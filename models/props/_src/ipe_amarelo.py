"""Ipê-amarelo (árvore nativa): tronco torto em três trechos com dois galhos, copa aberta de vários tufos
amarelos facetados e flores caídas no chão em volta."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    L.cilindro(0.38, 0.015, (0, 0, 0), 'grama', lados=10)
    for (x, y, r) in ((0.22, -0.18, 0.09), (-0.25, -0.05, 0.07), (0.05, 0.27, 0.08), (-0.1, -0.28, 0.05)):
        L.cilindro(r, 0.008, (x, y, 0.015), 'flor_amarela', lados=6)
    # Tronco torto e galhos
    pts = [(0, 0, 0.0), (0.04, 0.02, 0.55), (-0.03, 0.0, 1.0), (0.02, -0.02, 1.3)]
    raios = (0.06, 0.05, 0.04)
    for (a, b), r in zip(zip(pts, pts[1:]), raios):
        L.cano(a, b, r, 'madeira_escura', lados=6)
    L.cano((0.04, 0.02, 0.8), (0.38, 0.05, 1.2), 0.03, 'madeira_escura', lados=5)
    L.cano((-0.02, 0.0, 0.95), (-0.36, -0.04, 1.3), 0.028, 'madeira_escura', lados=5)
    # Copa: tufos amarelos (dois tons) com um pouco de verde por baixo
    tufos = [((0.02, -0.02, 1.42), 0.24, 'amarelo'), ((0.38, 0.05, 1.27), 0.17, 'flor_amarela'),
             ((-0.37, -0.04, 1.35), 0.17, 'flor_amarela'), ((0.2, 0.18, 1.5), 0.16, 'flor_amarela'),
             ((-0.18, -0.2, 1.52), 0.15, 'amarelo'), ((-0.12, 0.2, 1.48), 0.15, 'flor_amarela'),
             ((0.2, -0.18, 1.38), 0.15, 'flor_amarela'), ((0.0, 0.03, 1.62), 0.15, 'flor_amarela')]
    for pos, r, cor in tufos:
        L.esfera(r, pos, cor, escala=(1.15, 1.15, 0.7))
    L.esfera(0.13, (0.1, 0.12, 1.24), 'verde', escala=(1.2, 1, 0.5))


L.principal(__file__, construir)
