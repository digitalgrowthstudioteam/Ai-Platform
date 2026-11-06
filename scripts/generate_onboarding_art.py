"""
Generate Onboarding Grocery Illustration for Screen 1
"""
from PIL import Image, ImageDraw, ImageFont
import os
from pathlib import Path

ASSETS_DIR = Path(r"D:\App\Digital Growth Studio\mobile_app\assets\images")

def generate_onboarding_art():
    w, h = 600, 600
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background soft glow
    draw.ellipse([(60, 60), (540, 540)], fill=(234, 242, 235, 255))

    # Paper Grocery Bag
    bag_pts = [
        (180, 260),
        (420, 260),
        (400, 520),
        (200, 520),
    ]
    draw.polygon(bag_pts, fill=(210, 166, 121)) # Kraft brown paper
    # Bag folds & shadow
    draw.polygon([(180, 260), (220, 260), (210, 520), (200, 520)], fill=(195, 150, 105))
    draw.polygon([(380, 260), (420, 260), (400, 520), (390, 520)], fill=(185, 140, 95))
    
    # Fresh Produce emerging from bag:
    # 1. Fresh Lettuce / Greens (top left)
    draw.ellipse([(140, 180), (260, 280)], fill=(74, 222, 128)) # Light green
    draw.ellipse([(170, 150), (290, 250)], fill=(34, 197, 94))  # Emerald
    draw.ellipse([(220, 140), (320, 240)], fill=(22, 163, 74))  # Dark green
    
    # 2. Carrot (orange) sticking out top right
    carrot_pts = [(360, 270), (410, 130), (435, 140), (380, 270)]
    draw.polygon(carrot_pts, fill=(249, 115, 22))
    # Carrot green top
    draw.polygon([(410, 130), (420, 80), (430, 135)], fill=(34, 197, 94))
    draw.polygon([(420, 130), (440, 75), (435, 135)], fill=(74, 222, 128))

    # 3. Ripe Tomatoes (red)
    draw.ellipse([(270, 210), (360, 295)], fill=(239, 68, 68)) # Red tomato
    # Leaf stem on tomato
    draw.polygon([(310, 210), (305, 195), (320, 205), (325, 195)], fill=(22, 163, 74))
    
    draw.ellipse([(330, 230), (400, 300)], fill=(220, 38, 38)) # Second tomato

    # 4. Broccoli (deep forest green with florets)
    draw.ellipse([(220, 190), (300, 265)], fill=(21, 128, 61))
    draw.ellipse([(235, 175), (285, 225)], fill=(34, 197, 94))

    # 5. Golden Wheat / Baguette sticking out
    baguette = [(310, 250), (340, 90), (370, 95), (335, 250)]
    draw.polygon(baguette, fill=(234, 179, 8))

    # Cute Fresh N Fast brand stamp on the kraft bag
    try:
        font = ImageFont.truetype("C:\\Windows\\Fonts\\segoeuib.ttf", 26)
    except Exception:
        font = ImageFont.load_default()
    
    stamp_box = [(230, 370), (370, 430)]
    draw.rounded_rectangle(stamp_box, radius=12, outline=(140, 95, 55), width=3)
    draw.text((246, 385), "FRESH N FAST", font=font, fill=(140, 95, 55))

    out_path = ASSETS_DIR / "onboarding_grocery.png"
    img.save(out_path, "PNG")
    print(f"Generated onboarding illustration: {out_path}")

if __name__ == "__main__":
    generate_onboarding_art()

