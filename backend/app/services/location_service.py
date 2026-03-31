from __future__ import annotations

CAMERA_LOCATION_MAP: dict[str, str] = {
    "CAM-MUM-PLAT-1": "Platform 1 - Mumbai Central",
    "CAM-MUM-PLAT-2": "Platform 2 - Mumbai Central",
    "CAM-MUM-PLAT-3": "Platform 3 - Mumbai Central",
    "CAM-MUM-CONC-1": "Concourse Gate A - Mumbai Central",
    "CAM-MUM-CONC-2": "Concourse Gate B - Mumbai Central",
    "CAM-DEL-PLAT-5": "Platform 5 - New Delhi",
    "CAM-DEL-CONC-1": "Concourse Gate 1 - New Delhi",
    "CAM-BLR-PLAT-4": "Platform 4 - Bengaluru City",
    "CAM-BLR-ENTRY-1": "Main Entry - Bengaluru City",
    "CAM-CSMT-PLAT-8": "Platform 8 - CSMT",
}


def resolve_location(camera_id: str | None, explicit_location: str | None) -> str | None:
    if explicit_location:
        return explicit_location.strip() if explicit_location.strip() else None
    if not camera_id:
        return None
    return CAMERA_LOCATION_MAP.get(camera_id)
