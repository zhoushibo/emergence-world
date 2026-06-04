"""
Blender Python 脚本：生成低多边形角色 GLB 模型
用法: blender --background --python generate_agent.py
输出: D:\\workspace\\emergence-world\\public\\models\\agent.glb

角色设计说明：
- 高度约 1.2 单位（与当前 Agent 组件尺寸一致）
- 低多边形可爱风格，身体圆润
- 不烘焙颜色 — 颜色在 Three.js 端通过 ROLE_COLORS 动态覆写
"""

import bpy
import os
import math

OUT_DIR = r"D:\workspace\emergence-world\public\models"
OUT_FILE = os.path.join(OUT_DIR, "agent.glb")


def clean_scene():
    """清除场景"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def make_material(name, color=(0.6, 0.6, 0.8), roughness=0.3, metalness=0.1):
    """创建基础材质（中性色，代码中会覆写）"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metalness
    return mat


def create_character():
    """
    创建低多边形角色
    身体 - 有机圆润造型，类似不倒翁/梨形
    头部 - 球形，稍大
    眼睛 - 两个小半球（黑色）
    手臂 - 小圆柱，微微伸出
    腿 - 小圆柱（动画由 Three.js 控制）
    """
    objects = []

    # ─── 身体（梨形） ──────────────────────────────────────
    # 使用 UV 球体，缩放成上窄下宽的梨形
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.22, location=(0, 0, 0.35), segments=12, ring_count=10
    )
    body = bpy.context.active_object
    body.name = "body"
    body.scale = (1.0, 1.0, 1.3)  # 纵向拉长
    # 底部稍宽
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_mode(type='VERT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bm = bpy.context.edit_object.data
    # 选中底部顶点（z < -0.15），向外拉
    for v in bm.vertices:
        if v.co.z < -0.15:
            v.co.x *= 1.3
            v.co.y *= 1.3
    # 选中顶部顶点（z > 0.4），向内收
    for v in bm.vertices:
        if v.co.z > 0.4:
            v.co.x *= 0.7
            v.co.y *= 0.7
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.transform_apply(scale=True)

    body_mat = make_material("body_mat", (0.6, 0.6, 0.8), 0.3, 0.1)
    body.data.materials.append(body_mat)
    objects.append(body)

    # ─── 头部 ──────────────────────────────────────────────
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.16, location=(0, 0, 0.72), segments=10, ring_count=8
    )
    head = bpy.context.active_object
    head.name = "head"
    head_mat = make_material("head_mat", (0.7, 0.65, 0.6), 0.2, 0.05)
    head.data.materials.append(head_mat)
    objects.append(head)

    # ─── 左眼 ──────────────────────────────────────────────
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.04, location=(-0.07, 0.13, 0.76), segments=8, ring_count=6
    )
    left_eye = bpy.context.active_object
    left_eye.name = "left_eye"
    eye_mat = make_material("eye_mat", (0.05, 0.05, 0.1), 0.0, 0.8)
    left_eye.data.materials.append(eye_mat)
    objects.append(left_eye)

    # ─── 右眼 ──────────────────────────────────────────────
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.04, location=(0.07, 0.13, 0.76), segments=8, ring_count=6
    )
    right_eye = bpy.context.active_object
    right_eye.name = "right_eye"
    right_eye.data.materials.append(eye_mat)
    objects.append(right_eye)

    # ─── 左眼高光 ──────────────────────────────────────────
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.015, location=(-0.055, 0.15, 0.78), segments=6, ring_count=4
    )
    left_highlight = bpy.context.active_object
    left_highlight.name = "left_highlight"
    hl_mat = make_material("highlight_mat", (1.0, 1.0, 1.0), 0.0, 0.0)
    left_highlight.data.materials.append(hl_mat)
    objects.append(left_highlight)

    # ─── 右眼高光 ──────────────────────────────────────────
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.015, location=(0.055, 0.15, 0.78), segments=6, ring_count=4
    )
    right_highlight = bpy.context.active_object
    right_highlight.name = "right_highlight"
    right_highlight.data.materials.append(hl_mat)
    objects.append(right_highlight)

    # ─── 左臂 ──────────────────────────────────────────────
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.04, depth=0.12, location=(-0.28, 0, 0.45),
        vertices=6
    )
    left_arm = bpy.context.active_object
    left_arm.name = "left_arm"
    left_arm.rotation_euler = (0, 0, 0.2)
    arm_mat = make_material("arm_mat", (0.55, 0.55, 0.75), 0.4, 0.1)
    left_arm.data.materials.append(arm_mat)
    objects.append(left_arm)

    # ─── 右臂 ──────────────────────────────────────────────
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.04, depth=0.12, location=(0.28, 0, 0.45),
        vertices=6
    )
    right_arm = bpy.context.active_object
    right_arm.name = "right_arm"
    right_arm.rotation_euler = (0, 0, -0.2)
    right_arm.data.materials.append(arm_mat)
    objects.append(right_arm)

    # ─── 左腿（基座） ─────────────────────────────────────
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.05, depth=0.1, location=(-0.08, 0, 0.05),
        vertices=6
    )
    left_leg = bpy.context.active_object
    left_leg.name = "left_leg"
    leg_mat = make_material("leg_mat", (0.3, 0.3, 0.4), 0.6, 0.2)
    left_leg.data.materials.append(leg_mat)
    objects.append(left_leg)

    # ─── 右腿（基座） ─────────────────────────────────────
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.05, depth=0.1, location=(0.08, 0, 0.05),
        vertices=6
    )
    right_leg = bpy.context.active_object
    right_leg.name = "right_leg"
    right_leg.data.materials.append(leg_mat)
    objects.append(right_leg)

    # ─── 腮红（左） ────────────────────────────────────────
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.03, location=(-0.1, 0.04, 0.64), segments=6, ring_count=4
    )
    blush_l = bpy.context.active_object
    blush_l.name = "blush_left"
    blush_l.scale = (0.8, 0.4, 0.6)
    bpy.ops.object.transform_apply(scale=True)
    blush_mat = make_material("blush_mat", (1.0, 0.6, 0.6), 0.3, 0.0)
    blush_l.data.materials.append(blush_mat)
    objects.append(blush_l)

    # ─── 腮红（右） ────────────────────────────────────────
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.03, location=(0.1, 0.04, 0.64), segments=6, ring_count=4
    )
    blush_r = bpy.context.active_object
    blush_r.name = "blush_right"
    blush_r.scale = (0.8, 0.4, 0.6)
    bpy.ops.object.transform_apply(scale=True)
    blush_r.data.materials.append(blush_mat)
    objects.append(blush_r)

    # ─── 所有部件底部在 y=0 ────────────────────────────────
    # 当前设计：腿底部在 z=0，身体中心在 z=0.35，头顶约在 z=0.88
    # 整个角色高度约 0.88，稍微调低到匹配原版 1.0 左右
    # 缩放整体到 1.2x
    for obj in objects:
        # 先把所有物体组合成一个组
        pass

    # 合并所有物体为一个
    bpy.ops.object.select_all(action='SELECT')
    # 取消选中不想合并的（没有）
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    character = bpy.context.active_object
    character.name = "agent"
    
    # 整体缩放到匹配原版尺寸
    character.scale = (1.2, 1.2, 1.2)
    bpy.ops.object.transform_apply(scale=True)

    return character


def main():
    # 确保输出目录
    os.makedirs(OUT_DIR, exist_ok=True)

    # 清除场景
    clean_scene()

    # 启用 glTF 导出插件
    addon_name = "io_scene_gltf2"
    try:
        import addon_utils
        addon_utils.enable(addon_name, default_set=True, persistent=True)
        print(f"已启用插件: {addon_name}")
    except Exception as e:
        print(f"启用插件: {e}")

    print("生成角色模型...")
    character = create_character()

    # 选中角色
    bpy.ops.object.select_all(action='DESELECT')
    character.select_set(True)
    bpy.context.view_layer.objects.active = character

    # 导出 GLB
    bpy.ops.export_scene.gltf(
        filepath=OUT_FILE,
        export_format='GLB',
        export_draco_mesh_compression_enable=False,
        export_texcoords=False,
        export_normals=True,
        export_materials='EXPORT',
        export_apply=True,
        use_selection=True,
    )
    print(f"✅ 角色模型已导出: {OUT_FILE}")


if __name__ == "__main__":
    main()
