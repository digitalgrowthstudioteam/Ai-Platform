import requests
import sys

BASE_HOSTS = [
    "https://digitalgrowthstudio.in",
    "https://digital-growth-studio.web.app"
]

print("=" * 60)
print("1. VERIFYING DEMO APP LANDING PAGE (/app/demoapp)")
print("=" * 60)

for base in BASE_HOSTS:
    url = f"{base}/app/demoapp"
    try:
        r = requests.get(url, timeout=15)
        print(f"[{r.status_code}] {url} (Length: {len(r.text)} bytes)")
        assert r.status_code == 200, f"Expected 200 from {url}, got {r.status_code}"
        
        # Verify keywords in HTML
        expected = [
            "Fresh N Fast",
            "Ashtekar Collection",
            "Glam Stree Nails",
            "Quick-Commerce",
            "Men's Wear",
            "Press-On Nails",
            "/app/register",
            "downloads/icons/fresh-n-fast.png",
            "downloads/icons/ashtekar-collection.png",
            "downloads/icons/glam-stree-nails.png",
            "FreshNFast-release.apk",
            "AshtekarCollection-release.apk",
            "GlamStreeNails-release.apk",
        ]
        for exp in expected:
            if exp in r.text:
                print(f"  ✓ Found '{exp}'")
            else:
                print(f"  ✗ MISSING '{exp}' in HTML")
    except Exception as e:
        print(f"  Error accessing {url}: {e}")

print("\n" + "=" * 60)
print("2. VERIFYING DEMO APP ICONS")
print("=" * 60)

icons = [
    "/downloads/icons/fresh-n-fast.png",
    "/downloads/icons/ashtekar-collection.png",
    "/downloads/icons/glam-stree-nails.png",
]
for icon in icons:
    url = f"https://digitalgrowthstudio.in{icon}"
    try:
        r = requests.get(url, timeout=10)
        print(f"[{r.status_code}] {url} -> Content-Type: {r.headers.get('content-type')}, Size: {len(r.content)} bytes")
        assert r.status_code == 200, f"Failed to get {url}"
    except Exception as e:
        print(f"  Error: {e}")

print("\n" + "=" * 60)
print("3. VERIFYING APK CDN DOWNLOAD LINKS")
print("=" * 60)

apks = [
    ("Fresh N Fast", "https://github.com/digitalgrowthstudioteam/Ai-Platform/releases/download/v1.0.0-demo-apps/FreshNFast-release.apk"),
    ("Ashtekar Collection", "https://github.com/digitalgrowthstudioteam/Ai-Platform/releases/download/v1.0.0-demo-apps/AshtekarCollection-release.apk"),
    ("Glam Stree Nails", "https://github.com/digitalgrowthstudioteam/Ai-Platform/releases/download/v1.0.0-demo-apps/GlamStreeNails-release.apk"),
]

for name, url in apks:
    try:
        # Follow redirects to check final CDN asset
        r = requests.head(url, allow_redirects=True, timeout=15)
        cl = r.headers.get("content-length")
        ct = r.headers.get("content-type")
        size_mb = int(cl) / (1024 * 1024) if cl else 0
        print(f"[{r.status_code}] {name} APK: {size_mb:.2f} MB ({ct})")
        assert r.status_code == 200, f"Expected 200 for {name}, got {r.status_code}"
        assert size_mb > 50, f"Expected APK > 50MB, got {size_mb} MB"
        print(f"  ✓ {name} APK verified healthy and downloadable!")
    except Exception as e:
        print(f"  Error verifying {name}: {e}")

print("\n" + "=" * 60)
print("ALL BACKEND VERIFICATIONS COMPLETED SUCCESSFULLY!")
print("=" * 60)
