import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.ai_product_importer import fetch_product_raw_data, enhance_product_with_gemini

async def main():
    url = "https://www.amazon.in/BRUTON-852-Synthetic-Leather-Sports/dp/B0DKBRMRWC/ref"
    print(f"Testing Scraper on URL: {url}")
    raw = await fetch_product_raw_data(url)
    print("--- RAW SCRAPED DATA ---")
    print(f"Title: {raw.get('raw_title')}")
    print(f"Price: {raw.get('price')}, MRP: {raw.get('mrp')}")
    print(f"Colors ({len(raw.get('colors', []))}): {raw.get('colors')}")
    print(f"Sizes ({len(raw.get('sizes', []))}): {raw.get('sizes')}")
    print(f"Features count: {len(raw.get('features', []))}")
    for idx, f in enumerate(raw.get('features', [])[:5]):
        print(f"  Feature {idx+1}: {f}")
    print(f"Specifications count: {len(raw.get('specifications', {}))}")
    for k, v in list(raw.get('specifications', {}).items())[:6]:
        print(f"  Spec {k}: {v}")
    print(f"Images count: {len(raw.get('images', []))}")
    for img in raw.get('images', [])[:3]:
        print(f"  Image: {img}")

    print("\n--- ENHANCED GEMINI / D2C DATA ---")
    enhanced = await enhance_product_with_gemini(raw)
    print(f"Enhanced Title: {enhanced.get('title')}")
    print(f"Category: {enhanced.get('category')}")
    print(f"Selling Price: {enhanced.get('selling_price')}, MRP: {enhanced.get('mrp')}")
    print(f"Variants count: {len(enhanced.get('variants', []))}")
    for var in enhanced.get('variants', [])[:5]:
        print(f"  Variant: {var}")
    print(f"Description HTML preview (first 300 chars):\n{enhanced.get('description_html', '')[:300]}")

if __name__ == "__main__":
    asyncio.run(main())

