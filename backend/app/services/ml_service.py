"""
NeuroRail – ML Service
Loads the model once at startup (singleton) and exposes a predict() interface.
Supports: YOLOv8 / PyTorch (.pt / .pth), ONNX Runtime (.onnx), joblib/pickle (.pkl).
"""
from __future__ import annotations

import asyncio
import io
import logging
import pickle
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
#  Paths
# ──────────────────────────────────────────────
_BACKEND_DIR = Path(__file__).resolve().parents[2]          # …/backend/
_ML_MODEL_DIR = _BACKEND_DIR.parent / "ml-model" / "models" # …/ml-model/models/

# Confidence threshold above which a WebSocket ALERT is emitted
ALERT_THRESHOLD: float = 0.50

# Priority order for model file search
_EXTENSIONS_PRIORITY = [".pt", ".pth", ".onnx", ".pkl"]


def _find_model_file(directory: Path) -> Path:
    """Return the first model file found in *directory*, by extension priority."""
    for ext in _EXTENSIONS_PRIORITY:
        matches = sorted(directory.glob(f"*{ext}"))
        if matches:
            return matches[0]
    raise FileNotFoundError(
        f"No supported model file ({', '.join(_EXTENSIONS_PRIORITY)}) found in {directory}"
    )


# ──────────────────────────────────────────────
#  Detection result type
# ──────────────────────────────────────────────
class DetectionItem:
    __slots__ = ("label", "confidence", "bbox")

    def __init__(self, label: str, confidence: float, bbox: dict[str, float]) -> None:
        self.label = label
        self.confidence = confidence
        self.bbox = bbox  # {"x": ..., "y": ..., "w": ..., "h": ...}

    def to_dict(self) -> dict[str, Any]:
        return {
            "label": self.label,
            "confidence": round(float(self.confidence), 4),
            "bbox": {k: round(float(v), 2) for k, v in self.bbox.items()},
        }


# ──────────────────────────────────────────────
#  MLService
# ──────────────────────────────────────────────
class MLService:
    """Singleton wrapper around the trained inference model."""

    def __init__(self) -> None:
        self._model: Any = None
        self._model_type: str = "none"
        self._model_path: Path | None = None
        self._load_model()

    # ── private loaders ──────────────────────

    def _load_model(self) -> None:
        try:
            path = _find_model_file(_ML_MODEL_DIR)
        except FileNotFoundError as exc:
            logger.warning("%s – inference will return empty results.", exc)
            return

        ext = path.suffix.lower()
        logger.info("Loading model from %s (type=%s)", path, ext)

        try:
            if ext in (".pt", ".pth"):
                self._load_yolo_or_torch(path)
            elif ext == ".onnx":
                self._load_onnx(path)
            elif ext == ".pkl":
                self._load_pickle(path)
            else:
                logger.error("Unsupported model extension: %s", ext)
                return

            self._model_path = path
            logger.info("Model loaded successfully [type=%s]", self._model_type)
        except Exception:
            logger.exception("Failed to load model from %s", path)

    def _load_yolo_or_torch(self, path: Path) -> None:
        # Try Ultralytics YOLO first (most common for this project)
        try:
            from ultralytics import YOLO  # type: ignore[import]
            self._model = YOLO(str(path))
            self._model_type = "yolo"
            return
        except ImportError:
            pass

        # Fall back to raw PyTorch
        import torch  # type: ignore[import]
        self._model = torch.load(str(path), map_location="cpu")
        if hasattr(self._model, "eval"):
            self._model.eval()
        self._model_type = "torch"

    def _load_onnx(self, path: Path) -> None:
        import onnxruntime as ort  # type: ignore[import]
        self._model = ort.InferenceSession(
            str(path),
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        self._model_type = "onnx"

    def _load_pickle(self, path: Path) -> None:
        try:
            import joblib  # type: ignore[import]
            self._model = joblib.load(str(path))
        except ImportError:
            with path.open("rb") as fh:
                self._model = pickle.load(fh)
        self._model_type = "sklearn"

    # ── sync inference helpers ────────────────

    def _run_yolo(self, image: Image.Image) -> list[DetectionItem]:
        results = self._model.predict(source=image, verbose=False, conf=0.25)
        items: list[DetectionItem] = []
        for r in results:
            boxes = r.boxes
            if boxes is None:
                continue
            for box in boxes:
                xyxy = box.xyxy[0].tolist()
                x1, y1, x2, y2 = xyxy
                items.append(
                    DetectionItem(
                        label=r.names[int(box.cls[0])],
                        confidence=float(box.conf[0]),
                        bbox={"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
                    )
                )
        return items

    def _run_onnx(self, image: Image.Image) -> list[DetectionItem]:
        """Generic ONNX inference – adapt input_name / shape for your model."""
        import onnxruntime as ort  # type: ignore[import]

        img = image.convert("RGB").resize((640, 640))
        arr = np.array(img, dtype=np.float32).transpose(2, 0, 1) / 255.0
        blob = arr[np.newaxis, ...]  # (1, 3, 640, 640)

        input_name: str = self._model.get_inputs()[0].name
        outputs = self._model.run(None, {input_name: blob})

        # Shape: (1, num_det, 6) → [x1, y1, x2, y2, conf, cls]
        items: list[DetectionItem] = []
        if outputs and len(outputs[0].shape) == 3:
            preds = outputs[0][0]
            for det in preds:
                conf = float(det[4])
                if conf < 0.25:
                    continue
                x1, y1, x2, y2 = det[:4].tolist()
                cls_id = int(det[5])
                items.append(
                    DetectionItem(
                        label=str(cls_id),
                        confidence=conf,
                        bbox={"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
                    )
                )
        return items

    def _run_sklearn(self, image: Image.Image) -> list[DetectionItem]:
        """Flat-feature sklearn/joblib model (e.g. SVM, RandomForest)."""
        arr = np.array(image.convert("RGB").resize((64, 64)), dtype=np.float32).flatten() / 255.0
        proba = (
            self._model.predict_proba([arr])[0]
            if hasattr(self._model, "predict_proba")
            else None
        )
        label = str(self._model.predict([arr])[0])
        conf = float(max(proba)) if proba is not None else 1.0
        return [DetectionItem(label=label, confidence=conf, bbox={"x": 0, "y": 0, "w": 0, "h": 0})]

    def _infer(self, image_bytes: bytes) -> list[DetectionItem]:
        """Synchronous inference — called via asyncio.to_thread."""
        if self._model is None:
            return []

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        if self._model_type == "yolo":
            return self._run_yolo(image)
        if self._model_type in ("torch",):
            # Generic torch – delegate to YOLO-style if possible, else return empty
            return self._run_yolo(image)
        if self._model_type == "onnx":
            return self._run_onnx(image)
        if self._model_type == "sklearn":
            return self._run_sklearn(image)
        return []

    # ── public API ────────────────────────────

    async def predict(self, image_bytes: bytes) -> list[DetectionItem]:
        """Non-blocking inference. Runs _infer in a thread pool."""
        return await asyncio.to_thread(self._infer, image_bytes)

    @property
    def is_ready(self) -> bool:
        return self._model is not None

    @property
    def model_type(self) -> str:
        return self._model_type

    @property
    def model_path(self) -> str:
        return str(self._model_path) if self._model_path else "not loaded"


# Singleton instance — imported by routes
ml_service = MLService()
