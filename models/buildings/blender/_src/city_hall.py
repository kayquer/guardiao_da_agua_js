"""Prefeitura Municipal (city_hall, 2×2): casarão de fachada clássica — escadaria, colunas, frontão,
alas com telhado de telha, torre do relógio com cúpula dourada e mastro com bandeira."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((4.0, 4.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    L.caixa((3.7, 3.3, 0.06), (0, 0.15, 0.08), 'piso')  # praça calçada
    piso = 0.14

    # Corpo principal (creme) e alas laterais
    by, d = 0.55, 1.7
    L.caixa((2.0, d, 1.25), (0, by, piso), 'creme', chanfro=0.03)
    L.caixa((2.05, d + 0.05, 0.1), (0, by, piso + 1.25), 'parede')  # cornija
    L.telhado4(2.0, d, 0.45, (0, by, piso + 1.35), 'telhado_vermelho', beiral=0.08)
    for x in (-1.35, 1.35):
        L.caixa((0.75, d - 0.2, 0.95), (x, by, piso), 'creme', chanfro=0.03)
        L.caixa((0.8, d - 0.15, 0.08), (x, by, piso + 0.95), 'parede')
        L.telhado4(0.75, d - 0.2, 0.35, (x, by, piso + 1.03), 'telhado_vermelho', beiral=0.06)
    frente = by - d / 2
    # Janelas: alas e andar de cima do corpo
    for x in (-1.35, 1.35):
        L.janelas('frente', frente + 0.1, piso + 0.55, x - 0.25, x + 0.25, 2, 0.18, 0.32, moldura='parede')
    L.janelas('frente', frente, piso + 0.98, -0.8, 0.8, 4, 0.2, 0.26, moldura='parede')
    L.janelas('direita', 1.35 + 0.375, piso + 0.55, by - 0.5, by + 0.5, 3, 0.18, 0.32, moldura='parede')
    L.janelas('direita', 1.0, piso + 1.02, by - 0.5, by + 0.5, 3, 0.18, 0.24, moldura='parede')

    # Pórtico: escadaria, quatro colunas, frontão triangular e porta
    px = 0.0
    for i, (lw, ly) in enumerate(((1.6, 0.75), (1.45, 0.6), (1.3, 0.45))):
        L.caixa((lw, ly, 0.07), (px, frente - ly / 2 + 0.05, piso + i * 0.07), 'parede')
    topo_escada = piso + 0.21
    for x in (-0.48, -0.16, 0.16, 0.48):
        L.cilindro(0.07, 0.72, (x, frente - 0.28, topo_escada), 'parede', lados=8)
    L.caixa((1.3, 0.48, 0.1), (px, frente - 0.18, topo_escada + 0.72), 'parede')
    L.telhado(1.3, 0.5, 0.34, (px, frente - 0.12, topo_escada + 0.82), 'telhado_vermelho', beiral=0.05, eixo='Y')
    L.prisma([(-0.68, 0), (0.68, 0), (0, 0.34)], 0.05, (px, frente - 0.445, topo_escada + 0.82), 'parede', eixo='Y')
    L.prisma([(-0.5, 0.05), (0.5, 0.05), (0, 0.26)], 0.03, (px, frente - 0.485, topo_escada + 0.82), 'telhado_azul',
             eixo='Y')  # tímpano
    L.placa(0.4, 0.5, (px, frente, topo_escada + 0.25), 'madeira_escura', 'frente')
    L.placa(0.16, 0.12, (px, frente - 0.5, topo_escada + 0.9), 'dourado', 'frente')  # brasão

    # Torre do relógio com cúpula dourada (atrás do pórtico)
    ty = by + 0.15
    L.caixa((0.62, 0.62, 0.75), (0, ty, piso + 1.5), 'creme', chanfro=0.02)
    L.caixa((0.7, 0.7, 0.08), (0, ty, piso + 2.25), 'parede')
    L.cilindro(0.2, 0.03, (0, ty - 0.31, piso + 1.92), 'parede', lados=10, rot=(90, 0, 0))   # mostrador
    L.caixa((0.03, 0.02, 0.14), (0, ty - 0.345, piso + 1.9), 'escuro')
    L.caixa((0.1, 0.02, 0.03), (0.04, ty - 0.345, piso + 1.9), 'escuro')
    L.cupula(0.32, (0, ty, piso + 2.33), 'dourado', lados=8, aneis=3)
    L.cano((0, ty, piso + 2.6), (0, ty, piso + 2.85), 0.02, 'dourado', lados=4)

    # Mastro com bandeira verde e amarela e canteiros
    L.cano((1.55, -1.25, piso), (1.55, -1.25, piso + 1.9), 0.025, 'metal', lados=5)
    L.caixa((0.04, 0.5, 0.32), (1.55, -1.0, piso + 1.55), 'verde')
    L.caixa((0.05, 0.26, 0.18), (1.55, -1.0, piso + 1.62), 'amarelo', rot=(45, 0, 0))
    for x in (-1.3, 1.3):
        L.caixa((0.9, 0.35, 0.12), (x, -0.85, piso), 'madeira')
        L.arbusto((x - 0.25, -0.85, piso + 0.12), 0.15, 'verde')
        L.arbusto((x + 0.2, -0.85, piso + 0.12), 0.14, 'folha')
    L.arvore((-1.65, -1.55, piso), 0.9, 'verde')


L.principal(__file__, construir)
