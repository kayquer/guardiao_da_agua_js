"""Boia de monitoramento do rio: flutuador amarelo num pedaço de água, mastro com plaquinha solar, sensor e luz
de sinalização vermelha."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    L.cilindro(0.38, 0.02, (0, 0, 0), 'agua', lados=12)
    L.anel(0.3, 0.27, 0.025, (0, 0, 0), 'agua_funda', lados=12)                     # ondinha
    L.cilindro(0.16, 0.06, (0, 0, 0.0), 'amarelo', lados=10, r_topo=0.18, chanfro=0.01)
    L.cilindro(0.14, 0.02, (0, 0, 0.06), 'laranja', lados=10)
    L.cilindro(0.06, 0.12, (0, 0, 0.08), 'amarelo', lados=8, r_topo=0.04)
    L.cilindro(0.012, 0.25, (0, 0, 0.2), 'metal', lados=6)
    L.caixa((0.14, 0.1, 0.012), (0, 0, 0.36), 'painel_solar', rot=(-25, 0, 0))
    L.caixa((0.05, 0.04, 0.04), (0.05, 0, 0.3), 'metal_escuro')                       # sensor
    L.cilindro(0.025, 0.04, (0, 0, 0.45), 'vermelho', lados=6)                         # luz
    L.esfera(0.02, (0, 0, 0.5), 'vermelho')


L.principal(__file__, construir)
