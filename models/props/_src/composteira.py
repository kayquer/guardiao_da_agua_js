"""Composteira de dois módulos de ripas de madeira: um com composto pronto, outro com restos de folhas e cascas,
e uma pá encostada na frente."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def modulo(x0):
    for i in range(3):
        z = 0.02 + i * 0.09
        L.caixa((0.36, 0.025, 0.06), (x0, -0.17, z), 'madeira', chanfro=0.004)
        L.caixa((0.36, 0.025, 0.06), (x0, 0.17, z), 'madeira', chanfro=0.004)
        L.caixa((0.025, 0.34, 0.06), (x0 - 0.17, 0, z), 'madeira', chanfro=0.004)
        L.caixa((0.025, 0.34, 0.06), (x0 + 0.17, 0, z), 'madeira', chanfro=0.004)
    for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        L.caixa((0.035, 0.035, 0.3), (x0 + dx * 0.17, dy * 0.17, 0), 'madeira_escura')


def construir():
    L.caixa((0.82, 0.42, 0.02), (0, 0, 0), 'terra')
    modulo(-0.19)
    modulo(0.19)
    L.cupula(0.15, (-0.19, 0, 0.02), 'composto', lados=8, aneis=2)
    L.cupula(0.15, (0.19, 0, 0.02), 'verde_escuro', lados=8, aneis=2)
    for (x, y, cor) in ((0.15, -0.05, 'folha'), (0.24, 0.04, 'laranja'), (0.18, 0.06, 'amarelo'), (0.22, -0.07, 'madeira')):
        L.esfera(0.035, (x, y, 0.15), cor, escala=(1, 1, 0.5))
    # Pá encostada na frente
    L.cano((0.45, -0.25, 0.03), (0.42, -0.1, 0.42), 0.01, 'madeira', lados=5)
    L.caixa((0.08, 0.02, 0.1), (0.45, -0.26, 0.0), 'metal_escuro', rot=(20, 0, 0))


L.principal(__file__, construir)
