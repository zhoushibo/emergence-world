"""生成 2048 PBR 纹理 — Color + Normal + Roughness"""
import os, numpy as np
from PIL import Image, ImageFilter, ImageDraw

OUT = r"D:\model\emergence-world_1\emergence-world\public\models\buildings\textures\hq"
os.makedirs(OUT, exist_ok=True)
S = 2048
rng = np.random.RandomState(42)

def to_normal(img):
    gray = np.array(img.convert('L')).astype('float32')
    gy, gx = np.gradient(gray)
    n = np.zeros((S, S, 3), dtype='uint8')
    n[:,:,0] = np.clip(gx / 3 + 128, 0, 255).astype('uint8')
    n[:,:,1] = np.clip(gy / 3 + 128, 0, 255).astype('uint8')
    n[:,:,2] = 255
    return n

def save(name, c, n=None, r=None):
    p = lambda x: os.path.join(OUT, x)
    c.save(p(f"{name}_color.png"))
    if n is not None: Image.fromarray(n).save(p(f"{name}_normal.png"))
    if r is not None: r.save(p(f"{name}_rough.png"))
    print(f"  {name}: {os.path.getsize(p(f'{name}_color.png'))//1024}KB")

# ===== BRICK =====
print("brick...")
bw, bh, mortar = 200, 80, 5
brick = Image.new('RGB', (S, S), (75, 55, 35))
rough = Image.new('L', (S, S), 180)
bd, rd = ImageDraw.Draw(brick), ImageDraw.Draw(rough)

for y in range(0, S+bh, bh+mortar):
    off = (y//(bh+mortar))%2 * (bw//2)
    for x in range(-bw+off, S+bw, bw+mortar):
        x0, y0 = max(0, x+mortar), max(0, y+mortar)
        x1, y1 = min(S, x+bw), min(S, y+bh)
        if x0>=x1 or y0>=y1: continue
        bd.rectangle([x0,y0,x1,y1], fill=(rng.randint(150,190), rng.randint(115,155), rng.randint(85,125)))
        rd.rectangle([x0,y0,x1,y1], fill=rng.randint(190,250))

pix_b, rp_b = brick.load(), rough.load()
for _ in range(50000):
    x, y = rng.randint(0, S-1), rng.randint(0, S-1)
    p = pix_b[x, y]
    pix_b[x, y] = tuple(max(0,min(255,p[i]+rng.randint(-12,12))) for i in range(3))
    rp_b[y, x] = rng.randint(170,250)

brick = brick.filter(ImageFilter.GaussianBlur(0.8))
rough = rough.filter(ImageFilter.GaussianBlur(0.5))
save("brick", brick, to_normal(brick), rough)

# ===== CONCRETE =====
print("concrete...")
conc = Image.new('RGB', (S, S), (190, 185, 178))
rough_c = Image.new('L', (S, S), 140)
cd, rd = ImageDraw.Draw(conc), ImageDraw.Draw(rough_c)

for px in range(0, S, 350):
    cd.line([(px,0),(px,S)], fill=(150,145,138), width=4)
    cd.line([(0,px),(S,px)], fill=(150,145,138), width=4)
    rd.line([(px,0),(px,S)], fill=80, width=4)
    rd.line([(0,px),(S,px)], fill=80, width=4)

pix_c, rp_c = conc.load(), rough_c.load()
for _ in range(8000):
    x, y = rng.randint(8, S-8), rng.randint(8, S-8)
    r = rng.randint(1, 3)
    cb = rng.randint(165, 200)
    for dy in range(-r, r+1):
        for dx in range(-r, r+1):
            if dx*dx+dy*dy <= r*r:
                nx, ny = x+dx, y+dy
                if 0<=nx<S and 0<=ny<S:
                    pix_c[nx, ny] = (cb, cb-4, cb-7)
                    rp_c[ny, nx] = rng.randint(90, 160)

conc = conc.filter(ImageFilter.GaussianBlur(0.6))
rough_c = rough_c.filter(ImageFilter.GaussianBlur(0.4))
save("concrete", conc, to_normal(conc), rough_c)

# ===== METAL =====
print("metal...")
metal = Image.new('RGB', (S, S), (130, 133, 140))
rough_m = Image.new('L', (S, S), 100)
md, rd = ImageDraw.Draw(metal), ImageDraw.Draw(rough_m)

for i in range(14):
    x0 = i * (S//14)
    md.rectangle([x0,0,x0+S//14-1,S], fill=(rng.randint(110,150), rng.randint(113,153), rng.randint(120,160)))
    md.line([(x0+S//14-1,0),(x0+S//14-1,S)], fill=(70,73,80), width=1)
    rd.rectangle([x0,0,x0+S//14-1,S], fill=rng.randint(90,120))
    rd.line([(x0+S//14-1,0),(x0+S//14-1,S)], fill=50, width=1)

pix_m, rp_m = metal.load(), rough_m.load()
for _ in range(5000):
    x, y = rng.randint(0,S-1), rng.randint(0,S-1)
    L, d = rng.randint(10,50), rng.randint(0,1)
    for i in range(L):
        cx = min(S-1, x+(i if d==0 else 0))
        cy = min(S-1, y+(i if d==1 else 0))
        pix_m[cx, cy] = tuple(rng.randint(170,210) for _ in range(3))
        rp_m[cy, cx] = rng.randint(50,90)

metal = metal.filter(ImageFilter.GaussianBlur(0.4))
rough_m = rough_m.filter(ImageFilter.GaussianBlur(0.3))
save("metal", metal, to_normal(metal), rough_m)

print(f"\nDone — {len(os.listdir(OUT))} files")
for f in sorted(os.listdir(OUT)):
    print(f"  {f}: {os.path.getsize(os.path.join(OUT, f))//1024}KB")
