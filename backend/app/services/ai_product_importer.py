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
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.google.com/",
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

    html = ""
    async with httpx.AsyncClient(timeout=18.0, follow_redirects=True, headers=BROWSER_HEADERS) as client:
        try:
            resp = await client.get(cleaned_url)
            html = resp.text
        except Exception as e:
            logger.warning("scrape_request_primary_failed", error=str(e), url=cleaned_url)

    # If blocked by captcha, anti-bot challenge or empty response, fallback to social crawler user-agent (widely whitelisted by Amazon & Flipkart for link unfurls)
    if not html or len(html) < 8000 or "validateCaptcha" in html or ("amazon" in cleaned_url.lower() and "productTitle" not in html and "landingImage" not in html):
        logger.info("attempting_social_crawler_fallback", url=cleaned_url)
        fb_headers = {
            "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        try:
            async with httpx.AsyncClient(timeout=18.0, follow_redirects=True, headers=fb_headers) as client:
                fb_resp = await client.get(cleaned_url)
                if len(fb_resp.text) > len(html):
                    html = fb_resp.text
        except Exception as e:
            logger.warning("scrape_fallback_failed", error=str(e))

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
    specifications = {}
    colors = []
    sizes = []

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

        # Amazon "About this item" bullet points (Modern and classic selectors)
        about_h = soup.find(lambda el: el.name in ["h1", "h2", "h3", "h4"] and "about this item" in el.get_text().lower())
        if about_h:
            parent = about_h.find_parent()
            if parent:
                for li in parent.find_all("li"):
                    t = li.get_text(strip=True)
                    if t and not t.lower().startswith("make sure this fits") and t not in features:
                        features.append(t)
        if not features:
            bullets_el = soup.find(id="feature-bullets") or soup.find(id="featurebullets_feature_div")
            if bullets_el:
                for li in bullets_el.find_all("li"):
                    t = li.get_text(strip=True)
                    if t and not t.lower().startswith("make sure this fits") and t not in features:
                        features.append(t)

        # Amazon Product Overview / Specifications
        overview = soup.find(id="productOverview_feature_div")
        if overview:
            for tr in overview.find_all("tr"):
                tds = tr.find_all(["td", "th"])
                if len(tds) >= 2:
                    k = tds[0].get_text(strip=True)
                    v = tds[1].get_text(strip=True)
                    if k and v and len(k) < 50 and len(v) < 150:
                        specifications[k] = v

        for tr in soup.find_all("tr"):
            th = tr.find(["th", "td"], class_=re.compile(r"a-color-secondary|prodDetSectionEntry|label", re.I))
            td = tr.find("td", class_=re.compile(r"prodDetAttrValue|value", re.I))
            if th and td and th != td:
                k = th.get_text(strip=True)
                v = td.get_text(strip=True)
                if k and v and len(k) < 40 and len(v) < 120 and not k.isdigit():
                    if k not in specifications:
                        specifications[k] = v

        # Amazon Sizes & Colors Variations (From script variationValues JSON)
        m_var = re.search(r'"variationValues"\s*:\s*(\{[^}]+\})', html)
        if m_var:
            try:
                v_dict = json.loads(m_var.group(1))
                for vk, vlist in v_dict.items():
                    if isinstance(vlist, list):
                        if "color" in vk.lower():
                            for c in vlist:
                                if c not in colors:
                                    colors.append(c)
                        elif "size" in vk.lower():
                            for s in vlist:
                                if s not in sizes:
                                    sizes.append(s)
            except Exception:
                pass

        if not colors:
            c_div = soup.find(id=re.compile(r"color_name", re.I))
            if c_div:
                for img in c_div.find_all("img"):
                    alt = img.get("alt")
                    if alt and alt not in colors:
                        colors.append(alt)

        if not sizes:
            s_div = soup.find(id=re.compile(r"size_name", re.I))
            if s_div:
                for el in s_div.find_all(["span", "option"]):
                    txt = el.get_text(strip=True)
                    if txt and not any(skip in txt.lower() for skip in ["select", "size", "make a", "chart"]):
                        if txt not in sizes and len(txt) <= 15:
                            sizes.append(txt)

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
        if not images and landing_img and landing_img.get("src"):
            images.append(landing_img["src"])

        # Deep regex extraction for Amazon product imagery in page
        found_imgs = re.findall(r'https://m\.media-amazon\.com/images/I/[A-Za-z0-9+_-]+\.jpg', html)
        for fi in found_imgs:
            if not any(x in fi for x in ["_SS", "_SX38_", "_AC_US", "play-button", "grey-pixel"]):
                if fi not in images:
                    images.append(fi)

        # Amazon Price & MRP
        for p_span in soup.find_all("span", class_="a-price"):
            classes = p_span.get("class", [])
            if "a-text-price" in classes:
                continue
            offscreen_p = p_span.find(class_="a-offscreen")
            raw_p_text = offscreen_p.get_text(strip=True) if offscreen_p else p_span.get_text(strip=True)
            p_nums = re.findall(r"[\d,]+(?:\.\d+)?", raw_p_text)
            if p_nums:
                clean_p = p_nums[0].replace(",", "")
                try:
                    parsed_p = float(clean_p)
                    if 0 < parsed_p < 1000000:
                        price = parsed_p
                        break
                except Exception:
                    pass

        mrp_el = soup.find("span", class_="a-text-price")
        if mrp_el:
            offscreen_m = mrp_el.find(class_="a-offscreen")
            raw_m_text = offscreen_m.get_text(strip=True) if offscreen_m else mrp_el.get_text(strip=True)
            m_nums = re.findall(r"[\d,]+(?:\.\d+)?", raw_m_text)
            if m_nums:
                clean_m = m_nums[0].replace(",", "")
                try:
                    parsed_m = float(clean_m)
                    if 0 < parsed_m < 1000000:
                        mrp = parsed_m
                except Exception:
                    pass

    # 4. Flipkart-specific Fallbacks
    if "flipkart" in cleaned_url.lower():
        f_title = soup.find("span", class_="B_NuCI") or soup.find("h1", class_="cPHDOP")
        if f_title:
            title = f_title.get_text(strip=True)

        for fb_li in soup.find_all("li", class_="_21Ahn-"):
            t = fb_li.get_text(strip=True)
            if t and t not in features:
                features.append(t)

        for f_tr in soup.find_all("tr", class_="_1s_Smc"):
            tds = f_tr.find_all("td")
            if len(tds) >= 2:
                k = tds[0].get_text(strip=True)
                v = tds[1].get_text(strip=True)
                if k and v and k not in specifications:
                    specifications[k] = v

        for s_link in soup.find_all("a", class_=re.compile(r"_1q8qwO", re.I)):
            s_text = s_link.get_text(strip=True)
            if s_text and s_text not in sizes:
                sizes.append(s_text)

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

    # 6. Slug extraction fallback if title is still empty or generic marketplace branding
    if not title or title.lower() in ["amazon.in", "amazon", "online shopping", "flipkart", "flipkart.com", "meesho"]:
        m = re.search(r"/(?:dp/)?([a-zA-Z0-9_-]{5,})/(?:dp/|[?#/]|$)", cleaned_url)
        if m:
            slug_cand = m.group(1).replace("-", " ").strip()
            if len(slug_cand) > 3 and not slug_cand.startswith("B0"):
                title = slug_cand

    # Deduplicate and convert to master full-resolution image URLs
    clean_images = []
    seen = set()
    for img in images:
        if not img or not img.startswith("http"):
            continue
        # Upgrade Amazon image URLs to full original resolution
        master_img = re.sub(r"\._[^/]+_\.jpg", ".jpg", img) if "amazon" in img.lower() else img
        if master_img not in seen:
            seen.add(master_img)
            clean_images.append(master_img)

    if mrp <= price and price > 0:
        mrp = round(price * 1.6, 2)

    return {
        "source_url": cleaned_url,
        "raw_title": title[:300].strip(),
        "raw_description": description[:3000].strip(),
        "brand": brand[:100].strip(),
        "price": price,
        "mrp": mrp if mrp > price else price,
        "images": clean_images[:10],
        "features": features[:10],
        "specifications": specifications,
        "colors": colors[:10],
        "sizes": sizes[:15],
    }


def _infer_category(title: str) -> str:
    """Smart local category inference based on title keywords."""
    t = (title or "").lower()
    if any(w in t for w in ["shoe", "sandal", "footwear", "sneaker", "boot", "slipper", "wedge", "clog", "loaf"]):
        return "Footwear"
    if any(w in t for w in ["shirt", "t-shirt", "tshirt", "jeans", "dress", "kurti", "saree", "pant", "jacket", "hoodie", "top", "trouser", "suit", "blazer", "wear"]):
        return "Apparel & Fashion"
    if any(w in t for w in ["phone", "laptop", "earbud", "earphone", "headphone", "charger", "cable", "watch", "smartwatch", "speaker", "camera"]):
        return "Electronics"
    if any(w in t for w in ["cream", "serum", "lotion", "perfume", "shampoo", "lipstick", "makeup", "facewash", "skincare", "soap"]):
        return "Beauty & Personal Care"
    if any(w in t for w in ["bottle", "kitchen", "pan", "cooker", "bed", "pillow", "curtain", "towel", "mop", "lamp", "cushion", "decor"]):
        return "Home & Kitchen"
    if any(w in t for w in ["grocery", "tea", "coffee", "oil", "spice", "almond", "cashew", "dry fruit", "snack"]):
        return "Groceries & Essentials"
    return "General"


async def enhance_product_with_gemini(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Call Gemini 1.5 Flash to clean marketplace text, extract variants,
    generate a high-converting D2C product title, description, and suggested category.
    """
    api_key = settings.resolved_api_key
    model_name = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")

    # Generate structured variant combinations from extracted colors and sizes
    colors = raw_data.get("colors") or []
    sizes = raw_data.get("sizes") or []
    base_variants = []
    if colors and sizes:
        for c in colors[:5]:
            for s in sizes[:6]:
                clean_c = re.sub(r'[^a-zA-Z0-9]', '', c)[:3].upper() or "VAR"
                clean_s = re.sub(r'[^a-zA-Z0-9]', '', s) or "SZ"
                base_variants.append({
                    "name": f"{c} / {s}",
                    "sku_suffix": f"{clean_c}-{clean_s}",
                    "price_diff": 0.0,
                    "stock": 50
                })
    elif colors:
        for c in colors[:10]:
            clean_c = re.sub(r'[^a-zA-Z0-9]', '', c)[:4].upper() or "VAR"
            base_variants.append({
                "name": c,
                "sku_suffix": clean_c,
                "price_diff": 0.0,
                "stock": 50
            })
    elif sizes:
        for s in sizes[:10]:
            clean_s = re.sub(r'[^a-zA-Z0-9]', '', s) or "SZ"
            base_variants.append({
                "name": s,
                "sku_suffix": clean_s,
                "price_diff": 0.0,
                "stock": 50
            })
    else:
        base_variants.append({
            "name": "Standard",
            "sku_suffix": "STD",
            "price_diff": 0.0,
            "stock": 50
        })

    # Build rich formatted description with bullets and specs table
    features = raw_data.get("features") or []
    specs = raw_data.get("specifications") or {}
    raw_desc = raw_data.get("raw_description") or ""
    clean_title = re.sub(r"(?i)(Amazon\s*Brand\s*-\s*|Flipkart\s*SmartBuy\s*-\s*|\s*\|.*$|\s*-.*$)", "", raw_data.get("raw_title") or "Imported Product").strip()

    bullet_items = "".join([f"<li>{f}</li>" for f in features])
    specs_rows = "".join([
        f"<tr><td style='padding:6px 12px;font-weight:600;border:1px solid #e2e8f0;background:#f8fafc;width:35%;'>{k}</td><td style='padding:6px 12px;border:1px solid #e2e8f0;'>{v}</td></tr>"
        for k, v in list(specs.items())[:12]
    ])

    desc_parts = []
    if raw_desc:
        desc_parts.append(f"<p style='font-size:14px;line-height:1.6;color:#334155;margin-bottom:12px;'>{raw_desc[:400]}</p>")
    else:
        desc_parts.append(f"<p style='font-size:14px;line-height:1.6;color:#334155;margin-bottom:12px;'>High-quality {clean_title[:60]}, designed for exceptional comfort, lasting durability, and modern styling.</p>")
    if bullet_items:
        desc_parts.append(f"<h4 style='font-size:14px;font-weight:700;color:#0f172a;margin-top:16px;margin-bottom:8px;'>Key Highlights & Features:</h4><ul style='padding-left:20px;line-height:1.7;color:#475569;margin-bottom:12px;'>{bullet_items}</ul>")
    if specs_rows:
        desc_parts.append(f"<h4 style='font-size:14px;font-weight:700;color:#0f172a;margin-top:16px;margin-bottom:8px;'>Product Specifications:</h4><table style='width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;margin-top:8px;'><tbody>{specs_rows}</tbody></table>")

    rich_desc_html = "".join(desc_parts)

    suggested_category = _infer_category(clean_title)

    # 1. Attempt Gemini Enhancement if API Key configured
    if api_key:
        system_prompt = (
            "You are an expert e-commerce catalog specialist and copywriter for direct-to-consumer online brands.\n"
            "Format raw scraped product data into a clean, compelling, professional product listing.\n"
            "Remove ALL marketplace branding ('Amazon', 'Flipkart', 'Best Seller', etc.).\n"
            "Generate concise catchy title and clean category.\n"
            "Return valid JSON only."
        )

        user_payload = {
            "title": raw_data.get("raw_title"),
            "description": raw_data.get("raw_description"),
            "features": features,
            "specifications": specs,
            "detected_price": raw_data.get("price"),
            "detected_mrp": raw_data.get("mrp"),
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_prompt}\n\nInput Product Data:\n{json.dumps(user_payload, indent=2)}"}]
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
                        raw_text = re.sub(r"^```json\s*", "", raw_text)
                        raw_text = re.sub(r"\s*```$", "", raw_text)
                        parsed = json.loads(raw_text)
                        logger.info("gemini_product_enhanced_successfully", title=parsed.get("title"))
                        return {
                            "title": parsed.get("title") or clean_title[:90],
                            "category": parsed.get("category") or suggested_category,
                            "description_html": parsed.get("description_html") or rich_desc_html,
                            "short_description": parsed.get("short_description") or clean_title[:120],
                            "selling_price": raw_data.get("price") or 499.0,
                            "mrp": raw_data.get("mrp") or 999.0,
                            "variants": base_variants,
                            "features": features,
                            "specifications": specs,
                            "colors": colors,
                            "sizes": sizes,
                            "tags": parsed.get("tags") or ["Featured", "New Arrival"],
                            "images": raw_data.get("images", []),
                            "source_url": raw_data.get("source_url"),
                        }
                else:
                    logger.warning("gemini_api_returned_error", status=res.status_code, text=res.text)
        except Exception as e:
            logger.error("gemini_call_exception_using_fallback", error=str(e))

    # 2. Local Fallback
    return {
        "title": clean_title[:90] or "Quality E-Commerce Item",
        "category": suggested_category,
        "description_html": rich_desc_html,
        "short_description": clean_title[:120],
        "selling_price": raw_data.get("price") or 499.0,
        "mrp": raw_data.get("mrp") or 999.0,
        "variants": base_variants,
        "features": features,
        "specifications": specs,
        "colors": colors,
        "sizes": sizes,
        "tags": ["Featured", "New Arrival"],
        "images": raw_data.get("images", []),
        "source_url": raw_data.get("source_url"),
    }
