"""Buriti (palmeira das veredas): estipe alto e liso num chão encharcado, coroa de folhas caindo em volta
e cachos de cocos marrons."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    L.cilindro(0.36, 0.015, (0, 0, 0), 'agua_suja', lados=10)
    L.arbusto((0.22, -0.18, 0.0), 0.08, 'verde')
    L.arbusto((-0.22, 0.12, 0.0), 0.07, 'folha')
    L.cilindro(0.065, 1.7, (0, 0, 0), 'concreto_escuro', lados=7, r_topo=0.05)
    for z in (0.4, 0.8, 1.2):
        L.anel(0.07, 0.05, 0.02, (0, 0, z), 'pedra', lados=7)
    topo = 1.72
    # Folhas em leque: pecíolo fino saindo do topo e um leque largo e caído na ponta
    for k in range(10):
        t = 2 * math.pi * k / 10
        d = (-math.sin(t), math.cos(t))
        sobe = 0.12 if k % 2 else 0.0
        base, meio = (0, 0, topo), (0.25 * d[0], 0.25 * d[1], topo + 0.08 + sobe)
        L.cano(base, meio, 0.012, 'verde_escuro', lados=4)
        cor = 'verde' if k % 2 else 'folha'
        L.cilindro(0.17, 0.02, (0.36 * d[0], 0.36 * d[1], topo - 0.02 + sobe), cor, lados=6, r_topo=0.13,
                   rot=(-30, 0, math.degrees(t)))
    L.cone(0.05, 0.22, (0, 0, topo), 'folha', lados=5)   # broto central
    for (x, y) in ((0.07, -0.05), (-0.06, 0.06)):
        L.esfera(0.06, (x, y, topo - 0.1), 'marrom', escala=(1, 1, 1.4))


L.principal(__file__, construir)
