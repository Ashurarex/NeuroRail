from __future__ import annotations

import io
from typing import Iterable

import numpy as np
from PIL import Image


def _normalize(vec: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vec))
    if norm == 0:
        return vec
    return vec / norm


def compute_embedding_from_image(image: Image.Image, bins: int = 8) -> list[float]:
    """Compute a simple color histogram embedding (normalized)."""
    resized = image.convert("RGB").resize((128, 128))
    arr = np.array(resized, dtype=np.float32)
    hist_parts = []

    for channel in range(3):
        values = arr[:, :, channel].flatten()
        hist, _ = np.histogram(values, bins=bins, range=(0, 255), density=True)
        hist_parts.append(hist)

    vec = np.concatenate(hist_parts).astype(np.float32)
    return _normalize(vec).tolist()


def compute_embedding_from_bytes(image_bytes: bytes, bins: int = 8) -> list[float]:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return compute_embedding_from_image(image, bins=bins)


def cosine_similarity(a: Iterable[float], b: Iterable[float]) -> float:
    vec_a = np.array(list(a), dtype=np.float32)
    vec_b = np.array(list(b), dtype=np.float32)
    if vec_a.size == 0 or vec_b.size == 0:
        return 0.0
    denom = float(np.linalg.norm(vec_a) * np.linalg.norm(vec_b))
    if denom == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / denom)
