from ultralytics import YOLO

model = YOLO('yolov8m.pt')

model.train(
    data='merged_dataset/data.yaml',
    epochs=60,
    imgsz=640,
    batch=8,
    device=0,
    cache=False,
    workers=0,
    hsv_h=0.015,
    hsv_s=0.7,
    hsv_v=0.4,
    fliplr=0.5,
    degrees=10.0,
    translate=0.1,
    scale=0.5,
    mosaic=0.5,
    mixup=0.1
)
