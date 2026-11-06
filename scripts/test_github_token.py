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
    print("No token found")
    exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DigitalGrowthStudio"
}

# Test repo access
r = requests.get("https://api.github.com/repos/digitalgrowthstudioteam/Ai-Platform", headers=headers)
print("Repo status:", r.status_code, r.json().get("full_name"))

