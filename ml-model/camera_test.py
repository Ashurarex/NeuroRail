import cv2

cap = cv2.VideoCapture(0)

print("Opened:", cap.isOpened())

ret, frame = cap.read()
print("Frame:", ret)

if ret:
    cv2.imshow("Test", frame)
    cv2.waitKey(0)

cap.release()
cv2.destroyAllWindows()