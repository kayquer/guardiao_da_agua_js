"""Canteiro de horta comunitária: caixa de madeira elevada com terra, fileiras de alface e cenoura, tomateiro
no tutor e plaquinha de identificação."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    L.tanque(0.9, 0.5, 0.14, (0, 0, 0), cor_agua='terra', cor='madeira', parede=0.04, nivel=0.025, chanfro=0.006)
    for i in range(4):                                   # alfaces
        L.esfera(0.05, (-0.32 + i * 0.13, -0.13, 0.13), 'folha', escala=(1, 1, 0.7))
    for i in range(5):                                   # cenouras: ombro laranja e rama
        x = -0.33 + i * 0.1
        L.cilindro(0.018, 0.015, (x, 0.02, 0.105), 'laranja', lados=5)
        L.cone(0.025, 0.09, (x, 0.02, 0.115), 'verde', lados=4)
    # Tomateiro no tutor
    L.cano((0.3, 0.1, 0.11), (0.3, 0.1, 0.45), 0.008, 'madeira_escura', lados=4)
    L.esfera(0.08, (0.3, 0.1, 0.3), 'verde_escuro', escala=(0.8, 0.8, 1.3))
    for (x, y, z) in ((0.35, 0.05, 0.27), (0.25, 0.06, 0.33), (0.33, 0.04, 0.37)):
        L.esfera(0.022, (x, y, z), 'vermelho')
    # Plaquinha
    L.cano((-0.38, -0.2, 0.11), (-0.38, -0.2, 0.25), 0.006, 'madeira_escura', lados=4)
    L.placa(0.08, 0.05, (-0.38, -0.205, 0.27), 'creme', 'frente', espessura=0.008)


L.principal(__file__, construir)
