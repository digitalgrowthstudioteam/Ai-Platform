"""
Digital Growth Studio — AI 1-Click Product Importer Service
Scrapes e-commerce links (Amazon, Flipkart, Meesho, Shopify, WooCommerce) and enhances
titles, descriptions, pricing, and variants using Google Gemini 1.5 Flash.
"""
import re
import json
import uuid
import structlog
import httpx
from bs4 import BeautifulSoup
from typing import Dict, Any, List, Optional
from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def _extract_json_ld(soup: BeautifulSoup) -> List[dict]:
    """Extract all JSON-LD structured data blocks from page."""
    items = []
    scripts = soup.find_all("script", type="application/ld+json")
    for s in scripts:
        if not s.string:
            continue
        try:
            data = json.loads(s.string.strip())
            if isinstance(data, list):
                items.extend(data)
            elif isinstance(data, dict):
                if "@graph" in data and isinstance(data["@graph"], list):
                    items.extend(data["@graph"])
                else:
                    items.append(data)
        except Exception:
            continue
    return items


def _find_product_in_json_ld(items: List[dict]) -> Optional[dict]:
    """Find the main Product item in JSON-LD."""
    for item in items:
        item_type = item.get("@type")
        if item_type == "Product" or (isinstance(item_type, list) and "Product" in item_type):
            return item
    return None


