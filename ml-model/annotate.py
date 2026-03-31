"""
NeuroRail – Dataset Annotation Utilities
=========================================
Provides:
  - YOLO label format specification (via docstring + example)
  - validate_dataset()  — check labels are well-formed
  - generate_placeholder_labels()  — bootstrap empty labels for unlabelled images
  - augment_dataset()   — offline augmentation using Albumentations

Class IDs (must match data.yaml):
    0 = person
    1 = bag
    2 = object

YOLO annotation format (one detection per line):
    <class_id> <x_center> <y_center> <width> <height>

All coordinates are NORMALISED to [0, 1] relative to image dimensions.

Example (image 640×480, person bounding box x1=50 y1=100 x2=200 y2=400):
    x_center = (50 + 200) / 2 / 640 = 0.195313
    y_center = (100 + 400) / 2 / 480 = 0.520833
    width    = (200 - 50) / 640      = 0.234375
    height   = (400 - 100) / 480     = 0.625000
    → label file line:  0 0.195313 0.520833 0.234375 0.625000

Recommended free annotation tools:
    • Roboflow (web, auto-exports YOLO format)
    • LabelImg  (desktop, pip install labelImg)
    • CVAT      (self-hosted or cloud)
"""

from __future__ import annotations

import random
import shutil
import sys
from pathlib import Path
from typing import Iterator

# ── paths ─────────────────────────────────────────────────────────────────────

ROOT    = Path(__file__).resolve().parent
DATASET = ROOT / "dataset"

CLASS_NAMES = {0: "person", 1: "bag", 2: "object"}
NUM_CLASSES  = len(CLASS_NAMES)


# ── validation ────────────────────────────────────────────────────────────────

def _iter_label_files(split: str) -> Iterator[Path]:
    label_dir = DATASET / "labels" / split
    if not label_dir.exists():
        return
    yield from label_dir.glob("*.txt")


def validate_dataset(fix: bool = False) -> bool:
    """
    Check every label file for:
      - correct number of fields (5 per row)
      - class_id in [0, NUM_CLASSES-1]
      - coordinates in [0, 1]
      - matching image file exists

    Parameters
    ----------
    fix:  if True, remove lines that fail validation (in-place edit).

    Returns True if dataset is clean.
    """
    errors: list[str] = []

    for split in ("train", "val"):
        img_dir = DATASET / "images" / split
        for lf in _iter_label_files(split):
            lines = lf.read_text().splitlines()
            clean_lines: list[str] = []
            for i, line in enumerate(lines, 1):
                line = line.strip()
                if not line:
                    continue
                parts = line.split()
                ok = True
                if len(parts) != 5:
                    errors.append(f"{lf}:{i} — expected 5 fields, got {len(parts)}")
                    ok = False
                else:
                    cls_id = int(parts[0])
                    coords = [float(v) for v in parts[1:]]
                    if cls_id not in CLASS_NAMES:
                        errors.append(f"{lf}:{i} — invalid class_id {cls_id}")
                        ok = False
                    if any(v < 0 or v > 1 for v in coords):
                        errors.append(f"{lf}:{i} — coord out of [0,1]: {coords}")
                        ok = False
                if ok:
                    clean_lines.append(line)

            # Check matching image
            found = any(
                (img_dir / (lf.stem + ext)).exists()
                for ext in (".jpg", ".jpeg", ".png", ".webp")
            )
            if not found:
                errors.append(f"{lf} — no matching image in {img_dir}")

            if fix:
                lf.write_text("\n".join(clean_lines) + "\n")

    if errors:
        print(f"[validate_dataset] {len(errors)} issue(s) found:")
        for e in errors[:20]:
            print("  ", e)
        if len(errors) > 20:
            print(f"  … and {len(errors) - 20} more")
        return False

    print("[validate_dataset] Dataset is clean ✓")
    return True


# ── placeholder label generation ──────────────────────────────────────────────

def generate_placeholder_labels() -> None:
    """
    Create empty .txt label files for every image that has no label yet.
    Useful when bootstrapping a new dataset before annotation.
    """
    for split in ("train", "val"):
        img_dir   = DATASET / "images" / split
        label_dir = DATASET / "labels" / split
        label_dir.mkdir(parents=True, exist_ok=True)
        created = 0
        for img in img_dir.glob("*.*"):
            if img.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            lf = label_dir / (img.stem + ".txt")
            if not lf.exists():
                lf.touch()
                created += 1
        print(f"[{split}] Created {created} empty label files")


# ── offline augmentation ──────────────────────────────────────────────────────

