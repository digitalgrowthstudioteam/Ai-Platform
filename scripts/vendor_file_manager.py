r"""
Digital Growth Studio — Automated Vendor File Isolation System
Ensures that all vendor-specific files (APKs, builds, branding assets, credentials, data)
are strictly isolated inside their own dedicated directory:
D:\App\Digital Growth Studio\vendors\<vendor_slug>\

Also automates:
1. Brand launcher icon generation for all Android mipmap densities (square + adaptive round).
2. MainActivity.kt generation matching the vendor's application package name.
Prevents any mixing or merging between different brands/stores.
"""
import os
import io
import json
import base64
import urllib.request
from pathlib import Path
from typing import Dict, Any

try:
    from PIL import Image, ImageDraw
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

ROOT_DIR = Path("D:/App/Digital Growth Studio")
VENDORS_BASE_DIR = ROOT_DIR / "vendors"
MOBILE_APP_DIR = ROOT_DIR / "mobile_app"

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

    def install_brand_icons(self, logo_source: str) -> bool:
        """
        Takes a base64 data URL or HTTP URL, saves the master 512x512 logo,
        and generates all Android mipmap densities (square + round adaptive)
        as well as Flutter bundled assets.
        """
        if not PIL_AVAILABLE or not logo_source:
            return False

        try:
            if logo_source.startswith("data:image"):
                header, b64_str = logo_source.split(",", 1)
                img_data = base64.b64decode(b64_str)
                base_img = Image.open(io.BytesIO(img_data)).convert("RGBA")
            elif logo_source.startswith("http"):
                req = urllib.request.Request(logo_source, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=15) as res:
                    base_img = Image.open(io.BytesIO(res.read())).convert("RGBA")
            else:
                return False

            # 1. Master 512x512 in vendor branding
            master_512 = base_img.resize((512, 512), Image.Resampling.LANCZOS)
            master_512.save(self.branding_dir / "app_icon_512.png", "PNG")

            # 2. Flutter bundled asset
            assets_dir = MOBILE_APP_DIR / "assets" / "images"
            assets_dir.mkdir(parents=True, exist_ok=True)
            master_512.save(assets_dir / "logo.png", "PNG")

            # 3. Android mipmap densities
            sizes = {
                "mipmap-mdpi": 48,
                "mipmap-hdpi": 72,
                "mipmap-xhdpi": 96,
                "mipmap-xxhdpi": 144,
                "mipmap-xxxhdpi": 192,
            }
            res_base = MOBILE_APP_DIR / "android" / "app" / "src" / "main" / "res"

            for folder, size in sizes.items():
                target_dir = res_base / folder
                target_dir.mkdir(parents=True, exist_ok=True)

                # Standard launcher icon
                resized = base_img.resize((size, size), Image.Resampling.LANCZOS)
                resized.save(target_dir / "ic_launcher.png", "PNG")

                # Round adaptive icon
                mask = Image.new("L", (size, size), 0)
                draw = ImageDraw.Draw(mask)
                draw.ellipse((0, 0, size, size), fill=255)
                round_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
                round_img.paste(resized, (0, 0), mask=mask)
                round_img.save(target_dir / "ic_launcher_round.png", "PNG")

            print(f"   ✓ Generated all Android launcher icons & assets for {self.slug}")
            return True
        except Exception as e:
            print(f"   ⚠ Failed to generate launcher icons: {e}")
            return False

    def setup_android_activity(self):
        """
        Creates the matching MainActivity.kt for this vendor's package ID
        so that the Android OS never encounters ClassNotFoundException.
        """
        pkg_slug = self.slug.replace("-", "_")
        target_dir = MOBILE_APP_DIR / "android" / "app" / "src" / "main" / "kotlin" / "in" / "digitalgrowthstudio" / pkg_slug
        target_dir.mkdir(parents=True, exist_ok=True)
        kt_file = target_dir / "MainActivity.kt"
        content = f"""package `in`.digitalgrowthstudio.{pkg_slug}

import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity()
"""
        with open(kt_file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"   ✓ Configured MainActivity for in.digitalgrowthstudio.{pkg_slug}")

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
