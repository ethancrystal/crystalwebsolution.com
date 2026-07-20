"""Author the CWS "Signal Instruments" collection in Blender.

This is a design/validation tool, not a runtime dependency. It creates eight
low-complexity service sculptures, renders a contact sheet, saves an editable
.blend file, and emits a polygon-count audit. The production site recreates
the approved forms with native Three.js primitives so it does not ship a
binary model or add another network request.

Run with:
  blender.exe --background --python tools/blender/cws_service_instruments.py \
    -- --output-dir <directory>
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


FORM_NAMES = (
    "Web Design / Frame",
    "Development / Lattice",
    "Branding / Facet",
    "Logo Design / Construction",
    "Digital Marketing / Radar",
    "Animation / Motion Knot",
    "AI Automation / Decision Nodes",
    "Workflow Automation / Pipeline",
)

POSITIONS = (
    (-6.0, 2.7, 0.0),
    (-2.0, 2.7, 0.0),
    (2.0, 2.7, 0.0),
    (6.0, 2.7, 0.0),
    (-6.0, -2.7, 0.0),
    (-2.0, -2.7, 0.0),
    (2.0, -2.7, 0.0),
    (6.0, -2.7, 0.0),
)


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        default=os.path.join(os.environ.get("TEMP", "."), "cws-signal-instruments"),
    )
    return parser.parse_args(argv)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def material(name: str, base: tuple[float, float, float, float], emission: tuple[float, float, float, float], strength: float) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = base
    principled.inputs["Metallic"].default_value = 0.72
    principled.inputs["Roughness"].default_value = 0.24
    if "Emission Color" in principled.inputs:
        principled.inputs["Emission Color"].default_value = emission
        principled.inputs["Emission Strength"].default_value = strength
    else:
        principled.inputs["Emission"].default_value = emission
        principled.inputs["Emission Strength"].default_value = strength
    return mat


def apply_material(obj: bpy.types.Object, mat: bpy.types.Material) -> bpy.types.Object:
    if getattr(obj.data, "materials", None) is not None:
        obj.data.materials.append(mat)
    return obj


def cube(name: str, location, scale, mat, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("Precision bevel", "BEVEL")
    bevel.width = 0.055
    bevel.segments = 2
    return apply_material(obj, mat)


def sphere(name: str, location, radius: float, mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    return apply_material(obj, mat)


def torus(name: str, location, major: float, minor: float, mat, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=48,
        minor_segments=10,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return apply_material(obj, mat)


def cylinder_between(name: str, a, b, radius: float, mat):
    start = Vector(a)
    end = Vector(b)
    direction = end - start
    midpoint = (start + end) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=direction.length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return apply_material(obj, mat)


def label(text: str, location, mat):
    bpy.ops.object.text_add(location=location)
    obj = bpy.context.object
    obj.data.body = text.upper()
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = 0.23
    obj.data.extrude = 0.008
    obj.data.space_character = 1.1
    return apply_material(obj, mat)


def build_screen(origin, mat):
    x, y, z = origin
    cube("screen-top", (x, y + 0.72, z), (1.15, 0.07, 0.11), mat)
    cube("screen-bottom", (x, y - 0.72, z), (1.15, 0.07, 0.11), mat)
    cube("screen-left", (x - 1.08, y, z), (0.07, 0.66, 0.11), mat)
    cube("screen-right", (x + 1.08, y, z), (0.07, 0.66, 0.11), mat)
    cube("screen-artboard", (x - 0.18, y + 0.02, z - 0.08), (0.73, 0.43, 0.035), mat)
    cube("screen-baseline", (x - 0.48, y - 0.5, z + 0.05), (0.37, 0.035, 0.04), mat)


def build_lattice(origin, mat):
    x, y, z = origin
    offsets = (-0.58, 0.0, 0.58)
    for row in offsets:
        for col in offsets:
            cube(f"lattice-{row}-{col}", (x + col, y + row, z + 0.08 * math.sin((row + col) * 4)), (0.16, 0.16, 0.16), mat, (0.0, 0.2 * row, 0.15 * col))
    for row in offsets:
        cube(f"lattice-rail-x-{row}", (x, y + row, z - 0.07), (0.62, 0.025, 0.025), mat)
    for col in offsets:
        cube(f"lattice-rail-y-{col}", (x + col, y, z - 0.07), (0.025, 0.62, 0.025), mat)


def build_facet(origin, mat):
    radius = 1.02
    vertices = (
        (radius, 0.0, 0.0),
        (-radius, 0.0, 0.0),
        (0.0, radius, 0.0),
        (0.0, -radius, 0.0),
        (0.0, 0.0, radius),
        (0.0, 0.0, -radius),
    )
    faces = (
        (0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4),
        (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5),
    )
    mesh = bpy.data.meshes.new("brand-facet-mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("brand-facet", mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = origin
    obj.rotation_euler = (0.42, 0.28, 0.18)
    obj.name = "brand-facet"
    obj.scale = (1.0, 1.28, 0.44)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    wire = obj.modifiers.new("Facet wire", "WIREFRAME")
    wire.thickness = 0.045


def build_construction(origin, mat):
    x, y, z = origin
    torus("construction-ring", origin, 0.82, 0.065, mat)
    cube("construction-diamond", (x, y, z + 0.04), (0.47, 0.47, 0.12), mat, (0.0, 0.0, math.pi / 4.0))
    cylinder_between("construction-axis", (x - 0.95, y - 0.95, z - 0.05), (x + 0.95, y + 0.95, z - 0.05), 0.025, mat)


def build_radar(origin, mat):
    x, y, z = origin
    torus("radar-outer", origin, 0.88, 0.045, mat)
    torus("radar-inner", origin, 0.46, 0.025, mat)
    cylinder_between("radar-needle", (x, y, z + 0.02), (x + 0.82, y + 0.38, z + 0.08), 0.035, mat)
    sphere("radar-lock", (x + 0.55, y - 0.34, z + 0.05), 0.12, mat)


def build_knot(origin, mat):
    x, y, z = origin
    curve = bpy.data.curves.new("motion-knot-path", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = 0.085
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    count = 128
    spline.points.add(count - 1)
    for index in range(count):
        t = index / (count - 1) * math.tau
        radius = 0.61 + 0.2 * math.cos(3 * t)
        px = x + radius * math.cos(2 * t)
        py = y + radius * math.sin(2 * t)
        pz = z + 0.2 * math.sin(3 * t)
        spline.points[index].co = (px, py, pz, 1.0)
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new("motion-knot", curve)
    bpy.context.collection.objects.link(obj)
    apply_material(obj, mat)


def build_ai(origin, mat):
    x, y, z = origin
    nodes = [(-0.68, 0.28), (0.0, 0.64), (0.72, -0.15), (-0.23, -0.62)]
    links = ((0, 1), (1, 2), (0, 3), (3, 2))
    for a, b in links:
        cylinder_between(
            f"ai-link-{a}-{b}",
            (x + nodes[a][0], y + nodes[a][1], z - 0.04),
            (x + nodes[b][0], y + nodes[b][1], z - 0.04),
            0.035,
            mat,
        )
    for index, (nx, ny) in enumerate(nodes):
        sphere(f"ai-node-{index}", (x + nx, y + ny, z), 0.16 if index else 0.22, mat)


def build_pipeline(origin, mat):
    x, y, z = origin
    nodes = (-0.72, 0.0, 0.72)
    for index, nx in enumerate(nodes):
        cube(f"pipeline-node-{index}", (x + nx, y, z + 0.05 * index), (0.2, 0.2, 0.2), mat, (0.15 * index, 0.2 * index, 0.08 * index))
    cylinder_between("pipeline-link-a", (x - 0.52, y, z), (x - 0.2, y, z + 0.05), 0.04, mat)
    cylinder_between("pipeline-link-b", (x + 0.2, y, z + 0.05), (x + 0.52, y, z + 0.1), 0.04, mat)
    cylinder_between("pipeline-return", (x + 0.72, y - 0.32, z - 0.08), (x - 0.72, y - 0.32, z - 0.08), 0.025, mat)


def look_at(obj: bpy.types.Object, target=(0.0, 0.0, 0.0)) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def build_scene(output_dir: Path) -> dict:
    cobalt = material("CWS cobalt", (0.025, 0.09, 0.42, 1.0), (0.03, 0.42, 1.0, 1.0), 2.1)
    violet = material("CWS violet", (0.22, 0.05, 0.48, 1.0), (0.54, 0.18, 1.0, 1.0), 2.4)
    ink = material("CWS labels", (0.72, 0.9, 1.0, 1.0), (0.2, 0.7, 1.0, 1.0), 1.2)

    builders = (build_screen, build_lattice, build_facet, build_construction, build_radar, build_knot, build_ai, build_pipeline)
    for index, (name, origin, builder) in enumerate(zip(FORM_NAMES, POSITIONS, builders)):
        before = set(bpy.context.scene.objects)
        builder(origin, cobalt if index % 2 == 0 else violet)
        after = set(bpy.context.scene.objects)
        collection = bpy.data.collections.new(f"{index + 1:02d} {name}")
        bpy.context.scene.collection.children.link(collection)
        for obj in after - before:
            for owner in list(obj.users_collection):
                owner.objects.unlink(obj)
            collection.objects.link(obj)
        label(f"{index + 1:02d}  {name}", (origin[0], origin[1] - 1.42, 0.0), ink)

    world = bpy.context.scene.world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.003, 0.006, 0.018, 1.0)
    bg.inputs["Strength"].default_value = 0.12

    bpy.ops.object.light_add(type="AREA", location=(-5.0, 6.0, 10.0))
    key = bpy.context.object
    key.name = "Cool key"
    key.data.energy = 1350
    key.data.shape = "DISK"
    key.data.size = 7.0
    key.data.color = (0.4, 0.76, 1.0)
    look_at(key)

    bpy.ops.object.light_add(type="AREA", location=(7.0, -3.0, 7.0))
    rim = bpy.context.object
    rim.name = "Violet rim"
    rim.data.energy = 1100
    rim.data.size = 5.0
    rim.data.color = (0.62, 0.22, 1.0)
    look_at(rim)

    bpy.ops.object.camera_add(location=(0.0, -0.35, 20.0))
    camera = bpy.context.object
    camera.name = "Signal Instruments Camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 18.4
    look_at(camera, (0.0, 0.0, 0.0))
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1800
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(output_dir / "cws-signal-instruments.png")
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"

    mesh_objects = [obj for obj in scene.objects if obj.type == "MESH"]
    audit = {
        "concept": "Signal Instruments",
        "forms": list(FORM_NAMES),
        "mesh_objects": len(mesh_objects),
        "mesh_vertices": sum(len(obj.data.vertices) for obj in mesh_objects),
        "mesh_polygons": sum(len(obj.data.polygons) for obj in mesh_objects),
        "runtime_policy": "Rebuild with native Three.js primitives; do not ship the .blend or PNG.",
    }

    bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / "cws-signal-instruments.blend"))
    scene.render.filepath = str(output_dir / "cws-signal-instruments.png")
    bpy.ops.render.render(write_still=True)
    return audit


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    reset_scene()
    audit = build_scene(output_dir)
    with (output_dir / "cws-signal-instruments.json").open("w", encoding="utf-8") as handle:
        json.dump(audit, handle, indent=2)
    print(json.dumps({"output_dir": str(output_dir), **audit}, indent=2))


if __name__ == "__main__":
    main()