async def fetch_product_raw_data(url: str) -> Dict[str, Any]:
    """Fetch and scrape basic raw product data from any e-commerce link."""
    # Validate URL
    cleaned_url = url.strip()
    if not cleaned_url.startswith(("http://", "https://")):
        cleaned_url = f"https://{cleaned_url}"

    async with httpx.AsyncClient(timeout=18.0, follow_redirects=True, headers=BROWSER_HEADERS) as client:
        resp = await client.get(cleaned_url)
        if resp.status_code >= 400:
            logger.warning("scrape_request_non_200", status=resp.status_code, url=cleaned_url)
        html = resp.text

    soup = BeautifulSoup(html, "html.parser")
    json_ld_items = _extract_json_ld(soup)
    product_ld = _find_product_in_json_ld(json_ld_items)

    title = ""
    description = ""
    price = 0.0
    mrp = 0.0
    brand = ""
    images = []
    features = []

    # 1. Parse JSON-LD if present (Shopify, Amazon, WooCommerce)
    if product_ld:
        title = product_ld.get("name") or ""
        description = product_ld.get("description") or ""
        raw_brand = product_ld.get("brand")
        if isinstance(raw_brand, dict):
            brand = raw_brand.get("name", "")
        elif isinstance(raw_brand, str):
            brand = raw_brand

        # Images
        raw_images = product_ld.get("image")
        if isinstance(raw_images, list):
            for img in raw_images:
                if isinstance(img, str) and img.startswith("http"):
                    images.append(img)
                elif isinstance(img, dict) and img.get("url"):
                    images.append(img["url"])
        elif isinstance(raw_images, str) and raw_images.startswith("http"):
            images.append(raw_images)

        # Offers / Price
        offers = product_ld.get("offers")
        if isinstance(offers, dict):
            try:
                price = float(offers.get("price") or 0.0)
            except Exception:
                pass
        elif isinstance(offers, list) and len(offers) > 0:
            try:
                price = float(offers[0].get("price") or 0.0)
            except Exception:
                pass

    # 2. OpenGraph Fallback
    if not title:
        og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "twitter:title"})
        if og_title and og_title.get("content"):
            title = og_title["content"].strip()

    if not description:
        og_desc = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "twitter:description"})
        if og_desc and og_desc.get("content"):
            description = og_desc["content"].strip()

    og_image = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "twitter:image"})
    if og_image and og_image.get("content") and og_image["content"] not in images:
        images.insert(0, og_image["content"].strip())

    # 3. Amazon-specific Fallbacks
    if "amazon" in cleaned_url.lower():
        title_el = soup.find(id="productTitle")
        if title_el:
            title = title_el.get_text(strip=True)

        bullets_el = soup.find(id="feature-bullets")
        if bullets_el:
            for li in bullets_el.find_all("li"):
                t = li.get_text(strip=True)
                if t and not t.lower().startswith("make sure this fits"):
                    features.append(t)

        # Amazon Dynamic High-Res Images JSON
        landing_img = soup.find(id="landingImage")
        if landing_img and landing_img.get("data-a-dynamic-image"):
            try:
                dyn_dict = json.loads(landing_img["data-a-dynamic-image"])
                for img_url in dyn_dict.keys():
                    if img_url not in images:
                        images.append(img_url)
            except Exception:
                pass

        # Amazon Price
        price_el = soup.find("span", class_="a-price-whole")
        if price_el:
            clean_p = re.sub(r"[^\d.]", "", price_el.get_text(strip=True))
            if clean_p:
                try:
                    price = float(clean_p)
                except Exception:
                    pass

        mrp_el = soup.find("span", class_="a-text-price")
        if mrp_el:
            clean_m = re.sub(r"[^\d.]", "", mrp_el.get_text(strip=True))
            if clean_m:
                try:
                    mrp = float(clean_m)
                except Exception:
                    pass

    # 4. Flipkart-specific Fallbacks
    if "flipkart" in cleaned_url.lower():
        f_title = soup.find("span", class_="B_NuCI") or soup.find("h1", class_="cPHDOP")
        if f_title:
            title = f_title.get_text(strip=True)

        f_price = soup.find("div", class_="_30jeq3")
        if f_price:
            clean_p = re.sub(r"[^\d.]", "", f_price.get_text(strip=True))
            if clean_p:
                try:
                    price = float(clean_p)
                except Exception:
                    pass

        f_mrp = soup.find("div", class_="_3I9_wc")
        if f_mrp:
            clean_m = re.sub(r"[^\d.]", "", f_mrp.get_text(strip=True))
            if clean_m:
                try:
                    mrp = float(clean_m)
                except Exception:
                    pass

        # Flipkart thumbnails
        for f_img in soup.find_all("img", class_=["_0DkuPH", "_396cs4"]):
            src = f_img.get("src")
            if src and src.startswith("http") and "placeholder" not in src:
                # Upscale Flipkart thumbnail to 800px
                hires = re.sub(r"/image/\d+/\d+/", "/image/832/832/", src)
                if hires not in images:
                    images.append(hires)

    # 5. Generic page title fallback
    if not title and soup.title:
        title = soup.title.get_text(strip=True)

    # Deduplicate images
    clean_images = []
    seen = set()
    for img in images:
        if img and img not in seen:
            seen.add(img)
            clean_images.append(img)

    return {
        "source_url": cleaned_url,
        "raw_title": title[:300].strip(),
        "raw_description": description[:3000].strip(),
        "brand": brand[:100].strip(),
        "price": price,
        "mrp": mrp if mrp > price else price,
        "images": clean_images[:10],
        "features": features[:8],
    }


