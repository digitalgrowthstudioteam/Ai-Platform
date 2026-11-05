r"""
Digital Growth Studio — Automated Vendor File Isolation System
Ensures that all vendor-specific files (APKs, builds, branding assets, credentials, data)
are strictly isolated inside their own dedicated directory:
D:\App\Digital Growth Studio\vendors\<vendor_slug>\

Prevents any mixing or merging between different brands/stores.
"""
import os
import json
from pathlib import Path
from typing import Dict, Any

ROOT_DIR = Path("D:/App/Digital Growth Studio")
VENDORS_BASE_DIR = ROOT_DIR / "vendors"

class VendorWorkspace:
    def __init__(self, vendor_slug: str):
        self.slug = vendor_slug.strip().lower()
        self.root = VENDORS_BASE_DIR / self.slug
        self.builds_dir = self.root / "builds"
        self.branding_dir = self.root / "branding"
        self.credentials_dir = self.root / "credentials"
        self.data_dir = self.root / "data"

        # Automatically create isolated folder structure
        for d in [self.builds_dir, self.branding_dir, self.credentials_dir, self.data_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def save_branding(self, branding_data: Dict[str, Any]):
        """Save vendor logo, colors, and banner metadata."""
        file_path = self.branding_dir / "branding_config.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(branding_data, f, indent=2)
        return file_path

    def save_credentials(self, creds_data: Dict[str, Any]):
        """Save vendor OAuth Client ID, package name, SHA-1."""
        file_path = self.credentials_dir / "oauth_and_package.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(creds_data, f, indent=2)
        return file_path

    def get_build_destination(self, filename: str) -> Path:
        """Returns the isolated path for this vendor's APK or AAB."""
        return self.builds_dir / filename

    def get_summary(self) -> Dict[str, str]:
        return {
            "vendor_slug": self.slug,
            "root_path": str(self.root),
            "builds_path": str(self.builds_dir),
            "branding_path": str(self.branding_dir),
            "credentials_path": str(self.credentials_dir),
            "data_path": str(self.data_dir),
        }

def get_vendor_workspace(vendor_slug: str) -> VendorWorkspace:
    """Factory function for automated vendor workspace isolation."""
    return VendorWorkspace(vendor_slug)

if __name__ == "__main__":
    # Initialize workspace for Glam Stree Nails
    ws = get_vendor_workspace("glam-stree-nails")
    ws.save_credentials({
        "brand_name": "Glam stree nails",
        "vendor_slug": "glam-stree-nails",
        "android_package_name": "in.digitalgrowthstudio.glam_stree_nails",
        "google_oauth_client_id": "455814773569-dl1cglemkebqm3vdf5sb33t0lf7vqmc.apps.googleusercontent.com",
        "keystore_alias": "dgs-master-key",
        "keystore_sha1": "5F:53:67:62:97:02:79:9D:63:F9:AA:1B:DE:E1:42:DA:87:B0:C1:8E",
    })
    ws.save_branding({
        "brand_name": "Glam stree nails",
        "primary_color": "#0B192C",
        "secondary_color": "#DB2777",
        "accent_gold": "#D97706",
        "subdomain": "glam-stree-nails.digitalgrowthstudio.in",
        "support_phone": "7499904962",
    })
    print("Vendor workspace initialized successfully:")
    print(json.dumps(ws.get_summary(), indent=2))
