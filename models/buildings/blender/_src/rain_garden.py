"""Jardim de Chuva (rain_garden, 2×2): canteiro rebaixado com plantas e pedras que recebe a água da calçada
por uma canaleta e deixa ela infiltrar (poça no meio)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    # Fundo: calçada atrás (de onde vem a enxurrada) e borda de grama em volta do canteiro rebaixado
    L.caixa((4.0, 0.7, 0.16), (0, 1.65, 0), 'piso', chanfro=0.02)
    L.caixa((4.0, 0.08, 0.2), (0, 1.27, 0), 'concreto')  # meio-fio
    L.caixa((4.0, 0.45, 0.14), (0, -1.78, 0), 'grama')
    L.caixa((0.45, 2.9, 0.14), (-1.78, -0.1, 0), 'grama')
    L.caixa((0.45, 2.9, 0.14), (1.78, -0.1, 0), 'grama')
    L.caixa((3.2, 2.7, 0.05), (0, -0.2, 0), 'terra')  # fundo rebaixado
    z = 0.05
    # Pedras na borda do canteiro
    for (x, y, r) in ((-1.45, -1.4, 0.16), (-1.5, 0.6, 0.14), (1.45, -1.3, 0.15), (1.48, 0.9, 0.17),
                      (-0.6, -1.5, 0.13), (0.7, -1.5, 0.14), (-1.5, -0.4, 0.12)):
        L.esfera(r, (x, y, z + r * 0.3), 'pedra', escala=(1.2, 1, 0.65))

    # Poça d'água no meio (infiltrando)
    L.cilindro(0.7, 0.04, (0.1, -0.15, z), 'agua', lados=9, rot=(0, 0, 10))
    L.cilindro(0.45, 0.045, (-0.35, 0.25, z), 'agua', lados=8)
    # Canaleta de pedra trazendo a água da calçada, com a lâmina d'água
    L.caixa((0.4, 1.0, 0.08), (0.1, 0.95, 0), 'pedra')
    L.caixa((0.22, 1.05, 0.1), (0.1, 0.95, 0), 'agua')
    L.caixa((0.5, 0.1, 0.06), (0.1, 1.27, 0.2), 'metal_escuro')  # grelha da boca de lobo

    # Plantas: capins (cones), arbustos e flores
    for (x, y, s) in ((-1.0, -0.9, 1.0), (-1.2, 0.2, 0.8), (1.0, -0.6, 1.1), (1.1, 0.5, 0.9), (-0.3, -1.1, 0.8),
                      (0.75, -1.15, 0.9)):
        L.cone(0.14 * s, 0.55 * s, (x, y, z), 'verde_escuro', lados=5)
        L.cone(0.1 * s, 0.4 * s, (x + 0.13, y + 0.08, z), 'folha', lados=5)
    for (x, y, r, cor) in ((-0.9, 0.85, 0.22, 'verde'), (0.95, 1.0, 0.2, 'verde'), (-0.95, -0.3, 0.18, 'folha'),
                           (0.6, 0.45, 0.16, 'verde_escuro'), (1.3, -1.05, 0.15, 'folha')):
        L.arbusto((x, y, z), r, cor)
    for (x, y, cor) in ((-0.55, -0.6, 'flor_rosa'), (-0.7, 0.35, 'flor_amarela'), (0.95, 0.1, 'flor_rosa'),
                        (0.35, -0.95, 'flor_amarela'), (-1.25, -1.25, 'flor_rosa'), (1.2, 0.85, 'flor_amarela')):
        L.cano((x, y, z), (x, y, z + 0.28), 0.015, 'verde_escuro', lados=3)
        L.esfera(0.07, (x, y, z + 0.3), cor, escala=(1, 1, 0.8), sub=1)
    # Árvore pequena no canto e placa explicativa
    L.arvore((-1.65, 1.7, 0.16), 1.0, 'verde')
    L.cano((1.55, 1.3, 0.16), (1.55, 1.3, 0.6), 0.025, 'madeira_escura', lados=4)
    L.caixa((0.4, 0.04, 0.26), (1.55, 1.27, 0.5), 'agua')
    L.caixa((0.3, 0.02, 0.16), (1.55, 1.245, 0.55), 'parede')


L.principal(__file__, construir)
