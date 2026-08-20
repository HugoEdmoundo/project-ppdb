import asyncio
import logging
from fastapi.testclient import TestClient
from src.main import app
import httpx

def test_all_endpoints():
    client = TestClient(app)
    schema = app.openapi()
    paths = schema.get("paths", {})
    failed = []
    
    for path, path_item in paths.items():
        if "events" in path or "webhook" in path:
            print(f"SKIPPING (SSE/Webhook): {path}")
            continue
            
        for method, operation in path_item.items():
            if method.upper() in ["HEAD", "OPTIONS"]:
                continue
            
            try:
                import re
                test_path = re.sub(r'\{[^}]+\}', '1', path)
                
                method_upper = method.upper()
                # Use a small timeout to prevent hanging on streams or deadlocks
                if method_upper == "GET":
                    res = client.get(test_path, timeout=5.0)
                elif method_upper == "POST":
                    res = client.post(test_path, json={}, timeout=5.0)
                elif method_upper == "PUT":
                    res = client.put(test_path, json={}, timeout=5.0)
                elif method_upper == "DELETE":
                    res = client.delete(test_path, timeout=5.0)
                elif method_upper == "PATCH":
                    res = client.patch(test_path, json={}, timeout=5.0)
                else:
                    continue
                    
                if res.status_code == 500:
                    failed.append({
                        "path": path,
                        "method": method_upper,
                        "error": res.text
                    })
                    print(f"FAILED (500): {method_upper} {path}")
                else:
                    print(f"OK ({res.status_code}): {method_upper} {path}")
            except httpx.ReadTimeout:
                failed.append({
                    "path": path,
                    "method": method_upper,
                    "error": "Timeout (possibly hanging)"
                })
                print(f"TIMEOUT: {method_upper} {path}")
            except Exception as e:
                failed.append({
                    "path": path,
                    "method": method_upper,
                    "error": str(e)
                })
                print(f"EXCEPTION: {method_upper} {path} - {str(e)}")
                
    if failed:
        print("\n\n--- ERRORS FOUND ---")
        for f in failed:
            print(f"{f['method']} {f['path']} - {f['error']}")
        assert len(failed) == 0, f"Found {len(failed)} problematic endpoints"
    else:
        print("\n\n--- NO ERRORS FOUND ---")

if __name__ == "__main__":
    test_all_endpoints()
