"""Salle d'essai égyptienne « diorama miniature » rendue dans Blender (Cycles), puis découpée en couches pour Phaser 4.

Sorties (dossier passé en dernier argument) :
- beauty.png : la salle complète (image de référence de la qualité « hors temps réel ») ;
- bg.png / bg_n.png : sol, murs, colonnes, brasero, plantes (couleur + carte de relief) ;
- <objet>.png / <objet>_n.png : chaque objet interactif, plein cadre, fond transparent, avec son ombre ;
- scene.json : projection monde → écran et positions utiles.

Avec EXPORT=1 : room.glb seulement, la salle en 3D pour Godot (copiée dans godot/assets/rooms/egypt_test_room.glb).
Lancement : python avec le module bpy (Blender 5.0), dossier de sortie en dernier argument.
"""
import json
import math
import os
import random
import sys

import bpy  # doit précéder bmesh
import bmesh
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
W, H = 1920, 1080
TILT = math.radians(50)
FT = 0.16  # dessus du sol
SAMPLES = int(os.environ.get('SAMPLES', '64'))

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6
sc.render.film_transparent = True
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.resolution_percentage = int(os.environ.get('PCT', '100'))
QUICK = os.environ.get('QUICK') == '1'
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'


def color_mode(raw):
    if raw:
        sc.view_settings.view_transform = 'Raw'
        sc.view_settings.look = 'None'
        sc.view_settings.exposure = 0
    else:
        sc.view_settings.view_transform = 'AgX'
        sc.view_settings.look = 'AgX - Punchy'
        sc.view_settings.exposure = 0.15


def lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def sock(coll, ident):
    for s in coll:
        if s.identifier == ident:
            return s
    raise KeyError(ident)


