"""Parque Turístico (park, 4×4): gramado com caminhos em cruz, lago com chafariz e ponte de madeira,
coreto, bosque, bancos, canteiros de flores e playground."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((8.0, 8.0, 0.1), (0, 0, 0), 'grama', chanfro=0.03)
    z = 0.1
    # Caminhos de areia em cruz e anel central
    L.caixa((0.7, 8.0, 0.02), (0, 0, z), 'areia')
    L.caixa((8.0, 0.7, 0.02), (0, 0, z), 'areia')
    L.cilindro(1.5, 0.025, (0, 0, z), 'areia', lados=14)

    # Lago (fundo esquerdo) com borda de pedra, ponte e pedras
    lx, ly = -2.2, 2.0
    L.cilindro(1.45, 0.05, (lx, ly, z), 'pedra', lados=10, rot=(0, 0, 8))
    L.cilindro(1.3, 0.07, (lx, ly, z), 'agua', lados=10, rot=(0, 0, 8))
    L.caixa((0.42, 1.6, 0.06), (lx + 0.3, ly - 0.35, z + 0.14), 'madeira')    # ponte
    for dy in (-0.6, 0.6):
        L.caixa((0.42, 0.08, 0.14), (lx + 0.3, ly - 0.35 + dy, z), 'madeira_escura')
    L.esfera(0.16, (lx - 0.6, ly + 0.5, z + 0.05), 'pedra', escala=(1.2, 1, 0.6))
    L.cone(0.1, 0.4, (lx - 1.0, ly - 0.6, z), 'verde_escuro', lados=5)       # taboas na margem
    L.cone(0.08, 0.32, (lx - 0.85, ly - 0.75, z), 'folha', lados=5)

    # Chafariz central
    L.tanque_redondo(0.75, 0.2, (0, 0, z), 'agua', 'pedra', lados=12, borda=0.1, nivel=0.06)
    L.cilindro(0.12, 0.45, (0, 0, z), 'pedra', lados=6)
    L.cilindro(0.3, 0.06, (0, 0, z + 0.45), 'pedra', lados=8)
    L.cilindro(0.05, 0.25, (0, 0, z + 0.5), 'agua', lados=5, r_topo=0.02)

    # Coreto (fundo direito): base octogonal, colunas e telhado em cone
    cx, cy = 2.3, 2.2
    L.cilindro(1.0, 0.15, (cx, cy, z), 'parede', lados=8)
    for k in range(8):
        a = 2 * math.pi * k / 8
        L.cilindro(0.04, 0.85, (cx + 0.85 * math.cos(a), cy + 0.85 * math.sin(a), z + 0.15), 'parede', lados=4)
    L.cilindro(1.1, 0.08, (cx, cy, z + 1.0), 'parede', lados=8)
    L.cone(1.15, 0.6, (cx, cy, z + 1.08), 'telhado_vermelho', lados=8)

    # Playground (frente direita): escorregador e balanço
    px, py = 2.3, -2.2
    L.caixa((1.8, 1.6, 0.04), (px, py, z), 'areia')
    L.caixa((0.5, 0.5, 0.06), (px - 0.4, py + 0.2, z + 0.65), 'amarelo')
    for (dx, dy) in ((-0.2, -0.2), (0.2, -0.2), (-0.2, 0.2), (0.2, 0.2)):
        L.cano((px - 0.4 + dx, py + 0.2 + dy, z), (px - 0.4 + dx, py + 0.2 + dy, z + 0.95), 0.03, 'vermelho', lados=4)
    L.cone(0.4, 0.3, (px - 0.4, py + 0.2, z + 0.95), 'vermelho', lados=4)
    L.caixa((0.3, 0.9, 0.04), (px - 0.4, py - 0.55, z + 0.3), 'cano', rot=(-38, 0, 0))   # escorregador
    for dx in (0.2, 0.9):
        L.cano((px + dx, py + 0.3, z), (px + dx, py + 0.3, z + 0.8), 0.03, 'cano', lados=4)
    L.cano((px + 0.2, py + 0.3, z + 0.8), (px + 0.9, py + 0.3, z + 0.8), 0.03, 'cano', lados=4)
    L.caixa((0.22, 0.12, 0.03), (px + 0.55, py + 0.3, z + 0.3), 'amarelo')

    # Canteiros de flores (frente esquerda) e bancos ao longo dos caminhos
    fx, fy = -2.3, -2.2
    L.cilindro(1.0, 0.1, (fx, fy, z), 'terra', lados=10)
    for k in range(6):
        a = 2 * math.pi * k / 6
        r = 0.55 if k % 2 else 0.25
        cor = ('flor_rosa', 'flor_amarela', 'vermelho')[k % 3]
        L.esfera(0.12, (fx + r * math.cos(a), fy + r * math.sin(a), z + 0.18), cor, escala=(1, 1, 0.7))
    for (x, y, rz) in ((-0.9, -1.8, 0), (0.9, 1.8, 0), (-1.8, -0.9, 90), (1.8, 0.9, 90)):
        L.caixa((0.6, 0.2, 0.06), (x, y, z + 0.14), 'madeira', rot=(0, 0, rz))
        if rz == 0:
            L.caixa((0.6, 0.04, 0.16), (x, y + 0.1, z + 0.2), 'madeira')   # encosto
        else:
            L.caixa((0.04, 0.6, 0.16), (x + 0.1, y, z + 0.2), 'madeira')
        L.caixa((0.5, 0.16, 0.14), (x, y, z), 'metal_escuro', rot=(0, 0, rz))

    # Árvores nas bordas
    for (x, y, s, cor, tipo) in ((-3.5, -0.9, 1.2, 'verde', 'redonda'), (-3.5, 0.9, 1.0, 'verde_escuro', 'pinheiro'),
                                 (3.5, -0.9, 1.1, 'verde_escuro', 'pinheiro'), (3.5, 0.9, 1.2, 'verde', 'redonda'),
                                 (-0.9, 3.5, 1.1, 'verde', 'redonda'), (0.9, 3.5, 1.0, 'verde_escuro', 'pinheiro'),
                                 (-3.4, 3.4, 1.3, 'verde', 'redonda'),
                                 (-3.4, -3.4, 1.2, 'verde_escuro', 'pinheiro'), (3.5, 3.5, 1.1, 'verde', 'redonda')):
        L.arvore((x, y, z), s, cor, tipo=tipo)
    # Postes de luz
    for (x, y) in ((0.55, -1.3), (-0.55, 1.3), (1.3, 0.55), (-1.3, -0.55)):
        L.cano((x, y, z), (x, y, z + 0.8), 0.025, 'escuro', lados=4)
        L.esfera(0.07, (x, y, z + 0.84), 'amarelo')


L.principal(__file__, construir)
