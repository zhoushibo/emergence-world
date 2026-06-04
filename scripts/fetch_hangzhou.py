"""Fetch Hangzhou OSM buildings and save as local JSON"""
import requests, json, math, os, time, sys

# 杭州核心区域
bboxes = [
    (30.260, 120.155, 30.278, 120.178),  # 武林-湖滨
    (30.248, 120.158, 30.262, 120.180),  # 吴山-河坊街
    (30.240, 120.160, 30.252, 120.182),  # 城南
]

all_elements = []
seen_ids = set()

for bbox in bboxes:
    s, w, n, e = bbox
    query = f'[out:json];way["building"]({s},{w},{n},{e});out geom 300;'
    print(f"Fetching {s},{w} to {n},{e}")
    for attempt in range(3):
        try:
            resp = requests.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": query},
                timeout=30,
                headers={"User-Agent": "EmergenceWorld/1.0"}
            )
            if resp.status_code == 200:
                data = resp.json()
                for el in data.get("elements", []):
                    if el["id"] not in seen_ids:
                        seen_ids.add(el["id"])
                        all_elements.append(el)
                print(f"  Got {len(data.get('elements',[]))} buildings")
                break
            elif resp.status_code == 429:
                wait = 5 * (attempt + 1)
                print(f"  Rate limited, waiting {wait}s")
                time.sleep(wait)
            else:
                print(f"  HTTP {resp.status_code}: {resp.text[:100]}")
        except Exception as ex:
            print(f"  Error: {ex}")
            time.sleep(3)

print(f"\nTotal: {len(all_elements)} buildings")

if len(all_elements) == 0:
    print("ERROR: No data fetched")
    sys.exit(1)

# Compute center
lats, lons = [], []
for el in all_elements:
    if "geometry" in el:
        for pt in el["geometry"]:
            lats.append(pt["lat"])
            lons.append(pt["lon"])

center_lat = sum(lats) / len(lats)
center_lon = sum(lons) / len(lons)
cos_lat = math.cos(center_lat * math.pi / 180)
M_PER_LAT = 111320
M_PER_LON = 111320 * cos_lat

def to_local(lat, lon):
    x = (lon - center_lon) * M_PER_LON
    z = -(lat - center_lat) * M_PER_LAT
    return round(x, 2), round(z, 2)

buildings = []
for el in all_elements:
    if "geometry" not in el or len(el["geometry"]) < 3:
        continue
    
    pts = el["geometry"]
    poly = [to_local(p["lat"], p["lon"]) for p in pts]
    
    tags = el.get("tags", {})
    height = None
    if "height" in tags:
        try: height = float(tags["height"])
        except: pass
    if height is None and "building:levels" in tags:
        try: height = float(tags["building:levels"]) * 3.5
        except: pass
    if height is None:
        btype = tags.get("building", "")
        hmap = {
            "skyscraper": 40, "office": 25, "commercial": 20,
            "hotel": 22, "apartments": 18, "residential": 15,
            "house": 5, "school": 12, "hospital": 20,
            "industrial": 10, "retail": 12, "supermarket": 10,
            "yes": 10
        }
        height = hmap.get(btype, 8 + hash(str(el["id"])) % 12)
    
    buildings.append({
        "polygon": poly,
        "height": round(height, 1),
        "name": tags.get("name", tags.get("name:zh", "")),
        "type": tags.get("building", "yes"),
        "levels": tags.get("building:levels", ""),
    })

out_dir = r"D:\model\emergence-world_1\emergence-world\public\data"
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "hangzhou_buildings.json")

with open(out_path, "w", encoding="utf-8") as f:
    json.dump({
        "center": [center_lat, center_lon],
        "center_local": [0, 0],
        "buildings": buildings,
        "count": len(buildings),
    }, f, ensure_ascii=False, indent=2)

size_kb = os.path.getsize(out_path) / 1024
print(f"Saved {len(buildings)} buildings to {out_path} ({size_kb:.0f}KB)")
