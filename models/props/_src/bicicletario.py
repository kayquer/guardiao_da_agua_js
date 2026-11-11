"""Bicicletário: base de concreto com três arcos em U invertido de metal amarelo e uma bicicleta vermelha presa."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def arco(x):
    L.cano((x, -0.12, 0.03), (x, -0.12, 0.26), 0.014, 'amarelo', lados=6)
    L.cano((x, 0.12, 0.03), (x, 0.12, 0.26), 0.014, 'amarelo', lados=6)
    L.cano((x, -0.12, 0.26), (x, 0.12, 0.26), 0.014, 'amarelo', lados=6)


def bicicleta(x):
    for py in (-0.2, 0.2):
        L.cilindro(0.11, 0.015, (x - 0.0075, py, 0.12), 'escuro', lados=12, rot=(0, 90, 0))
        L.cilindro(0.03, 0.02, (x - 0.01, py, 0.12), 'metal', lados=6, rot=(0, 90, 0))
    a, b, c = (x, -0.2, 0.12), (x, 0.0, 0.12), (x, -0.02, 0.3)
    L.cano(a, c, 0.01, 'vermelho', lados=5)
    L.cano(b, c, 0.01, 'vermelho', lados=5)
    L.cano(b, (x, 0.2, 0.12), 0.01, 'vermelho', lados=5)
    L.cano(c, (x, 0.18, 0.3), 0.01, 'vermelho', lados=5)
    L.cano((x, 0.18, 0.3), (x, 0.2, 0.12), 0.01, 'vermelho', lados=5)
    L.caixa((0.04, 0.08, 0.015), (x, -0.02, 0.31), 'escuro')                           # selim
    L.cano((x - 0.08, 0.17, 0.36), (x + 0.08, 0.17, 0.36), 0.008, 'escuro', lados=5)  # guidão
    L.cano((x, 0.18, 0.3), (x, 0.17, 0.36), 0.009, 'vermelho', lados=5)


def construir():
    L.caixa((0.9, 0.5, 0.03), (0, 0, 0), 'concreto', chanfro=0.01)
    for x in (-0.3, 0.0, 0.3):
        arco(x)
    bicicleta(-0.15)


L.principal(__file__, construir)
