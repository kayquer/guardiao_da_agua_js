"""Usina Solar com Rastreadores (solar_tracker, 3×3): fileiras de mesas de painéis em eixo único que giram
seguindo o sol (cada fileira num ângulo, como se estivessem virando), inversores no caminho de cascalho e uma
subestação no canto com transformador, isoladores e faixa amarela — a energia sai para a rede."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.08
EIXO = 0.42  # altura do tubo de torção (eixo de giro)


def mesa(x, y0, y1, ang, larg=0.8):
    """Mesa de rastreador: postes, tubo de torção ao longo de Y e o painel inclinado em torno dele."""
    yc, comp = (y0 + y1) / 2, y1 - y0
    for y in (y0 + 0.2, y1 - 0.2):
        L.caixa((0.05, 0.05, EIXO - 0.02), (x, y, PISO), 'metal_escuro')
    z = PISO + EIXO + 0.03
    L.caixa((larg, comp, 0.04), (x, yc, z), 'painel_solar', rot=(0, ang, 0))
    # linhas claras entre os módulos
    n = 3
    for i in range(1, n):
        L.caixa((larg + 0.004, 0.025, 0.044), (x, y0 + i * comp / n, z), 'vidro', rot=(0, ang, 0))


def inversor(x, y):
    L.caixa((0.5, 0.3, 0.3), (x, y, PISO), 'parede', chanfro=0.015)
    L.caixa((0.501, 0.301, 0.06), (x, y, PISO + 0.2), 'amarelo')
    L.caixa((0.54, 0.34, 0.03), (x, y, PISO + 0.3), 'metal_escuro')
    L.placa(0.16, 0.12, (x - 0.1, y - 0.15, PISO + 0.17), 'metal', 'frente')


def construir():
    L.caixa((6.0, 6.0, PISO), (0, 0, 0), 'grama', chanfro=0.02)
    # Caminhos de cascalho: na frente e no meio (entre as mesas)
    L.caixa((6.0, 0.4, 0.02), (0, -2.7, PISO), 'areia')
    L.caixa((6.0, 0.5, 0.02), (0, 0.0, PISO), 'areia')
    L.caixa((0.4, 2.3, 0.02), (2.75, -1.3, PISO), 'areia')

    # Fileiras de rastreadores: cada uma num ângulo (o sol vai passando)
    angulos = (32, 26, 20, 14, 8, 2)
    xs = (-2.4, -1.45, -0.5, 0.45, 1.4, 2.35)
    for i, (x, ang) in enumerate(zip(xs, angulos)):
        mesa(x, -2.4, -0.3, ang)
        if x < 1.0:
            mesa(x, 0.3, 2.45, ang)
    # Inversores no caminho do meio
    inversor(-0.97, 0.0)
    inversor(0.92, 0.0)

    # Subestação no canto do fundo à direita
    sx, sy = 1.95, 1.45
    L.caixa((1.75, 1.85, 0.06), (sx, sy, PISO), 'concreto', chanfro=0.015)
    base = PISO + 0.06
    # transformador com aletas de resfriamento e isoladores
    tx, ty = 1.6, 1.0
    L.caixa((0.6, 0.45, 0.5), (tx, ty, base), 'metal_escuro', chanfro=0.02)
    for k in range(2):
        L.caixa((0.06, 0.38, 0.36), (tx - 0.33, ty - 0.1 + k * 0.2, base + 0.05), 'metal_escuro')
    L.caixa((0.61, 0.46, 0.07), (tx, ty, base + 0.32), 'amarelo')
    for x in (tx - 0.18, tx, tx + 0.18):
        L.cilindro(0.04, 0.24, (x, ty, base + 0.5), 'parede', lados=6)
    # pórtico de saída (estrutura com isoladores) e cabos
    gx, gy = 2.35, 1.95
    for x in (gx - 0.4, gx + 0.4):
        L.cano((x, gy, base), (x, gy, base + 1.2), 0.035, 'metal', lados=4)
    L.caixa((0.95, 0.06, 0.06), (gx, gy, base + 1.15), 'metal')
    for x in (gx - 0.25, gx, gx + 0.25):
        L.cilindro(0.025, 0.12, (x, gy, base + 1.03), 'parede', lados=5)
        L.cano((x, gy, base + 1.04), (tx + (x - gx) * 0.7, ty, base + 0.74), 0.01, 'escuro', lados=3)
    # casinha de controle branca com faixa amarela
    cx, cy = 2.35, 0.95
    L.caixa((0.6, 0.5, 0.5), (cx, cy, base), 'parede', chanfro=0.02)
    L.caixa((0.66, 0.56, 0.06), (cx, cy, base + 0.5), 'metal_escuro')
    L.caixa((0.601, 0.501, 0.08), (cx, cy, base + 0.38), 'amarelo')
    L.placa(0.16, 0.28, (cx - 0.12, cy - 0.25, base + 0.3), 'escuro', 'frente')
    L.placa(0.2, 0.14, (cx + 0.3, cy, base + 0.3), 'vidro', 'direita')
    L.prisma([(-0.04, 0.0), (0.03, 0.08), (0.0, 0.08), (0.045, 0.16), (-0.02, 0.08), (0.01, 0.08)], 0.02,
             (cx + 0.14, cy - 0.26, base + 0.15), 'escuro', eixo='Y')
    L.cerca(1.12, 0.55, 2.82, 2.35, alt=0.22, cor='metal_escuro')

    # Cerca em volta da usina
    for (cx_, cy_, lx, ly) in ((0, -2.92, 5.84, 0.03), (0, 2.92, 5.84, 0.03), (-2.92, 0, 0.03, 5.84), (2.92, 0, 0.03, 5.84)):
        L.caixa((lx, ly, 0.04), (cx_, cy_, PISO + 0.14), 'metal_escuro')
    for (px, py) in ((-2.92, -2.92), (2.92, -2.92), (2.92, 2.92), (-2.92, 2.92)):
        L.caixa((0.06, 0.06, 0.2), (px, py, PISO), 'metal_escuro')


L.principal(__file__, construir)
