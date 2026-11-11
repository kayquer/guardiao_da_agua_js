"""Lixeira seletiva de rua: quatro cestos (azul papel, vermelho plástico, verde vidro, amarelo metal) presos
numa travessa sobre dois postes, cada um com boca escura e etiqueta clara na frente; base de concreto."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def cesto(x, cor):
    z = 0.12
    L.cilindro(0.085, 0.24, (x, 0, z), cor, lados=8, r_topo=0.095, chanfro=0.01)
    L.anel(0.1, 0.075, 0.025, (x, 0, z + 0.235), cor, lados=8)       # borda da boca
    L.cilindro(0.075, 0.005, (x, 0, z + 0.235), 'escuro', lados=8)   # boca escura
    L.placa(0.07, 0.07, (x, -0.09, z + 0.17), 'parede', 'frente', espessura=0.01)


def construir():
    L.caixa((0.95, 0.32, 0.04), (0, 0, 0), 'concreto', chanfro=0.015)
    for px in (-0.44, 0.44):
        L.cilindro(0.025, 0.335, (px, 0.06, 0.04), 'metal_escuro', lados=6)
    L.caixa((0.92, 0.035, 0.035), (0, 0.06, 0.37), 'metal_escuro')
    for i, cor in enumerate(('telhado_azul', 'vermelho', 'verde_garrafa', 'amarelo')):
        cesto(-0.315 + i * 0.21, cor)
    # Plaquinha verde no alto ("recicle")
    L.caixa((0.36, 0.03, 0.1), (0, 0.06, 0.405), 'verde', chanfro=0.008)
    L.placa(0.2, 0.03, (0, 0.04, 0.47), 'parede', 'frente', espessura=0.008)


L.principal(__file__, construir)
