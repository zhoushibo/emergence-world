"""
Blender Python 脚本：程序化生成 18 栋建筑 GLB 模型
用法：在 Blender 中打开 Scripting 工作区 → 打开此文件 → Run Script
输出：D:\\workspace\\emergence-world\\public\\models\\buildings\\*.glb
"""

import bpy
import math
import os
from mathutils import Vector

# 确保 glTF 2.0 导出插件已启用（无头模式需手动注册）
addon_name = "io_scene_gltf2"
try:
    # background 模式下通过直接操作 preferences 来启用
    import addon_utils
    addon_utils.enable(addon_name, default_set=True, persistent=True)
    print(f"已启用插件: {addon_name}")
except Exception as e:
    print(f"启用插件 {addon_name}: {e}")

# ─── 输出路径 ───────────────────────────────────────────────
OUT_DIR = r"D:\workspace\emergence-world\public\models\buildings"

# ─── 建筑配置 (与 locations.ts 一致) ──────────────────────
BUILDINGS = [
    # id, name, type, size[w,h,d], color, roofColor
    # 第一排（北面）
    ("research_institute", "研究院", "institution", (4, 5, 4), "#f97316", "#ea580c"),
    ("hospital", "医院", "institution", (4, 4, 5), "#f97316", "#ea580c"),
    ("school", "学校", "institution", (4, 3.5, 4), "#f97316", "#ea580c"),
    ("police_station", "警察局", "institution", (3, 3.5, 3), "#f97316", "#ea580c"),
    # 第二排
    ("apartment_complex", "公寓小区", "residential", (4, 6, 3), "#a78bfa", "#8b5cf6"),
    ("office_tower", "写字楼", "workplace", (3, 8, 3), "#3b82f6", "#2563eb"),
    ("tech_hub", "科技中心", "workplace", (5, 7, 4), "#3b82f6", "#2563eb"),
    ("coding_lab", "编程实验室", "workplace", (3, 4, 3), "#3b82f6", "#2563eb"),
    # 第三排
    ("writers_studio", "作家工作室", "commercial", (3, 3, 3), "#fbbf24", "#f59e0b"),
    ("coffee_shop", "咖啡馆", "commercial", (2.5, 2.5, 2.5), "#fbbf24", "#f59e0b"),
    ("restaurant_row", "美食街", "commercial", (5, 2.5, 2), "#fbbf24", "#f59e0b"),
    ("shopping_mall", "购物中心", "commercial", (5, 4, 4), "#fbbf24", "#f59e0b"),
    # 第四排
    ("central_park", "中央公园", "outdoor", (5, 0.3, 5), "#4ade80", "#22c55e"),
    ("subway_station", "地铁站", "transit", (4, 2, 3), "#94a3b8", "#64748b"),
    ("city_hall", "市政厅", "government", (4, 5, 4), "#ef4444", "#dc2626"),
    ("bank", "银行", "financial", (3, 4, 3), "#14b8a6", "#0d9488"),
    # 第五排
    ("devops_center", "运维中心", "institution", (3, 3.5, 3), "#f97316", "#ea580c"),
    ("bookstore", "书店", "commercial", (3, 3, 3), "#fbbf24", "#f59e0b"),
]

# ─── 颜色工具 ───────────────────────────────────────────────
def hex_to_rgb(hex_str):
    """#RRGGBB → (R, G, B) in 0-1 range"""
    h = hex_str.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))


def darken(rgb, factor=0.7):
    """深色版本"""
    return tuple(c * factor for c in rgb)


# ─── 材质工具 ───────────────────────────────────────────────
def make_mat(name, color, roughness=0.5, metalness=0.3, emissive=None, emissive_strength=0):
    """创建 PBR 材质"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metalness
    if emissive:
        bsdf.inputs["Emission Color"].default_value = (*emissive, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emissive_strength
    return mat


def make_emissive_mat(name, color, strength=0.8):
    """发光材质（窗户）"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    rgb = (*color, 1.0)
    bsdf.inputs["Base Color"].default_value = rgb
    bsdf.inputs["Emission Color"].default_value = rgb
    bsdf.inputs["Emission Strength"].default_value = strength
    bsdf.inputs["Roughness"].default_value = 0.1
    bsdf.inputs["Metallic"].default_value = 0.8
    return mat


