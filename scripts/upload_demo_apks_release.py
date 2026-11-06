import os
import subprocess
import requests

# 1. Get token
p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
out, _ = p.communicate('protocol=https\nhost=github.com\n')
token = None
for line in out.splitlines():
    if line.startswith('password='):
        token = line.split('=', 1)[1].strip()

if not token:
    print("Error: Could not retrieve GitHub token")
    exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DigitalGrowthStudio"
}

repo = "digitalgrowthstudioteam/Ai-Platform"
tag = "v1.0.0-demo-apps"

# 2. Check if release exists
r = requests.get(f"https://api.github.com/repos/{repo}/releases/tags/{tag}", headers=headers)
if r.status_code == 200:
    release = r.json()
    print("Found existing release:", release["id"])
else:
    # Create release
    payload = {
        "tag_name": tag,
        "target_commitish": "main",
        "name": "Digital Growth Studio — Demo Android Applications",
        "body": "Official demo Android APKs for Digital Growth Studio multi-vendor app platform showcase:\n- Fresh N Fast (Quick Commerce & Hyperlocal Grocery)\n- Ashtekar Collection (Men's Wear & Ethnic Fashion)\n- Glam Stree Nails (Beauty & Handcrafted Press-on Nails)",
        "draft": False,
        "prerelease": False
    }
    r = requests.post(f"https://api.github.com/repos/{repo}/releases", headers=headers, json=payload)
    if r.status_code not in (200, 201):
        print("Failed to create release:", r.status_code, r.text)
        exit(1)
    release = r.json()
    print("Created new release:", release["id"])

upload_url_template = release["upload_url"].split("{")[0]

# Existing assets
existing_assets = {a["name"]: a["id"] for a in release.get("assets", [])}
print("Existing assets in release:", list(existing_assets.keys()))

apks = [
    {
        "name": "FreshNFast-release.apk",
        "path": r"D:\App\Digital Growth Studio\frontend\public\downloads\FreshNFast-release.apk"
    },
    {
        "name": "AshtekarCollection-release.apk",
        "path": r"D:\App\Digital Growth Studio\frontend\public\downloads\AshtekarCollection-release.apk"
    },
    {
        "name": "GlamStreeNails-release.apk",
        "path": r"D:\App\Digital Growth Studio\frontend\public\downloads\GlamStreeNails-release.apk"
    }
]

for apk in apks:
    fname = apk["name"]
    fpath = apk["path"]
    if fname in existing_assets:
        print(f"Asset {fname} already uploaded, deleting old asset...")
        del_r = requests.delete(f"https://api.github.com/repos/{repo}/releases/assets/{existing_assets[fname]}", headers=headers)
        print("Delete old asset status:", del_r.status_code)

    print(f"Uploading {fname} ({os.path.getsize(fpath)} bytes)...")
    with open(fpath, "rb") as f:
        file_bytes = f.read()

    upload_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/vnd.android.package-archive",
        "User-Agent": "DigitalGrowthStudio"
    }
    up_r = requests.post(f"{upload_url_template}?name={fname}", headers=upload_headers, data=file_bytes)
    if up_r.status_code in (200, 201):
        asset_info = up_r.json()
        print(f"Uploaded {fname} successfully! Download URL: {asset_info['browser_download_url']}")
    else:
        print(f"Upload {fname} failed:", up_r.status_code, up_r.text)

print("All APK uploads complete!")

