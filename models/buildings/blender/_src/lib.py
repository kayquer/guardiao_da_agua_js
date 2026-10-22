"""
GUARDIÃO DA ÁGUA - biblioteca dos geradores de modelos low poly no Blender (bpy)

Cada arquivo <id>.py desta pasta monta UM prédio e exporta models/buildings/blender/<id>.glb.
Regerar um modelo (Blender 4.5 LTS, sem interface):

    blender.exe -b --factory-startup --python models/buildings/blender/_src/<id>.py

Regerar todos:

    blender.exe -b --factory-startup --python models/buildings/blender/_src/gerar_todos.py

Depois de regerar, atualize `tris` em js/data/buildingModels.js (o script imprime) — o teste
tests/unit/models.test.js confere a contagem e o orçamento (≤ 1.500 triângulos, ≤ 150 KB).

Convenções (para casar com a Kenney City Kit e com o carregador js/systems/building/BuildingModels.js):
- Unidade: 1 célula do grid = 2 unidades. Monte a base do tamanho `size × 2` (o jogo encaixa pela caixa
  envolvente: maior lado do chão = 90% da área, base no chão, centro na área).
- Monte com a FRENTE para -Y (vista frontal do Blender) e o lado direito (+X) também caprichado: são as
  duas faces que a câmera isométrica vê. `exportar` gira 180° em Z, e o glTF→Babylon leva a frente para
  -Z do jogo, como os modelos da Kenney.
- Só cores chapadas: cada material é um Principled BSDF com cor base (sem textura, sem UV). O carregador
  junta tudo num mesh só e grava a cor de cada material como cor de vértice.
- Sombreamento facetado (flat) e chanfro leve (modificador Bevel de 1 segmento) nos volumes principais.
- Partes que poderiam girar (pás, roda d'água) saem como objetos separados com nome próprio; hoje o
  carregador junta tudo num mesh estático, mas o arquivo já fica pronto para animar.
"""
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

# Paleta em sRGB (#rrggbb), na linha da Kenney City Kit + cores do jogo
# (azul-água/turquesa = água, verde = ambiente, amarelo = energia)
PALETA = {
    'parede': '#f4f1ea',        # branco quente das fachadas
    'creme': '#f2e2b6',
    'concreto': '#cfccc4',
    'concreto_escuro': '#a19e97',
    'piso': '#b9b6ae',
    'asfalto': '#5b6068',
    'escuro': '#3b404b',
    'metal': '#b9c3cc',
    'metal_escuro': '#6f7a86',
    'vidro': '#7fb3e0',
    'vidro_escuro': '#4f7fb5',
    'agua': '#3cc4dc',          # turquesa
    'agua_funda': '#1f8fd0',
    'agua_suja': '#8fae7a',     # água bruta, antes do tratamento
    'cano': '#2b86d6',
    'telhado_azul': '#3f78bf',
    'telhado_vermelho': '#c8553d',
    'telhado_verde': '#3f9a54',
    'grama': '#7cc85a',
    'verde': '#5cb84a',
    'verde_escuro': '#3e8a3a',
    'folha': '#8ad155',
    'madeira': '#a8743f',
    'madeira_escura': '#7a5230',
    'terra': '#8a6a4a',
    'areia': '#e3cf96',
    'pedra': '#bdb6a6',
    'amarelo': '#ffc72c',
    'laranja': '#ff9a2e',
    'vermelho': '#e04646',
    'roxo': '#7e57c2',
    'roxo_escuro': '#5e3fa0',
    'dourado': '#e9b22c',
    'painel_solar': '#2a4b8f',
    'flor_rosa': '#f07aa8',
    'flor_amarela': '#ffd84a',
}

_materiais = {}
_objetos = []


def _linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(nome):
    """Material só com cor base (Principled BSDF), um por cor da paleta."""
    if nome in _materiais:
        return _materiais[nome]
    hexa = PALETA[nome].lstrip('#')
    rgb = [_linear(int(hexa[i:i + 2], 16) / 255) for i in (0, 2, 4)]
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = 0.85
    bsdf.inputs['Metallic'].default_value = 0.0
    m.diffuse_color = (*rgb, 1)
    _materiais[nome] = m
    return m


