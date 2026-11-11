"""Conjunto de arbustos para canteiro: cinco tufos em verdes variados, alguns com flores rosas e amarelas."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    tufos = ((0, 0, 0.16, 'verde'), (0.22, -0.08, 0.12, 'verde_escuro'), (-0.2, 0.06, 0.13, 'folha'),
             (0.08, 0.2, 0.11, 'verde_escuro'), (-0.08, -0.2, 0.1, 'verde'))
    for (x, y, r, cor) in tufos:
        L.arbusto((x, y, 0), r, cor)
    flores = ((0.04, -0.12, 0.17, 'flor_rosa'), (-0.1, 0.0, 0.2, 'flor_rosa'), (0.2, -0.16, 0.12, 'flor_amarela'),
              (-0.24, 0.12, 0.15, 'flor_amarela'), (0.1, 0.06, 0.24, 'flor_rosa'))
    for (x, y, z, cor) in flores:
        L.esfera(0.025, (x, y, z), cor)


L.principal(__file__, construir)