async def enhance_product_with_gemini(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call Gemini 1.5 Flash to clean marketplace text, extract variants,
    generate a high-converting D2C product title, description, and suggested category.
    """
    api_key = settings.resolved_api_key
    model_name = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")

    system_prompt = (
        "You are an expert e-commerce catalog specialist and copywriter for direct-to-consumer online brands.\n"
        "Your job is to take raw, messy scraped product details from marketplaces like Amazon or Flipkart and format "
        "them into a clean, compelling, professional product listing for an independent store.\n\n"
        "STRICT RULES:\n"
        "1. Remove ALL marketplace watermarks/branding: 'Amazon', 'Amazon's Choice', 'Fulfilled by Amazon', 'Flipkart Assured', 'Best Seller', warranty mentions.\n"
        "2. Generate an SEO-friendly, catchy, concise product title (max 90 chars).\n"
        "3. Generate a rich, formatted description with bullet points (Features, Material/Build, What's in the Box).\n"
        "4. Suggest a clean store category name (e.g., 'Groceries & Essentials', 'Men\\'s Apparel', 'Electronics', 'Footwear', 'Home Decor').\n"
        "5. Detect standard variants if implied (e.g. standard garment sizes: S, M, L, XL or pack sizes: 500g, 1kg).\n"
        "6. Return ONLY a valid JSON object matching the requested schema. No code fences, no extra commentary."
    )

    user_payload = {
        "title": raw_data.get("raw_title"),
        "description": raw_data.get("raw_description"),
        "features": raw_data.get("features"),
        "brand": raw_data.get("brand"),
        "detected_price": raw_data.get("price"),
        "detected_mrp": raw_data.get("mrp"),
    }

    schema_format = {
        "title": "Optimized Product Title",
        "category": "Suggested Category",
        "description_html": "<p>Overview paragraph...</p><ul><li>Feature 1</li><li>Feature 2</li></ul>",
        "short_description": "Catchy 1-line product punchline",
        "selling_price": raw_data.get("price") or 499.0,
        "mrp": raw_data.get("mrp") or 999.0,
        "variants": [
            {"name": "Default / Regular", "sku_suffix": "REG", "price_diff": 0.0, "stock": 50}
        ],
        "tags": ["Tag1", "Tag2"],
    }

    full_prompt = (
        f"Input Product Data:\n{json.dumps(user_payload, indent=2)}\n\n"
        f"Please output a JSON object adhering to this structure:\n{json.dumps(schema_format, indent=2)}"
    )

    # 1. Call Gemini REST API directly if API key available
    if api_key:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_prompt}\n\n{full_prompt}"}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            }
        }
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, json=body)
                if res.status_code == 200:
                    resp_json = res.json()
                    candidates = resp_json.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        raw_text = candidates[0]["content"]["parts"][0]["text"].strip()
                        # Clean potential markdown fences
                        raw_text = re.sub(r"^```json\s*", "", raw_text)
                        raw_text = re.sub(r"\s*```$", "", raw_text)
                        parsed = json.loads(raw_text)
                        logger.info("gemini_product_enhanced_successfully", title=parsed.get("title"))
                        return {
                            **parsed,
                            "images": raw_data.get("images", []),
                            "source_url": raw_data.get("source_url"),
                        }
                else:
                    logger.warning("gemini_api_returned_error", status=res.status_code, text=res.text)
        except Exception as e:
            logger.error("gemini_call_exception_using_fallback", error=str(e))

    # 2. Robust Local Fallback (runs if Gemini is offline or quota reached)
    clean_title = re.sub(r"(?i)(Amazon\s*Brand\s*-\s*|Flipkart\s*SmartBuy\s*-\s*|\s*\|.*$|\s*-.*$)", "", raw_data.get("raw_title") or "Imported Product").strip()
    raw_desc = raw_data.get("raw_description") or ""
    bullet_items = "".join([f"<li>{f}</li>" for f in raw_data.get("features", [])])
    desc_html = f"<p>{raw_desc[:400]}</p>"
    if bullet_items:
        desc_html += f"<h4>Product Highlights:</h4><ul>{bullet_items}</ul>"

    return {
        "title": clean_title[:100] or "Quality E-Commerce Item",
        "category": "General",
        "description_html": desc_html,
        "short_description": clean_title[:120],
        "selling_price": raw_data.get("price") or 499.0,
        "mrp": raw_data.get("mrp") or 999.0,
        "variants": [
            {"name": "Standard", "sku_suffix": "STD", "price_diff": 0.0, "stock": 50}
        ],
        "tags": ["Featured", "New Arrival"],
        "images": raw_data.get("images", []),
        "source_url": raw_data.get("source_url"),
    }
