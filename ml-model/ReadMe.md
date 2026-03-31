# NeuroRail ML Training Pipeline

Complete YOLOv8 fine-tuning pipeline for railway surveillance detection.
**Classes:** `person` (0) · `bag` (1) · `object` (2)

---

## File map

```
ml-model/
├── train.py          ← full training pipeline (run this)
├── predict.py        ← inference + threshold tuning + hard-neg analysis
├── annotate.py       ← dataset utilities (validate, augment, split)
├── data.yaml         ← Ultralytics dataset config  (legacy root)
├── dataset/
│   ├── data.yaml     ← canonical dataset config (used by train.py)
│   ├── images/
│   │   ├── train/    ← put your training images here
│   │   └── val/      ← put your validation images here
│   └── labels/
│       ├── train/    ← YOLO .txt labels for train images
│       └── val/      ← YOLO .txt labels for val images
└── models/
    ├── final_model.pt         ← current deployed model
    └── neurorail_best.pt      ← written here after training
```

---

## 1. Setup

```bash
cd "NeuroRail v1/ml-model"
pip install ultralytics albumentations opencv-python-headless torch torchvision
```

GPU training (recommended):
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

---

## 2. Prepare dataset

### Option A — You already have labelled images
Place them in:
```
dataset/images/train/   ← .jpg or .png
dataset/labels/train/   ← matching .txt files (YOLO format)
dataset/images/val/
dataset/labels/val/
```

### Option B — Flat directory, needs splitting
```bash
python annotate.py split \
    --images path/to/all_images \
    --labels path/to/all_labels \
    --val-ratio 0.15
```

### Option C — Images have no labels yet
```bash
python annotate.py placeholders   # creates empty .txt files for each image
# Then annotate using Roboflow / LabelImg / CVAT
```

### YOLO label format
One line per bounding box — all values **normalised to [0, 1]**:
```
<class_id> <x_center> <y_center> <width> <height>

# Examples:
0 0.512 0.430 0.180 0.320      # person in centre
1 0.750 0.820 0.090 0.110      # bag bottom-right
2 0.210 0.300 0.350 0.200      # obstacle left side
```

### Offline augmentation (optional but recommended)
```bash
python annotate.py augment --factor 3   # 3× dataset size
```
Applies: flip · brightness/contrast · blur · CoarseDropout (occlusion) · HSV shift · ShiftScaleRotate

### Validate labels
```bash
python annotate.py validate   # report only
python annotate.py fix        # auto-remove malformed lines
```

---

## 3. Train

### Standard run (auto-detects GPU, batch size)
```bash
python train.py
```

### Custom options
```bash
python train.py \
    --model yolov8m.pt \     # backbone: n / s / m / l / x
    --epochs 80 \
    --imgsz 640 \
    --batch 16 \
    --name exp_v2 \
    --onnx                   # also export to ONNX after training
```

### Resume interrupted run
```bash
python train.py --resume runs/neurorail/exp/weights/last.pt
```

### Evaluate only (no training)
```bash
python train.py --eval-only models/neurorail_best.pt --conf 0.35
```

**After training, `best.pt` is automatically copied to `models/neurorail_best.pt`.**

---

## 4. Evaluate

Metrics printed after every training run:
```
mAP@50      per-class mean average precision
mAP@50:95   stricter IoU-averaged mAP
Precision   TP / (TP + FP)   — reduce FP
Recall      TP / (TP + FN)   — reduce FN
```

Confusion matrix + PR curves saved in `runs/neurorail/<name>/`.

---

## 5. Tune confidence threshold

Use `predict.py` to find the best trade-off:
```bash
python predict.py --source dataset/images/val/example.jpg --tune
```
Output:
```
  conf  detections  labels
  0.20           4  person(0.89), bag(0.43), bag(0.31), object(0.22)
  0.35           2  person(0.89), bag(0.43)
  0.50           1  person(0.89)
```
Pick the threshold that keeps genuine detections and drops false positives.

---

## 6. Run inference

```bash
# Single image
python predict.py --source image.jpg --conf 0.35

# Batch directory
python predict.py --source dataset/images/val/ --json > results.json

# Video
python predict.py --source surveillance.mp4 --video-out annotated.mp4

# Hard-negative mining (find frames where model fires on negatives)
python predict.py --source negatives_dir/ --hard-neg
```

---

## 7. Deploy updated model

After training:
```bash
# best.pt is already at models/neurorail_best.pt — just restart the backend
# OR rename it to final_model.pt to use as the primary model:
copy models\neurorail_best.pt models\final_model.pt
```

The backend (`ml_service.py`) auto-loads the first `.pt` file found in `ml-model/models/`
using alphabetical priority — `final_model.pt` takes precedence.

---

## 8. ONNX export (optional, for faster CPU inference)

```bash
python train.py --eval-only models/neurorail_best.pt --onnx
# OR manually:
python -c "
from ultralytics import YOLO
YOLO('models/neurorail_best.pt').export(format='onnx', imgsz=640, simplify=True, opset=17)
"
```
ONNX model is written to `models/neurorail_best.onnx` and auto-loaded by `ml_service.py`.

---

## Recommended model size guide

| Backbone   | Size  | Speed    | Accuracy | VRAM   |
|------------|-------|----------|----------|--------|
| yolov8n.pt | ~6 MB | fastest  | lowest   | 2 GB   |
| yolov8s.pt | ~22 MB| fast     | moderate | 4 GB   |
| **yolov8m.pt** | **~52 MB** | **balanced** | **good** | **6 GB** |
| yolov8l.pt | ~87 MB| slower   | better   | 10 GB  |
| yolov8x.pt | ~136 MB| slowest | best     | 16 GB  |

`yolov8m` is the default — good balance for surveillance hardware.

---

## High-precision checklist

- [ ] Minimum 300–500 annotated images per class
- [ ] Run `python annotate.py augment --factor 3` before training
- [ ] Tune `--conf` with `predict.py --tune` after training
- [ ] If `bag` recall < 0.7: uncomment `weights` in `data.yaml` and set `[1.0, 2.5, 1.5]`
- [ ] For very small objects: add `--imgsz 1280` (slower but more accurate)
- [ ] Hard-negative mine with `predict.py --hard-neg` and add FP frames to training set
