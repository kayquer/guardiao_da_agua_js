"""Aerogerador Pequeno (wind_small, 1×1): uma turbina de três pás numa torre de treliça (pás no nó "pas_1",
giram no jogo com o vento), armário de controle com faixa amarela, cabo enterrado e cerquinha."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((2.0, 2.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    piso = 0.08
    tx, ty = -0.15, 0.2
    H = 2.1
    # Sapata de concreto
    L.caixa((0.62, 0.62, 0.08), (tx, ty, piso), 'concreto', chanfro=0.02)
    base = piso + 0.08
    # Torre de treliça: quatro pernas afinando + travessas em X
    b0, b1 = 0.24, 0.07
    cantos = ((-1, -1), (1, -1), (1, 1), (-1, 1))
    for (sx, sy) in cantos:
        L.cano((tx + sx * b0, ty + sy * b0, base), (tx + sx * b1, ty + sy * b1, base + H), 0.022, 'metal', lados=4)
    niveis = (0.0, 0.55, 1.05, 1.5, H)
    for i in range(len(niveis) - 1):
        z0, z1 = base + niveis[i], base + niveis[i + 1]
        r0 = b0 + (b1 - b0) * niveis[i] / H
        r1 = b0 + (b1 - b0) * niveis[i + 1] / H
        # diagonais nas faces da frente (-Y) e da direita (+X), que a câmera vê; travessas nas quatro
        L.cano((tx - r0, ty - r0, z0), (tx + r1, ty - r1, z1), 0.012, 'metal_escuro', lados=3)
        L.cano((tx + r0, ty - r0, z0), (tx + r1, ty + r1, z1), 0.012, 'metal_escuro', lados=3)
        L.cano((tx - r0, ty + r0, z0), (tx - r1, ty - r1, z1), 0.012, 'metal_escuro', lados=3)
        if i:
            for (ax, ay, bx, by) in ((-1, -1, 1, -1), (1, -1, 1, 1), (1, 1, -1, 1), (-1, 1, -1, -1)):
                L.cano((tx + ax * r0, ty + ay * r0, z0), (tx + bx * r0, ty + by * r0, z0), 0.012, 'metal', lados=3)
    topo = base + H
    # Plataforma, nacele e leme (cauda) atrás
    L.caixa((0.22, 0.22, 0.04), (tx, ty, topo), 'metal_escuro')
    L.caixa((0.16, 0.42, 0.16), (tx, ty + 0.02, topo + 0.04), 'parede', chanfro=0.02)
    L.caixa((0.161, 0.12, 0.161), (tx, ty + 0.16, topo + 0.04), 'amarelo')
    L.cano((tx, ty + 0.2, topo + 0.12), (tx, ty + 0.6, topo + 0.18), 0.018, 'metal', lados=4)
    L.prisma([(0.5, 0.0), (0.72, 0.0), (0.72, 0.34), (0.58, 0.3)], 0.02, (tx, ty, topo + 0.05), 'parede', eixo='X')
    L.rotor((tx, ty - 0.21, topo + 0.12), 0.78, 'parede', 'metal', nome='pas_1', largura=0.1)

    # Armário de controle (inversor) com faixa amarela e raio
    cx, cy = 0.55, -0.45
    L.caixa((0.42, 0.3, 0.42), (cx, cy, piso), 'parede', chanfro=0.02)
    L.caixa((0.46, 0.34, 0.04), (cx, cy, piso + 0.42), 'metal_escuro')
    L.caixa((0.421, 0.301, 0.07), (cx, cy, piso + 0.3), 'amarelo')
    L.placa(0.14, 0.2, (cx - 0.08, cy - 0.15, piso + 0.24), 'metal', 'frente')
    L.prisma([(-0.03, 0.0), (0.022, 0.05), (0.0, 0.05), (0.034, 0.1), (-0.012, 0.05), (0.008, 0.05)], 0.012,
             (cx + 0.1, cy - 0.155, piso + 0.13), 'escuro', eixo='Y')
    L.placa(0.12, 0.08, (cx + 0.21, cy, piso + 0.22), 'vidro', 'direita')
    # Cabo enterrado da torre ao armário (faixa de terra) e saída para a rede
    L.caixa((0.08, 0.72, 0.012), (0.3, -0.12, piso), 'terra', rot=(0, 0, 50))
    L.cano((cx + 0.15, cy + 0.1, piso + 0.42), (cx + 0.15, cy + 0.1, piso + 0.62), 0.015, 'escuro', lados=4)
    L.cano((cx + 0.15, cy + 0.1, piso + 0.62), (0.95, cy + 0.1, piso + 0.62), 0.008, 'escuro', lados=3)

    # Cerca em volta e um caminho de cascalho até o portão
    L.cerca(-0.88, -0.88, 0.88, 0.88, alt=0.2, cor='metal_escuro')
    L.caixa((0.3, 0.55, 0.015), (-0.3, -0.6, piso), 'areia')
    # Arbustos
    L.arbusto((-0.7, -0.68, piso), 0.12, 'verde')
    L.arbusto((0.68, 0.7, piso), 0.14, 'verde_escuro')
    L.arbusto((-0.68, 0.72, piso), 0.11, 'verde')


L.principal(__file__, construir)
