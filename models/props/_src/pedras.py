"""Conjunto de pedras de beira de rio: três pedras facetadas de tamanhos diferentes com tufos de capim."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    L.esfera(0.2, (0, 0.05, 0.08), 'pedra', escala=(1.2, 1, 0.75))
    L.esfera(0.13, (0.25, -0.08, 0.05), 'concreto_escuro', escala=(1, 1.2, 0.7))
    L.esfera(0.08, (-0.2, -0.15, 0.03), 'pedra', escala=(1.2, 1, 0.7))
    for (x, y, h) in ((-0.22, 0.12, 0.14), (0.12, -0.2, 0.11), (0.35, 0.1, 0.12), (-0.05, -0.22, 0.09)):
        L.cone(0.04, h, (x, y, 0), 'verde', lados=4)
        L.cone(0.03, h * 0.8, (x + 0.03, y + 0.02, 0), 'folha', lados=4)


L.principal(__file__, construir)
