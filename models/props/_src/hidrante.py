"""Hidrante de rua: corpo vermelho com tampa amarela, duas saídas laterais e uma frontal, sobre base de concreto."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    L.cilindro(0.1, 0.025, (0, 0, 0), 'concreto', lados=8)
    L.cilindro(0.07, 0.03, (0, 0, 0.025), 'vermelho', lados=8, chanfro=0.006)
    L.cilindro(0.055, 0.2, (0, 0, 0.055), 'vermelho', lados=8)
    L.anel(0.068, 0.05, 0.02, (0, 0, 0.22), 'vermelho', lados=8)
    L.cupula(0.06, (0, 0, 0.24), 'amarelo', lados=8, aneis=3)
    L.cilindro(0.015, 0.025, (0, 0, 0.3), 'amarelo', lados=6)
    saidas = (((0.05, 0, 0.17), (0.1, 0, 0.17)), ((-0.05, 0, 0.17), (-0.1, 0, 0.17)), ((0, -0.05, 0.15), (0, -0.1, 0.15)))
    for (a, b) in saidas:
        L.cano(a, b, 0.025, 'vermelho', lados=8)
        L.cano(b, (b[0] * 1.15, b[1] * 1.15, b[2]), 0.03, 'amarelo', lados=6)   # tampa da saída


L.principal(__file__, construir)
