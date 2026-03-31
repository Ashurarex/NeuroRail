"""
NeuroRail – Inference Script
==============================
Standalone inference compatible with the existing ml_service.py interface.
Can be called from CLI for batch testing, or imported as a library.

Usage:
    # Single image
    python predict.py --source path/to/image.jpg

    # Directory of images
    python predict.py --source path/to/images/

    # Video file
    python predict.py --source path/to/video.mp4

    # Confidence threshold tuning
    python predict.py --source img.jpg --conf 0.35 --iou 0.45

    # Hard-negative analysis (saves only FP frames)
    python predict.py --source path/to/negatives/ --hard-neg
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

# ── paths ─────────────────────────────────────────────────────────────────────

ROOT       = Path(__file__).resolve().parent
MODELS_DIR = ROOT / "models"

# Class mapping must match data.yaml
CLASS_NAMES = {0: "person", 1: "bag", 2: "object"}

# ── confidence / NMS defaults ─────────────────────────────────────────────────
# Tuned for high precision (fewer false positives).
# Lower conf → more recalls; raise iou → less aggressive NMS.
DEFAULT_CONF = 0.35   # raise above 0.25 to reduce FP on bags vs objects
DEFAULT_IOU  = 0.45


def _find_model(override: str | None) -> Path:
    if override:
        p = Path(override)
        if not p.exists():
            print(f"[error] Model not found: {p}")
            sys.exit(1)
        return p
    # Priority: neurorail_best.pt > any .pt > final_model.pt
    candidates = sorted(MODELS_DIR.glob("neurorail*.pt")) + sorted(MODELS_DIR.glob("*.pt"))
    if candidates:
        return candidates[0]
    print(f"[error] No .pt model found in {MODELS_DIR}")
    sys.exit(1)


# ── result type ───────────────────────────────────────────────────────────────

class Detection:
    __slots__ = ("label", "confidence", "bbox")

    def __init__(self, label: str, confidence: float, bbox: dict[str, float]) -> None:
        self.label      = label
        self.confidence = confidence
        self.bbox       = bbox  # {"x": x1, "y": y1, "w": w, "h": h} in pixels

    def to_dict(self) -> dict[str, Any]:
        return {
            "label":      self.label,
            "confidence": round(self.confidence, 4),
            "bbox":       {k: round(v, 2) for k, v in self.bbox.items()},
        }

    def __repr__(self) -> str:
        return (
            f"Detection({self.label!r}, conf={self.confidence:.2f}, "
            f"x={self.bbox['x']:.0f} y={self.bbox['y']:.0f} "
            f"w={self.bbox['w']:.0f} h={self.bbox['h']:.0f})"
        )


# ── NeuroRailPredictor ────────────────────────────────────────────────────────

class NeuroRailPredictor:
    """
    Thin wrapper around Ultralytics YOLO that matches the interface
    expected by ml_service._run_yolo().

    Parameters
    ----------
    model_path : path to best.pt / neurorail_best.pt
    conf       : detection confidence threshold (reduce FP by raising this)
    iou        : NMS IoU threshold (raise to merge overlapping boxes more aggressively)
    """

    def __init__(
        self,
        model_path: str | Path | None = None,
        conf: float = DEFAULT_CONF,
        iou: float  = DEFAULT_IOU,
    ) -> None:
        try:
            from ultralytics import YOLO  # type: ignore[import]
        except ImportError:
            raise ImportError("pip install ultralytics")

        self.model_path = _find_model(str(model_path) if model_path else None)
        self.conf = conf
        self.iou  = iou
        self._model = YOLO(str(self.model_path))

    # ── single-image inference ─────────────────────────────────────────────

    def predict_bytes(self, image_bytes: bytes) -> list[Detection]:
        """
        Accept raw image bytes (JPEG/PNG) — same interface as ml_service.predict().
        Suitable for drop-in replacement in ml_service._run_yolo().
        """
        import io
        from PIL import Image  # type: ignore[import]
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return self._run(image)

    def predict_file(self, path: str | Path) -> list[Detection]:
        from PIL import Image  # type: ignore[import]
        image = Image.open(str(path)).convert("RGB")
        return self._run(image)

    def _run(self, image: Any) -> list[Detection]:
        results = self._model.predict(
            source=image,
            conf=self.conf,
            iou=self.iou,
            verbose=False,
            augment=False,   # no TTA at inference for speed; set True for accuracy boost
            agnostic_nms=False,
            max_det=50,
        )
        detections: list[Detection] = []
        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append(
                    Detection(
                        label=r.names[int(box.cls[0])],
                        confidence=float(box.conf[0]),
                        bbox={"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
                    )
                )
        return detections

    # ── batch inference ────────────────────────────────────────────────────

    def predict_directory(
        self,
        directory: str | Path,
        save_viz: bool = True,
        hard_neg: bool = False,
    ) -> list[dict[str, Any]]:
        """
        Run inference on all images in a directory.
        If hard_neg=True, only saves images where the model fires (FP analysis).
        """
        directory = Path(directory)
        suffixes = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
        images   = [f for f in sorted(directory.iterdir()) if f.suffix.lower() in suffixes]
        if not images:
            print(f"[warn] No images found in {directory}")
            return []

        results_out: list[dict[str, Any]] = []
        t0 = time.perf_counter()

        for img_path in images:
            dets = self.predict_file(img_path)
            entry = {
                "file":       str(img_path),
                "detections": [d.to_dict() for d in dets],
                "count":      len(dets),
            }
            results_out.append(entry)

            flag = "⚠" if any(d.label in ("bag", "object") for d in dets) else "✓"
            print(f"  {flag} {img_path.name}  → {len(dets)} detection(s)")
            for d in dets:
                print(f"       {d!r}")

        elapsed = time.perf_counter() - t0
        print(f"\n[done] {len(images)} images in {elapsed:.2f}s  ({elapsed/len(images)*1000:.1f} ms/img)")
        return results_out

    # ── video inference ────────────────────────────────────────────────────

    def predict_video(self, video_path: str | Path, output_path: str | Path | None = None) -> None:
        """
        Frame-by-frame inference on a video file.
        Saves annotated output video if output_path is provided.
        """
        video_path = Path(video_path)
        results = self._model.predict(
            source=str(video_path),
            conf=self.conf,
            iou=self.iou,
            stream=True,
            verbose=False,
            save=output_path is not None,
        )
        for frame_idx, r in enumerate(results):
            n = len(r.boxes) if r.boxes is not None else 0
            if n:
                print(f"  frame {frame_idx:05d}: {n} detection(s)")

    # ── threshold analysis ─────────────────────────────────────────────────

    def tune_threshold(self, image_path: str | Path) -> None:
        """
        Print detection counts at multiple confidence thresholds.
        Helps manually choose the best conf for precision/recall trade-off.
        """
        print(f"\n{'conf':>6}  {'detections':>11}  labels")
        for conf in [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.60, 0.70]:
            orig_conf = self.conf
            self.conf = conf
            dets = self.predict_file(image_path)
            self.conf = orig_conf
            labels = ", ".join(f"{d.label}({d.confidence:.2f})" for d in dets) or "—"
            print(f"  {conf:.2f}   {len(dets):>5}         {labels}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def _parse() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="NeuroRail inference")
    p.add_argument("--source",   required=True, help="Image file, directory, or video")
    p.add_argument("--model",    default=None,  help="Override model path")
    p.add_argument("--conf",     type=float, default=DEFAULT_CONF)
    p.add_argument("--iou",      type=float, default=DEFAULT_IOU)
    p.add_argument("--json",     action="store_true", help="Output results as JSON")
    p.add_argument("--tune",     action="store_true",
                   help="Print detection count at various confidence thresholds")
    p.add_argument("--hard-neg", action="store_true",
                   help="Hard-negative analysis: flag images where model fires")
    p.add_argument("--video-out", default=None, help="Output path for annotated video")
    return p.parse_args()


if __name__ == "__main__":
    args  = _parse()
    src   = Path(args.source)
    pred  = NeuroRailPredictor(model_path=args.model, conf=args.conf, iou=args.iou)

    if args.tune:
        pred.tune_threshold(src)
        sys.exit(0)

    if src.is_dir():
        results = pred.predict_directory(src, hard_neg=args.hard_neg)
        if args.json:
            print(json.dumps(results, indent=2))

    elif src.suffix.lower() in {".mp4", ".avi", ".mov", ".webm", ".mkv"}:
        pred.predict_video(src, output_path=args.video_out)

    else:
        dets = pred.predict_file(src)
        print(f"\nDetections in {src.name}:")
        for d in dets:
            print(" ", d)
        if args.json:
            print(json.dumps([d.to_dict() for d in dets], indent=2))