# ---------- Matériaux ----------
def make_mat(name, col, rough=0.8, metal=0.0, mottle=0.12, per_obj=0.08, scale=5.0, band=None, ao=True, wood=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt, N, L = m.node_tree, m.node_tree.nodes, m.node_tree.links
    bsdf = N['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    rgb = N.new('ShaderNodeRGB')
    rgb.outputs[0].default_value = (*lin(col), 1)
    cur = rgb.outputs[0]
    tc = N.new('ShaderNodeTexCoord')

    def mul(color_out, scalar_out):
        cc = N.new('ShaderNodeCombineColor')
        for k in ('Red', 'Green', 'Blue'):
            L.new(scalar_out, cc.inputs[k])
        mx = N.new('ShaderNodeMix')
        mx.data_type = 'RGBA'
        mx.blend_type = 'MULTIPLY'
        sock(mx.inputs, 'Factor_Float').default_value = 1.0
        L.new(color_out, sock(mx.inputs, 'A_Color'))
        L.new(cc.outputs[0], sock(mx.inputs, 'B_Color'))
        return sock(mx.outputs, 'Result_Color')

    def mapr(val_out, lo, hi):
        mr = N.new('ShaderNodeMapRange')
        L.new(val_out, mr.inputs['Value'])
        mr.inputs['To Min'].default_value = lo
        mr.inputs['To Max'].default_value = hi
        return mr.outputs['Result']

    if band:
        z0, z1, bcol = band
        sep = N.new('ShaderNodeSeparateXYZ')
        L.new(tc.outputs['Object'], sep.inputs[0])
        g = N.new('ShaderNodeMath'); g.operation = 'GREATER_THAN'; g.inputs[1].default_value = z0
        l2 = N.new('ShaderNodeMath'); l2.operation = 'LESS_THAN'; l2.inputs[1].default_value = z1
        L.new(sep.outputs['Z'], g.inputs[0]); L.new(sep.outputs['Z'], l2.inputs[0])
        f = N.new('ShaderNodeMath'); f.operation = 'MULTIPLY'
        L.new(g.outputs[0], f.inputs[0]); L.new(l2.outputs[0], f.inputs[1])
        mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'
        L.new(f.outputs[0], sock(mx.inputs, 'Factor_Float'))
        L.new(cur, sock(mx.inputs, 'A_Color'))
        sock(mx.inputs, 'B_Color').default_value = (*lin(bcol), 1)
        cur = sock(mx.outputs, 'Result_Color')
    if wood:
        wv = N.new('ShaderNodeTexWave')
        wv.inputs['Scale'].default_value = 3.0
        wv.inputs['Distortion'].default_value = 6.0
        wv.inputs['Detail'].default_value = 3.0
        L.new(tc.outputs['Object'], wv.inputs['Vector'])
        cur = mul(cur, mapr(wv.outputs['Fac'], 0.8, 1.08))
    if mottle:
        nz = N.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = scale
        nz.inputs['Detail'].default_value = 6.0
        L.new(tc.outputs['Object'], nz.inputs['Vector'])
        cur = mul(cur, mapr(nz.outputs['Fac'], 1 - mottle, 1 + mottle))
    if per_obj:
        oi = N.new('ShaderNodeObjectInfo')
        cur = mul(cur, mapr(oi.outputs['Random'], 1 - per_obj, 1 + per_obj))
    if ao:
        a = N.new('ShaderNodeAmbientOcclusion')
        a.inputs['Distance'].default_value = 0.35
        cur = mul(cur, mapr(a.outputs['AO'], 0.6, 1.0))
    L.new(cur, bsdf.inputs['Base Color'])
    return m


def emit_mat(name, col, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    N.remove(N['Principled BSDF'])
    e = N.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = (*lin(col), 1)
    e.inputs['Strength'].default_value = strength
    L.new(e.outputs[0], N['Material Output'].inputs['Surface'])
    return m


M = {
    'floor': make_mat('floor', '#c99a52', 0.85, mottle=0.16, per_obj=0.1, scale=3),
    'grout': make_mat('grout', '#8e6236', 0.95, mottle=0.1, per_obj=0),
    'wall': make_mat('wall', '#d4a462', 0.85, mottle=0.12, per_obj=0.06, scale=2.5),
    'cap': make_mat('cap', '#e2bd80', 0.8, mottle=0.1, per_obj=0.04, scale=2.5),
    'base': make_mat('base', '#5a3f2b', 0.9, mottle=0.08, per_obj=0),
    'teal': make_mat('teal', '#2f8a86', 0.6, mottle=0.08, per_obj=0),
    'ochre': make_mat('ochre', '#d1913a', 0.6, mottle=0.08, per_obj=0),
    'column': make_mat('column', '#e0bb7f', 0.75, mottle=0.1, per_obj=0.03, scale=3),
    'bronze': make_mat('bronze', '#b0803f', 0.38, metal=0.75, mottle=0.08, per_obj=0),
    'bronze_dark': make_mat('bronze_dark', '#6a4b2a', 0.45, metal=0.6, mottle=0.08, per_obj=0),
    'iron': make_mat('iron', '#3a3e48', 0.45, metal=0.5, mottle=0.06, per_obj=0),
    'steel': make_mat('steel', '#b9c0c8', 0.3, metal=0.8, mottle=0.05, per_obj=0),
    'hole': make_mat('hole', '#20160f', 0.9, mottle=0, per_obj=0, ao=False),
    'jar': make_mat('jar', '#b8622f', 0.55, mottle=0.08, per_obj=0.03, band=(0.38, 0.47, '#2e58a6')),
    'wood': make_mat('wood', '#9a5e30', 0.75, mottle=0.06, per_obj=0.08, wood=True),
    'wood_dark': make_mat('wood_dark', '#5e3a1f', 0.75, mottle=0.06, per_obj=0.06, wood=True),
    'pot': make_mat('pot', '#a9552e', 0.7, mottle=0.08, per_obj=0.05),
    'leaf': make_mat('leaf', '#4f8f2e', 0.65, mottle=0.25, per_obj=0.1, scale=14),
    'rope': make_mat('rope', '#c9a066', 0.9, mottle=0.1, per_obj=0),
    'coal': emit_mat('coal', '#b32400', 1.4),
    'flame': emit_mat('flame', '#ff6a00', 3.2),
    'flame_core': emit_mat('flame_core', '#ffb21e', 5),
}

ROOM, PROPS = [], {}


def reg(obj, group):
    if group == 'room':
        ROOM.append(obj)
    else:
        PROPS.setdefault(group, []).append(obj)
    return obj


def link(obj):
    bpy.context.collection.objects.link(obj)
    return obj


def rbox(size, loc, mat, bevel=0.04, rot=(0, 0, 0), group='room', seg=3):
    me = bpy.data.meshes.new('box')
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new('box', me))
    ob.location = loc; ob.rotation_euler = rot
    if bevel:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = seg
        bv.harden_normals = True
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    return reg(ob, group)


def lathe(profile, loc, mat, steps=48, group='room', smooth=True, solid=0.0, sub=1, scale=1.0, rot=(0, 0, 0)):
    me = bpy.data.meshes.new('lathe')
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in profile]
    for a, b in zip(vs, vs[1:]):
        bm.edges.new((a, b))
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new('lathe', me))
    s = ob.modifiers.new('screw', 'SCREW'); s.steps = steps; s.render_steps = steps; s.use_smooth_shade = smooth
    s.use_merge_vertices = True
    if solid:
        so = ob.modifiers.new('solid', 'SOLIDIFY'); so.thickness = solid
    if sub:
        ob.modifiers.new('sub', 'SUBSURF').levels = sub
        ob.modifiers['sub'].render_levels = sub
    me.materials.append(mat)
    ob.location = loc; ob.scale = (scale, scale, scale); ob.rotation_euler = rot
    return reg(ob, group)


