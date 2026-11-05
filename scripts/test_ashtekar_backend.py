import urllib.request
import json
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

base = "https://digital-growth-studio-api.onrender.com/api/store/ashtekar-collection"
endpoints = ["config", "banners", "categories", "products"]

print("==================================================")
print("🔍 BACKEND API VERIFICATION: ASHTEKAR COLLECTION")
print("==================================================")

for ep in endpoints:
    url = f"{base}/{ep}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "DGS-BackendTest/1.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if ep == "config":
                print(f"✓ {ep.upper()}: HTTP {resp.status}")
                print(f"   Store Name:     {data.get('store_name')}")
                print(f"   Primary Color:  {data.get('primary_color')} (Deep Royal Charcoal Navy)")
                print(f"   Secondary Color:{data.get('secondary_color')} (Imperial Sovereign Gold)")
                print(f"   Logo URL Base64:{len(str(data.get('logo_url')))} chars")
                print(f"   COD Enabled:    {data.get('cod_enabled')}")
            else:
                print(f"✓ {ep.upper()}: HTTP {resp.status} — Total items: {len(data)}")
                if len(data) > 0 and isinstance(data, list):
                    for idx, item in enumerate(data[:3]):
                        title = item.get("title") or item.get("name")
                        print(f"   [{idx+1}] {title}")
    except Exception as e:
        print(f"✗ {ep.upper()} Error: {e}")

print("==================================================")