def limpar():
    """Cena vazia (chamado por gerar antes de cada modelo)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _materiais.clear()
    _objetos.clear()


def _objeto(bm, cor, nome='peca', chanfro=0.0, local=(0, 0, 0), animado=False):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = False
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = local
    me.materials.append(material(cor))
    if chanfro > 0:
        mod = ob.modifiers.new('chanfro', 'BEVEL')
        mod.width = chanfro
        mod.segments = 1
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(35)
    ob['animado'] = animado
    _objetos.append(ob)
    return ob


def _rotacao(rot):
    """rot = (rx, ry, rz) em graus → matriz 4×4."""
    rx, ry, rz = (math.radians(a) for a in rot)
    return Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X')


def caixa(tam, pos, cor, chanfro=0.0, rot=(0, 0, 0), nome='caixa'):
    """Caixa de tamanho (x, y, z); pos = centro em x/y e BASE em z. rot gira em torno do centro da base."""
    sx, sy, sz = tam
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    m = Matrix.Translation(pos) @ _rotacao(rot) @ Matrix.Translation((0, 0, sz / 2)) @ Matrix.Diagonal((sx, sy, sz, 1))
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    return _objeto(bm, cor, nome, chanfro)


def cilindro(r, h, pos, cor, lados=8, r_topo=None, chanfro=0.0, rot=(0, 0, 0), nome='cilindro'):
    """Cilindro (ou tronco de cone com r_topo) em pé; pos = centro da base. rot gira em torno da base."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=lados, radius1=r,
                          radius2=r if r_topo is None else r_topo, depth=h)
    m = Matrix.Translation(pos) @ _rotacao(rot) @ Matrix.Translation((0, 0, h / 2))
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    if r_topo == 0:
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    return _objeto(bm, cor, nome, chanfro)


def cone(r, h, pos, cor, lados=8, nome='cone'):
    return cilindro(r, h, pos, cor, lados=lados, r_topo=0, nome=nome)


def cano(p1, p2, r, cor='cano', lados=6, nome='cano'):
    """Cilindro de p1 a p2 (canos, postes, hastes)."""
    a, b = Vector(p1), Vector(p2)
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=lados, radius1=r, radius2=r, depth=d.length)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    m = Matrix.Translation((a + b) / 2) @ rot
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    return _objeto(bm, cor, nome)


