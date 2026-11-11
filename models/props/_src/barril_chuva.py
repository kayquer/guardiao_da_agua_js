"""Barril de captação de chuva: tambor azul sobre um estrado de madeira, cano da calha descendo até a tampa,
torneira na frente com um regador ao lado e marcador de nível de água na lateral direita."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _base import L  # noqa: E402


def construir():
    # Estrado
    for py in (-0.1, 0.1):
        L.caixa((0.42, 0.06, 0.04), (0, py, 0), 'madeira_escura')
    for px in (-0.14, 0, 0.14):
        L.caixa((0.11, 0.38, 0.03), (px, 0, 0.04), 'madeira', chanfro=0.005)
    # Tambor com aros
    z0 = 0.07
    L.cilindro(0.16, 0.38, (0, 0, z0), 'cano', lados=10, chanfro=0.01)
    for zz in (0.1, 0.28):
        L.anel(0.168, 0.15, 0.025, (0, 0, z0 + zz), 'agua_funda', lados=10)
    L.cilindro(0.15, 0.02, (0, 0, z0 + 0.38), 'agua_funda', lados=10)
    # Tela/entrada da calha e cano descendo
    L.cilindro(0.06, 0.012, (0.03, 0.05, z0 + 0.4), 'escuro', lados=8)
    L.cano((0.03, 0.05, z0 + 0.43), (0.03, 0.05, 0.85), 0.03, 'metal', lados=6)
    L.cano((0.03, 0.05, 0.85), (0.03, 0.2, 0.95), 0.03, 'metal', lados=6)
    # Torneira
    L.cano((0, -0.155, 0.15), (0, -0.21, 0.15), 0.015, 'metal_escuro', lados=6)
    L.cano((0, -0.21, 0.15), (0, -0.21, 0.11), 0.012, 'metal_escuro', lados=6)
    L.caixa((0.04, 0.012, 0.012), (0, -0.19, 0.17), 'vermelho')
    # Marcador de nível (lado direito, visível pela câmera)
    L.caixa((0.012, 0.03, 0.26), (0.162, 0, z0 + 0.06), 'parede')
    L.caixa((0.014, 0.032, 0.16), (0.163, 0, z0 + 0.06), 'agua')
    # Regador
    L.cilindro(0.05, 0.09, (0.25, -0.12, 0), 'verde', lados=8)
    L.cano((0.21, -0.12, 0.05), (0.15, -0.12, 0.12), 0.008, 'verde', lados=5)
    L.cano((0.27, -0.12, 0.09), (0.3, -0.12, 0.13), 0.006, 'verde_escuro', lados=5)


L.principal(__file__, construir)
