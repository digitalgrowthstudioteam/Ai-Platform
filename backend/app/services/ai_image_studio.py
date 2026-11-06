"""
Digital Growth Studio — AI Image Studio Service (Phase 2)
Transforms standard product photos into studio-grade e-commerce assets:
- Auto subject centering and aspect ratio framing (1:1 square)
- Background replacement with 4 studio aesthetics:
  * studio-white: Clean #FFFFFF with realistic soft ground contact shadow
  * minimal-marble: Luxury Carrara marble base with soft ambient lighting
  * modern-pastel: Warm cream / champagne pastel studio gradient
  * luxury-dark: Sleek slate charcoal with radial spotlight highlight
- Color vibrance, contrast, and sharpness enhancement
- Edge feathering and soft drop shadows
"""
import io
import re
import math
import httpx
import uuid
import structlog
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw, ImageOps
from typing import Optional, Dict, Any, Tuple

from app.services.bunny_storage import bunny_storage

logger = structlog.get_logger()

# Canvas dimensions
CANVAS_SIZE = 1000
MARGIN_RATIO = 0.12  # 12% margin around product


def _download_image(image_url: str) -> Image.Image:
    """Download image from URL or parse base64."""
    if image_url.startswith("data:image"):
        import base64
        header, encoded = image_url.split(",", 1)
        data = base64.b64decode(encoded)
        return Image.open(io.BytesIO(data)).convert("RGBA")

    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
        resp = client.get(image_url)
        resp.raise_for_status()
        return Image.open(io.BytesIO(resp.content)).convert("RGBA")


def _extract_product_foreground(img: Image.Image) -> Image.Image:
    """
    Detect product foreground, remove plain/white/solid background,
    and crop bounding box with smooth anti-aliased alpha.
    """
    rgba = img.convert("RGBA")
    w, h = rgba.size
    np_img = np.array(rgba)

    # Check corners to estimate background color
    corners = [
        np_img[0, 0, :3],
        np_img[0, -1, :3],
        np_img[-1, 0, :3],
        np_img[-1, -1, :3],
    ]
    bg_color = np.median(corners, axis=0)

    # If already has alpha transparency with significant clear pixels, respect existing alpha
    alpha = np_img[:, :, 3]
    if np.mean(alpha < 240) > 0.05:
        # Existing transparent PNG
        mask = alpha
    else:
        # Calculate color distance from estimated background
        diff = np.sqrt(np.sum((np_img[:, :, :3].astype(np.float32) - bg_color.astype(np.float32)) ** 2, axis=2))
        
        # If background is near-white or uniform
        threshold = 28.0
        mask = np.clip((diff - threshold) * (255.0 / 25.0), 0, 255).astype(np.uint8)

    # Convert mask to PIL for smoothing and bounding box
    mask_pil = Image.fromarray(mask, mode="L")
    mask_pil = mask_pil.filter(ImageFilter.GaussianBlur(radius=1.2))

    # Apply alpha mask
    r, g, b, _ = rgba.split()
    cutout = Image.merge("RGBA", (r, g, b, mask_pil))

    # Get bounding box of foreground
    bbox = cutout.getbbox()
    if bbox:
        # Expand bbox slightly to not clip product edges
        pad = 4
        left = max(0, bbox[0] - pad)
        top = max(0, bbox[1] - pad)
        right = min(w, bbox[2] + pad)
        bottom = min(h, bbox[3] + pad)
        cutout = cutout.crop((left, top, right, bottom))

    return cutout