def esfera(r, pos, cor, escala=(1, 1, 1), sub=1, nome='esfera'):
    """Icoesfera facetada (copas de árvore, pedras, cúpulas). pos = centro."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    m = Matrix.Translation(pos) @ Matrix.Diagonal((*escala, 1))
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    return _objeto(bm, cor, nome)


def cupula(r, pos, cor, lados=8, aneis=3, nome='cupula'):
    """Meia esfera facetada com a base em pos."""
    bm = bmesh.new()
    topo = bm.verts.new((0, 0, r))
    aneis_v = []
    for i in range(aneis):
        ang = (math.pi / 2) * (i / aneis)
        z, rr = r * math.sin(ang), r * math.cos(ang)
        aneis_v.append([bm.verts.new((rr * math.cos(2 * math.pi * k / lados), rr * math.sin(2 * math.pi * k / lados), z))
                        for k in range(lados)])
    for i in range(aneis - 1):
        for k in range(lados):
            a, b = aneis_v[i][k], aneis_v[i][(k + 1) % lados]
            c, d = aneis_v[i + 1][(k + 1) % lados], aneis_v[i + 1][k]
            bm.faces.new((a, b, c, d))
    for k in range(lados):
        bm.faces.new((aneis_v[-1][k], aneis_v[-1][(k + 1) % lados], topo))
    bm.faces.new(list(reversed(aneis_v[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(pos), verts=bm.verts)
    return _objeto(bm, cor, nome)


def prisma(perfil, comprimento, pos, cor, eixo='X', chanfro=0.0, rot=(0, 0, 0), nome='prisma'):
    """
    Extruda um polígono 2D. eixo 'X': perfil em (y, z) estendido ao longo de X (telhado de duas águas
    com a cumeeira em X); 'Y': perfil em (x, z) ao longo de Y; 'Z': perfil em (x, y) subindo em Z.
    pos = centro da extrusão em x/y (e base em z para os perfis que começam em z = 0).
    """
    bm = bmesh.new()
    L = comprimento
    a_, b_ = [], []
    for (u, v) in perfil:
        if eixo == 'X':
            a_.append(bm.verts.new((-L / 2, u, v)))
            b_.append(bm.verts.new((L / 2, u, v)))
        elif eixo == 'Y':
            a_.append(bm.verts.new((u, -L / 2, v)))
            b_.append(bm.verts.new((u, L / 2, v)))
        else:
            a_.append(bm.verts.new((u, v, 0)))
            b_.append(bm.verts.new((u, v, L)))
    n = len(perfil)
    bm.faces.new(a_)
    bm.faces.new(list(reversed(b_)))
    for i in range(n):
        bm.faces.new((a_[i], a_[(i + 1) % n], b_[(i + 1) % n], b_[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(pos) @ _rotacao(rot), verts=bm.verts)
    return _objeto(bm, cor, nome, chanfro)


def telhado(larg, prof, alt, pos, cor, beiral=0.12, eixo='X', nome='telhado'):
    """Telhado de duas águas. larg em X, prof em Y; cumeeira ao longo de `eixo`. pos = centro, base do telhado."""
    if eixo == 'X':
        p = prof / 2 + beiral
        return prisma([(-p, 0), (p, 0), (0, alt)], larg + 2 * beiral, pos, cor, eixo='X', nome=nome)
    p = larg / 2 + beiral
    return prisma([(-p, 0), (p, 0), (0, alt)], prof + 2 * beiral, pos, cor, eixo='Y', nome=nome)


def telhado4(larg, prof, alt, pos, cor, beiral=0.1, nome='telhado'):
    """Telhado de quatro águas (cumeeira ao longo do lado maior). pos = centro, base do telhado."""
    x, y, z = pos
    a, b = larg / 2 + beiral, prof / 2 + beiral
    bm = bmesh.new()
    base = [bm.verts.new((x + sx * a, y + sy * b, z)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    if larg >= prof:
        r = max(a - b, 0.001)
        c1, c2 = bm.verts.new((x - r, y, z + alt)), bm.verts.new((x + r, y, z + alt))
        bm.faces.new((base[0], base[1], c2, c1))
        bm.faces.new((base[1], base[2], c2))
        bm.faces.new((base[2], base[3], c1, c2))
        bm.faces.new((base[3], base[0], c1))
    else:
        r = max(b - a, 0.001)
        c1, c2 = bm.verts.new((x, y - r, z + alt)), bm.verts.new((x, y + r, z + alt))
        bm.faces.new((base[0], base[1], c1))
        bm.faces.new((base[1], base[2], c2, c1))
        bm.faces.new((base[2], base[3], c2))
        bm.faces.new((base[3], base[0], c1, c2))
    bm.faces.new(list(reversed(base)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _objeto(bm, cor, nome)


def tanque(larg, prof, alt, pos, cor_agua='agua', cor='concreto', parede=0.08, nivel=0.07, chanfro=0.0):
    """Tanque aberto retangular (decantação, filtros): quatro paredes e a lâmina d'água visível por cima."""
    x, y, z = pos
    p = parede
    caixa((larg, p, alt), (x, y - prof / 2 + p / 2, z), cor, chanfro=chanfro)
    caixa((larg, p, alt), (x, y + prof / 2 - p / 2, z), cor, chanfro=chanfro)
    caixa((p, prof - 2 * p, alt), (x - larg / 2 + p / 2, y, z), cor, chanfro=chanfro)
    caixa((p, prof - 2 * p, alt), (x + larg / 2 - p / 2, y, z), cor, chanfro=chanfro)
    caixa((larg - 2 * p, prof - 2 * p, alt - nivel), (x, y, z), cor_agua)


def tanque_redondo(r, alt, pos, cor_agua='agua', cor='concreto', lados=12, borda=0.08, nivel=0.07):
    """Tanque circular aberto: anel (cilindro) com a água um pouco abaixo da borda."""
    x, y, z = pos
    anel(r, r - borda, alt, pos, cor, lados=lados)
    cilindro(r - borda + 0.01, alt - nivel, pos, cor_agua, lados=lados)


def anel(r_ext, r_int, alt, pos, cor, lados=12, nome='anel'):
    """Tubo (anel com altura): borda de tanques, chafarizes, flanges."""
    bm = bmesh.new()
    fora_b, fora_t, dentro_b, dentro_t = [], [], [], []
    for k in range(lados):
        a = 2 * math.pi * k / lados
        c, s = math.cos(a), math.sin(a)
        fora_b.append(bm.verts.new((r_ext * c, r_ext * s, 0)))
        fora_t.append(bm.verts.new((r_ext * c, r_ext * s, alt)))
        dentro_b.append(bm.verts.new((r_int * c, r_int * s, 0)))
        dentro_t.append(bm.verts.new((r_int * c, r_int * s, alt)))
    for k in range(lados):
        j = (k + 1) % lados
        bm.faces.new((fora_b[k], fora_b[j], fora_t[j], fora_t[k]))
        bm.faces.new((dentro_b[j], dentro_b[k], dentro_t[k], dentro_t[j]))
        bm.faces.new((fora_t[k], fora_t[j], dentro_t[j], dentro_t[k]))
        bm.faces.new((fora_b[j], fora_b[k], dentro_b[k], dentro_b[j]))
    bmesh.ops.transform(bm, matrix=Matrix.Translation(pos), verts=bm.verts)
    return _objeto(bm, cor, nome)