def augment_dataset(
    split: str = "train",
    factor: int = 3,
    seed: int = 42,
) -> None:
    """
    Offline augmentation: generate `factor` augmented copies per image.
    Requires: pip install albumentations opencv-python-headless

    Augmentations applied:
      • Horizontal flip
      • Brightness / contrast jitter
      • Gaussian blur
      • Coarse dropout (occlusion simulation)
      • Hue-saturation-value shift
      • Random scale + translate (via ShiftScaleRotate)

    Output images/labels are written to the same split directories with
    suffix _aug{N} so they don't overwrite originals.
    """
    try:
        import albumentations as A  # type: ignore[import]
        import cv2                  # type: ignore[import]
        import numpy as np          # type: ignore[import]
    except ImportError:
        print("Install albumentations + opencv:  pip install albumentations opencv-python-headless")
        sys.exit(1)

    random.seed(seed)

    transform = A.Compose(
        [
            A.HorizontalFlip(p=0.5),
            A.RandomBrightnessContrast(brightness_limit=0.3, contrast_limit=0.3, p=0.7),
            A.GaussianBlur(blur_limit=(3, 7), p=0.3),
            A.CoarseDropout(
                max_holes=6,
                max_height=64,
                max_width=64,
                min_holes=1,
                min_height=16,
                min_width=16,
                fill_value=0,
                p=0.4,
            ),
            A.HueSaturationValue(
                hue_shift_limit=15,
                sat_shift_limit=30,
                val_shift_limit=20,
                p=0.4,
            ),
            A.ShiftScaleRotate(
                shift_limit=0.08,
                scale_limit=0.15,
                rotate_limit=5,
                border_mode=cv2.BORDER_CONSTANT,
                p=0.5,
            ),
        ],
        bbox_params=A.BboxParams(
            format="yolo",
            label_fields=["class_labels"],
            min_visibility=0.3,   # drop boxes occluded >70%
        ),
    )

    img_dir   = DATASET / "images" / split
    label_dir = DATASET / "labels" / split
    out_img   = img_dir
    out_lbl   = label_dir

    images = sorted(img_dir.glob("*.jpg")) + sorted(img_dir.glob("*.png"))
    print(f"[augment] Augmenting {len(images)} images × {factor} copies …")
    generated = 0

    for img_path in images:
        lf = label_dir / (img_path.stem + ".txt")
        if not lf.exists():
            continue
        image = cv2.imread(str(img_path))
        if image is None:
            continue
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        bboxes: list[list[float]] = []
        class_labels: list[int]  = []
        for line in lf.read_text().splitlines():
            parts = line.strip().split()
            if len(parts) == 5:
                class_labels.append(int(parts[0]))
                bboxes.append([float(v) for v in parts[1:]])

        for n in range(factor):
            aug = transform(image=image, bboxes=bboxes, class_labels=class_labels)
            aug_img = cv2.cvtColor(aug["image"], cv2.COLOR_RGB2BGR)

            stem = f"{img_path.stem}_aug{n}"
            cv2.imwrite(str(out_img / f"{stem}.jpg"), aug_img)

            rows = [
                f"{cls} {' '.join(f'{v:.6f}' for v in bb)}"
                for cls, bb in zip(aug["class_labels"], aug["bboxes"])
            ]
            (out_lbl / f"{stem}.txt").write_text("\n".join(rows) + "\n")
            generated += 1

    print(f"[augment] Generated {generated} augmented samples in dataset/{split}/")


# ── train / val split ─────────────────────────────────────────────────────────

def split_dataset(source_images: Path, source_labels: Path, val_ratio: float = 0.15, seed: int = 42) -> None:
    """
    Split a flat directory of images+labels into train/val subsets.

    source_images/  → contains all .jpg / .png
    source_labels/  → contains matching .txt files

    Copies into dataset/images/{train,val} and dataset/labels/{train,val}.
    """
    random.seed(seed)
    images = sorted(source_images.glob("*.jpg")) + sorted(source_images.glob("*.png"))
    random.shuffle(images)
    n_val = max(1, int(len(images) * val_ratio))
    splits = {"val": images[:n_val], "train": images[n_val:]}

    for split_name, img_list in splits.items():
        (DATASET / "images" / split_name).mkdir(parents=True, exist_ok=True)
        (DATASET / "labels" / split_name).mkdir(parents=True, exist_ok=True)
        for img in img_list:
            lf = source_labels / (img.stem + ".txt")
            shutil.copy2(img, DATASET / "images" / split_name / img.name)
            if lf.exists():
                shutil.copy2(lf, DATASET / "labels" / split_name / lf.name)
        print(f"[split] {split_name}: {len(img_list)} images")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="NeuroRail dataset utilities")
    sub = p.add_subparsers(dest="cmd")

    sub.add_parser("validate",  help="Validate all label files")
    sub.add_parser("fix",       help="Validate and auto-remove bad lines")
    sub.add_parser("placeholders", help="Create empty label files for unannotated images")

    aug_p = sub.add_parser("augment", help="Offline augmentation of the training set")
    aug_p.add_argument("--factor", type=int, default=3)
    aug_p.add_argument("--split",  default="train")

    spl_p = sub.add_parser("split", help="Split a flat image/label directory into train/val")
    spl_p.add_argument("--images", required=True)
    spl_p.add_argument("--labels", required=True)
    spl_p.add_argument("--val-ratio", type=float, default=0.15)

    args = p.parse_args()

    if args.cmd == "validate":
        validate_dataset(fix=False)
    elif args.cmd == "fix":
        validate_dataset(fix=True)
    elif args.cmd == "placeholders":
        generate_placeholder_labels()
    elif args.cmd == "augment":
        augment_dataset(split=args.split, factor=args.factor)
    elif args.cmd == "split":
        split_dataset(Path(args.images), Path(args.labels), val_ratio=args.val_ratio)
    else:
        p.print_help()