def cyl(r, h, loc, mat, group='room', verts=40, rot=(0, 0, 0), bevel=0.0, r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc, rotation=rot)
    ob = bpy.context.object
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    if bevel:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = 2; bv.harden_normals = True
    return reg(ob, group)


def sphere(r, loc, mat, group='room', scale=(1, 1, 1), sub=3):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    ob = bpy.context.object
    ob.scale = scale
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return reg(ob, group)


random.seed(11)

# ---------- Salle ----------
rbox((15.2, 10.2, 0.5), (0, 0.05, -0.25), M['base'], bevel=0.05)
rbox((13.0, 8.0, 0.06), (0, 0, 0.03), M['grout'], bevel=0)
for i in range(13):
    for j in range(8):
        x, y = -6 + i, -3.5 + j
        rbox((0.95, 0.95, 0.16), (x, y, 0.08 + random.uniform(-0.008, 0.008)), M['floor'], bevel=0.05,
             rot=(0, 0, math.radians(random.uniform(-1.2, 1.2))))
# mur du fond : 3 assises décalées
for row in range(3):
    x = -7.3 - (0.7 if row % 2 else 0)
    while x < 7.3:
        w = random.uniform(1.3, 2.1)
        x0, x1 = max(x, -7.3), min(x + w, 7.3)
        if x1 - x0 > 0.25:
            rbox((x1 - x0 - 0.04, 0.9, 0.78), ((x0 + x1) / 2, 4.45, 0.4 + row * 0.8), M['wall'], bevel=0.085)
        x += w
rbox((14.9, 0.05, 0.24), (0, 3.99, 1.95), M['teal'], bevel=0.01)
for k in range(29):
    rbox((0.13, 0.03, 0.13), (-7.0 + k * 0.5, 3.955, 1.95), M['ochre'], bevel=0.015, rot=(0, math.radians(45), 0))
rbox((15.4, 1.1, 0.24), (0, 4.4, 2.5), M['cap'], bevel=0.05)
# murs latéraux
for side in (-1, 1):
    for row in range(2):
        y = -4.0 - (0.6 if row else 0)
        while y < 4.0:
            l = random.uniform(1.2, 1.9)
            y0, y1 = max(y, -4.0), min(y + l, 4.0)
            if y1 - y0 > 0.25:
                rbox((0.8, y1 - y0 - 0.04, 0.68), (side * 6.9, (y0 + y1) / 2, 0.35 + row * 0.7), M['wall'], bevel=0.085)
            y += l
    rbox((0.95, 8.2, 0.18), (side * 6.9, 0.0, 1.47), M['cap'], bevel=0.04)
    rbox((14.0 * 0 + 0.06, 7.9, 0.16), (side * 6.48, 0, 1.0), M['teal'], bevel=0.01)