def rotor(pos, raio, cor='parede', cor_cubo='metal', nome='pas', pas=3, largura=0.12):
    """
    Pás de turbina eólica no plano XZ (de frente para -Y), como objeto SEPARADO com o pivô no cubo:
    pronto para girar em Y se o carregador um dia manter nós separados.
    """
    bm = bmesh.new()
    for i in range(pas):
        ang = 2 * math.pi * i / pas + math.pi / 2
        d = Vector((math.cos(ang), 0, math.sin(ang)))
        n = Vector((-d.z, 0, d.x))
        # pá afilada (perfil de quatro pontos) com uma espessurinha
        pts = [d * 0.08 + n * largura * 0.4, d * 0.08 - n * largura * 0.6,
               d * raio * 0.35 - n * largura * 0.7, d * raio - n * largura * 0.15, d * raio + n * largura * 0.1,
               d * raio * 0.3 + n * largura * 0.5]
        frente = [bm.verts.new(p + Vector((0, -0.02, 0))) for p in pts]
        tras = [bm.verts.new(p + Vector((0, 0.02, 0))) for p in pts]
        bm.faces.new(frente)
        bm.faces.new(list(reversed(tras)))
        k = len(pts)
        for j in range(k):
            bm.faces.new((frente[j], frente[(j + 1) % k], tras[(j + 1) % k], tras[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = _objeto(bm, cor, nome, local=pos, animado=True)
    # cubo (nariz) no mesmo nó das pás
    bm2 = bmesh.new()
    bmesh.ops.create_cone(bm2, cap_ends=True, cap_tris=False, segments=8, radius1=0.09, radius2=0.0, depth=0.18)
    bmesh.ops.remove_doubles(bm2, verts=bm2.verts, dist=1e-5)
    bmesh.ops.transform(bm2, matrix=Matrix.Rotation(math.pi / 2, 4, 'X') @ Matrix.Translation((0, 0, 0.05)),
                        verts=bm2.verts)
    me2 = bpy.data.meshes.new('cubo')
    bm2.to_mesh(me2)
    bm2.free()
    me2.materials.append(material(cor_cubo))
    # junta o cubo na malha das pás (dois materiais, um nó)
    bm3 = bmesh.new()
    bm3.from_mesh(ob.data)
    n_mat = len(ob.data.materials)
    ob.data.materials.append(material(cor_cubo))
    tmp = bmesh.new()
    tmp.from_mesh(me2)
    novos = {}
    for v in tmp.verts:
        novos[v] = bm3.verts.new(v.co)
    for f in tmp.faces:
        nf = bm3.faces.new([novos[v] for v in f.verts])
        nf.material_index = n_mat
    tmp.free()
    bm3.to_mesh(ob.data)
    bm3.free()
    bpy.data.meshes.remove(me2)
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob


def cerca(x0, y0, x1, y1, alt=0.22, cor='metal', postes=True):
    """Cerca baixa retangular: quatro travessas finas (e postes nos cantos)."""
    e = 0.025
    for (ax, ay, bx, by) in ((x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)):
        cx, cy = (ax + bx) / 2, (ay + by) / 2
        lx, ly = abs(bx - ax) or e, abs(by - ay) or e
        caixa((lx, ly, e), (cx, cy, alt), cor)
        caixa((lx, ly, e), (cx, cy, alt * 0.5), cor)
    if postes:
        for (px, py) in ((x0, y0), (x1, y0), (x1, y1), (x0, y1)):
            caixa((0.05, 0.05, alt + 0.04), (px, py, 0), cor)


def placa(larg, alt, pos, cor, face='frente', espessura=0.04, nome='placa'):
    """
    Painel fino numa fachada (janela, porta, letreiro). pos = centro do painel, já no plano da fachada;
    face: 'frente' (-Y), 'tras' (+Y), 'direita' (+X), 'esquerda' (-X), 'topo' (+Z).
    """
    x, y, z = pos
    e = espessura
    if face in ('frente', 'tras'):
        dy = -e / 2 if face == 'frente' else e / 2
        return caixa((larg, e, alt), (x, y + dy, z - alt / 2), cor, nome=nome)
    if face in ('direita', 'esquerda'):
        dx = e / 2 if face == 'direita' else -e / 2
        return caixa((e, larg, alt), (x + dx, y, z - alt / 2), cor, nome=nome)
    return caixa((larg, alt, e), (x, y, z), cor, nome=nome)


def janelas(face, plano, centro_z, de, ate, n, larg, alt, cor='vidro', moldura=None):
    """n janelas iguais numa fachada: ao longo de X (frente/trás) ou Y (direita/esquerda), de `de` até `ate`."""
    for i in range(n):
        t = (i + 0.5) / n
        c = de + (ate - de) * t
        if face in ('frente', 'tras'):
            pos = (c, plano, centro_z)
        else:
            pos = (plano, c, centro_z)
        if moldura:
            placa(larg + 0.08, alt + 0.08, pos, moldura, face, espessura=0.03)
            off = 0.03 if face in ('tras', 'direita') else -0.03
            pos = (pos[0] + (off if face in ('direita', 'esquerda') else 0),
                   pos[1] + (off if face in ('frente', 'tras') else 0), pos[2])
        placa(larg, alt, pos, cor, face, espessura=0.03)


def arvore(pos, altura=1.0, cor='verde', tronco='madeira', tipo='redonda'):
    """Árvore low poly como as do jogo: tronco + copa facetada (redonda ou pinheiro)."""
    x, y, z = pos
    cilindro(0.06 * altura, 0.35 * altura, (x, y, z), tronco, lados=5)
    if tipo == 'pinheiro':
        cone(0.32 * altura, 0.9 * altura, (x, y, z + 0.25 * altura), cor, lados=6)
    else:
        esfera(0.3 * altura, (x, y, z + 0.6 * altura), cor, escala=(1, 1, 1.1))


def arbusto(pos, r=0.18, cor='verde'):
    esfera(r, (pos[0], pos[1], pos[2] + r * 0.6), cor, escala=(1, 1, 0.75))


# ---------------------------------------------------------------------------------------------------------

def _aplicar_e_juntar():
    """Aplica modificadores, gira 180° em Z (frente -Y do Blender → -Z do jogo) e junta as peças estáticas."""
    giro = Matrix.Rotation(math.pi, 4, 'Z')
    dg = bpy.context.evaluated_depsgraph_get()
    finais = []
    for ob in list(_objetos):
        ev = ob.evaluated_get(dg)
        me = bpy.data.meshes.new_from_object(ev)
        novo = bpy.data.objects.new(ob.name, me)
        bpy.context.scene.collection.objects.link(novo)
        novo.matrix_world = ob.matrix_world.copy()
        novo['animado'] = ob['animado']
        bpy.data.objects.remove(ob)
        finais.append(novo)
    _objetos[:] = finais

    estaticos = []
    for ob in _objetos:
        if ob['animado']:
            # Partes animáveis: vértices relativos ao pivô (origem do objeto), só a posição gira
            ob.matrix_world = giro @ ob.matrix_world
            ob.data.transform(Matrix.Diagonal((*ob.scale, 1)))
            ob.scale = (1, 1, 1)
        else:
            ob.data.transform(giro @ ob.matrix_world)
            ob.matrix_world = Matrix.Identity(4)
            estaticos.append(ob)

    corpo = estaticos[0]
    if len(estaticos) > 1:
        with bpy.context.temp_override(active_object=corpo, selected_editable_objects=estaticos,
                                       selected_objects=estaticos):
            bpy.ops.object.join()
    corpo.name = 'corpo'
    corpo.data.name = 'corpo'
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            for p in ob.data.polygons:
                p.use_smooth = False
            ob.data.validate()
    return [ob for ob in bpy.context.scene.objects if ob.type == 'MESH']


def triangulos():
    total = 0
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ob.data.calc_loop_triangles()
            total += len(ob.data.loop_triangles)
    return total


def exportar(saida):
    _aplicar_e_juntar()
    tris = triangulos()
    os.makedirs(os.path.dirname(saida), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=saida,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_texcoords=False,
        export_normals=True,
        export_materials='EXPORT',
        export_yup=True,
        export_animations=False,
        export_extras=False,
    )
    kb = os.path.getsize(saida) / 1024
    print('MODELO ' + json.dumps({'arquivo': os.path.basename(saida), 'tris': tris, 'kb': round(kb, 1)}))
    return tris


def gerar(arquivo_py, construir):
    """Monta e exporta o modelo de `arquivo_py` (<id>.py → ../<id>.glb)."""
    nome = os.path.splitext(os.path.basename(arquivo_py))[0]
    saida = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(arquivo_py))), nome + '.glb')
    limpar()
    construir()
    return exportar(saida)


def principal(arquivo_py, construir):
    """Chamado no fim de cada <id>.py: só gera quando o arquivo é o script do Blender (não ao importar)."""
    argv = sys.argv
    script = argv[argv.index('--python') + 1] if '--python' in argv else ''
    if os.path.abspath(script) == os.path.abspath(arquivo_py):
        gerar(arquivo_py, construir)
