import urllib.request
import json

# Check Render backend health and admin vendors
url = "https://digital-growth-studio-api.onrender.com/api/v1/ping"
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=15) as res:
        print("Ping status:", res.status, res.read().decode())
except Exception as e:
    print("Ping failed:", e)

# Test login as super admin
login_url = "https://digital-growth-studio-api.onrender.com/api/v1/platform/auth/login"
try:
    data = json.dumps({"email": "vikramwadkar@gmail.com", "password": "password123"}).encode()
    req = urllib.request.Request(login_url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as res:
        login_res = json.loads(res.read().decode())
        token = login_res.get("access_token")
        print("Login success, token prefix:", token[:20] if token else "None")
        
        # Test vendors API
        v_url = "https://digital-growth-studio-api.onrender.com/api/v1/platform/admin/vendors"
        v_req = urllib.request.Request(v_url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(v_req, timeout=15) as v_res:
            vendors = json.loads(v_res.read().decode())
            print(f"Total vendors returned: {len(vendors)}")
            for v in vendors[:5]:
                print(f" - {v.get('vendor_code')}: {v.get('business_name')} (Hyperlocal: {v.get('hyperlocal_enabled')})")
except Exception as e:
    print("Admin test error:", e)

