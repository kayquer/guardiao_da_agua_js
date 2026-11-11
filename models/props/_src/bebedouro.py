"""Bebedouro público: pedestal de concreto, cuba turquesa com bica de metal, pedal e bacia para animais na base."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    L.cilindro(0.16, 0.03, (0, 0, 0), 'concreto', lados=8, chanfro=0.008)
    L.cilindro(0.08, 0.3, (0, 0, 0.03), 'concreto', lados=8, r_topo=0.06, chanfro=0.008)
    L.cilindro(0.13, 0.05, (0, 0, 0.33), 'agua_funda', lados=10, r_topo=0.15, chanfro=0.008)
    L.cilindro(0.12, 0.01, (0, 0, 0.375), 'agua', lados=10)
    L.cano((0, 0.03, 0.37), (0, -0.03, 0.42), 0.012, 'metal', lados=6)
    L.esfera(0.012, (0, -0.045, 0.43), 'agua')
    L.caixa((0.05, 0.08, 0.02), (0, -0.12, 0.0), 'metal_escuro', chanfro=0.004)   # pedal
    L.tanque_redondo(0.07, 0.04, (0.16, -0.12, 0), cor='metal', lados=8, borda=0.015, nivel=0.012)


L.principal(__file__, construir)
