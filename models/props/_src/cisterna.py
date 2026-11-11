"""Cisterna de placas (semiárido): tanque branco de concreto com faixa azul, tampa cônica, cano trazendo a água
da calha do telhado, bomba manual e balde na frente."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    L.cilindro(0.48, 0.03, (0, 0, 0), 'concreto', lados=12, chanfro=0.008)
    L.cilindro(0.42, 0.42, (0, 0, 0.03), 'parede', lados=12, chanfro=0.012)
    L.anel(0.428, 0.41, 0.06, (0, 0, 0.3), 'telhado_azul', lados=12)
    L.cilindro(0.43, 0.13, (0, 0, 0.45), 'concreto', lados=12, r_topo=0.12)
    L.cilindro(0.13, 0.04, (0, 0, 0.58), 'concreto_escuro', lados=8, chanfro=0.006)   # tampa de inspeção
    # Cano que traz a água da calha da casa: sai do chão atrás, sobe e entra pelo topo
    L.cano((0.22, 0.62, 0.0), (0.22, 0.62, 0.66), 0.025, 'cano', lados=6)
    L.cano((0.22, 0.62, 0.66), (0.2, 0.22, 0.6), 0.025, 'cano', lados=6)
    L.cano((0.2, 0.22, 0.6), (0.18, 0.18, 0.5), 0.025, 'cano', lados=6)
    # Bomba manual na frente
    L.caixa((0.12, 0.12, 0.03), (0, -0.5, 0), 'concreto', chanfro=0.005)
    L.cilindro(0.025, 0.32, (0, -0.5, 0.03), 'telhado_azul', lados=6)
    L.cano((0, -0.5, 0.33), (0.12, -0.5, 0.38), 0.012, 'metal_escuro', lados=5)   # alavanca
    L.cano((0, -0.5, 0.25), (0, -0.58, 0.24), 0.012, 'metal', lados=5)            # bica
    L.cilindro(0.045, 0.06, (0, -0.6, 0.03), 'laranja', lados=8, r_topo=0.055)     # balde


L.principal(__file__, construir)
