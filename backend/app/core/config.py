import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")

    def __init__(self):
        if not self.DATABASE_URL:
            raise ValueError("DATABASE_URL is not set. Please configure it in backend/.env")

        if not self.JWT_SECRET:
            raise ValueError("JWT_SECRET is not set. Please configure it in backend/.env")


settings = Settings()