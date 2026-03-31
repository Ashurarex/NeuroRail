"""
NeuroRail – YOLOv8 Fine-tuning Pipeline
========================================
Trains / fine-tunes YOLOv8 on the NeuroRail dataset (person, bag, object).

Usage:
    python train.py                          # default config
    python train.py --model yolov8s.pt       # lighter backbone
    python train.py --epochs 100 --batch 16
    python train.py --resume runs/train/exp/weights/last.pt

Outputs best weights to:
    runs/neurorail/<exp_name>/weights/best.pt
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path

import torch

# ── logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("neurorail.train")

# ── paths ─────────────────────────────────────────────────────────────────────

ROOT        = Path(__file__).resolve().parent          # ml-model/
DATASET_DIR = ROOT / "dataset"
DATA_YAML   = DATASET_DIR / "data.yaml"
MODELS_DIR  = ROOT / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ── helpers ───────────────────────────────────────────────────────────────────

def _detect_device() -> str:
    """Pick best available device: CUDA > MPS > CPU."""
    if torch.cuda.is_available():
        gpu = torch.cuda.get_device_name(0)
        log.info("Using GPU: %s", gpu)
        return "0"        # first CUDA device
    if torch.backends.mps.is_available():
        log.info("Using Apple MPS backend")
        return "mps"
    log.warning("No GPU found – training on CPU (will be slow)")
    return "cpu"


def _optimal_batch(device: str, requested: int | None) -> int:
    """Return the batch size, halving if VRAM is modest."""
    if requested:
        return requested
    if device == "cpu":
        return 4
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if device == "0" else 8
    if vram_gb >= 16:
        return 32
    if vram_gb >= 8:
        return 16
    return 8


def _verify_dataset() -> None:
    """Sanity-check that the dataset tree and data.yaml exist."""
    for split in ("train", "val"):
        for sub in ("images", "labels"):
            d = DATASET_DIR / sub / split
            if not d.exists():
                log.error("Missing directory: %s", d)
                sys.exit(1)
    if not DATA_YAML.exists():
        log.error("Missing data.yaml at %s", DATA_YAML)
        sys.exit(1)
    n_train = len(list((DATASET_DIR / "images" / "train").glob("*.*")))
    n_val   = len(list((DATASET_DIR / "images" / "val").glob("*.*")))
    log.info("Dataset: %d train | %d val images", n_train, n_val)


# ── training ──────────────────────────────────────────────────────────────────

def train(args: argparse.Namespace) -> Path:
    try:
        from ultralytics import YOLO  # type: ignore[import]
    except ImportError:
        log.error("Ultralytics not installed. Run: pip install ultralytics")
        sys.exit(1)

    device = args.device or _detect_device()
    batch  = _optimal_batch(device, args.batch)

    _verify_dataset()

    # ── Load model (pretrained or resume) ─────────────────────────────────
    if args.resume:
        log.info("Resuming from checkpoint: %s", args.resume)
        model = YOLO(str(args.resume))
    else:
        log.info("Loading pretrained weights: %s", args.model)
        model = YOLO(args.model)

    log.info("Starting training  epochs=%d  batch=%d  imgsz=%d  device=%s",
             args.epochs, batch, args.imgsz, device)

    # ── Ultralytics train ──────────────────────────────────────────────────
    results = model.train(
        data=str(DATA_YAML),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=batch,
        device=device,
        project="runs/neurorail",
        name=args.name,
        exist_ok=True,

        # ── precision optimisation ────────────────────────────────────────
        patience=20,           # early stopping – no improvement for N epochs
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,              # final lr = lr0 * lrf  (cosine schedule)
        warmup_epochs=3,
        weight_decay=0.0005,
        label_smoothing=0.1,

        # ── augmentations ─────────────────────────────────────────────────
        #   Colour
        hsv_h=0.015,           # hue jitter
        hsv_s=0.7,             # saturation jitter
        hsv_v=0.4,             # value / brightness jitter
        #   Geometric
        fliplr=0.5,            # horizontal flip
        flipud=0.0,            # vertical flip (disabled for surveillance)
        degrees=5.0,           # rotation ±5°
        translate=0.1,
        scale=0.6,             # zoom 40–160 %
        shear=2.0,
        perspective=0.0003,
        #   Mixing
        mosaic=1.0,            # critical for small objects
        mixup=0.1,
        copy_paste=0.1,        # boosts occlusion robustness
        #   Erasing (simulates occlusion)
        erasing=0.4,

        # ── NMS / threshold ───────────────────────────────────────────────
        conf=None,             # set at inference time
        iou=0.7,               # NMS IoU during validation
        max_det=50,

        # ── small-object improvements ─────────────────────────────────────
        # Anchor sizes are auto-tuned by YOLOv8 via k-means on the dataset.
        # overlap_mask=True ensures better mask quality for instances.
        overlap_mask=True,
        mask_ratio=4,

        # ── logging / saving ──────────────────────────────────────────────
        save=True,
        save_period=10,        # checkpoint every N epochs
        plots=True,
        verbose=True,
        workers=min(8, os.cpu_count() or 4),
        cache=False,           # set True if RAM > 16 GB for speed
    )

    best_pt: Path = Path(results.save_dir) / "weights" / "best.pt"
    log.info("Training complete. Best weights: %s", best_pt)
    return best_pt


# ── post-training export ──────────────────────────────────────────────────────

def export_model(best_pt: Path, export_onnx: bool = False) -> None:
    """Copy best.pt → ml-model/models/ and optionally export ONNX."""
    from ultralytics import YOLO  # type: ignore[import]

    dest_pt = MODELS_DIR / "neurorail_best.pt"
    import shutil
    shutil.copy2(best_pt, dest_pt)
    log.info("Copied best.pt → %s", dest_pt)

    if export_onnx:
        log.info("Exporting to ONNX …")
        model = YOLO(str(dest_pt))
        model.export(
            format="onnx",
            imgsz=640,
            simplify=True,
            opset=17,
            dynamic=False,
        )
        onnx_src = dest_pt.with_suffix(".onnx")
        dest_onnx = MODELS_DIR / "neurorail_best.onnx"
        if onnx_src.exists():
            shutil.move(str(onnx_src), str(dest_onnx))
            log.info("ONNX model → %s", dest_onnx)


# ── evaluation ────────────────────────────────────────────────────────────────

def evaluate(best_pt: Path, conf_threshold: float = 0.25) -> None:
    """Run val set evaluation and print mAP / Precision / Recall."""
    from ultralytics import YOLO  # type: ignore[import]

    log.info("Evaluating %s on validation set …", best_pt)
    model = YOLO(str(best_pt))
    metrics = model.val(
        data=str(DATA_YAML),
        imgsz=640,
        conf=conf_threshold,
        iou=0.6,
        plots=True,
        verbose=True,
    )
    log.info("── Evaluation Results ──────────────────────────")
    log.info("mAP@50      : %.4f", metrics.box.map50)
    log.info("mAP@50:95   : %.4f", metrics.box.map)
    log.info("Precision   : %.4f", metrics.box.mp)
    log.info("Recall      : %.4f", metrics.box.mr)
    log.info("────────────────────────────────────────────────")


# ── CLI ───────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="NeuroRail YOLOv8 training pipeline")
    p.add_argument("--model",   default="yolov8m.pt",
                   help="Pretrained weights file or path (default: yolov8m.pt)")
    p.add_argument("--epochs",  type=int, default=80)
    p.add_argument("--batch",   type=int, default=None,
                   help="Batch size (auto-detected from VRAM if omitted)")
    p.add_argument("--imgsz",   type=int, default=640)
    p.add_argument("--device",  default=None,
                   help="Device string: '0', 'cpu', 'mps' (auto-detected if omitted)")
    p.add_argument("--name",    default="exp",
                   help="Run name under runs/neurorail/")
    p.add_argument("--resume",  default=None,
                   help="Path to last.pt to resume an interrupted run")
    p.add_argument("--onnx",    action="store_true",
                   help="Also export best.pt to ONNX after training")
    p.add_argument("--eval-only", default=None, metavar="WEIGHTS",
                   help="Skip training; evaluate this .pt file instead")
    p.add_argument("--conf",    type=float, default=0.25,
                   help="Confidence threshold for evaluation (default: 0.25)")
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()

    if args.eval_only:
        evaluate(Path(args.eval_only), conf_threshold=args.conf)
        sys.exit(0)

    best_pt = train(args)
    evaluate(best_pt, conf_threshold=args.conf)
    export_model(best_pt, export_onnx=args.onnx)
