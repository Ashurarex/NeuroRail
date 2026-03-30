import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base