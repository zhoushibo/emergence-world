"""生成程序化建筑纹理 — 砖墙/混凝土/金属面板"""
import os
from PIL import Image, ImageDraw, ImageFilter
import random
import math

OUT = r"D:\model\emergence-world_1\emergence-world\public\models\buildings\textures"
os.makedirs(OUT, exist_ok=True)

random.seed(42)

def brick_wall(w=512, h=512, brick_w=80, brick_h=30, mortar=3, colors=None):
    """生成砖墙纹理 + 粗糙度图"""
    if colors is None:
        colors = [(180,150,120), (160,130,100), (170,140,110), (155,125,105), (175,145,115)]
    
    img = Image.new('RGB', (w, h), (80,60,40))  # 砂浆底色
    rough = Image.new('L', (w, h), 200)  # 粗糙度: 砖粗糙, 砂浆光滑
    
    for y in range(0, h, brick_h + mortar):
        offset = (y // (brick_h + mortar)) % 2 * (brick_w // 2)
        for x in range(-brick_w + offset, w + brick_w, brick_w + mortar):
            c = random.choice(colors)
            # 每块砖颜色微调
            r = min(255, max(0, c[0] + random.randint(-15, 15)))
            g = min(255, max(0, c[1] + random.randint(-15, 15)))
            b = min(255, max(0, c[2] + random.randint(-15, 15)))
            
            bx = x + mortar
            by = y + mortar
            bw = min(brick_w - mortar, w - bx)
            bh = min(brick_h - mortar, h - by)
            if bw > 0 and bh > 0:
                rect = Image.new('RGB', (bw, bh), (r, g, b))
                img.paste(rect, (bx, by))
                ImageDraw.Draw(rough).rectangle([bx, by, bx+bw-1, by+bh-1], fill=random.randint(180, 240))
    
    return img, rough

def concrete_panels(w=512, h=512, panel_size=120, color=(180,175,170)):
    """混凝土面板纹理 — 有接缝和微孔"""
    img = Image.new('RGB', (w, h), color)
    rough = Image.new('L', (w, h), 130)
    draw = ImageDraw.Draw(img)
    rdraw = ImageDraw.Draw(rough)
    
    # 面板接缝
    for x in range(0, w, panel_size):
        draw.line([(x, 0), (x, h)], fill=(140,135,130), width=3)
        rdraw.line([(x, 0), (x, h)], fill=80, width=3)
    for y in range(0, h, panel_size):
        draw.line([(0, y), (w, y)], fill=(140,135,130), width=3)
        rdraw.line([(0, y), (w, y)], fill=80, width=3)
    
    # 微孔/斑点
    for _ in range(200):
        x, y = random.randint(4, w-4), random.randint(4, h-4)
        r = random.randint(1, 3)
        c = random.randint(160, 195)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(c, c-5, c-8))
        rdraw.ellipse([x-r, y-r, x+r, y+r], fill=random.randint(100, 160))
    
    return img, rough

def metal_panels(w=512, h=512, strips=8, color=(120,125,135)):
    """金属竖条面板 — 竖向条纹 + 微锈"""
    img = Image.new('RGB', (w, h), color)
    rough = Image.new('L', (w, h), 100)
    draw = ImageDraw.Draw(img)
    
    strip_w = w // strips
    for i in range(strips):
        x0 = i * strip_w
        x1 = x0 + strip_w - 2
        c = (min(255, color[0] + random.randint(-10, 15)),
             min(255, color[1] + random.randint(-10, 15)),
             min(255, color[2] + random.randint(-10, 10)))
        draw.rectangle([x0, 0, x1, h], fill=c, outline=(color[0]-30, color[1]-30, color[2]-30), width=1)
        
    # 微锈点
    for _ in range(80):
        x, y = random.randint(0, w-1), random.randint(0, h-1)
        draw.point((x, y), fill=(random.randint(100, 180), random.randint(70, 120), random.randint(40, 80)))
    
    return img, rough

def noise_roughness(w=256, h=256):
    """生成噪声粗糙度图"""
    img = Image.new('L', (w, h))
    for y in range(h):
        for x in range(w):
            v = int(100 + 80 * (math.sin(x*0.05) * math.cos(y*0.05) + math.sin((x+y)*0.03)*0.5))
            img.putpixel((x, y), max(0, min(255, v)))
    img = img.filter(ImageFilter.GaussianBlur(3))
    return img

# ─── 生成 ──────────────────────────────────────────────
print("Generating textures...")

brick_img, brick_rough = brick_wall()
brick_img.save(os.path.join(OUT, "brick_color.png"))
brick_rough.save(os.path.join(OUT, "brick_rough.png"))

conc_img, conc_rough = concrete_panels()
conc_img.save(os.path.join(OUT, "concrete_color.png"))
conc_rough.save(os.path.join(OUT, "concrete_rough.png"))

metal_img, metal_rough = metal_panels()
metal_img.save(os.path.join(OUT, "metal_color.png"))
metal_rough.save(os.path.join(OUT, "metal_rough.png"))

noise_rough = noise_roughness()
noise_rough.save(os.path.join(OUT, "noise_rough.png"))

files = os.listdir(OUT)
print(f"Done: {len(files)} files in {OUT}")
for f in sorted(files):
    print(f"  {f}: {os.path.getsize(os.path.join(OUT, f))} bytes")