# muret avant (bas, pour ne jamais cacher le jeu)
x = -7.3
while x < 7.3:
    w = random.uniform(1.2, 1.8)
    x0, x1 = x, min(x + w, 7.3)
    rbox((x1 - x0 - 0.04, 0.8, 0.42), ((x0 + x1) / 2, -4.4, 0.21), M['wall'], bevel=0.085)
    x += w
rbox((15.4, 0.95, 0.12), (0, -4.4, 0.47), M['cap'], bevel=0.04)


# colonnes
def column(x, y):
    rbox((1.05, 1.05, 0.3), (x, y, FT + 0.15), M['column'], bevel=0.05)
    lathe([(0.0, 0), (0.37, 0), (0.37, 0.05), (0.35, 0.6), (0.34, 1.6), (0.33, 2.2), (0.0, 2.2)], (x, y, FT + 0.3), M['column'], sub=1)
    cyl(0.352, 0.14, (x, y, FT + 0.3 + 1.86), M['teal'])
    cyl(0.348, 0.08, (x, y, FT + 0.3 + 1.7), M['ochre'])
    cyl(0.36, 0.1, (x, y, FT + 0.42), M['teal'])
    lathe([(0.0, 0), (0.33, 0), (0.45, 0.12), (0.58, 0.3), (0.6, 0.38), (0.0, 0.38)], (x, y, FT + 2.5), M['column'], sub=1)
    rbox((1.15, 1.15, 0.22), (x, y, FT + 3.0), M['cap'], bevel=0.05)


column(-3.8, 3.05)
column(3.8, 3.05)

# brasero
BRAZ = Vector((0, 3.45, FT))
cyl(0.32, 0.06, BRAZ + Vector((0, 0, 0.03)), M['bronze_dark'], bevel=0.01)
cyl(0.07, 0.6, BRAZ + Vector((0, 0, 0.33)), M['bronze_dark'], r2=0.05)
lathe([(0, 0), (0.25, 0.02), (0.42, 0.12), (0.5, 0.28), (0.53, 0.32), (0.49, 0.33), (0.43, 0.2), (0, 0.15)], BRAZ + Vector((0, 0, 0.6)), M['bronze'], solid=0)
for k in range(9):
    a = k / 9 * 6.28
    sphere(0.11, BRAZ + Vector((math.cos(a) * 0.22, math.sin(a) * 0.22, 0.83)), M['coal'], sub=2)
fire = bpy.data.lights.new('fire', 'POINT')
fire.energy = 200
fire.color = lin('#ffa24a')
fire.shadow_soft_size = 0.25
fo = link(bpy.data.objects.new('fire', fire))
fo.location = BRAZ + Vector((0, -0.15, 1.35))


# plantes en pot
def plant(x, y, s=1.0):
    lathe([(0, 0), (0.24, 0), (0.33, 0.12), (0.36, 0.42), (0.4, 0.48), (0.38, 0.52), (0.31, 0.46), (0, 0.46)], (x, y, FT), M['pot'], sub=1, scale=s)
    blobs = [(0, 0, 0.85, 0.36), (0.24, 0.08, 0.72, 0.27), (-0.22, 0.06, 0.74, 0.28), (0.04, -0.24, 0.7, 0.26),
             (-0.06, 0.02, 1.1, 0.25), (0.12, 0.22, 0.75, 0.24), (-0.16, -0.16, 0.95, 0.22)]
    for bx, by, bz, br in blobs:
        ob = sphere(br * s, (x + bx * s, y + by * s, FT + bz * s), M['leaf'], sub=4)
        d = ob.modifiers.new('disp', 'DISPLACE')
        tex = bpy.data.textures.new('leafnoise', 'CLOUDS'); tex.noise_scale = 0.07
        d.texture = tex; d.strength = 0.05 * s


