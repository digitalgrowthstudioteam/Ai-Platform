"""
Generate high-resolution App Logo and Android Launcher Icons for Fresh N Fast
Uses just the Food/Store Name ("FRESH N FAST") with fresh green theme.
"""

from PIL import Image, ImageDraw, ImageFont
import os
from pathlib import Path

BASE_DIR = Path(r"D:\App\Digital Growth Studio\mobile_app")
RES_DIR = BASE_DIR / "android" / "app" / "src" / "main" / "res"
ASSETS_DIR = BASE_DIR / "assets" / "images"

# Colors
BG_GREEN = (21, 128, 61)       # #15803D Forest Green
DARK_GREEN = (22, 101, 52)     # #166534
LIGHT_MINT = (220, 252, 231)   # #DCFCE7
WHITE = (255, 255, 255)

def get_font(size, bold=True):
    font_names = [
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
    ]
    for fn in font_names:
        if os.path.exists(fn):
            try:
                return ImageFont.truetype(fn, size)
            except Exception:
                pass
    return ImageFont.load_default()

def draw_logo(size=512, is_round=False, is_foreground=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if not is_foreground:
        if is_round:
            draw.ellipse([(0, 0), (size, size)], fill=BG_GREEN)
            # Subtle inner ring
            draw.ellipse([(size * 0.04, size * 0.04), (size * 0.96, size * 0.96)], outline=(34, 197, 94, 180), width=int(size * 0.015))
        else:
            # Rounded rect or full bleed
            draw.rectangle([(0, 0), (size, size)], fill=BG_GREEN)
            # Subtle gradient or top highlight
            draw.rectangle([(0, 0), (size, int(size * 0.15))], fill=(34, 197, 94, 40))

    # Leaf decorative element above text
    leaf_w = size * 0.12
    cx = size / 2
    cy_leaf = size * 0.30 if not is_foreground else size * 0.35
    
    # Draw cute fresh leaf / sprout
    draw.polygon([
        (cx, cy_leaf - leaf_w),
        (cx + leaf_w * 0.8, cy_leaf - leaf_w * 0.2),
        (cx, cy_leaf + leaf_w * 0.5),
        (cx - leaf_w * 0.8, cy_leaf - leaf_w * 0.2),
    ], fill=LIGHT_MINT)
    # Leaf stem
    draw.line([(cx, cy_leaf - leaf_w), (cx, cy_leaf + leaf_w * 0.8)], fill=WHITE, width=max(2, int(size * 0.015)))

    # Main text: "FRESH"
    fresh_size = int(size * 0.20) if not is_foreground else int(size * 0.16)
    font_fresh = get_font(fresh_size, bold=True)
    bbox_fresh = draw.textbbox((0, 0), "FRESH", font=font_fresh)
    w_fresh = bbox_fresh[2] - bbox_fresh[0]
    h_fresh = bbox_fresh[3] - bbox_fresh[1]
    
    y_fresh = (size * 0.44) if not is_foreground else (size * 0.46)
    draw.text(((size - w_fresh) / 2, y_fresh), "FRESH", font=font_fresh, fill=WHITE)

    # Sub text: "N FAST"
    fast_size = int(size * 0.11) if not is_foreground else int(size * 0.09)
    font_fast = get_font(fast_size, bold=True)
    bbox_fast = draw.textbbox((0, 0), "N FAST", font=font_fast)
    w_fast = bbox_fast[2] - bbox_fast[0]
    
    y_fast = y_fresh + h_fresh + (size * 0.04)
    # Draw pill behind "N FAST"
    pad_x = size * 0.04
    pad_y = size * 0.015
    pill_box = [
        ((size - w_fast) / 2 - pad_x, y_fast - pad_y),
        ((size + w_fast) / 2 + pad_x, y_fast + (bbox_fast[3] - bbox_fast[1]) + pad_y)
    ]
    draw.rounded_rectangle(pill_box, radius=int(size * 0.03), fill=DARK_GREEN)
    draw.text(((size - w_fast) / 2, y_fast), "N FAST", font=font_fast, fill=LIGHT_MINT)

    return img

def generate_all():
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    logo_512 = draw_logo(512, is_round=False)
    logo_512.save(ASSETS_DIR / "logo.png", "PNG")
    print(f"Saved: {ASSETS_DIR / 'logo.png'}")

    # Android mipmaps
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    for folder, dim in densities.items():
        out_dir = RES_DIR / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        
        # 1. ic_launcher.png (square/rounded)
        img_sq = draw_logo(dim, is_round=False)
        img_sq.save(out_dir / "ic_launcher.png", "PNG")

        # 2. ic_launcher_round.png
        img_rnd = draw_logo(dim, is_round=True)
        img_rnd.save(out_dir / "ic_launcher_round.png", "PNG")

        # 3. ic_launcher_foreground.png (for adaptive icons, ~108dp on Android)
        fg_dim = int(dim * (108.0 / 48.0))
        img_fg = draw_logo(fg_dim, is_foreground=True)
        img_fg.save(out_dir / "ic_launcher_foreground.png", "PNG")
        print(f"Generated icons for {folder} ({dim}x{dim})")

if __name__ == "__main__":
    generate_all()