def _create_studio_backdrop(style: str, width: int, height: int) -> Image.Image:
    """Generate professional studio backdrops."""
    canvas = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(canvas)

    if style == "studio-white":
        # Pure studio white with very subtle top-to-bottom soft vignette
        for y in range(height):
            v = int(255 - (y / height) * 4)  # 255 down to 251
            draw.line([(0, y), (width, y)], fill=(v, v, v, 255))

    elif style == "minimal-marble":
        # Luxury marble background: soft warm off-white with smooth marble pedestal floor
        # Upper wall: subtle gradient
        split_y = int(height * 0.72)
        for y in range(split_y):
            ratio = y / split_y
            val = int(248 - ratio * 10)
            draw.line([(0, y), (width, y)], fill=(val, val + 1, val + 2, 255))

        # Pedestal / Floor: crisp horizontal marble tone
        for y in range(split_y, height):
            ratio = (y - split_y) / (height - split_y)
            val = int(235 - ratio * 12)
            draw.line([(0, y), (width, y)], fill=(val, val, val + 1, 255))

        # Subtle elegant line separating wall and floor
        draw.line([(0, split_y), (width, split_y)], fill=(215, 218, 222, 255), width=2)

    elif style == "modern-pastel":
        # Warm aesthetic cream / champagne / blush gradient
        for y in range(height):
            ratio = y / height
            r = int(250 - ratio * 12)
            g = int(246 - ratio * 14)
            b = int(240 - ratio * 18)
            draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

        # Soft radial warm glow in center
        glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        cx, cy = width // 2, int(height * 0.48)
        glow_draw.ellipse([cx - 380, cy - 380, cx + 380, cy + 380], fill=(255, 253, 248, 65))
        glow = glow.filter(ImageFilter.GaussianBlur(radius=80))
        canvas = Image.alpha_composite(canvas, glow)

    elif style == "luxury-dark":
        # Moody dark slate / obsidian with focused radial spotlight
        for y in range(height):
            ratio = y / height
            v = int(26 + ratio * 14)  # #1A1A24 to #282836
            draw.line([(0, y), (width, y)], fill=(v, v + 2, v + 8, 255))

        # Radial spotlight centered behind product
        spotlight = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        spot_draw = ImageDraw.Draw(spotlight)
        cx, cy = width // 2, int(height * 0.46)
        spot_draw.ellipse([cx - 340, cy - 340, cx + 340, cy + 340], fill=(70, 78, 98, 90))
        spotlight = spotlight.filter(ImageFilter.GaussianBlur(radius=70))
        canvas = Image.alpha_composite(canvas, spotlight)

    else:
        # Default fallback: pure clean white
        canvas = Image.new("RGBA", (width, height), (255, 255, 255, 255))

    return canvas


