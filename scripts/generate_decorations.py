"""
Blender Python 脚本：生成环境装饰 GLB 模型（树、路灯、长椅）
用法: blender --background --python generate_decorations.py
输出: D:\\workspace\\emergence-world\\public\\models\\decorations\\*.glb
"""

import bpy
import os

OUT_DIR = r"D:\workspace\emergence-world\public\models\decorations"


def clean_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def make_mat(name, color, roughness=0.5, metalness=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metalness
    return mat


def export_glb(name, path):
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        export_draco_mesh_compression_enable=False,
        export_texcoords=False,
        export_normals=True,
        export_materials='EXPORT',
        export_apply=True,
        use_selection=True,
    )
    print(f"  ✅ {name}.glb")


def create_tree():
    """低多边形树 — 圆柱树干 + 3层锥体树冠"""
    trunk_mat = make_mat("trunk", (0.45, 0.30, 0.15), 0.9, 0.0)
    leaf_mat = make_mat("leaves", (0.2, 0.65, 0.2), 0.6, 0.0)
    leaf_mat2 = make_mat("leaves2", (0.25, 0.55, 0.15), 0.6, 0.0)

    # 树干
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.08, depth=0.5, location=(0, 0, 0.25), vertices=6
    )
    trunk = bpy.context.active_object
    trunk.name = "trunk"
    trunk.data.materials.append(trunk_mat)

    # 树冠下层（大）
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.4, radius2=0, depth=0.5, location=(0, 0, 0.7), vertices=8
    )
    crown1 = bpy.context.active_object
    crown1.name = "crown1"
    crown1.data.materials.append(leaf_mat)

    # 树冠中层
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.3, radius2=0, depth=0.4, location=(0, 0, 0.95), vertices=8
    )
    crown2 = bpy.context.active_object
    crown2.name = "crown2"
    crown2.data.materials.append(leaf_mat)

    # 树冠顶层
    bpy.ops.mesh.primitive_cone_add(
        radius1=0.2, radius2=0, depth=0.3, location=(0, 0, 1.15), vertices=8
    )
    crown3 = bpy.context.active_object
    crown3.name = "crown3"
    crown3.data.materials.append(leaf_mat2)

    # 合并
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = trunk
    bpy.ops.object.join()
    tree = bpy.context.active_object
    tree.name = "tree"
    return tree


def create_tree2():
    """球形树 — 圆柱树干 + 球体树冠（另一种风格）"""
    trunk_mat = make_mat("trunk", (0.45, 0.30, 0.15), 0.9, 0.0)
    leaf_mat = make_mat("leaves", (0.18, 0.55, 0.25), 0.5, 0.0)

    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.06, depth=0.4, location=(0, 0, 0.2), vertices=6
    )
    trunk = bpy.context.active_object
    trunk.name = "trunk"
    trunk.data.materials.append(trunk_mat)

    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.3, location=(0, 0, 0.6), segments=8, ring_count=6
    )
    crown = bpy.context.active_object
    crown.name = "crown"
    crown.data.materials.append(leaf_mat)

    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = trunk
    bpy.ops.object.join()
    tree = bpy.context.active_object
    tree.name = "tree2"
    return tree


def create_lamp():
    """路灯 — 细长柱 + 灯罩 + 光源"""
    pole_mat = make_mat("pole", (0.3, 0.3, 0.35), 0.3, 0.7)
    lamp_mat = make_mat("lamp", (0.9, 0.85, 0.7), 0.2, 0.5)

    # 灯柱
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.04, depth=1.2, location=(0, 0, 0.6), vertices=8
    )
    pole = bpy.context.active_object
    pole.name = "pole"
    pole.data.materials.append(pole_mat)

    # 灯臂（水平伸出）
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.02, depth=0.25, location=(0.125, 0, 1.2), vertices=6
    )
    arm = bpy.context.active_object
    arm.name = "arm"
    arm.rotation_euler = (0, 0, 0)
    arm.data.materials.append(pole_mat)

    # 灯罩（球形）
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.06, location=(0.25, 0, 1.2), segments=8, ring_count=6
    )
    lamp = bpy.context.active_object
    lamp.name = "lamp_head"
    lamp.data.materials.append(lamp_mat)

    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = pole
    bpy.ops.object.join()
    lamp_obj = bpy.context.active_object
    lamp_obj.name = "lamp"
    return lamp_obj


def create_bench():
    """长椅 — 座面 + 椅背 + 4条腿"""
    wood_mat = make_mat("wood", (0.5, 0.35, 0.2), 0.8, 0.0)
    metal_mat = make_mat("metal", (0.3, 0.3, 0.35), 0.3, 0.6)

    # 座面
    bpy.ops.mesh.primitive_cube_add(size=1)
    seat = bpy.context.active_object
    seat.name = "seat"
    seat.scale = (0.6, 0.12, 0.2)
    bpy.ops.object.transform_apply(scale=True)
    seat.location = (0, 0, 0.25)
    seat.data.materials.append(wood_mat)

    # 椅背
    bpy.ops.mesh.primitive_cube_add(size=1)
    back = bpy.context.active_object
    back.name = "back"
    back.scale = (0.55, 0.04, 0.2)
    bpy.ops.object.transform_apply(scale=True)
    back.location = (0, -0.12, 0.45)
    back.data.materials.append(wood_mat)

    # 4条腿
    for x in [-0.22, 0.22]:
        for y in [-0.08, 0.08]:
            bpy.ops.mesh.primitive_cylinder_add(
                radius=0.02, depth=0.2, location=(x, y, 0.1), vertices=6
            )
            leg = bpy.context.active_object
            leg.name = "leg"
            leg.data.materials.append(metal_mat)

    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = seat
    bpy.ops.object.join()
    bench = bpy.context.active_object
    bench.name = "bench"
    return bench


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    addon_name = "io_scene_gltf2"
    try:
        import addon_utils
        addon_utils.enable(addon_name, default_set=True, persistent=True)
    except:
        pass

    # 树1（锥体树）
    clean_scene()
    obj = create_tree()
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    export_glb("tree1", os.path.join(OUT_DIR, "tree1.glb"))

    # 树2（球形树）
    clean_scene()
    obj = create_tree2()
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    export_glb("tree2", os.path.join(OUT_DIR, "tree2.glb"))

    # 路灯
    clean_scene()
    obj = create_lamp()
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    export_glb("lamp", os.path.join(OUT_DIR, "lamp.glb"))

    # 长椅
    clean_scene()
    obj = create_bench()
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    export_glb("bench", os.path.join(OUT_DIR, "bench.glb"))

    print(f"\n所有装饰模型已导出到: {OUT_DIR}")


if __name__ == "__main__":
    main()