for (px, py) in ((-5.8, 3.3), (5.8, 3.3), (-5.8, -3.25), (5.8, -3.25)):
    plant(px, py)

# ---------- Objets interactifs (construits à l'origine, puis placés) ----------
JAR = [(0.0, 0), (0.16, 0), (0.24, 0.05), (0.32, 0.22), (0.36, 0.4), (0.33, 0.58), (0.24, 0.72), (0.14, 0.8),
       (0.12, 0.88), (0.16, 0.93), (0.17, 0.98), (0.13, 1.0), (0.11, 0.96)]


def bake(ob):
    """Applique les modificateurs et renvoie un objet maillé simple."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    nob = link(bpy.data.objects.new(ob.name + '_m', me))
    nob.matrix_world = ob.matrix_world.copy()
    bpy.data.objects.remove(ob)
    return nob


def boolean(target, cutter, op):
    mod = target.modifiers.new('bool', 'BOOLEAN')
    mod.operation = op; mod.object = cutter; mod.solver = 'EXACT'
    return bake(target)


def unreg(ob):
    for lst in [ROOM] + list(PROPS.values()):
        if ob in lst:
            lst.remove(ob)


def jar_intact(group, loc):
    ob = lathe(JAR, loc, M['jar'], group=group, solid=0.03, sub=1, scale=0.95)
    return ob


def jar_broken(group, loc):
    random.seed(5)
    base = lathe(JAR, (0, 0, 0), M['jar'], group='tmp', solid=0.03, sub=1, scale=0.95)
    unreg(base)
    base = bake(base)
    # coupe dentelée : boîte dont le dessus est irrégulier
    me = bpy.data.meshes.new('cut')
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=12, use_grid_fill=True)
    for v in bm.verts:
        v.co.x *= 1.4; v.co.y *= 1.4
        v.co.z = (0.4 + random.uniform(-0.07, 0.07)) if v.co.z > 0.49 else (-0.6 if v.co.z < -0.49 else -0.1 + v.co.z)
    bm.to_mesh(me); bm.free()
    cut = link(bpy.data.objects.new('cut', me))
    shards_src = base.copy(); shards_src.data = base.data.copy(); link(shards_src)
    piece = boolean(base, cut, 'INTERSECT')
    bpy.data.objects.remove(cut)
    piece.location = loc
    reg(piece, group)
    # éclats : intersections du haut du vase avec de petites boîtes, posés au sol
    for k in range(7):
        a = k / 7 * 6.28 + random.uniform(-0.3, 0.3)
        z = random.uniform(0.5, 0.85)
        bx = rbox((0.22, 0.22, 0.2), (math.cos(a) * 0.32, math.sin(a) * 0.32, z), M['jar'], bevel=0, group='tmp')
        unreg(bx)
        src = shards_src.copy(); src.data = shards_src.data.copy(); link(src)
        sh = boolean(src, bx, 'INTERSECT')
        bpy.data.objects.remove(bx)
        if len(sh.data.vertices) == 0:
            bpy.data.objects.remove(sh)
            continue
        # recentrer puis poser au sol
        c = sum((v.co for v in sh.data.vertices), Vector()) / len(sh.data.vertices)
        for v in sh.data.vertices:
            v.co -= c
        dist = random.uniform(0.45, 0.85)
        sh.location = (loc[0] + math.cos(a) * dist, loc[1] + math.sin(a) * dist * 0.8, FT + 0.05)
        sh.rotation_euler = (math.radians(random.uniform(60, 100)), random.uniform(0, 6.28), random.uniform(-0.4, 0.4))
        reg(sh, group)
    bpy.data.objects.remove(shards_src)


def crate_intact(group, loc, ry=0.15):
    S = 0.85
    parts = [rbox((S, S, S), (0, 0, S / 2), M['wood'], bevel=0.03, group=group)]
    p = S / 2 - 0.05
    for cx, cy in ((-p, -p), (p, -p), (-p, p), (p, p)):
        parts.append(rbox((0.12, 0.12, S + 0.02), (cx, cy, S / 2), M['wood_dark'], bevel=0.02, group=group))
    for z in (0.06, S - 0.06):
        parts.append(rbox((S + 0.02, 0.1, 0.1), (0, -p, z), M['wood_dark'], bevel=0.02, group=group))
        parts.append(rbox((S + 0.02, 0.1, 0.1), (0, p, z), M['wood_dark'], bevel=0.02, group=group))
        parts.append(rbox((0.1, S + 0.02, 0.1), (-p, 0, z), M['wood_dark'], bevel=0.02, group=group))
        parts.append(rbox((0.1, S + 0.02, 0.1), (p, 0, z), M['wood_dark'], bevel=0.02, group=group))
    parts.append(rbox((1.0, 0.05, 0.1), (0, -S / 2 - 0.01, S / 2), M['wood_dark'], bevel=0.015, rot=(0, math.radians(45), 0), group=group))
    parts.append(rbox((0.05, 1.0, 0.1), (S / 2 + 0.01, 0, S / 2), M['wood_dark'], bevel=0.015, rot=(math.radians(45), 0, 0), group=group))
    for c in (-0.42, 0.42):
        for d in (-0.42, 0.42):
            parts.append(sphere(0.035, (c, -0.44, 0.06 + (d + 0.42) * 0.85), M['iron'], group=group, sub=2))
    root = bpy.data.objects.new('crate_root', None); link(root)
    for o in parts:
        o.location = Vector(o.location) + Vector((0, 0, FT))
        o.parent = root
    root.location = loc; root.rotation_euler = (0, 0, ry)


def crate_broken(group, loc):
    random.seed(9)
    root = bpy.data.objects.new('crate_b_root', None); link(root)
    for k in range(8):
        a = random.uniform(0, 6.28); d = random.uniform(0.0, 0.55)
        o = rbox((random.uniform(0.6, 0.85), 0.16, 0.05), (math.cos(a) * d, math.sin(a) * d * 0.8, FT + 0.03 + (k % 3) * 0.045),
                 M['wood'] if k % 3 else M['wood_dark'], bevel=0.012, rot=(random.uniform(-0.12, 0.12), random.uniform(-0.12, 0.12), random.uniform(0, 3.14)), group=group)
        o.parent = root
    for k in range(2):
        o = rbox((0.12, 0.12, 0.8), (-0.35 + k * 0.7, 0.3 - k * 0.5, FT + 0.07), M['wood_dark'], bevel=0.02, rot=(math.radians(90), 0, random.uniform(0, 3)), group=group)
        o.parent = root
    root.location = loc


def trap(group, loc, active):
    root = bpy.data.objects.new('trap_root', None); link(root)
    parts = [cyl(0.5, 0.07, (0, 0, FT + 0.035), M['bronze'], group=group, bevel=0.02, verts=64),
             cyl(0.41, 0.075, (0, 0, FT + 0.04), M['bronze_dark'], group=group, bevel=0.01, verts=64)]
    for a in range(-1, 2):
        for b in range(-1, 2):
            parts.append(cyl(0.055, 0.02, (a * 0.2, b * 0.2, FT + 0.075), M['hole'], group=group, verts=20))
            if active:
                parts.append(cyl(0.07, 0.42, (a * 0.2, b * 0.2, FT + 0.29), M['steel'], group=group, verts=20, r2=0.0))
    for k in range(10):
        a = k / 10 * 6.28
        parts.append(sphere(0.03, (math.cos(a) * 0.455, math.sin(a) * 0.455, FT + 0.072), M['bronze'], group=group, sub=2))
    for o in parts:
        o.parent = root
    root.location = loc


def bomb(group, loc):
    root = bpy.data.objects.new('bomb_root', None); link(root)
    parts = [sphere(0.32, (0, 0, FT + 0.32), M['iron'], group=group, sub=4)]
    bpy.ops.mesh.primitive_torus_add(major_radius=0.322, minor_radius=0.035, location=(0, 0, FT + 0.32))
    t = bpy.context.object; t.data.materials.append(M['bronze']); bpy.ops.object.shade_smooth(); parts.append(reg(t, group))
    parts.append(cyl(0.1, 0.12, (0, 0, FT + 0.66), M['bronze'], group=group, r2=0.08))
    cu = bpy.data.curves.new('fuse', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.025; cu.bevel_resolution = 3
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(2)
    for bp, co in zip(sp.bezier_points, [(0, 0, FT + 0.7), (0.06, 0.02, FT + 0.86), (0.2, 0.06, FT + 0.9)]):
        bp.co = co; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    f = link(bpy.data.objects.new('fuse', cu)); f.data.materials.append(M['rope']); parts.append(reg(f, group))
    for o in parts:
        o.parent = root
    root.location = loc


# positions de référence (un seul rendu par état, réutilisé ailleurs en jeu)
P = {
    'jar': (-4.3, 0.9, 0), 'crate': (3.4, 1.6, 0), 'trap': (1.4, -0.7, 0), 'bomb': (3.0, -2.0, 0),
}
jar_intact('jar', P['jar'])
jar_broken('jar_broken', P['jar'])
crate_intact('crate', P['crate'])
crate_broken('crate_broken', P['crate'])
trap('trap', P['trap'], False)
trap('trap_on', P['trap'], True)
bomb('bomb', P['bomb'])

# ---------- Lumières ----------
sun = bpy.data.lights.new('sun', 'SUN')
sun.energy = 5.2
sun.angle = math.radians(2.5)
sun.color = lin('#ffe6c4')
so = link(bpy.data.objects.new('sun', sun))
so.rotation_euler = Vector((1.0, 0.18, -1.45)).to_track_quat('-Z', 'Y').to_euler()
world = bpy.data.worlds.new('w')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (*lin('#c9d3e8'), 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5
sc.world = world

# ---------- Caméra orthographique à 50° ----------
cam = bpy.data.cameras.new('cam')
cam.type = 'ORTHO'
cam.ortho_scale = 17.4
co = link(bpy.data.objects.new('cam', cam))
co.rotation_euler = (math.radians(90) - TILT, 0, 0)
up = Vector((0, math.sin(TILT), math.cos(TILT)))
d = Vector((0, math.cos(TILT), -math.sin(TILT)))
m = 0.64
target = up * m
co.location = target - d * 40
sc.camera = co

# catcher d'ombre sous chaque objet (seulement pour les rendus d'objets)
catchers = {}
for name, pos in P.items():
    bpy.ops.mesh.primitive_plane_add(size=2.6, location=(pos[0], pos[1], FT + 0.001))
    c = bpy.context.object
    c.is_shadow_catcher = True
    c.hide_render = True
    catchers[name] = c

# matériau « carte de relief » : normale en espace caméra, codée en couleur
nm = bpy.data.materials.new('normals'); nm.use_nodes = True
N, L = nm.node_tree.nodes, nm.node_tree.links
N.remove(N['Principled BSDF'])
geo = N.new('ShaderNodeNewGeometry')
vt = N.new('ShaderNodeVectorTransform'); vt.vector_type = 'NORMAL'; vt.convert_from = 'WORLD'; vt.convert_to = 'CAMERA'
L.new(geo.outputs['Normal'], vt.inputs[0])
sc1 = N.new('ShaderNodeVectorMath'); sc1.operation = 'MULTIPLY_ADD'
L.new(vt.outputs[0], sc1.inputs[0]); sc1.inputs[1].default_value = (0.5, 0.5, 0.5); sc1.inputs[2].default_value = (0.5, 0.5, 0.5)
em = N.new('ShaderNodeEmission'); L.new(sc1.outputs[0], em.inputs['Color'])
L.new(em.outputs[0], N['Material Output'].inputs['Surface'])

PROPS.pop('tmp', None)
ALL_PROP_OBJS = [o for lst in PROPS.values() for o in lst]


def show(objs):
    keep = set(objs)
    for o in ROOM + ALL_PROP_OBJS:
        o.hide_render = o not in keep


def render(path, normals=False, samples=None):
    vl = sc.view_layers[0]
    color_mode(normals)
    vl.material_override = nm if normals else None
    sc.cycles.samples = 8 if normals else (samples or SAMPLES)
    sc.cycles.use_denoising = not normals
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('rendu', os.path.basename(path), flush=True)


# 0) export glTF pour Godot (même salle, même état que l'image complète)
if os.environ.get('EXPORT') == '1':
    import addon_utils
    addon_utils.enable('io_scene_gltf2', default_set=True)
    jar_intact('beauty', (-2.6, 1.9, 0))
    jar_broken('beauty', (-1.2, 1.2, 0))
    crate_broken('beauty', (4.6, 0.6, 0))
    trap('beauty', (-3.6, -1.9, 0), True)
    PROPS.pop('tmp', None)
    for key in ('jar_broken', 'crate_broken', 'trap_on'):
        for o in PROPS.get(key, []):
            bpy.data.objects.remove(o)
    for c in catchers.values():
        bpy.data.objects.remove(c)
    # appliquer les modificateurs et réorienter les faces vers l'extérieur (Godot n'affiche que l'extérieur)
    dg = bpy.context.evaluated_depsgraph_get()
    for o in [o for o in bpy.data.objects if o.type == 'MESH']:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.to_mesh(me); bm.free()
        o.modifiers.clear(); o.data = me
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'room.glb'), export_format='GLB', export_apply=True,
                              export_lights=False, export_cameras=False, export_materials='EXPORT')
    print('EXPORT OK', flush=True)
    sys.exit(0)

# 1) image complète (tous les objets, avec doublons placés ailleurs)
jar_intact('beauty', (-2.6, 1.9, 0))
jar_broken('beauty', (-1.2, 1.2, 0))
crate_broken('beauty', (4.6, 0.6, 0))
trap('beauty', (-3.6, -1.9, 0), True)
EXTRA = PROPS.pop('beauty')
for o in EXTRA:
    o.hide_render = False
beauty_objs = ROOM + PROPS['jar'] + PROPS['crate'] + PROPS['trap'] + PROPS['bomb'] + EXTRA
show(beauty_objs)
for o in EXTRA:
    o.hide_render = False
render(os.path.join(OUT, 'beauty.png'), samples=int(os.environ.get('BEAUTY_SAMPLES', SAMPLES)))
for o in EXTRA:
    o.hide_render = True
if QUICK:
    sys.exit(0)
PROPS.pop('tmp', None)

# 2) fond seul
show(ROOM)
render(os.path.join(OUT, 'bg.png'))
render(os.path.join(OUT, 'bg_n.png'), normals=True)

# 3) chaque état d'objet, avec son ombre
for state, objs in PROPS.items():
    base = state.split('_')[0]
    show(objs)
    catchers[base].hide_render = False
    render(os.path.join(OUT, f'{state}.png'))
    catchers[base].hide_render = True
    render(os.path.join(OUT, f'{state}_n.png'), normals=True)


# 4) projection monde → écran (orthographique donc linéaire)
def px(v):
    p = world_to_camera_view(sc, co, Vector(v))
    return [p.x * W, (1 - p.y) * H]


o0 = px((0, 0, 0))
proj = {'o': o0, 'x': [a - b for a, b in zip(px((1, 0, 0)), o0)], 'y': [a - b for a, b in zip(px((0, 1, 0)), o0)],
        'z': [a - b for a, b in zip(px((0, 0, 1)), o0)]}
info = {'W': W, 'H': H, 'FT': FT, 'proj': proj, 'ref': P, 'brazier': px(BRAZ + Vector((0, 0, 1.4))),
        'bombFuse': px((P['bomb'][0] + 0.2, P['bomb'][1] + 0.06, FT + 0.9))}
with open(os.path.join(OUT, 'scene.json'), 'w') as f:
    json.dump(info, f, indent=1)
print('FINI', flush=True)
