"""Poste solar: mastro cônico, placa solar inclinada no topo virada para o sol, braço com luminária de LED
amarela, caixa da bateria no meio do poste e base de concreto."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    L.cilindro(0.11, 0.08, (0, 0, 0), 'concreto', lados=8, r_topo=0.09, chanfro=0.01)
    L.cilindro(0.035, 1.55, (0, 0, 0.08), 'metal', lados=8, r_topo=0.022)
    # Bateria
    L.caixa((0.1, 0.07, 0.16), (0, -0.045, 0.55), 'metal_escuro', chanfro=0.01)
    L.placa(0.05, 0.02, (0, -0.08, 0.68), 'verde', 'frente', espessura=0.008)  # luz de carga
    # Placa solar inclinada (de frente para o sul/câmera)
    L.caixa((0.04, 0.04, 0.08), (0, 0, 1.6), 'metal_escuro')
    L.caixa((0.42, 0.3, 0.025), (0, 0, 1.66), 'metal', rot=(-28, 0, 0), chanfro=0.006)
    L.caixa((0.39, 0.27, 0.01), (0, -0.007, 1.683), 'painel_solar', rot=(-28, 0, 0))
    # Braço e luminária
    L.cano((0, 0, 1.45), (0.36, 0, 1.52), 0.016, 'metal', lados=6)
    L.caixa((0.18, 0.08, 0.035), (0.4, 0, 1.49), 'metal_escuro', chanfro=0.008)
    L.caixa((0.15, 0.06, 0.01), (0.4, 0, 1.483), 'flor_amarela')  # LED


L.principal(__file__, construir)
