import os
import subprocess
import requests

# 1. Get token from git credential
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

r = requests.get(f"https://api.github.com/repos/{repo}/releases/tags/{tag}", headers=headers)
if r.status_code != 200:
    print("Release not found:", r.status_code)
    exit(1)

release = r.json()
upload_url_template = release["upload_url"].split("{")[0]
existing_assets = {a["name"]: a["id"] for a in release.get("assets", [])}

fname = "DGSPartner-release.apk"
fpath = r"D:\App\Digital Growth Studio\vendors\partner-app\builds\DGSPartner-release.apk"

if fname in existing_assets:
    print(f"Deleting old {fname}...")
    requests.delete(f"https://api.github.com/repos/{repo}/releases/assets/{existing_assets[fname]}", headers=headers)

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
    print(f"Uploaded successfully! Download URL: {asset_info['browser_download_url']}")
else:
    print("Upload failed:", up_r.status_code, up_r.text)
