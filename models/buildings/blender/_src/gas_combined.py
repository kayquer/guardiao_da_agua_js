"""Termelétrica de Ciclo Combinado (gas_combined, 3×3): o gás chega pelo gasoduto (válvulas amarelas), queima na
turbina a gás (galpão), o calor que sobra vai para a caldeira de recuperação (HRSG, bloco alto) e sai pela chaminé
fina; o vapor volta resfriado no condensador a ar (ventiladores "gira_1".."gira_3" giram no jogo) e a energia
sai pela subestação."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.08


def construir():
    L.caixa((6.0, 6.0, PISO), (0, 0, 0), 'grama', chanfro=0.02)
    L.caixa((5.6, 5.6, 0.02), (0.1, 0.0, PISO), 'piso')
    z = PISO + 0.02

    # Galpão das turbinas (gás + vapor): branco, faixa amarela, telhado metálico
    hx, hy, hw, hd, hh = -1.15, -0.55, 2.5, 1.4, 1.0
    L.caixa((hw, hd, hh), (hx, hy, z), 'parede', chanfro=0.03)
    L.caixa((hw + 0.01, hd + 0.01, 0.14), (hx, hy, z + hh - 0.32), 'amarelo')
    L.telhado(hw, hd, 0.28, (hx, hy, z + hh), 'metal_escuro', beiral=0.05)
    L.janelas('frente', hy - hd / 2, z + 0.45, hx - 1.0, hx + 1.0, 4, 0.3, 0.24)
    L.placa(0.4, 0.5, (hx - 0.2, hy - hd / 2, z + 0.25), 'metal', 'frente')
    L.prisma([(-0.07, 0.0), (0.05, 0.14), (0.0, 0.14), (0.09, 0.28), (-0.035, 0.14), (0.017, 0.14)], 0.03,
             (hx + 0.85, hy - hd / 2 - 0.02, z + hh - 0.3), 'escuro', eixo='Y')

    # Duto de exaustão da turbina até a caldeira de recuperação
    L.prisma([(-0.35, 0.0), (0.35, 0.0), (0.45, 0.65), (-0.45, 0.65)], 0.55, (0.32, -0.35, z + 0.35),
             'metal_escuro', eixo='X', rot=(0, 0, 0))
    # HRSG: bloco alto com nervuras
    bx, by, bw, bd, bh = 1.05, -0.35, 1.0, 1.25, 1.85
    L.caixa((bw, bd, bh), (bx, by, z), 'metal', chanfro=0.03)
    for k in range(3):
        L.placa(0.06, bh - 0.2, (bx - 0.3 + k * 0.3, by - bd / 2, z + bh - 0.1), 'metal_escuro', 'frente', espessura=0.03)
    L.caixa((bw + 0.05, bd + 0.05, 0.08), (bx, by, z + bh), 'metal_escuro')
    L.caixa((0.04, bd - 0.2, 0.12), (bx + bw / 2 + 0.01, by, z + 1.2), 'amarelo')
    # Chaminé fina (o gás queima mais limpo: fumacinha clara)
    cx, cy = 1.95, 0.0
    L.cilindro(0.2, 3.6, (cx, cy, z), 'concreto', lados=10, r_topo=0.16)
    L.cilindro(0.175, 0.14, (cx, cy, z + 3.1), 'metal_escuro', lados=10)
    L.cano((bx + bw / 2 - 0.05, by + 0.3, z + 1.55), (cx, cy, z + 1.55), 0.13, 'metal', lados=8)
    for i, (dz, r) in enumerate(((3.85, 0.16), (4.15, 0.22))):
        L.esfera(r, (cx + i * 0.12, cy + i * 0.05, z + dz), 'parede', escala=(1, 1, 0.8))

    # Condensador a ar: mesa alta com ventiladores (devolve o vapor como água)
    ax, ay, aw, ad = -1.0, 1.75, 3.0, 1.3
    ah = 1.05
    for x in (ax - 1.35, ax, ax + 1.35):
        for y in (ay - 0.5, ay + 0.5):
            L.caixa((0.09, 0.09, ah), (x, y, z), 'metal_escuro')
    L.caixa((aw, ad, 0.2), (ax, ay, z + ah), 'metal', chanfro=0.02)
    for i, x in enumerate((ax - 1.0, ax, ax + 1.0)):
        L.cilindro(0.46, 0.08, (x, ay, z + ah + 0.2), 'concreto', lados=8)
        L.cilindro(0.38, 0.03, (x, ay, z + ah + 0.28), 'escuro', lados=8)
        pas = [L.caixa((0.66, 0.07, 0.02), (x, ay, z + ah + 0.31), 'metal', rot=(0, 0, 25 + 60 * i)),
               L.caixa((0.66, 0.07, 0.02), (x, ay, z + ah + 0.31), 'metal', rot=(0, 0, -65 + 60 * i))]
        L.animar(pas, f'gira_{i + 1}', (x, ay, z + ah + 0.31))  # ventilador gira no jogo
    L.cano((hx + 0.6, hy + 0.5, z + hh + 0.1), (ax + 0.6, ay - 0.5, z + ah + 0.1), 0.12, 'metal', lados=8)

    # Gasoduto: chega pela esquerda, válvulas amarelas, entra no galpão
    gy = -2.0
    L.cano((-3.0, gy, z + 0.18), (hx - 0.4, gy, z + 0.18), 0.08, 'metal', lados=8)
    L.cano((hx - 0.4, gy, z + 0.18), (hx - 0.4, hy - hd / 2, z + 0.18), 0.08, 'metal', lados=8)
    for x in (-2.75, -1.95):
        L.caixa((0.1, 0.1, 0.16), (x, gy, z), 'concreto_escuro')
    for x in (-2.35, -1.75):
        L.caixa((0.16, 0.2, 0.2), (x, gy, z + 0.08), 'amarelo', chanfro=0.01)
        L.cano((x, gy, z + 0.28), (x, gy, z + 0.42), 0.015, 'metal_escuro', lados=4)
        L.cilindro(0.09, 0.025, (x, gy, z + 0.42), 'amarelo', lados=8)

    # Subestação na frente à direita: transformador, pórtico e cerca
    sx, sy = 1.6, -2.05
    L.caixa((2.0, 1.4, 0.02), (sx, sy, z), 'pedra')
    L.caixa((0.55, 0.45, 0.48), (sx - 0.35, sy + 0.05, z), 'metal_escuro', chanfro=0.02)
    L.caixa((0.56, 0.46, 0.08), (sx - 0.35, sy + 0.05, z + 0.3), 'amarelo')
    for x in (sx - 0.5, sx - 0.35, sx - 0.2):
        L.cilindro(0.035, 0.2, (x, sy + 0.05, z + 0.48), 'parede', lados=5)
    for x in (sx + 0.25, sx + 0.85):
        L.cano((x, sy + 0.2, z), (x, sy + 0.2, z + 1.15), 0.03, 'metal', lados=4)
    L.caixa((0.75, 0.05, 0.05), (sx + 0.55, sy + 0.2, z + 1.1), 'metal')
    for x in (sx + 0.4, sx + 0.7):
        L.cano((x, sy + 0.2, z + 1.08), (sx - 0.35, sy + 0.05, z + 0.7), 0.01, 'escuro', lados=3)
    L.cano((hx + hw / 2 - 0.1, hy - 0.3, z + 0.8), (sx - 0.35, sy + 0.05, z + 0.7), 0.012, 'escuro', lados=3)
    L.cerca(sx - 0.95, sy - 0.65, sx + 0.95, sy + 0.65, alt=0.2, cor='metal_escuro')


L.principal(__file__, construir)
