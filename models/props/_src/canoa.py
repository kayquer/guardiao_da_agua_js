"""Canoa de madeira de pescador num remanso do rio: casco em duas camadas, bancos, remo apoiado e uma rede dobrada."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def casco(meia, larg, z, h, cor):
    """Contorno da canoa visto de cima (pontuda nas duas pontas, ao longo de Y), extrudado de z até z + h."""
    lado = []
    for i in range(9):
        t = -1 + 2 * i / 8
        lado.append((larg * (1 - t ** 2) ** 0.6, t * meia))
    perfil = lado + [(-x, y) for (x, y) in reversed(lado[1:-1])]
    return L.prisma(perfil, h, (0, 0, z), cor, eixo='Z')


def construir():
    L.cilindro(0.75, 0.02, (0, 0, 0), 'agua', lados=12)
    casco(0.62, 0.12, 0.0, 0.05, 'madeira_escura')
    casco(0.68, 0.17, 0.05, 0.06, 'madeira')
    casco(0.6, 0.14, 0.105, 0.007, 'madeira_escura')       # fundo interno
    L.caixa((0.27, 0.05, 0.015), (0, -0.25, 0.09), 'madeira')
    L.caixa((0.28, 0.05, 0.015), (0, 0.22, 0.09), 'madeira')
    # Remo
    L.cano((-0.1, -0.35, 0.12), (0.1, 0.25, 0.14), 0.01, 'madeira_escura', lados=5)
    L.caixa((0.06, 0.14, 0.01), (0.12, 0.31, 0.13), 'madeira_escura', rot=(0, 0, -18))
    L.esfera(0.06, (0.0, 0.02, 0.11), 'creme', escala=(1.2, 1.4, 0.4))      # rede dobrada


L.principal(__file__, construir)
