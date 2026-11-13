"""Microgeração Solar (solar_micro, 1×1): um sitiozinho com três fileiras curtas de mesas de painéis fixas no
chão, inclinadas para o sol, sobre pernas de metal; o inversor (caixa com faixa e raio amarelos) num calço de
concreto e o poste do medidor (relógio de luz) junto do portão, com o cabo saindo para a rua — geração
distribuída pequena (até 75 kW, a microgeração da ANEEL), bem menor que uma usina."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

L.PALETA['cascalho'] = '#cbc3ae'

PISO = 0.08
INCL = 25  # graus (frente baixa, fundo alto: o painel olha para a frente)


def mesa(x, y, larg, prof=0.3, alt=0.27, modulos=4):
    """Mesa fixa de painéis: quatro pernas de metal (as de trás mais altas), moldura e painel azul inclinado."""
    sobe = prof / 2 * math.sin(math.radians(INCL))
    for dx in (-larg / 2 + 0.08, larg / 2 - 0.08):
        L.caixa((0.035, 0.035, alt - sobe), (x + dx, y - prof * 0.38, PISO), 'metal_escuro')
        L.caixa((0.035, 0.035, alt + sobe - 0.02), (x + dx, y + prof * 0.38, PISO), 'metal_escuro')
    z = PISO + alt - 0.02
    L.caixa((larg + 0.04, prof + 0.04, 0.025), (x, y, z), 'metal', rot=(INCL, 0, 0))
    L.caixa((larg, prof, 0.035), (x, y, z + 0.004), 'painel_solar', rot=(INCL, 0, 0))
    # linhas claras entre os módulos
    for i in range(1, modulos):
        L.caixa((0.018, prof, 0.037), (x - larg / 2 + i * larg / modulos, y, z + 0.005), 'vidro', rot=(INCL, 0, 0))


def cerca_sitio():
    """Cerca baixa de mourões de madeira com dois fios, aberta na frente para o portão."""
    a, alt = 0.95, 0.17
    mouroes = [(-a, -a), (0, -a), (0.3, -a), (0.72, -a), (a, -a), (a, 0), (a, a), (0, a), (-a, a), (-a, 0)]
    for (px, py) in mouroes:
        L.caixa((0.05, 0.05, alt + 0.03), (px, py, PISO), 'madeira_escura')
    fios = [((-a + a + 0.3) / 2, -a, 0.3 + a, 0.02),        # frente, da esquerda até o portão
            ((0.72 + a) / 2, -a, a - 0.72, 0.02),           # frente, depois do portão
            (a, 0, 0.02, 2 * a),                            # lado direito
            (0, a, 2 * a, 0.02),                            # fundo
            (-a, 0, 0.02, 2 * a)]                           # lado esquerdo
    for (cx, cy, lx, ly) in fios:
        for z in (0.08, 0.15):
            L.caixa((lx, ly, 0.018), (cx, cy, PISO + z), 'metal_escuro')


def construir():
    L.caixa((2.0, 2.0, PISO), (0, 0, 0), 'grama', chanfro=0.02)
    # Cascalho sob as mesas e caminho do portão até o inversor
    L.caixa((1.42, 1.6, 0.012), (-0.2, 0.05, PISO), 'cascalho')
    L.caixa((0.3, 1.25, 0.012), (0.51, -0.32, PISO), 'cascalho')

    # Três fileiras curtas de painéis, com corredor entre elas
    mesa(-0.22, -0.52, 1.2)
    mesa(-0.22, 0.02, 1.2)
    mesa(-0.22, 0.56, 1.2)

    # Inversor num calço de concreto, à direita do caminho
    ix, iy = 0.72, 0.32
    L.caixa((0.34, 0.26, 0.04), (ix, iy, PISO), 'concreto', chanfro=0.01)
    base = PISO + 0.04
    L.caixa((0.24, 0.16, 0.28), (ix, iy, base), 'parede', chanfro=0.012)
    L.caixa((0.242, 0.162, 0.05), (ix, iy, base + 0.19), 'amarelo')
    L.caixa((0.28, 0.2, 0.025), (ix, iy, base + 0.28), 'metal_escuro')
    L.prisma([(-0.025, 0.0), (0.018, 0.045), (0.0, 0.045), (0.028, 0.09), (-0.01, 0.045), (0.007, 0.045)], 0.012,
             (ix, iy - 0.085, base + 0.04), 'escuro', eixo='Y')
    L.placa(0.12, 0.08, (ix + 0.12, iy, base + 0.15), 'metal', 'direita', espessura=0.015)
    # cabo enterrado (faixa escura): inversor → poste
    L.caixa((0.03, 0.84, 0.014), (0.82, -0.18, PISO), 'escuro')

    # Poste do medidor ao lado do portão, com o cabo descendo para a rua (frente do lote)
    px, py = 0.82, -0.6
    L.cano((px, py, PISO), (px, py, 0.9), 0.03, 'concreto', lados=6)
    L.caixa((0.14, 0.07, 0.18), (px, py - 0.05, 0.36), 'parede', chanfro=0.01)
    L.caixa((0.142, 0.072, 0.035), (px, py - 0.05, 0.5), 'amarelo')
    L.placa(0.08, 0.07, (px, py - 0.085, 0.47), 'vidro', 'frente', espessura=0.012)
    L.cilindro(0.025, 0.06, (px, py - 0.04, 0.82), 'parede', lados=5)
    L.cano((px, py - 0.04, 0.86), (px, -0.99, 0.48), 0.01, 'escuro', lados=3)

    cerca_sitio()

    # Um pé de árvore e uma moita no fundo (cara de chácara)
    L.arvore((0.7, 0.76, PISO), 0.6, 'verde')
    L.arbusto((0.38, 0.84, PISO), 0.08, 'verde')


L.principal(__file__, construir)
