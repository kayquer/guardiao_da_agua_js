"""Araucária (pinheiro-do-paraná): tronco reto e alto, galhos subindo em candelabro e copa achatada em camadas
verde-escuras no topo, com uma pinha."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    L.cilindro(0.3, 0.015, (0, 0, 0), 'grama', lados=10)
    L.cilindro(0.06, 1.75, (0, 0, 0), 'madeira_escura', lados=6, r_topo=0.035)
    # Galhos saem quase na horizontal e curvam para cima: todas as pontas na mesma altura (copa em "taça")
    for k in range(8):
        a = 2 * math.pi * k / 8 + 0.2
        z = 1.3 + (k % 2) * 0.1
        c, s = math.cos(a), math.sin(a)
        cotovelo = (0.32 * c, 0.32 * s, z + 0.06)
        ponta = (0.5 * c, 0.5 * s, 1.72)
        L.cano((0, 0, z), cotovelo, 0.016, 'madeira_escura', lados=5)
        L.cano(cotovelo, ponta, 0.014, 'madeira_escura', lados=5)
        cor = 'verde_escuro' if k % 2 else 'verde_garrafa'
        L.cilindro(0.2, 0.05, (ponta[0], ponta[1], ponta[2] - 0.01), cor, lados=7, r_topo=0.16)
    L.cilindro(0.24, 0.05, (0, 0, 1.75), 'verde_escuro', lados=7, r_topo=0.18)
    L.esfera(0.04, (0.2, -0.38, 1.66), 'marrom', escala=(1, 1, 1.2))   # pinha


L.principal(__file__, construir)
