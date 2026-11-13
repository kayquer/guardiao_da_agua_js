"""Bateria da Rede (grid_battery, 1×1): três armários brancos de baterias, do tamanho de contêineres, com faixa
amarela de energia, grades de ventilação, ar-condicionado no teto e um medidor de carga (barras verdes) na porta;
transformador e cerca. Guarda a energia que sobra (sol, vento) para usar quando falta."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.08


def armario(x, y, carga):
    w, d, h = 0.44, 1.0, 0.56
    L.caixa((w, d, h), (x, y, PISO + 0.04), 'parede', chanfro=0.02)
    L.caixa((w + 0.04, d + 0.04, 0.04), (x, y, PISO), 'metal_escuro')  # base sobre o piso
    L.caixa((w + 0.006, d + 0.006, 0.07), (x, y, PISO + 0.04 + h - 0.16), 'amarelo')
    # portas na frente e medidor de carga (barras verdes, de baixo para cima)
    fy = y - d / 2
    L.placa(0.17, 0.3, (x - 0.1, fy, PISO + 0.04 + 0.23), 'concreto', 'frente', espessura=0.02)
    L.placa(0.1, 0.24, (x + 0.11, fy, PISO + 0.04 + 0.22), 'escuro', 'frente', espessura=0.02)
    for i in range(3):
        cor = 'verde' if i < carga else 'metal_escuro'
        L.placa(0.07, 0.05, (x + 0.11, fy - 0.015, PISO + 0.04 + 0.08 + i * 0.065), cor, 'frente', espessura=0.015)
    # grades de ventilação no lado direito
    for k in range(3):
        L.placa(0.18, 0.025, (x + w / 2, y - 0.25 + k * 0.25, PISO + 0.04 + 0.3), 'metal_escuro', 'direita',
                espessura=0.015)
        L.placa(0.18, 0.025, (x + w / 2, y - 0.25 + k * 0.25, PISO + 0.04 + 0.22), 'metal_escuro', 'direita',
                espessura=0.015)
    # unidade de resfriamento no teto com o ventilador
    topo = PISO + 0.04 + h
    L.caixa((0.3, 0.3, 0.1), (x, y + 0.22, topo), 'metal', chanfro=0.01)
    L.cilindro(0.1, 0.012, (x, y + 0.22, topo + 0.1), 'escuro', lados=8)


def construir():
    L.caixa((2.0, 2.0, PISO), (0, 0, 0), 'grama', chanfro=0.02)
    L.caixa((1.8, 1.8, 0.02), (0, 0, PISO), 'piso')
    armario(-0.62, 0.3, 3)
    armario(-0.1, 0.3, 2)
    armario(0.42, 0.3, 3)

    # Transformador (frente, à direita) com aletas, faixa amarela e isoladores
    tx, ty = 0.55, -0.58
    L.caixa((0.42, 0.3, 0.34), (tx, ty, PISO), 'metal_escuro', chanfro=0.015)
    L.caixa((0.04, 0.24, 0.26), (tx + 0.23, ty, PISO + 0.03), 'metal_escuro')
    L.caixa((0.04, 0.24, 0.26), (tx - 0.23, ty, PISO + 0.03), 'metal_escuro')
    L.caixa((0.43, 0.31, 0.05), (tx, ty, PISO + 0.24), 'amarelo')
    for x in (tx - 0.12, tx, tx + 0.12):
        L.cilindro(0.03, 0.14, (x, ty, PISO + 0.34), 'parede', lados=5)
    # Caixa de cabos ligando as baterias ao transformador
    L.caixa((1.3, 0.1, 0.06), (-0.1, -0.28, PISO), 'metal_escuro')
    L.caixa((0.1, 0.24, 0.06), (tx - 0.05, -0.38, PISO), 'metal_escuro')
    # Poste de saída para a rede
    px, py = -0.75, -0.7
    L.cano((px, py, PISO), (px, py, 1.05), 0.03, 'concreto', lados=6)
    L.caixa((0.3, 0.04, 0.04), (px, py, 0.95), 'concreto_escuro')
    L.caixa((0.18, 0.12, 0.2), (px + 0.0, py - 0.07, 0.35), 'amarelo', chanfro=0.01)
    L.cano((px + 0.12, py, 0.97), (tx - 0.12, ty, PISO + 0.46), 0.008, 'escuro', lados=3)
    L.cano((px - 0.12, py, 0.97), (-1.0, py - 0.05, 0.85), 0.008, 'escuro', lados=3)

    L.cerca(-0.92, -0.92, 0.92, 0.92, alt=0.22, cor='metal_escuro')
    L.arbusto((0.82, 0.86, PISO), 0.1, 'verde')


L.principal(__file__, construir)
