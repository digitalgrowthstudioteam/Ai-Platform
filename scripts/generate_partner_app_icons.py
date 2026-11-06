import os
from pathlib import Path
from PIL import Image

SRC_LOGO = Path(r"C:\Users\vikra\.gemini\antigravity\brain\5c7171d9-f407-4d87-a3f6-399deef22896\.user_uploaded\media_1793972243134_046a1f3b.png")
PARTNER_APP_DIR = Path(r"D:\App\Digital Growth Studio\partner_app")
RES_DIR = PARTNER_APP_DIR / "android" / "app" / "src" / "main" / "res"
ASSETS_DIR = PARTNER_APP_DIR / "assets" / "images"
WEB_DIR = PARTNER_APP_DIR / "web"
WEB_ICONS_DIR = WEB_DIR / "icons"
VENDORS_PARTNER_DIR = Path(r"D:\App\Digital Growth Studio\vendors\partner-app\branding")

# Ensure directories exist
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
WEB_ICONS_DIR.mkdir(parents=True, exist_ok=True)
VENDORS_PARTNER_DIR.mkdir(parents=True, exist_ok=True)

# 1. Load source logo
src_img = Image.open(SRC_LOGO).convert("RGBA")
print(f"Loaded source logo: {src_img.size}")

# Save in assets
src_img.save(ASSETS_DIR / "dgs_logo.png", "PNG")
src_img.save(VENDORS_PARTNER_DIR / "app_icon_512.png", "PNG")
print("Saved dgs_logo.png in assets and vendors branding")

# Helper to create launcher icon with white/transparent background padding
def make_launcher_icon(size, is_round=False):
    # Standard Android icon recommendation: 10-15% padding
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255) if is_round else (0, 0, 0, 0))
    pad = int(size * 0.1)
    inner_size = size - 2 * pad
    resized_logo = src_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    canvas.paste(resized_logo, (pad, pad), resized_logo)
    
    if is_round:
        # Create circular mask
        from PIL import ImageDraw
        mask = Image.new("L", (size, size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size - 1, size - 1), fill=255)
        # Apply mask
        canvas.putalpha(mask)
        
    return canvas

# 2. Android launcher densities
android_densities = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

for folder, size in android_densities.items():
    fdir = RES_DIR / folder
    fdir.mkdir(parents=True, exist_ok=True)
    
    # Square / transparent
    icon = make_launcher_icon(size, is_round=False)
    icon.save(fdir / "ic_launcher.png", "PNG")
    
    # Round icon
    round_icon = make_launcher_icon(size, is_round=True)
    round_icon.save(fdir / "ic_launcher_round.png", "PNG")
    print(f"Saved {folder} launcher icons ({size}x{size})")

# 3. Web icons & Favicon
fav = src_img.resize((64, 64), Image.Resampling.LANCZOS)
fav.save(WEB_DIR / "favicon.png", "PNG")

icon_192 = src_img.resize((192, 192), Image.Resampling.LANCZOS)
icon_192.save(WEB_ICONS_DIR / "Icon-192.png", "PNG")
icon_192.save(WEB_ICONS_DIR / "Icon-maskable-192.png", "PNG")

icon_512 = src_img.resize((512, 512), Image.Resampling.LANCZOS)
icon_512.save(WEB_ICONS_DIR / "Icon-512.png", "PNG")
icon_512.save(WEB_ICONS_DIR / "Icon-maskable-512.png", "PNG")

print("All icons and favicons generated successfully!")