def make_emissive_mat_dark(color):
    """暗窗材质"""
    mat = bpy.data.materials.new(name="window_dark")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    dark = (*darken(color, 0.1), 1.0)
    bsdf.inputs["Base Color"].default_value = dark
    bsdf.inputs["Emission Color"].default_value = dark
    bsdf.inputs["Emission Strength"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.3
    bsdf.inputs["Metallic"].default_value = 0.5
    bsdf.inputs["Alpha"].default_value = 0.5
    return mat


# ─── 几何工具 ───────────────────────────────────────────────
def add_box(w, h, d, name, mat):
    """添加一个立方体"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (w, d, h)  # Blender: Z is up
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.append(mat)
    return obj


def add_cylinder(radius, depth, name, mat, location=(0, 0, 0)):
    """添加圆柱体"""
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius, depth=depth, location=location, vertices=8
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def add_cone(radius, depth, name, mat, location=(0, 0, 0)):
    """添加圆锥体"""
    bpy.ops.mesh.primitive_cone_add(
        radius1=radius, radius2=0, depth=depth, location=location, vertices=8
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def add_plane(w, h, name, mat, location=(0, 0, 0), rotation=(0, 0, 0)):
    """添加平面"""
    bpy.ops.mesh.primitive_plane_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (w, h, 1)
    bpy.ops.object.transform_apply(scale=True)
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    return obj


def add_sphere(radius, name, mat, location=(0, 0, 0)):
    """添加球体"""
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=radius, location=location, segments=8, ring_count=6
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def select_only(obj):
    """只选中一个对象"""
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def join_objects(objects, name):
    """合并多个对象为一个"""
    if len(objects) == 0:
        return None
    if len(objects) == 1:
        objects[0].name = name
        return objects[0]

    # 只选中要合并的对象
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    objects[0].name = name
    return objects[0]


# ─── 窗户生成器 ─────────────────────────────────────────────
def create_windows(w, h, d, wall_color, neon_color_hex, face='front', seed_offset=0):
    """在指定面上生成网格窗户，返回窗户对象列表"""
    windows = []
    neon = hex_to_rgb(neon_color_hex)
    lit_mat = make_emissive_mat(f"win_lit_{face}", neon, 0.8)
    dark_mat = make_emissive_mat(f"win_dark_{face}", darken(neon, 0.1), 0.0)

    if face in ('front', 'back'):
        cols = max(1, int((w - 0.6) / 1.2))
        rows = max(1, int((h - 1.0) / 1.3))
        sp_x = (w - 0.6) / (cols + 1)
        sp_y = (h - 0.8) / (rows + 1)
        sign = 1 if face == 'front' else -1
        for r in range(rows):
            for c in range(cols):
                seed = (r * 17 + c * 31 + seed_offset) * 7
                is_lit = (seed % 10) > 2
                mat = lit_mat if is_lit else dark_mat
                x_pos = -w/2 + 0.3 + sp_x + c * sp_x
                y_pos = 0.7 + sp_y + r * sp_y
                win = add_plane(0.35, 0.5, f"win_{face}_{r}_{c}", mat,
                                location=(x_pos, sign * (d/2 + 0.001), y_pos),
                                rotation=(0, 0, 0))
                windows.append(win)
    elif face in ('left', 'right'):
        cols = max(1, int((d - 0.6) / 1.2))
        rows = max(1, int((h - 1.0) / 1.3))
        sp_x = (d - 0.6) / (cols + 1)
        sp_y = (h - 0.8) / (rows + 1)
        sign = 1 if face == 'right' else -1
        for r in range(rows):
            for c in range(cols):
                seed = (r * 11 + c * 23 + seed_offset) * 7
                is_lit = (seed % 10) > 2
                mat = lit_mat if is_lit else dark_mat
                x_pos = -d/2 + 0.3 + sp_x + c * sp_x
                y_pos = 0.7 + sp_y + r * sp_y
                win = add_plane(0.35, 0.5, f"win_{face}_{r}_{c}", mat,
                                location=(sign * (w/2 + 0.001), x_pos, y_pos),
                                rotation=(0, math.radians(90 if face == 'right' else -90), 0))
                windows.append(win)
    return windows


# ─── 建筑生成器 ─────────────────────────────────────────────
def generate_institution(cfg):
    """公共机构 — 方正、平顶带围栏、对称窗户、入口雨棚"""
    bid, bname, btype, (w, h, d), color, roof_color = cfg
    col = hex_to_rgb(color)
    roof_col = hex_to_rgb(roof_color)
    wall_mat = make_mat(f"{bid}_wall", col, 0.5, 0.3)
    base_mat = make_mat(f"{bid}_base", darken(col, 0.7), 0.7, 0.2)
    roof_mat = make_mat(f"{bid}_roof", roof_col, 0.3, 0.4)
    fence_mat = make_mat(f"{bid}_fence", roof_col, 0.2, 0.6)
    trim_mat = make_mat(f"{bid}_trim", roof_col, 0.3, 0.5)
    canopy_mat = make_mat(f"{bid}_canopy", roof_col, 0.3, 0.4)
    door_mat = make_mat(f"{bid}_door", (0.16, 0.10, 0.04), 0.8, 0.1)
    pillar_mat = make_mat(f"{bid}_pillar", roof_col, 0.2, 0.7)

    objects = []

    # 基座
    base = add_box(w + 0.4, 0.2, d + 0.4, f"{bid}_base", base_mat)
    base.location.z = 0.1
    objects.append(base)

    # 主体
    body = add_box(w, h, d, f"{bid}_body", wall_mat)
    body.location.z = h / 2 + 0.2
    objects.append(body)

    # 楼层分隔线
    num_trims = max(1, int(h / 2.5))
    for i in range(1, num_trims + 1):
        y_pos = i * (h / (num_trims + 1)) + 0.2
        trim = add_box(w + 0.1, 0.08, d + 0.1, f"{bid}_trim_{i}", trim_mat)
        trim.location.z = y_pos
        objects.append(trim)

    # 平顶
    roof = add_box(w + 0.2, 0.15, d + 0.2, f"{bid}_roof", roof_mat)
    roof.location.z = h + 0.2 + 0.075
    objects.append(roof)

    # 屋顶围栏四角柱子
    for fx, fy in [(-w/2 - 0.1, -d/2 - 0.1), (w/2 + 0.1, -d/2 - 0.1),
                   (-w/2 - 0.1, d/2 + 0.1), (w/2 + 0.1, d/2 + 0.1)]:
        pillar = add_cylinder(0.08, 0.25, f"{bid}_fence", fence_mat,
                              location=(fx, fy, h + 0.2 + 0.15 + 0.125))
        objects.append(pillar)

    # 窗户
    windows = create_windows(w, h, d, col, "#ffd700", 'front', hash(bid))
    objects.extend(windows)
    if d > 2.5:
        windows_b = create_windows(w, h, d, col, "#ffd700", 'back', hash(bid) + 100)
        objects.extend(windows_b)

    # 入口雨棚
    canopy = add_box(0.8, 0.08, 0.4, f"{bid}_canopy", canopy_mat)
    canopy.location = (0, d / 2 + 0.2, 0.7)
    objects.append(canopy)

    # 门
    door = add_plane(0.5, 0.7, f"{bid}_door", door_mat,
                     location=(0, d / 2 + 0.005, 0.35))
    objects.append(door)

    # 两侧柱子
    if w >= 3:
        for x_off in [-w / 4, w / 4]:
            pillar = add_cylinder(0.1, 0.6, f"{bid}_pillar", pillar_mat,
                                  location=(x_off, d / 2 + 0.05, 0.3))
            objects.append(pillar)

    return join_objects(objects, bid)


def generate_commercial(cfg):
    """商业建筑 — 人字形屋顶、大橱窗、雨棚"""
    bid, bname, btype, (w, h, d), color, roof_color = cfg
    col = hex_to_rgb(color)
    roof_col = hex_to_rgb(roof_color)
    wall_mat = make_mat(f"{bid}_wall", col, 0.3, 0.6)
    base_mat = make_mat(f"{bid}_base", darken(col, 0.7), 0.7, 0.1)
    roof_mat = make_mat(f"{bid}_roof", roof_col, 0.3, 0.2)
    door_mat = make_mat(f"{bid}_door", (0.16, 0.10, 0.04), 0.8, 0.1)
    awning_mat = make_mat(f"{bid}_awning", roof_col, 0.6, 0.1)
    neon = hex_to_rgb("#ffdd44")
    win_big_mat = make_emissive_mat(f"{bid}_win_big", neon, 0.6)

    objects = []

    # 基座
    base = add_box(w + 0.3, 0.15, d + 0.3, f"{bid}_base", base_mat)
    base.location.z = 0.075
    objects.append(base)

    # 主体
    body = add_box(w, h, d, f"{bid}_body", wall_mat)
    body.location.z = h / 2 + 0.15
    objects.append(body)

    # 人字形屋顶 (extrude 方式)
    bpy.ops.mesh.primitive_cube_add(size=1)
    roof_obj = bpy.context.active_object
    roof_obj.name = f"{bid}_roof"
    roof_obj.scale = (w + 0.4, d + 0.2, 0.5)
    bpy.ops.object.transform_apply(scale=True)
    # 进入编辑模式，把顶面往上拉成尖顶
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_mode(type='VERT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bm = bpy.context.edit_object.data
    # 选中顶部四个顶点
    for v in bm.vertices:
        if abs(v.co.z - 0.25) < 0.01:
            v.select = True
    bpy.ops.transform.translate(value=(0, 0, 0.4))
    bpy.ops.object.mode_set(mode='OBJECT')
    roof_obj.location.z = h + 0.15
    roof_obj.data.materials.append(roof_mat)
    objects.append(roof_obj)

    # 大橱窗
    win_w = min(w - 0.6, 2.5)
    win_h = min(h * 0.5, 1.2)
    big_win = add_plane(win_w, win_h, f"{bid}_bigwin", win_big_mat,
                        location=(0, d / 2 + 0.005, h * 0.35 + 0.15))
    objects.append(big_win)

    # 雨棚
    awning = add_box(w + 0.2, 0.05, 0.4, f"{bid}_awning", awning_mat)
    awning.location = (0, d / 2 + 0.2, h * 0.25 + 0.15)
    objects.append(awning)

    # 门
    door = add_plane(0.5, 0.7, f"{bid}_door", door_mat,
                     location=(0, d / 2 + 0.005, 0.35))
    objects.append(door)

    # 侧面窗户
    if d > 2:
        windows_l = create_windows(w, h, d, col, "#ffdd44", 'left', hash(bid))
        objects.extend(windows_l)
        windows_r = create_windows(w, h, d, col, "#ffdd44", 'right', hash(bid) + 100)
        objects.extend(windows_r)

    return join_objects(objects, bid)


def generate_workplace(cfg):
    """办公建筑 — 高、玻璃幕墙、楼层分隔线、天线"""
    bid, bname, btype, (w, h, d), color, roof_color = cfg
    col = hex_to_rgb(color)
    roof_col = hex_to_rgb(roof_color)
    wall_mat = make_mat(f"{bid}_wall", col, 0.2, 0.8)
    base_mat = make_mat(f"{bid}_base", darken(col, 0.7), 0.7, 0.3)
    trim_mat = make_mat(f"{bid}_trim", roof_col, 0.2, 0.7)
    roof_mat = make_mat(f"{bid}_roof", roof_col, 0.2, 0.6)
    door_mat = make_mat(f"{bid}_door", (0.16, 0.10, 0.04), 0.8, 0.1)

    objects = []

    # 基座
    base = add_box(w + 0.3, 0.2, d + 0.3, f"{bid}_base", base_mat)
    base.location.z = 0.1
    objects.append(base)

    # 主体
    body = add_box(w, h, d, f"{bid}_body", wall_mat)
    body.location.z = h / 2 + 0.2
    objects.append(body)

    # 楼层分隔线 (密)
    num_trims = max(2, int(h / 2.0))
    for i in range(num_trims + 1):
        y_pos = i * (h / num_trims) + 0.2
        trim = add_box(w + 0.06, 0.05, d + 0.06, f"{bid}_trim_{i}", trim_mat)
        trim.location.z = y_pos
        objects.append(trim)

    # 平顶
    roof = add_box(w, 0.12, d, f"{bid}_roof", roof_mat)
    roof.location.z = h + 0.2 + 0.06
    objects.append(roof)

    # 天线 (高建筑)
    if h > 5:
        ant_mat = make_mat(f"{bid}_ant", (0.53, 0.60, 0.67), 0.3, 0.8)
        pole = add_cylinder(0.03, 0.6, f"{bid}_ant1", ant_mat,
                            location=(w/3, 0, h + 0.2 + 0.12 + 0.3))
        objects.append(pole)
        ball = add_sphere(0.06, f"{bid}_ant1_ball", ant_mat,
                          location=(w/3, 0, h + 0.2 + 0.12 + 0.6))
        objects.append(ball)
        pole2 = add_cylinder(0.02, 0.4, f"{bid}_ant2", ant_mat,
                             location=(-w/3, 0, h + 0.2 + 0.12 + 0.2))
        objects.append(pole2)

    # 四周窗户
    neon = "#66ccff"
    for face in ['front', 'back']:
        objects.extend(create_windows(w, h, d, col, neon, face, hash(bid)))
    if d > 2.5:
        for face in ['left', 'right']:
            objects.extend(create_windows(w, h, d, col, neon, face, hash(bid)))

    # 门
    door = add_plane(0.5, 0.7, f"{bid}_door", door_mat,
                     location=(0, d / 2 + 0.005, 0.35))
    objects.append(door)

    return join_objects(objects, bid)


def generate_residential(cfg):
    """住宅 — 坡屋顶、阳台"""
    bid, bname, btype, (w, h, d), color, roof_color = cfg
    col = hex_to_rgb(color)
    roof_col = hex_to_rgb(roof_color)
    wall_mat = make_mat(f"{bid}_wall", col, 0.7, 0.2)
    base_mat = make_mat(f"{bid}_base", darken(col, 0.7), 0.7, 0.2)
    roof_mat = make_mat(f"{bid}_roof", roof_col, 0.5, 0.1)
    balcony_mat = make_mat(f"{bid}_balcony", (0.4, 0.4, 0.53), 0.6, 0.4)
    door_mat = make_mat(f"{bid}_door", (0.16, 0.10, 0.04), 0.8, 0.1)

    objects = []

    # 基座
    base = add_box(w + 0.3, 0.15, d + 0.3, f"{bid}_base", base_mat)
    base.location.z = 0.075
    objects.append(base)

    # 主体
    body = add_box(w, h, d, f"{bid}_body", wall_mat)
    body.location.z = h / 2 + 0.15
    objects.append(body)

    # 坡屋顶 (尖顶)
    bpy.ops.mesh.primitive_cube_add(size=1)
    roof_obj = bpy.context.active_object
    roof_obj.name = f"{bid}_roof"
    roof_obj.scale = (w + 0.3, d + 0.2, 0.5)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_mode(type='VERT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bm = bpy.context.edit_object.data
    for v in bm.vertices:
        if abs(v.co.z - 0.25) < 0.01:
            v.select = True
    bpy.ops.transform.translate(value=(0, 0, 0.35))
    bpy.ops.object.mode_set(mode='OBJECT')
    roof_obj.location.z = h + 0.15
    roof_obj.data.materials.append(roof_mat)
    objects.append(roof_obj)

    # 正面窗户
    objects.extend(create_windows(w, h, d, col, "#ccaaff", 'front', hash(bid)))

    # 阳台
    num_floors = max(1, int(h / 2.5))
    for i in range(num_floors):
        y_pos = 0.6 + i * 2.0
        if y_pos + 0.3 < h:
            balcony = add_box(0.6, 0.04, 0.3, f"{bid}_balcony_{i}", balcony_mat)
            balcony.location = (w / 2 - 0.1, d / 2 + 0.15, y_pos + 0.15)
            objects.append(balcony)

    # 门
    door = add_plane(0.5, 0.7, f"{bid}_door", door_mat,
                     location=(0, d / 2 + 0.005, 0.35))
    objects.append(door)

    return join_objects(objects, bid)


def generate_government(cfg):
    """政府建筑 — 宏伟、大柱子、台阶"""
    bid, bname, btype, (w, h, d), color, roof_color = cfg
    col = hex_to_rgb(color)
    roof_col = hex_to_rgb(roof_color)
    wall_mat = make_mat(f"{bid}_wall", col, 0.4, 0.5)
    base_mat = make_mat(f"{bid}_base", darken(col, 0.65), 0.6, 0.3)
    trim_mat = make_mat(f"{bid}_trim", roof_col, 0.2, 0.7)
    roof_mat = make_mat(f"{bid}_roof", roof_col, 0.2, 0.6)
    pillar_mat = make_mat(f"{bid}_pillar", (0.87, 0.80, 0.67), 0.3, 0.4)
    deco_mat = make_mat(f"{bid}_deco", (1.0, 0.84, 0.0), 0.2, 0.9)
    door_mat = make_mat(f"{bid}_door", (0.23, 0.13, 0.06), 0.9, 0.0)
    arch_mat = make_mat(f"{bid}_arch", (0.87, 0.80, 0.67), 0.3, 0.5)
    step_mat = make_mat(f"{bid}_step", roof_col, 0.7, 0.2)

    objects = []

    # 基座 (抬高)
    base = add_box(w + 0.5, 0.3, d + 0.5, f"{bid}_base", base_mat)
    base.location.z = 0.15
    objects.append(base)

    # 主体
    body = add_box(w, h, d, f"{bid}_body", wall_mat)
    body.location.z = h / 2 + 0.3
    objects.append(body)

    # 装饰檐口
    cornice = add_box(w + 0.3, 0.1, d + 0.3, f"{bid}_cornice", trim_mat)
    cornice.location.z = h + 0.3 - 0.05
    objects.append(cornice)

    # 平顶
    roof = add_box(w + 0.1, 0.2, d + 0.1, f"{bid}_roof", roof_mat)
    roof.location.z = h + 0.3 + 0.1
    objects.append(roof)

    # 顶部装饰尖顶
    spire = add_cone(0.08, 0.3, f"{bid}_spire", deco_mat,
                     location=(0, d / 2, h + 0.3 + 0.2 + 0.15))
    objects.append(spire)

    # 正面大柱子
    num_pillars = 4
    for i in range(num_pillars):
        x_pos = -w / 3 + i * (2 * w / (3 * max(num_pillars - 1, 1)))
        pillar = add_cylinder(0.1, h * 0.6, f"{bid}_pillar_{i}", pillar_mat,
                              location=(x_pos, d / 2 + 0.05, h * 0.3 + 0.3))
        objects.append(pillar)

    # 正门
    door = add_plane(0.7, 0.9, f"{bid}_door", door_mat,
                     location=(0, d / 2 + 0.005, 0.45))
    objects.append(door)

    # 门拱
    arch = add_box(0.8, 0.08, 0.02, f"{bid}_arch", arch_mat)
    arch.location = (0, d / 2 + 0.015, 0.9)
    objects.append(arch)

    # 台阶
    for i in range(3):
        step = add_box(1.0 - i * 0.1, 0.06, 0.2 - i * 0.02, f"{bid}_step_{i}", step_mat)
        step.location = (0, d / 2 + 0.1 + i * 0.2, -0.1 + i * 0.06)
        objects.append(step)

    # 侧面窗户
    for face in ['left', 'right']:
        objects.extend(create_windows(w, h, d, col, "#ff6666", face, hash(bid)))

    return join_objects(objects, bid)


def generate_financial(cfg):
    """金融建筑 — 坚实、古典柱式"""
    bid, bname, btype, (w, h, d), color, roof_color = cfg
    col = hex_to_rgb(color)
    roof_col = hex_to_rgb(roof_color)
    wall_mat = make_mat(f"{bid}_wall", col, 0.2, 0.7)
    base_mat = make_mat(f"{bid}_base", darken(col, 0.6), 0.5, 0.4)
    trim_mat = make_mat(f"{bid}_trim", roof_col, 0.1, 0.8)
    roof_mat = make_mat(f"{bid}_roof", roof_col, 0.1, 0.8)
    pillar_mat = make_mat(f"{bid}_pillar", (0.80, 0.87, 0.93), 0.2, 0.7)
    emblem_mat = make_mat(f"{bid}_emblem", (1.0, 0.84, 0.0), 0.1, 0.9)
    door_mat = make_mat(f"{bid}_door", (0.10, 0.10, 0.16), 0.5, 0.6)

    objects = []

    # 基座
    base = add_box(w + 0.4, 0.25, d + 0.4, f"{bid}_base", base_mat)
    base.location.z = 0.125
    objects.append(base)

    # 主体
    body = add_box(w, h, d, f"{bid}_body", wall_mat)
    body.location.z = h / 2 + 0.25
    objects.append(body)

    # 装饰檐口 (上下)
    cornice_b = add_box(w + 0.2, 0.06, d + 0.2, f"{bid}_cornice_b", trim_mat)
    cornice_b.location.z = 0.25 + 0.03
    objects.append(cornice_b)
    cornice_t = add_box(w + 0.2, 0.1, d + 0.2, f"{bid}_cornice_t", trim_mat)
    cornice_t.location.z = h + 0.25 - 0.05
    objects.append(cornice_t)

    # 平顶
    roof = add_box(w, 0.15, d, f"{bid}_roof", roof_mat)
    roof.location.z = h + 0.25 + 0.075
    objects.append(roof)

    # 正面柱子 (两侧)
    for x_off in [-w/2 + 0.3, w/2 - 0.3]:
        pillar = add_cylinder(0.12, h * 0.7, f"{bid}_pillar", pillar_mat,
                              location=(x_off, d / 2 + 0.02, h * 0.35 + 0.25))
        objects.append(pillar)

    # 中央金色标志
    emblem = add_cylinder(0.15, 0.05, f"{bid}_emblem", emblem_mat,
                          location=(0, d / 2 + 0.02, h * 0.55 + 0.25))
    objects.append(emblem)

    # 门
    door = add_plane(0.5, 0.7, f"{bid}_door", door_mat,
                     location=(0, d / 2 + 0.005, 0.35))
    objects.append(door)

    # 侧面窗户
    for face in ['left', 'right']:
        objects.extend(create_windows(w, h, d, col, "#66ddcc", face, hash(bid)))

    return join_objects(objects, bid)


def generate_outdoor(cfg):
    """公园 — 绿色地面 + 树木"""
    bid, bname, btype, (w, h, d), color, roof_color = cfg
    col = hex_to_rgb(color)
    ground_mat = make_mat(f"{bid}_ground", col, 0.9, 0.0, emissive=col, emissive_strength=0.1)
    fence_mat = make_mat(f"{bid}_fence", (0.55, 0.62, 0.76), 0.5, 0.4)
    trunk_mat = make_mat(f"{bid}_trunk", (0.55, 0.35, 0.17), 0.9, 0.0)
    leaf_mat = make_mat(f"{bid}_leaf", (0.13, 0.77, 0.37), 0.6, 0.0)

    objects = []

    # 绿色地面
    ground = add_box(w, 0.1, d, f"{bid}_ground", ground_mat)
    ground.location.z = 0.05
    objects.append(ground)

    # 四角围栏柱
    for fx, fy in [(-w/2, -d/2), (w/2, -d/2), (-w/2, d/2), (w/2, d/2)]:
        post = add_cylinder(0.05, 0.2, f"{bid}_fence", fence_mat,
                            location=(fx, fy, 0.1))
        objects.append(post)

    # 两棵小树
    for tx, tz, scale in [(-w/3, 0, 1), (w/3, 0, 0.8)]:
        trunk = add_cylinder(0.05 * scale, 0.3 * scale, f"{bid}_trunk", trunk_mat,
                             location=(tx, tz, 0.15 * scale))
        objects.append(trunk)
        leaves = add_sphere(0.25 * scale, f"{bid}_leaves", leaf_mat,
                            location=(tx, tz, 0.35 * scale + 0.15 * scale))
        objects.append(leaves)

    return join_objects(objects, bid)


def generate_transit(cfg):
    """交通 — 低矮、雨棚式屋顶"""
    bid, bname, btype, (w, h, d), color, roof_color = cfg
    col = hex_to_rgb(color)
    roof_col = hex_to_rgb(roof_color)
    wall_mat = make_mat(f"{bid}_wall", col, 0.6, 0.4)
    base_mat = make_mat(f"{bid}_base", darken(col, 0.7), 0.7, 0.3)
    canopy_mat = make_mat(f"{bid}_canopy", roof_col, 0.3, 0.5)
    door_mat = make_mat(f"{bid}_door", (0.16, 0.10, 0.04), 0.8, 0.1)
    sign_mat = make_mat(f"{bid}_sign", (1.0, 0.80, 0.0), 0.3, 0.6)
    neon = hex_to_rgb("#ffcc44")
    sign_light_mat = make_emissive_mat(f"{bid}_sign_light", neon, 0.5)

    objects = []

    # 基座
    base = add_box(w + 0.3, 0.1, d + 0.3, f"{bid}_base", base_mat)
    base.location.z = 0.05
    objects.append(base)

    # 主体
    body = add_box(w, h, d, f"{bid}_body", wall_mat)
    body.location.z = h / 2 + 0.1
    objects.append(body)

    # 雨棚 (extend beyond walls)
    canopy = add_box(w + 0.8, 0.12, d + 0.3, f"{bid}_canopy", canopy_mat)
    canopy.location.z = h + 0.1 + 0.06
    objects.append(canopy)

    # 入口标识柱
    for x_off in [-w/2 - 0.1, w/2 + 0.1]:
        sign = add_box(0.08, 0.5, 0.08, f"{bid}_sign", sign_mat)
        sign.location = (x_off, d / 2 + 0.2, 0.35)
        objects.append(sign)

    # 发光标识
    sign_board = add_plane(0.6, 0.2, f"{bid}_sign_board", sign_light_mat,
                           location=(0, d / 2 + 0.015, h + 0.1 + 0.12 + 0.1))
    objects.append(sign_board)

    # 门
    door = add_plane(0.5, 0.7, f"{bid}_door", door_mat,
                     location=(0, d / 2 + 0.005, 0.35))
    objects.append(door)

    return join_objects(objects, bid)


# ─── 分发器 ───────────────────────────────────────────────
GENERATORS = {
    "institution": generate_institution,
    "commercial": generate_commercial,
    "workplace": generate_workplace,
    "residential": generate_residential,
    "government": generate_government,
    "financial": generate_financial,
    "outdoor": generate_outdoor,
    "transit": generate_transit,
}


# ─── 主流程 ───────────────────────────────────────────────
def main():
    # 确保输出目录存在
    os.makedirs(OUT_DIR, exist_ok=True)

    # 清除场景
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    success = 0
    failed = 0

    for cfg in BUILDINGS:
        bid = cfg[0]
        bname = cfg[1]
        btype = cfg[2]

        print(f"生成 {bid} ({bname}) — {btype}...")

        try:
            # 清除场景中所有对象
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.object.delete(use_global=False)

            # 生成建筑
            gen_func = GENERATORS.get(btype)
            if not gen_func:
                print(f"  未知类型 {btype}，跳过")
                failed += 1
                continue

            building = gen_func(cfg)

            # 重置位置到原点
            building.location = (0, 0, 0)

            # 确保物体位于地面上 (Z=0 为底)
            # 已经以底面在 Z=0 构建

            # 选中建筑
            select_only(building)

            # 应用变换
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

            # 导出 GLB
            out_path = os.path.join(OUT_DIR, f"{bid}.glb")
            bpy.ops.export_scene.gltf(
                filepath=out_path,
                export_format='GLB',
                export_draco_mesh_compression_enable=False,
                export_texcoords=False,
                export_normals=True,
                export_materials='EXPORT',
                export_apply=True,
                use_selection=True,
            )
            print(f"  ✅ {bid}.glb ({bname})")
            success += 1

        except Exception as e:
            print(f"  ❌ {bid}: {e}")
            failed += 1

    print(f"\n完成: {success} 成功, {failed} 失败, 共 {len(BUILDINGS)} 个建筑")
    print(f"输出目录: {OUT_DIR}")


if __name__ == "__main__":
    main()
