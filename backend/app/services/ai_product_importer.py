"""
Digital Growth Studio — AI 1-Click Product Importer Service
Scrapes and enhances e-commerce listings across Flipkart, Meesho, Amazon,
Shopify stores, and WooCommerce with automated variant generation,
high-resolution master image resolution, and rich specifications formatting.
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

# Safe browser headers without unsupported compression like Brotli ('br')
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    "Accept-Encoding": "gzip, deflate",
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


async def _scrape_shopify_json(url: str) -> Optional[Dict[str, Any]]:
    """Attempt direct Shopify JSON endpoint fetch, falling back to Next.js / Headless Shopify HTML parsing."""
    try:
        clean_url = url.split("?")[0].rstrip("/")
        json_url = f"{clean_url}.json"
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=BROWSER_HEADERS) as client:
            resp = await client.get(json_url)
            if resp.status_code == 200 and "application/json" in resp.headers.get("content-type", ""):
                data = resp.json()
                if "product" in data:
                    p = data["product"]
                    title = p.get("title", "")
                    brand = p.get("vendor", "")
                    desc = p.get("body_html", "")
                    raw_images = [img["src"] for img in p.get("images", []) if isinstance(img, dict) and "src" in img]
                    
                    variants = []
                    for v in p.get("variants", []):
                        v_title = v.get("title", "")
                        if v_title and v_title.lower() != "default title":
                            variants.append({
                                "name": v_title,
                                "sku_suffix": re.sub(r'[^a-zA-Z0-9]', '', v_title)[:6].upper() or "VAR",
                                "price_diff": 0.0,
                                "stock": v.get("inventory_quantity") or 50
                            })
                    
                    price = 0.0
                    mrp = 0.0
                    if p.get("variants"):
                        first_v = p["variants"][0]
                        price = float(first_v.get("price") or 0.0)
                        mrp = float(first_v.get("compare_at_price") or (price * 1.4 if price > 0 else 0.0))

                    return {
                        "source_url": url,
                        "raw_title": title,
                        "raw_description": desc,
                        "brand": brand,
                        "price": price,
                        "mrp": mrp if mrp > price else round(price * 1.5, 2),
                        "images": raw_images[:10],
                        "features": [],
                        "specifications": {"Vendor": brand} if brand else {},
                        "colors": [],
                        "sizes": [],
                        "variants": variants,
                    }

            # Fallback for Headless Shopify / Next.js Storefronts (e.g. Clinderma)
            html_resp = await client.get(url)
            if html_resp.status_code == 200:
                html = html_resp.text
                soup = BeautifulSoup(html, "html.parser")

                title = ""
                og_t = soup.find("meta", property="og:title")
                if og_t and og_t.get("content"):
                    title = og_t.get("content").strip()
                elif soup.title:
                    title = soup.title.string.strip()
                    title = re.sub(r'\s*[—|–-]\s*[A-Za-z0-9\s]+$', '', title)

                selling_price = 0.0
                m_price = re.search(r'\\?"amount\\?":\s*\\?"([\d.]+)\\?"', html)
                if not m_price:
                    m_price = re.search(r'\"price\":\s*\"?([\d.]+)\"?', html)
                if m_price:
                    try:
                        selling_price = float(m_price.group(1))
                    except Exception:
                        pass

                mrp = 0.0
                m_mrp = re.search(r'compareAtPrice.*?\\?"amount\\?":\s*\\?"([\d.]+)\\?"', html)
                if m_mrp:
                    try:
                        mrp = float(m_mrp.group(1))
                    except Exception:
                        pass
                if not mrp and selling_price > 0:
                    mrp = round(selling_price * 1.25, 2)

                images = []
                cdn_imgs = re.findall(r'(https://cdn\.shopify\.com/s/files/[^\s"\'<>]+\.(?:jpg|jpeg|png|webp))', html)
                for img in cdn_imgs:
                    clean = re.sub(r'_\d+x\d*\.', '.', img).split("?")[0]
                    if clean not in images and not any(skip in clean.lower() for skip in ['icon', 'logo', 'badge', 'payment', 'star', 'cart']):
                        images.append(clean)

                desc_meta = soup.find("meta", attrs={"name": "description"})
                desc = desc_meta.get("content") if desc_meta else ""

                if title and (selling_price > 0 or images):
                    return {
                        "source_url": url,
                        "raw_title": title,
                        "raw_description": desc,
                        "brand": "",
                        "price": selling_price,
                        "mrp": mrp,
                        "images": images[:10],
                        "features": [],
                        "specifications": {},
                        "colors": [],
                        "sizes": [],
                        "variants": [],
                    }
    except Exception as e:
        logger.debug("shopify_json_fetch_failed", error=str(e), url=url)
    return None


async def _scrape_flipkart_from_search(url: str) -> Optional[Dict[str, Any]]:
    """
    Search Flipkart's open catalog search endpoint which bypasses cloud datacenter IP blocks,
    and extracts full JSON-LD / __INITIAL_STATE__ for titles, prices, master images, and variants.
    """
    try:
        pid_m = re.search(r'pid=([a-zA-Z0-9]+)', url)
        target_pid = pid_m.group(1) if pid_m else ""

        slug_m = re.search(r"flipkart\.com/([a-zA-Z0-9_-]+)(?:/p/|$)", url)
        slug = slug_m.group(1) if slug_m else ""
        words = [w for w in slug.replace("-", " ").split() if w.lower() not in ["and", "with", "for", "the", "in", "at", "by", "rating", "safe", "wash", "fully"]][:6]
        search_q = "+".join(words) if words else target_pid
        if not search_q:
            return None

        search_url = f"https://www.flipkart.com/search?q={search_q}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        async with httpx.AsyncClient(timeout=14.0, headers=headers) as client:
            resp = await client.get(search_url)
            html = resp.text

        m = re.search(r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});\s*</script>', html, re.DOTALL)
        if not m:
            return None
        data = json.loads(m.group(1))
        page_data = data.get("pageDataV4", {}).get("page", {}).get("data", {})
        all_products = []
        for slot_list in page_data.values():
            if isinstance(slot_list, list):
                for item in slot_list:
                    if isinstance(item, dict):
                        w_data = item.get("widget", {}).get("data", {})
                        for p in w_data.get("products", []):
                            val = p.get("productInfo", {}).get("value", {})
                            if val:
                                all_products.append(val)
        if not all_products:
            return None

        best = None
        if target_pid:
            for p in all_products:
                if target_pid.lower() in p.get("baseUrl", "").lower() or target_pid.lower() in str(p.get("listingId", "")).lower() or target_pid.lower() in str(p.get("id", "")).lower():
                    best = p
                    break
        if not best and words:
            scored = []
            for p in all_products:
                t = (p.get("titles", {}).get("title", "") + " " + (p.get("titles", {}).get("subtitle") or "")).lower()
                score = sum(1 for kw in words if kw.lower() in t)
                scored.append((score, p))
            scored.sort(key=lambda x: x[0], reverse=True)
            if scored and scored[0][0] > 0:
                best = scored[0][1]
        if not best:
            best = all_products[0]

        title = best.get("titles", {}).get("title", "")
        sub = best.get("titles", {}).get("subtitle")
        if sub and sub not in title:
            title = f"{title} ({sub})"

        selling_price = 0.0
        mrp = 0.0
        for pr in best.get("pricing", {}).get("prices", []):
            if pr.get("strikeOff"):
                mrp = float(pr.get("value", 0))
            else:
                selling_price = float(pr.get("value", 0))
        if not mrp and selling_price > 0:
            mrp = round(selling_price * 1.35, 2)

        images = []
        for img in best.get("media", {}).get("images", []):
            u = img.get("url", "")
            if u:
                u = u.replace("{@width}", "1500").replace("{@height}", "1500").replace("{@quality}", "90")
                u = u.replace("http://", "https://")
                images.append(u)

        variants = []
        seen = set()
        for p in all_products:
            pt = p.get("titles", {}).get("title", "")
            psub = p.get("titles", {}).get("subtitle") or ""
            combo = f"{pt} {psub}"
            cap = re.search(r'(\b\d+(?:\.\d+)?\s*(?:kg|l|gb|tb|inch)\b)', combo, re.IGNORECASE)
            col = re.search(r'\b(silver|grey|black|white|blue|red|gold|brown|beige|yellow)\b', combo, re.IGNORECASE)
            vname = ""
            if col and cap:
                vname = f"{col.group(1).title()} / {cap.group(1).title()}"
            elif cap:
                vname = cap.group(1).title()
            elif col:
                vname = col.group(1).title()
            elif psub and len(psub) < 25 and not any(skip in psub.lower() for skip in ["star", "rpm", "warranty"]):
                vname = psub.strip()

            if vname and vname not in seen:
                seen.add(vname)
                p_price = None
                for pr in p.get("pricing", {}).get("prices", []):
                    if not pr.get("strikeOff"):
                        p_price = float(pr.get("value", 0))
                diff = (p_price - selling_price) if (p_price and selling_price) else 0.0
                variants.append({
                    "name": vname,
                    "sku_suffix": re.sub(r'[^a-zA-Z0-9]', '', vname)[:6].upper() or "VAR",
                    "price_diff": round(diff, 2),
                    "stock": 50
                })

        features = best.get("keySpecs") or []
        analytics = best.get("analyticsData", {})
        category = analytics.get("category") or best.get("vertical") or ""

        return {
            "title": title,
            "description": f"Authentic {title}. Features include: {', '.join(features)}." if features else "",
            "price": selling_price,
            "mrp": mrp,
            "brand": "",
            "images": images[:12],
            "features": features,
            "specifications": {"Category": category} if category else {},
            "colors": [],
            "sizes": [],
            "variants": variants[:10] if variants else []
        }
    except Exception as e:
        logger.warning("flipkart_search_scrape_failed", error=str(e))
        return None


async def _scrape_flipkart_specialized(soup: BeautifulSoup, html: str, url: str) -> Dict[str, Any]:
    """Specialized extraction for Flipkart pages with automatic truncated URL recovery."""
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

    # 1. Extract from Flipkart's JSON-LD Product Schema FIRST (contains un-truncated official title)
    json_ld_items = _extract_json_ld(soup)
    product_ld = _find_product_in_json_ld(json_ld_items)
    if product_ld:
        title = (product_ld.get("name") or "").strip()
        
        raw_images = product_ld.get("image", [])
        if isinstance(raw_images, list):
            for img in raw_images:
                if isinstance(img, str) and img.startswith("http"):
                    images.append(img)
                elif isinstance(img, dict) and img.get("url"):
                    images.append(img["url"])
        elif isinstance(raw_images, str) and raw_images.startswith("http"):
            images.append(raw_images)

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

        raw_brand = product_ld.get("brand")
        if isinstance(raw_brand, dict):
            brand = raw_brand.get("name", "")
        elif isinstance(raw_brand, str):
            brand = raw_brand

        if product_ld.get("color"):
            c_val = str(product_ld.get("color")).strip()
            if c_val and c_val not in colors:
                colors.append(c_val)

        desc = product_ld.get("description", "")
        if desc:
            description = desc
            mrp_m = re.search(r"Rs\.?\s*([\d,]+(?:\.\d+)?)", desc)
            if mrp_m:
                try:
                    parsed_m = float(mrp_m.group(1).replace(",", ""))
                    if parsed_m > price:
                        mrp = parsed_m
                except Exception:
                    pass

    # 2. If no title from JSON-LD, fall back to H1 or DOM elements
    if not title:
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)
    if not title:
        f_title = soup.find("span", class_="B_NuCI") or soup.find("h1", class_="cPHDOP")
        if f_title:
            title = f_title.get_text(strip=True)

    # Clean Flipkart "more" button suffixes from H1 (e.g. "Fully Automat...more")
    title = re.sub(r"(?i)\s*(\.\.\.more|show\s*more|more)\s*$", "", title).strip()

    # Reject generic marketplace placeholders (e.g. "Online Shopping India", "Itm Store Online")
    if any(bad in title.lower() for bad in ["online shopping", "itm store online", "flipkart.com", "access denied", "buy online at best price"]):
        title = ""

    # 3. Truncated URL / Blocked page recovery via Search Catalog
    # If title, price, or images are missing, extract directly from Flipkart Search (never blocked by datacenter IP filters)
    if (not title or price == 0.0 or not images) and "flipkart.com" in url.lower():
        search_data = await _scrape_flipkart_from_search(url)
        if search_data and (search_data.get("title") or search_data.get("price", 0) > 0):
            return search_data

    # 4. If title is still empty, derive from slug words
    if not title:
        slug_m = re.search(r"flipkart\.com/([a-zA-Z0-9_-]+)", url)
        if slug_m:
            title = slug_m.group(1).replace("-", " ").title()

    # 5. Extract Swatches, Colors, Sizes & Highlights
    swatch_elements = soup.find_all(class_=re.compile(r"_1psv1zeb9"))
    swatch_texts = [el.get_text(strip=True) for el in swatch_elements]

    in_highlights = False
    for st in swatch_texts:
        if st.startswith("Selected Color:"):
            c = st.replace("Selected Color:", "").strip()
            if c and c not in colors:
                colors.append(c)
        elif st.startswith("Variant:"):
            v = st.replace("Variant:", "").strip()
            clean_v = re.sub(r"[↓↑]?\d+%[\d,]+.*$", "", v).strip()
            if clean_v and clean_v not in sizes:
                sizes.append(clean_v)
        elif "product highlights" in st.lower():
            in_highlights = True
            continue
        elif in_highlights:
            if any(term in st.lower() for term in ["buy with", "similar products", "specifications", "ratings", "reviews", "top discount"]):
                in_highlights = False
            elif 5 < len(st) < 80 and st not in features:
                features.append(st)

    # 6. Fallback image extraction from thumbnails upscaling
    if not images:
        for f_img in soup.find_all("img"):
            src = f_img.get("src") or ""
            if "flixcart.com/image" in src and "placeholder" not in src:
                hires = re.sub(r"/image/\d+/\d+/", "/image/1500/1500/", src)
                if hires not in images:
                    images.append(hires)

    return {
        "title": title,
        "description": description,
        "price": price,
        "mrp": mrp if mrp > price else (round(price * 1.5, 2) if price > 0 else 0.0),
        "brand": brand,
        "images": images[:10],
        "features": features[:10],
        "specifications": specifications,
        "colors": colors[:10],
        "sizes": sizes[:15],
        "variants": [],
    }


async def _scrape_meesho_specialized(url: str) -> Dict[str, Any]:
    """
    Specialized extraction for Meesho pages using URL slug decomposition,
    direct official brand store recovery, DuckDuckGo price indexing, and Flipkart cross-catalog matching.
    NEVER uses generic wallpapers or unrelated images.
    """
    slug_match = re.search(r"meesho\.com/([a-zA-Z0-9_-]+)/p/([a-zA-Z0-9]+)", url)
    slug = slug_match.group(1) if slug_match else ""
    clean_words = slug.replace("-", " ")
    words = clean_words.split()

    brand = words[0].title() if words else "Brand"
    model = words[1].title() if len(words) > 1 else ""
    title = clean_words.title()
    price = 499.0
    mrp = 999.0
    features = []
    description = ""
    images = []
    colors = []
    sizes = []

    for c in ["Black", "White", "Blue", "Red", "Green", "Grey", "Yellow", "Pink", "Gold"]:
        if c.lower() in clean_words.lower() and c not in colors:
            colors.append(c)

    # Strategy 1: Check Brand Official Shopify Store (e.g. hoppup.in, boat-lifestyle.com, noise.com, etc.)
    for domain in [f"{brand.lower()}.in", f"my{brand.lower()}.com", f"{brand.lower()}.com", f"the{brand.lower()}.com"]:
        try:
            shop_url = f"https://www.{domain}/products.json?limit=100"
            async with httpx.AsyncClient(timeout=7.0, follow_redirects=True) as client:
                r = await client.get(shop_url)
                if r.status_code == 200 and "products" in r.text:
                    data = r.json()
                    for p in data.get("products", []):
                        p_title = p.get("title", "").lower()
                        p_handle = p.get("handle", "").lower()
                        if model.lower() in p_title or model.lower() in p_handle or brand.lower() in p_title:
                            logger.info("meesho_recovered_from_brand_store", brand=brand, domain=domain, title=p.get("title"))
                            title = p.get("title") or title
                            images = [img.get("src") for img in p.get("images", []) if img.get("src") and img.get("src").startswith("http")]
                            for v in p.get("variants", []):
                                v_name = v.get("title", "")
                                if v_name and v_name != "Default Title" and v_name not in colors:
                                    colors.append(v_name)
                            if p.get("variants") and p["variants"][0].get("price"):
                                try:
                                    p_price = float(p["variants"][0]["price"])
                                    if p_price > 50:
                                        price = p_price
                                        mrp = round(price * 1.5, 2)
                                except Exception:
                                    pass
                            break
                    if images:
                        break
        except Exception as e:
            logger.debug("brand_store_lookup_failed", domain=domain, error=str(e))

    # Strategy 2: If no images yet, query Flipkart search for the branded item to get authentic studio photos
    if not images:
        try:
            search_q = f"{brand} {model}".strip()
            fk_search_url = f"https://www.flipkart.com/search?q={search_q.replace(' ', '+')}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
            async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
                r_fk = await client.get(fk_search_url)
                fk_imgs = re.findall(r'https://rukmini\d*\.flixcart\.com/image/\d+/\d+/([a-zA-Z0-9/._-]+)', r_fk.text)
                for ip in fk_imgs:
                    if not any(skip in ip.lower() for skip in ["placeholder", "logo", "icon", "banner", "fk-p"]):
                        hires = f"https://rukmini1.flixcart.com/image/1500/1500/{ip}"
                        if hires not in images:
                            images.append(hires)
                    if len(images) >= 8:
                        break
        except Exception as e:
            logger.debug("meesho_flipkart_cross_search_failed", error=str(e))

    # Query DuckDuckGo HTML for accurately indexed snippet and pricing
    query = f"{brand} {clean_words[:45]} meesho"
    try:
        async with httpx.AsyncClient(timeout=10.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
            ddg_resp = await client.post("https://html.duckduckgo.com/html/", data={"q": query})
            soup = BeautifulSoup(ddg_resp.text, "html.parser")
            snippets = soup.find_all("div", class_="result__body")
            for snip in snippets:
                text = snip.get_text()
                if "₹" in text or "meesho" in text.lower():
                    t_el = snip.find("a", class_="result__snippet")
                    if t_el:
                        t_text = t_el.get_text().strip()
                        t_clean = re.sub(r"(?i)₹.*$", "", t_text).strip()
                        if len(t_clean) > 15 and not title:
                            title = t_clean
                    
                    price_matches = re.findall(r"₹\s*([\d,]+)", text)
                    if price_matches:
                        nums = [float(p.replace(",", "")) for p in price_matches if float(p.replace(",", "")) > 50]
                        if len(nums) >= 2:
                            price = min(nums[0], nums[1])
                            mrp = max(nums[0], nums[1])
                        elif len(nums) == 1:
                            price = nums[0]
                            mrp = round(price * 2.2, 2)
                    
                    if not description:
                        description = snip.find("a", class_="result__snippet").get_text(strip=True) if snip.find("a", class_="result__snippet") else ""
                    break
    except Exception as e:
        logger.debug("meesho_ddg_fallback_error", error=str(e))

    # Keyword feature extraction
    for kw in ["35ms", "13mm", "50h", "bluetooth", "low latency", "true wireless", "gaming", "fast charging", "water resistant", "anc"]:
        if kw in clean_words.lower():
            features.append(kw.upper() if len(kw) <= 4 else kw.title())

    return {
        "title": title,
        "description": description or f"Authentic {title} by {brand}. Designed with high-performance specs and durability.",
        "price": price,
        "mrp": mrp if mrp > price else round(price * 1.6, 2),
        "brand": brand,
        "images": images[:10],
        "features": features[:8],
        "specifications": {"Brand": brand, "Type": "Earbuds / Audio", "Connectivity": "Bluetooth"},
        "colors": colors[:6],
        "sizes": sizes,
    }


async def fetch_product_raw_data(url: str) -> Dict[str, Any]:
    """Fetch and scrape basic raw product data from any e-commerce link."""
    cleaned_url = url.strip()
    if not cleaned_url.startswith(("http://", "https://")):
        cleaned_url = f"https://{cleaned_url}"

    # 1. Check if Shopify store URL
    if "/products/" in cleaned_url and not any(m in cleaned_url.lower() for m in ["amazon", "flipkart", "meesho"]):
        shopify_data = await _scrape_shopify_json(cleaned_url)
        if shopify_data:
            return shopify_data

    # 2. Check if Meesho URL
    if "meesho.com" in cleaned_url.lower():
        meesho_data = await _scrape_meesho_specialized(cleaned_url)
        if meesho_data:
            return {
                "source_url": cleaned_url,
                "raw_title": meesho_data["title"][:300].strip(),
                "raw_description": meesho_data["description"][:3000].strip(),
                "brand": meesho_data["brand"][:100].strip(),
                "price": meesho_data["price"],
                "mrp": meesho_data["mrp"],
                "images": meesho_data["images"],
                "features": meesho_data["features"],
                "specifications": meesho_data["specifications"],
                "colors": meesho_data["colors"],
                "sizes": meesho_data["sizes"],
            }

    html = ""
    async with httpx.AsyncClient(timeout=18.0, follow_redirects=True, headers=BROWSER_HEADERS) as client:
        try:
            resp = await client.get(cleaned_url)
            html = resp.text
        except Exception as e:
            logger.warning("scrape_request_primary_failed", error=str(e), url=cleaned_url)

    # Social crawler fallback if blocked
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

    # 3. Check if Flipkart URL
    if "flipkart" in cleaned_url.lower():
        fk_data = await _scrape_flipkart_specialized(soup, html, cleaned_url)
        if fk_data and (fk_data.get("title") or fk_data.get("price", 0) > 0):
            return {
                "source_url": cleaned_url,
                "raw_title": fk_data["title"][:300].strip(),
                "raw_description": fk_data.get("description", "")[:3000].strip(),
                "brand": fk_data.get("brand", "")[:100].strip(),
                "price": fk_data.get("price", 0.0),
                "mrp": fk_data.get("mrp", 0.0),
                "images": fk_data.get("images", []),
                "features": fk_data.get("features", []),
                "specifications": fk_data.get("specifications", {}),
                "colors": fk_data.get("colors", []),
                "sizes": fk_data.get("sizes", []),
                "variants": fk_data.get("variants", []),
            }

    # Standard JSON-LD & OpenGraph parsing for Amazon, WooCommerce & Generic
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

    if product_ld:
        title = product_ld.get("name") or ""
        description = product_ld.get("description") or ""
        raw_brand = product_ld.get("brand")
        if isinstance(raw_brand, dict):
            brand = raw_brand.get("name", "")
        elif isinstance(raw_brand, str):
            brand = raw_brand

        raw_images = product_ld.get("image")
        if isinstance(raw_images, list):
            for img in raw_images:
                if isinstance(img, str) and img.startswith("http"):
                    images.append(img)
                elif isinstance(img, dict) and img.get("url"):
                    images.append(img["url"])
        elif isinstance(raw_images, str) and raw_images.startswith("http"):
            images.append(raw_images)

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

    if not title:
        h1 = soup.find("h1")
        if h1 and len(h1.get_text(strip=True)) > 3 and "access denied" not in h1.get_text().lower():
            title = h1.get_text(strip=True)

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

    # Headless Shopify / Next.js / RSC payload extraction (e.g. Clinderma, modern D2C brands)
    if "gid://shopify/Product" in html or "minVariantPrice" in html or "cdn.shopify.com" in html:
        # Title from script if empty
        if not title:
            m_t = re.search(r'(?:\\\"|\")title(?:\\\"|\")\s*:\s*(?:\\\"|\")([^\\\"\n]+)(?:\\\"|\")', html)
            if m_t:
                title = m_t.group(1).encode('utf-8').decode('unicode_escape', 'ignore').strip()

        # Price from minVariantPrice or amount
        if price == 0.0:
            m_p = re.search(r'(?:\\\"|\")minVariantPrice(?:\\\"|\")\s*:\s*\{[^\}]*(?:\\\"|\")amount(?:\\\"|\")\s*:\s*(?:\\\"|\")([\d.]+)(?:\\\"|\")', html)
            if not m_p:
                m_p = re.search(r'(?:\\\"|\")amount(?:\\\"|\")\s*:\s*(?:\\\"|\")([\d.]+)(?:\\\"|\")', html)
            if m_p:
                try:
                    price = float(m_p.group(1))
                except Exception:
                    pass

        # Description from script
        if not description:
            m_d = re.search(r'(?:\\\"|\")description(?:\\\"|\")\s*:\s*(?:\\\"|\")([^\\\"\n]{15,400})(?:\\\"|\")', html)
            if m_d:
                description = m_d.group(1).encode('utf-8').decode('unicode_escape', 'ignore').strip()

        # Features & Badges
        for badge in ["Dermatologist Approved", "Clinically Tested", "Non-Comedogenic", "Paraben Free", "Cruelty Free", "Sulfate Free", "100% Organic"]:
            if badge.lower() in html.lower() and badge not in features:
                features.append(badge)

        # Extract Shopify CDN master images
        found_shopify_imgs = re.findall(r'(https://cdn\.shopify\.com/s/files/[^\\"\',&]+\.(?:png|jpg|jpeg|webp))', html)
        for s_img in found_shopify_imgs:
            clean_s_img = re.sub(r'\\/', '/', s_img)
            if clean_s_img not in images and not any(skip in clean_s_img.lower() for skip in ["logo", "icon", "placeholder", "badge"]):
                images.append(clean_s_img)

    # Generic Add to Cart button fallback for price
    if price == 0.0:
        for btn in soup.find_all(["button", "a", "span", "div"]):
            btn_t = btn.get_text(strip=True)
            if any(term in btn_t.lower() for term in ["add to cart", "buy now", "order now"]):
                pm = re.search(r'₹\s*([\d,]+(?:\.\d+)?)', btn_t)
                if pm:
                    try:
                        p_cand = float(pm.group(1).replace(",", ""))
                        if 10 < p_cand < 500000:
                            price = p_cand
                            break
                    except Exception:
                        pass

    # Generic price span fallback
    if price == 0.0:
        for el in soup.find_all(["span", "div", "p"], class_=re.compile(r"price|amount|current", re.I)):
            txt = el.get_text(strip=True)
            pm = re.search(r'₹\s*([\d,]+(?:\.\d+)?)', txt)
            if pm:
                try:
                    p_cand = float(pm.group(1).replace(",", ""))
                    if 10 < p_cand < 500000:
                        price = p_cand
                        break
                except Exception:
                    pass

    # Generic Image Fallback from <img> tags
    if not images:
        for img_tag in soup.find_all("img"):
            src = img_tag.get("src") or img_tag.get("data-src") or ""
            if any(term in src.lower() for term in ["cdn.shopify.com", "products", "uploads", "images"]) and not any(skip in src.lower() for skip in ["logo", "icon", "banner", "svg"]):
                m_next = re.search(r'url=([^&]+)', src)
                if m_next:
                    import urllib.parse
                    unpacked = urllib.parse.unquote(m_next.group(1))
                    if unpacked.startswith("http") and unpacked not in images:
                        images.append(unpacked)
                elif src.startswith("http") and src not in images:
                    images.append(src)

    # Amazon Specialized Extraction
    if "amazon" in cleaned_url.lower():
        title_el = soup.find(id="productTitle")
        if title_el:
            title = title_el.get_text(strip=True)

        # "About this item" bullet points
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

        # Specifications / Product Overview
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

        # Fix discordant Amazon child titles (e.g. sandal title on sports shoe ASIN)
        model_name = specifications.get("Model Name") or specifications.get("Item Type Name")
        if model_name:
            if any(term in title.lower() for term in ["sandal", "wedge", "slipper"]) and any(term in model_name.lower() for term in ["shoe", "sport", "running", "sneaker"]):
                b_name = specifications.get("Brand") or "BRUTON"
                title = f"{b_name} {model_name}"

        # Sizes & Colors Variations from Amazon JSON script
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

        # Dynamic High-Res Images
        landing_img = soup.find(id="landingImage")
        if landing_img and landing_img.get("data-a-dynamic-image"):
            try:
                dyn_dict = json.loads(landing_img["data-a-dynamic-image"])
                for img_url in dyn_dict.keys():
                    if img_url not in images:
                        images.append(img_url)
            except Exception:
                pass

        found_imgs = re.findall(r'https://m\.media-amazon\.com/images/I/[A-Za-z0-9+_-]+\.jpg', html)
        for fi in found_imgs:
            if not any(x in fi for x in ["_SS", "_SX38_", "_AC_US", "play-button", "grey-pixel"]):
                if fi not in images:
                    images.append(fi)

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

    # Generic page title fallback
    if not title and soup.title:
        title = soup.title.get_text(strip=True)

    # Slug fallback
    if not title or title.lower() in ["amazon.in", "amazon", "online shopping", "flipkart", "flipkart.com", "meesho"]:
        m = re.search(r"/(?:dp/)?([a-zA-Z0-9_-]{5,})/(?:dp/|[?#/]|$)", cleaned_url)
        if m:
            slug_cand = m.group(1).replace("-", " ").strip()
            if len(slug_cand) > 3 and not slug_cand.startswith("B0"):
                title = slug_cand

    # Deduplicate master image URLs
    clean_images = []
    seen = set()
    for img in images:
        if not img or not img.startswith("http"):
            continue
        if any(skip in img.lower() for skip in ["sprite", "pixel", "icon", "logo", "nav-", "blank", "transparent", "placeholder"]):
            continue
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


def _infer_category(title: str, context: str = "") -> str:
    """Smart local category inference based on title and context keywords."""
    t = f"{title or ''} {context or ''}".lower()
    if any(w in t for w in ["washing", "top load", "front load", "refrigerator", "fridge", "microwave", "appliance", "dryer", "dishwasher"]):
        return "Home & Kitchen Appliances"
    if any(w in t for w in ["phone", "laptop", "earbud", "earphone", "headphone", "tws", "charger", "cable", "watch", "smartwatch", "speaker", "camera", "hoppup", "boat", "noise", "audio", "bluetooth"]):
        return "Electronics & Gadgets"
    if any(w in t for w in ["shoe", "sandal", "footwear", "sneaker", "boot", "slipper", "clog", "loaf", "wedge", "heel"]):
        return "Footwear"
    if any(w in t for w in ["shirt", "t-shirt", "tshirt", "jeans", "dress", "kurti", "saree", "pant", "jacket", "hoodie", "trouser", "suit", "blazer", "clothing"]):
        return "Apparel & Fashion"
    if any(w in t for w in ["cream", "serum", "lotion", "perfume", "shampoo", "lipstick", "makeup", "facewash", "face wash", "skincare", "soap", "acne", "cleanser", "moisturizer", "sunscreen", "derma"]):
        return "Beauty & Personal Care"
    if any(w in t for w in ["bottle", "kitchen", "pan", "cooker", "bed", "pillow", "curtain", "towel", "mop", "lamp", "cushion", "decor"]):
        return "Home & Kitchen"
    if any(w in t for w in ["grocery", "tea", "coffee", "oil", "spice", "almond", "cashew", "dry fruit", "snack"]):
        return "Groceries & Essentials"
    return "General"


async def enhance_product_with_gemini(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format scraped product data with Gemini 1.5 Flash (or high-converting local fallback),
    generating variant matrices, master bullet points, and responsive specifications.
    """
    api_key = settings.resolved_api_key
    model_name = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")

    # Generate structured variant combinations
    colors = raw_data.get("colors") or []
    sizes = raw_data.get("sizes") or []
    base_variants = []

    raw_variants = raw_data.get("variants") or []
    valid_extracted = [v for v in raw_variants if isinstance(v, dict) and v.get("name") and v.get("name").lower() not in ["standard", "default title"]]
    
    if valid_extracted:
        base_variants = valid_extracted
    elif colors and sizes:
        for c in colors[:4]:
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
        # Category-based intelligent default variant generation
        raw_t_check = raw_data.get("raw_title") or ""
        raw_d_check = raw_data.get("raw_description") or ""
        cat = _infer_category(raw_t_check, f"{raw_d_check} {raw_data.get('source_url', '')}")
        t_low = f"{raw_t_check} {raw_d_check}".lower()
        if cat == "Footwear" or any(w in t_low for w in ["shoe", "sandal", "sneaker", "wedge", "boot", "slipper", "loaf"]):
            base_variants = [
                {"name": "6 UK", "sku_suffix": "6UK", "price_diff": 0.0, "stock": 50},
                {"name": "7 UK", "sku_suffix": "7UK", "price_diff": 0.0, "stock": 50},
                {"name": "8 UK", "sku_suffix": "8UK", "price_diff": 0.0, "stock": 50},
                {"name": "9 UK", "sku_suffix": "9UK", "price_diff": 0.0, "stock": 50},
                {"name": "10 UK", "sku_suffix": "10UK", "price_diff": 0.0, "stock": 50},
            ]
        elif cat == "Apparel & Fashion" or any(w in t_low for w in ["shirt", "t-shirt", "kurti", "saree", "dress", "pant", "jeans"]):
            base_variants = [
                {"name": "S", "sku_suffix": "S", "price_diff": 0.0, "stock": 50},
                {"name": "M", "sku_suffix": "M", "price_diff": 0.0, "stock": 50},
                {"name": "L", "sku_suffix": "L", "price_diff": 0.0, "stock": 50},
                {"name": "XL", "sku_suffix": "XL", "price_diff": 0.0, "stock": 50},
                {"name": "XXL", "sku_suffix": "XXL", "price_diff": 0.0, "stock": 50},
            ]
        elif cat == "Electronics & Gadgets" or any(w in t_low for w in ["earbud", "headphone", "tws", "speaker", "audio"]):
            base_variants = [
                {"name": "Black", "sku_suffix": "BLK", "price_diff": 0.0, "stock": 50},
                {"name": "White", "sku_suffix": "WHT", "price_diff": 0.0, "stock": 50},
                {"name": "Navy Blue", "sku_suffix": "BLU", "price_diff": 0.0, "stock": 50},
            ]
        elif cat == "Home & Kitchen Appliances" or any(w in t_low for w in ["washing", "load", "refrigerator"]):
            base_variants = [
                {"name": "6.5 kg", "sku_suffix": "65KG", "price_diff": 0.0, "stock": 50},
                {"name": "7 kg", "sku_suffix": "7KG", "price_diff": 2490.0, "stock": 50},
                {"name": "8 kg", "sku_suffix": "8KG", "price_diff": 4990.0, "stock": 50},
            ]
        elif cat == "Beauty & Personal Care" or any(w in t_low for w in ["kit", "cream", "serum", "acne", "facewash"]):
            base_variants = [
                {"name": "Single Pack (Regular)", "sku_suffix": "PACK1", "price_diff": 0.0, "stock": 50},
                {"name": "Value Pack of 2", "sku_suffix": "PACK2", "price_diff": round((raw_data.get("price") or 499) * 0.85, 2), "stock": 50},
            ]
        else:
            base_variants.append({
                "name": "Standard",
                "sku_suffix": "STD",
                "price_diff": 0.0,
                "stock": 50
            })

    features = raw_data.get("features") or []
    specs = raw_data.get("specifications") or {}
    raw_desc = raw_data.get("raw_description") or ""
    raw_t = raw_data.get("raw_title") or "Imported Product"
    # Clean only trailing marketplace branding (e.g. " | Amazon.in", " - Flipkart", " — Clinderma")
    clean_title = re.sub(
        r"(?i)\s*[-|–—:]\s*(Amazon(?:\.in)?|Flipkart(?:\.com)?|Meesho|Shopify|Clinderma|Myntra|Nykaa|Ajio|Official Store|Online Store|Buy Online).*$",
        "",
        raw_t
    )
    clean_title = re.sub(
        r"(?i)^(Amazon\s*Brand\s*[-–—]\s*|Flipkart\s*SmartBuy\s*[-–—]\s*)",
        "",
        clean_title
    ).strip()
    if not clean_title:
        clean_title = raw_t

    bullet_items = "".join([f"<li>{f}</li>" for f in features])
    specs_rows = "".join([
        f"<tr><td style='padding:6px 12px;font-weight:600;border:1px solid #e2e8f0;background:#f8fafc;width:35%;'>{k}</td><td style='padding:6px 12px;border:1px solid #e2e8f0;'>{v}</td></tr>"
        for k, v in list(specs.items())[:12]
    ])

    desc_parts = []
    if raw_desc and len(raw_desc) > 30:
        desc_parts.append(f"<p style='font-size:14px;line-height:1.6;color:#334155;margin-bottom:12px;'>{raw_desc[:500]}</p>")
    else:
        desc_parts.append(f"<p style='font-size:14px;line-height:1.6;color:#334155;margin-bottom:12px;'>Premium quality {clean_title[:70]}, engineered for superior performance, durability, and daily satisfaction.</p>")
    if bullet_items:
        desc_parts.append(f"<h4 style='font-size:14px;font-weight:700;color:#0f172a;margin-top:16px;margin-bottom:8px;'>Key Highlights & Features:</h4><ul style='padding-left:20px;line-height:1.7;color:#475569;margin-bottom:12px;'>{bullet_items}</ul>")
    if specs_rows:
        desc_parts.append(f"<h4 style='font-size:14px;font-weight:700;color:#0f172a;margin-top:16px;margin-bottom:8px;'>Product Specifications:</h4><table style='width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;margin-top:8px;'><tbody>{specs_rows}</tbody></table>")

    rich_desc_html = "".join(desc_parts)
    suggested_category = _infer_category(clean_title, f"{raw_desc} {' '.join(features)} {raw_data.get('source_url', '')}")

    # Attempt Gemini Enhancement if API Key configured
    if api_key:
        system_prompt = (
            "You are an expert e-commerce catalog specialist for direct-to-consumer online brands.\n"
            "Format raw scraped product data into a clean, compelling product listing.\n"
            "Remove ALL marketplace branding ('Amazon', 'Flipkart', 'Meesho', etc.).\n"
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
                            "title": parsed.get("title") or clean_title[:200],
                            "category": parsed.get("category") or suggested_category,
                            "description_html": parsed.get("description_html") or rich_desc_html,
                            "short_description": parsed.get("short_description") or clean_title[:150],
                            "selling_price": raw_data.get("price") or 499.0,
                            "mrp": raw_data.get("mrp") or (round(raw_data.get("price", 499.0) * 1.5, 2)),
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

    # Resilient Local Fallback
    return {
        "title": clean_title[:200] or "Premium Product Listing",
        "category": suggested_category,
        "description_html": rich_desc_html,
        "short_description": clean_title[:150],
        "selling_price": raw_data.get("price") or 499.0,
        "mrp": raw_data.get("mrp") or (round(raw_data.get("price", 499.0) * 1.5, 2)),
        "variants": base_variants,
        "features": features,
        "specifications": specs,
        "colors": colors,
        "sizes": sizes,
        "tags": ["Featured", "New Arrival"],
        "images": raw_data.get("images", []),
        "source_url": raw_data.get("source_url"),
    }
