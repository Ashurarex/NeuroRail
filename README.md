NeuroRail v1
AI-powered railway surveillance and safety monitoring system with real-time alerts, lost & found matching, and admin/user consoles.

Features
AI detection on uploaded frames (YOLO/ONNX/PyTorch supported).
Real-time alert broadcasts via WebSocket.
Lost & Found matching with confidence scoring and admin verification.
Admin dashboard: alerts, live surveillance, reports, and case management.
User console: submit lost items and track case status.
PostgreSQL-backed persistence.
Tech Stack
Backend: FastAPI, SQLAlchemy (async), PostgreSQL
Frontend: Next.js (App Router), TypeScript, Tailwind
ML: Ultralytics YOLO / ONNX / Torch (auto-loaded if present)
Project Structure (high level)
backend – FastAPI API, models, routes, services, WebSockets
frontend – Next.js UI (admin + user consoles)
ml-model – training + inference assets (optional)
Prerequisites
Python 3.10+ (venv recommended)
Node.js 18+
PostgreSQL running locally
A .env file in backend with:
Backend Setup
Run:

Frontend Setup
Core API Endpoints
POST /detect – run AI detection on an image
GET /detect/status – model load status
POST /lost-item – create a lost item case
GET /lost-found/mine – user case list
GET /lost-found/admin – admin case list
PATCH /lost-found/admin/{case_id} – update case status
POST /detections/ingest – ingest surveillance frame detections
GET /matches/{case_id} – fetch AI matches for a case
PATCH /matches/match/{match_id} – verify/reject a match
WebSockets
/ws/alerts – real-time alert feed
/ws/lost-found-matches – real-time match notifications
Lost & Found Flow
User submits a case (image + metadata).
Surveillance ingest pushes detections with bounding boxes.
Matching service scores image similarity + metadata.
Admin sees top matches, verifies or rejects.
Notes
Uploaded images are served via /uploads/....
Model auto-loads from models if present.
Admin accounts are identified by email containing “admin” (mock login).
