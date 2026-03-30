import uuid
from supabase import create_client
from app.core.config import settings

# Initialize Supabase client
supabase = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_ANON_KEY
)


def upload_image(file_bytes: bytes, filename: str) -> str:
    """
    Upload image to Supabase Storage and return public URL
    """

    unique_name = f"{uuid.uuid4()}_{filename}"

    # Upload file
    response = supabase.storage.from_("neurorail-images").upload(
        unique_name,
        file_bytes
    )

    if hasattr(response, "error") and response.error:
        raise Exception(response.error)

    # Get public URL
    public_url = supabase.storage.from_("neurorail-images").get_public_url(unique_name)

    return public_url