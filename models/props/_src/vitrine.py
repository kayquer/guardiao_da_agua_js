"""Vitrine do pack: importa os .glb de models/props/ lado a lado num chão de grama, luz de dia do jogo, render PNG.
blender -b --factory-startup --python vitrine.py -- <saida.png> [<arquivo.blend>]"""
import glob
import math
import os
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SAIDA = args[0] if args else os.path.join(os.path.dirname(__file__), 'vitrine.png')
BLEND = args[1] if len(args) > 1 else None
PASTA = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

bpy.ops.wm.read_factory_settings(use_empty=True)
cena = bpy.context.scene


def mat(nome, rgb):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = 0.9
    return m


# Fileiras da vitrine: as altas ao fundo (-Y, longe da câmera), as baixas na frente.
# Peça nova que não estiver aqui entra numa fileira extra na frente.
FILEIRAS = [
    ['araucaria', 'buriti', 'ipe_amarelo', 'poste_solar', 'ponto_onibus', 'cisterna'],
    ['lixeira_seletiva', 'placa_educativa', 'bicicletario', 'banco_praca', 'composteira', 'horta'],
    ['canoa', 'boia_rio', 'barril_chuva', 'bebedouro', 'hidrante', 'arbustos', 'pedras'],
]
existentes = {os.path.basename(f)[:-4] for f in glob.glob(os.path.join(PASTA, '*.glb'))}
FILEIRAS = [[n for n in fila if n in existentes] for fila in FILEIRAS]
sobra = sorted(existentes - {n for fila in FILEIRAS for n in fila})
FILEIRAS = [fila for fila in FILEIRAS + [sobra] if fila]

passo, passo_y = 1.5, 1.6
colunas = max(len(fila) for fila in FILEIRAS)
y0 = -passo_y * (len(FILEIRAS) - 1) / 2
for j, fila in enumerate(FILEIRAS):
    x0 = -passo * (len(fila) - 1) / 2
    for i, nome in enumerate(fila):
        antes = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(PASTA, nome + '.glb'))
        novos = [o for o in bpy.data.objects if o not in antes]
        pai = bpy.data.objects.new(nome, None)
        cena.collection.objects.link(pai)
        for o in novos:
            if o.parent is None:
                o.parent = pai
        pai.location = (x0 + i * passo, y0 + j * passo_y, 0.05)

# Chão: placa de grama como um bloco do terreno do jogo
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.15))
chao = bpy.context.object
chao.scale = (passo * colunas + 0.4, passo_y * len(FILEIRAS) + 0.2, 0.4)
chao.data.materials.append(mat('grama', (0.2, 0.55, 0.1)))
bev = chao.modifiers.new('b', 'BEVEL'); bev.width = 0.04; bev.segments = 1

# Céu em degradê suave e sol do jogo
mundo = bpy.data.worlds.new('ceu'); cena.world = mundo
mundo.use_nodes = True
bg = next(n for n in mundo.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (0.55, 0.78, 0.95, 1)
bg.inputs['Strength'].default_value = 0.9
sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
cena.collection.objects.link(sol)
sol.data.energy = 3.2
sol.data.color = (1.0, 0.95, 0.85)
sol.data.angle = math.radians(6)
sol.rotation_euler = (math.radians(50), 0, math.radians(-150))

# Câmera ortográfica isométrica (frente dos modelos = +Y no Blender após o giro da exportação)
cam = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
cena.collection.objects.link(cam); cena.camera = cam
cam.data.type = 'ORTHO'
cam.data.ortho_scale = passo * colunas + 0.3
alvo = Vector((-0.3, 0, 0.45))
cam.location = alvo + Vector((-2.5, 9, 5.5))
cam.rotation_euler = (alvo - cam.location).to_track_quat('-Z', 'Y').to_euler()

r = cena.render
try:
    r.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    r.engine = 'BLENDER_EEVEE'
r.resolution_x, r.resolution_y = 1920, 1080
r.film_transparent = False
cena.view_settings.view_transform = 'Standard'
try:
    cena.eevee.use_gtao = True
except AttributeError:
    pass
r.image_settings.file_format = 'PNG'
r.filepath = SAIDA
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.render.render(write_still=True)
print('VITRINE', SAIDA)
