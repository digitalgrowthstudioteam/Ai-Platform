import asyncio, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.ai_product_importer import fetch_product_raw_data, enhance_product_with_gemini

async def test_url(name: str, url: str):
    print(f"\n{'='*20} TESTING {name} {'='*20}")
    print("URL:", url)
    raw = await fetch_product_raw_data(url)
    print("RAW EXTRACTION:")
    print(f"  Title: {raw.get('raw_title')}")
    print(f"  Brand: {raw.get('brand')}")
    print(f"  Price: {raw.get('price')} (MRP: {raw.get('mrp')})")
    print(f"  Images: {len(raw.get('images', []))} images")
    if raw.get('images'):
        print(f"    First: {raw['images'][0]}")
    print(f"  Colors: {raw.get('colors')}")
    print(f"  Sizes: {raw.get('sizes')}")
    print(f"  Features: {len(raw.get('features', []))} features")
    
    enhanced = await enhance_product_with_gemini(raw)
    print("ENHANCED PRODUCT:")
    print(f"  Title: {enhanced.get('title')}")
    print(f"  Category: {enhanced.get('category')}")
    print(f"  Price: {enhanced.get('selling_price')} (MRP: {enhanced.get('mrp')})")
    print(f"  Variants: {len(enhanced.get('variants', []))} variants -> {[v['name'] for v in enhanced.get('variants', [])[:4]]}")
    print(f"  Images count: {len(enhanced.get('images', []))}")
    print(f"  Has rich desc HTML: {len(enhanced.get('description_html', '')) > 50}")

async def main():
    # 1. Flipkart
    fk_url = "https://www.flipkart.com/haier-6-5-kg-fully-automatic-top-load-washing-machine-silver/p/itm4f8d1cff8daf5?pid=WMNHPCWSYZWZCEKR"
    await test_url("FLIPKART", fk_url)
    
    # 2. Meesho
    meesho_url = "https://www.meesho.com/hoppup-xo3-gaming-earbuds-with-35ms-low-latency-13mm-drivers-50h-playtime-bluetooth-headset-black-true-wireless/p/6rupee"
    await test_url("MEESHO", meesho_url)

    # 3. Amazon
    amazon_url = "https://www.amazon.in/BRUTON-852-Synthetic-Leather-Sports/dp/B0DKBRMRWC/ref"
    await test_url("AMAZON", amazon_url)

    # 4. Shopify Store
    shopify_url = "https://www.boat-lifestyle.com/products/rockerz-450"
    await test_url("SHOPIFY", shopify_url)

if __name__ == "__main__":
    asyncio.run(main())

