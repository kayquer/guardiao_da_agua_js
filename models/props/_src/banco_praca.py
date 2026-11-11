"""Banco de praça: assento e encosto de ripas de madeira sobre dois pés de ferro fundido escuro, com braços."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    for px in (-0.3, 0.3):
        L.caixa((0.04, 0.2, 0.17), (px, 0, 0), 'escuro', chanfro=0.008)            # pé
        L.caixa((0.035, 0.03, 0.2), (px, 0.09, 0.17), 'escuro')                   # sobe para o encosto
        L.caixa((0.04, 0.2, 0.025), (px, -0.005, 0.25), 'escuro', chanfro=0.006)  # braço
    for i in range(3):
        L.caixa((0.72, 0.055, 0.02), (0, -0.07 + i * 0.065, 0.17), 'madeira', chanfro=0.006)
    for i in range(2):
        L.caixa((0.72, 0.018, 0.05), (0, 0.1, 0.22 + i * 0.07), 'madeira', rot=(-10, 0, 0), chanfro=0.005)


L.principal(__file__, construir)