def _render_drop_shadow(product_w: int, product_h: int, canvas_w: int, canvas_h: int, style: str) -> Image.Image:
    """Render realistic soft directional contact & ground shadow under product."""
    shadow_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow_layer)

    shadow_w = int(product_w * 0.85)
    shadow_h = max(24, int(product_h * 0.12))
    cx = canvas_w // 2
    ground_y = int(canvas_h * 0.82)

    # Shadow opacity and tint based on style
    if style == "luxury-dark":
        shadow_color = (0, 0, 0, 160)
        blur_rad = 18
    elif style == "modern-pastel":
        shadow_color = (130, 115, 105, 75)
        blur_rad = 22
    elif style == "minimal-marble":
        shadow_color = (100, 105, 115, 65)
        blur_rad = 20
    else:  # studio-white
        shadow_color = (70, 70, 75, 55)
        blur_rad = 24

    # Draw contact ellipse
    draw.ellipse(
        [cx - shadow_w // 2, ground_y - shadow_h // 2, cx + shadow_w // 2, ground_y + shadow_h // 2],
        fill=shadow_color
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=blur_rad))

    # Tighter contact shadow directly under the product base for depth
    tight_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    tight_draw = ImageDraw.Draw(tight_layer)
    tight_w = int(product_w * 0.6)
    tight_h = max(10, int(product_h * 0.05))
    tight_draw.ellipse(
        [cx - tight_w // 2, ground_y - tight_h // 2, cx + tight_w // 2, ground_y + tight_h // 2],
        fill=(shadow_color[0], shadow_color[1], shadow_color[2], min(255, int(shadow_color[3] * 1.5)))
    )
    tight_layer = tight_layer.filter(ImageFilter.GaussianBlur(radius=8))

    return Image.alpha_composite(shadow_layer, tight_layer)


async def enhance_product_image_studio(
    image_url: str,
    style: str = "studio-white",
    vendor_id: Optional[str] = None,
    badge_text: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main entry point for AI Image Studio.
    Downloads, extracts subject, applies studio backdrop & shadows, enhances colors,
    and uploads to CDN storage.
    """
    style_clean = (style or "studio-white").lower().strip()
    if style_clean not in ["studio-white", "minimal-marble", "modern-pastel", "luxury-dark"]:
        style_clean = "studio-white"

    logger.info("ai_image_studio_processing_start", style=style_clean, url=image_url[:80])

    # 1. Download image
    raw_img = _download_image(image_url)

    # 2. Extract foreground product cutout
    cutout = _extract_product_foreground(raw_img)

    # 3. Enhance product vibrancy and clarity
    rgb_part = cutout.convert("RGB")
    alpha_part = cutout.split()[3]

    # Mild color & contrast pop
    enh_color = ImageEnhance.Color(rgb_part).enhance(1.08)
    enh_contrast = ImageEnhance.Contrast(enh_color).enhance(1.06)
    enh_sharpness = ImageEnhance.Sharpness(enh_contrast).enhance(1.18)
    enhanced_cutout = Image.merge("RGBA", (*enh_sharpness.split(), alpha_part))

    # 4. Fit product within target canvas size preserving aspect ratio
    max_w = int(CANVAS_SIZE * (1.0 - 2 * MARGIN_RATIO))
    max_h = int(CANVAS_SIZE * (1.0 - 2 * MARGIN_RATIO))

    pw, ph = enhanced_cutout.size
    scale = min(max_w / pw, max_h / ph)
    new_pw = max(1, int(pw * scale))
    new_ph = max(1, int(ph * scale))
    scaled_product = enhanced_cutout.resize((new_pw, new_ph), Image.Resampling.LANCZOS)

    # 5. Generate Studio Backdrop
    backdrop = _create_studio_backdrop(style_clean, CANVAS_SIZE, CANVAS_SIZE)

    # 6. Generate Realistic Ground Shadow
    shadow = _render_drop_shadow(new_pw, new_ph, CANVAS_SIZE, CANVAS_SIZE, style_clean)
    composite = Image.alpha_composite(backdrop, shadow)

    # 7. Position Product centered horizontally and resting on ground plane
    ground_y = int(CANVAS_SIZE * 0.82)
    pos_x = (CANVAS_SIZE - new_pw) // 2
    pos_y = ground_y - new_ph + int(new_ph * 0.05)  # slight overlap with ground shadow for realism
    pos_y = max(int(CANVAS_SIZE * MARGIN_RATIO), min(pos_y, CANVAS_SIZE - new_ph - 20))

    composite.alpha_composite(scaled_product, (pos_x, pos_y))

    # 8. Optional store badge watermark (e.g. "D2C Certified", "Premium Studio")
    if badge_text:
        badge_layer = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
        b_draw = ImageDraw.Draw(badge_layer)
        badge_w, badge_h = 160, 36
        bx, by = 40, 40
        b_draw.rounded_rectangle([bx, by, bx + badge_w, by + badge_h], radius=18, fill=(0, 0, 0, 180))
        b_draw.text((bx + 20, by + 10), badge_text[:18], fill=(255, 255, 255, 240))
        composite = Image.alpha_composite(composite, badge_layer)

    # 9. Export to optimized JPEG bytes
    final_rgb = composite.convert("RGB")
    buf = io.BytesIO()
    final_rgb.save(buf, format="JPEG", quality=92, optimize=True)
    out_bytes = buf.getvalue()

    # 10. Upload to Bunny CDN or fallback
    target_vid = vendor_id or "ai-studio"
    filename = f"studio_{style_clean}_{uuid.uuid4().hex[:8]}.jpg"
    upload_result = await bunny_storage.upload_file(
        vendor_id=str(target_vid),
        file_bytes=out_bytes,
        filename=filename,
        folder="studio_photos"
    )

    cdn_url = upload_result.get("url")
    logger.info("ai_image_studio_processing_completed", cdn_url=cdn_url[:80])

    return {
        "enhanced_image_url": cdn_url,
        "style": style_clean,
        "width": CANVAS_SIZE,
        "height": CANVAS_SIZE,
        "bytes": len(out_bytes),
    }
