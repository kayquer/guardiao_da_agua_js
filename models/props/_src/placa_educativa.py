"""Placa educativa de beira de rio: quadro de madeira com telhadinho sobre dois postes, gota azul e árvore
desenhadas, faixa verde de título e linhas de texto (sem letras)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    for px in (-0.28, 0.28):
        L.caixa((0.045, 0.045, 0.62), (px, 0.02, 0), 'madeira_escura', chanfro=0.006)
    L.caixa((0.62, 0.035, 0.36), (0, 0.0, 0.22), 'madeira', chanfro=0.008)
    L.placa(0.54, 0.29, (0, -0.018, 0.545), 'parede', 'frente', espessura=0.008)
    # Gota de água
    L.esfera(0.05, (-0.17, -0.024, 0.37), 'agua_funda', escala=(1, 0.2, 1))
    L.cone(0.038, 0.06, (-0.17, -0.024, 0.39), 'agua_funda', lados=6)
    # Arvorezinha
    L.caixa((0.012, 0.006, 0.05), (0.17, -0.024, 0.33), 'madeira_escura')
    L.esfera(0.045, (0.17, -0.024, 0.41), 'verde', escala=(1, 0.2, 1))
    # Faixa de título e linhas de texto
    L.placa(0.48, 0.035, (0, -0.023, 0.52), 'telhado_verde', 'frente', espessura=0.006)
    for i in range(4):
        L.placa(0.16, 0.012, (0.0, -0.023, 0.44 - i * 0.03), 'escuro', 'frente', espessura=0.004)
    L.telhado(0.66, 0.1, 0.07, (0, 0.0, 0.58), 'telhado_vermelho', beiral=0.03)


L.principal(__file__, construir)
