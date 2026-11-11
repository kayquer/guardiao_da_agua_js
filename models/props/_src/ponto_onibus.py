"""Ponto de ônibus com telhado verde: abrigo de metal com fundo de vidro, banco, cobertura com grama e plantas
(segura a água da chuva) e placa azul do ponto ao lado."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    L.caixa((1.0, 0.5, 0.03), (0, 0, 0), 'concreto', chanfro=0.01)
    L.caixa((1.0, 0.06, 0.015), (0, -0.23, 0.03), 'amarelo')                   # piso tátil
    for px in (-0.42, 0.42):
        L.caixa((0.035, 0.035, 0.62), (px, 0.17, 0.03), 'metal_escuro')
        L.caixa((0.035, 0.035, 0.6), (px, -0.12, 0.03), 'metal_escuro')
    L.caixa((0.82, 0.015, 0.45), (0, 0.17, 0.12), 'vidro', chanfro=0.004)        # fundo de vidro
    L.caixa((0.015, 0.25, 0.45), (0.42, 0.025, 0.12), 'vidro')                   # lateral de vidro
    L.caixa((0.6, 0.12, 0.02), (0, 0.1, 0.17), 'madeira', chanfro=0.005)         # banco
    for px in (-0.25, 0.25):
        L.caixa((0.03, 0.08, 0.14), (px, 0.12, 0.03), 'metal_escuro')
    # Telhado verde: laje, substrato com grama e plantinhas
    L.caixa((1.0, 0.44, 0.04), (0, 0.025, 0.63), 'metal_escuro', rot=(4, 0, 0), chanfro=0.008)
    L.caixa((0.94, 0.38, 0.035), (0, 0.025, 0.665), 'telhado_verde', rot=(4, 0, 0))
    for (x, y, r, cor) in ((-0.32, 0.0, 0.07, 'verde'), (-0.1, 0.1, 0.06, 'folha'),
                           (0.15, -0.05, 0.07, 'verde_escuro'), (0.33, 0.08, 0.06, 'folha')):
        L.arbusto((x, y, 0.69), r, cor)
    L.esfera(0.025, (0.0, -0.08, 0.72), 'flor_rosa')
    L.esfera(0.025, (0.25, 0.12, 0.73), 'flor_amarela')
    # Placa do ponto
    L.cilindro(0.015, 0.8, (0.6, -0.15, 0.03), 'metal', lados=6)
    L.caixa((0.04, 0.2, 0.14), (0.6, -0.15, 0.7), 'telhado_azul', chanfro=0.008)
    L.placa(0.1, 0.07, (0.62, -0.15, 0.81), 'parede', 'direita', espessura=0.006)


L.principal(__file__, construir)
