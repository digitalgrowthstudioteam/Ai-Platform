"""
Digital Growth Studio — Bunny.net CDN & Edge Storage Service
Handles asset uploads (logos, product photos, banners, splash screens) to Bunny Storage.
"""
import base64
import httpx
import uuid
import structlog
from typing import Optional
from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class BunnyStorageService:
    def __init__(self):
        self.storage_zone = settings.BUNNY_STORAGE_ZONE
        self.api_key = settings.BUNNY_API_KEY
        self.cdn_hostname = settings.BUNNY_CDN_HOSTNAME
        self.region = settings.BUNNY_STORAGE_REGION.lower() if settings.BUNNY_STORAGE_REGION else "de"

    @property
    def base_storage_url(self) -> str:
        """Storage API base host according to region."""
        if not self.region or self.region in ["de", "standard"]:
            return f"https://storage.bunnycdn.com/{self.storage_zone}"
        return f"https://{self.region}.storage.bunnycdn.com/{self.storage_zone}"

    async def upload_file(
        self,
        vendor_id: str,
        file_bytes: bytes,
        filename: str,
        folder: str = "products"
    ) -> dict:
        """
        Uploads file to Bunny.net Edge Storage and returns public CDN URL and file size.
        If credentials are not yet configured, returns a fallback data reference.
        """
        file_size = len(file_bytes)
        ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
        unique_filename = f"{uuid.uuid4().hex[:12]}.{ext}"
        relative_path = f"{folder}/{vendor_id}/{unique_filename}"

        def make_base64_url(b: bytes, f_ext: str) -> str:
            mime = "image/jpeg"
            if f_ext in ["png"]:
                mime = "image/png"
            elif f_ext in ["webp"]:
                mime = "image/webp"
            elif f_ext in ["svg"]:
                mime = "image/svg+xml"
            elif f_ext in ["gif"]:
                mime = "image/gif"
            encoded = base64.b64encode(b).decode("utf-8")
            return f"data:{mime};base64,{encoded}"

        if not self.storage_zone or not self.api_key:
            # Fallback when Bunny credentials are not yet configured in env:
            # Return inline base64 image data URI so browser & mobile apps render the image directly without broken icon
            logger.warning("bunny_storage_unconfigured_using_base64_fallback", filename=filename)
            fallback_url = make_base64_url(file_bytes, ext)
            return {
                "url": fallback_url,
                "bytes": file_size,
                "path": relative_path,
                "filename": filename,
                "stored_at": "inline_base64",
            }

        endpoint = f"{self.base_storage_url}/{relative_path}"
        headers = {
            "AccessKey": self.api_key,
            "Content-Type": "application/octet-stream",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.put(endpoint, content=file_bytes, headers=headers)
                if res.status_code in [200, 201]:
                    cdn_host = self.cdn_hostname or f"{self.storage_zone}.b-cdn.net"
                    public_url = f"https://{cdn_host}/{relative_path}"
                    return {
                        "url": public_url,
                        "bytes": file_size,
                        "path": relative_path,
                        "filename": filename,
                        "stored_at": "bunny"
                    }
                else:
                    logger.error("bunny_upload_failed", status=res.status_code, body=res.text)
                    raise RuntimeError(f"Bunny storage upload failed: {res.text}")
        except Exception as e:
            logger.error("bunny_storage_exception", error=str(e))
            fallback_url = make_base64_url(file_bytes, ext)
            return {
                "url": fallback_url,
                "bytes": file_size,
                "path": relative_path,
                "filename": filename,
                "stored_at": "inline_base64_fallback"
            }

    async def delete_file(self, relative_path: str) -> bool:
        """Deletes file from Bunny Storage."""
        if not self.storage_zone or not self.api_key:
            return True
        endpoint = f"{self.base_storage_url}/{relative_path}"
        headers = {"AccessKey": self.api_key}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.delete(endpoint, headers=headers)
                return res.status_code in [200, 404]
        except Exception as e:
            logger.error("bunny_delete_exception", error=str(e), path=relative_path)
            return False


bunny_storage = BunnyStorageService()

