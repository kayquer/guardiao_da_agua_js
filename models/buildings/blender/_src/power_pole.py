"""Poste de Energia (power_pole, 1×1, escondido em FEATURE_FLAGS): poste de madeira com cruzeta,
isoladores, transformador e fios saindo para os dois lados."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    # Base do tamanho da célula (define o encaixe: sem ela o poste fino viraria gigante)
    L.caixa((2.0, 2.0, 0.03), (0, 0, 0), 'grama')
    L.cilindro(0.25, 0.05, (0, 0, 0.03), 'concreto', lados=8)
    h = 2.6
    L.cilindro(0.08, h, (0, 0, 0.03), 'madeira', lados=6, r_topo=0.06)
    L.caixa((1.2, 0.1, 0.1), (0, 0, h - 0.25), 'madeira_escura')
    L.cano((-0.35, 0, h - 0.2), (0, 0, h - 0.6), 0.02, 'madeira_escura', lados=4)
    for x in (-0.5, 0.0, 0.5):
        L.cilindro(0.04, 0.12, (x, 0, h - 0.15), 'parede', lados=6)
    # Transformador
    L.cilindro(0.16, 0.38, (0, -0.2, h - 1.15), 'metal', lados=8)
    L.caixa((0.06, 0.15, 0.06), (0, -0.08, h - 0.95), 'metal_escuro')
    L.caixa((0.12, 0.02, 0.12), (0, -0.37, h - 0.98), 'amarelo')
    # Fios caindo de leve para fora da célula
    for x in (-0.5, 0.0, 0.5):
        L.cano((x, 0, h - 0.04), (x, -0.95, h - 0.2), 0.008, 'escuro', lados=3)
        L.cano((x, 0, h - 0.04), (x, 0.95, h - 0.2), 0.008, 'escuro', lados=3)
    L.arbusto((0.6, 0.6, 0.03), 0.14, 'verde')


L.principal(__file__, construir)
