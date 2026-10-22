"""Parque Linear (linear_park, 3×3): córrego que atravessa o parque com mata ciliar nas margens,
ciclovia, ponte de madeira, bancos e postes — o rio tem espaço para encher sem alagar a cidade."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((6.0, 6.0, 0.1), (0, 0, 0), 'grama', chanfro=0.02)
    z = 0.1
    # Córrego em ziguezague suave (trechos inclinados), com margens de pedra/areia
    trechos = ((-2.4, -1.6, -1.0, -0.9), (-1.0, -0.9, 0.6, -0.3), (0.6, -0.3, 2.0, 0.8), (2.0, 0.8, 3.0, 1.0))
    for (x0, y0, x1, y1) in trechos:
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        comp = math.hypot(x1 - x0, y1 - y0) + 0.35
        ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
        L.caixa((comp, 1.15, 0.02), (cx, cy, z), 'areia', rot=(0, 0, ang))
        L.caixa((comp, 0.75, 0.04), (cx, cy, z), 'agua', rot=(0, 0, ang))
    L.caixa((0.6, 1.15, 0.02), (-2.75, -1.6, z), 'areia')
    L.caixa((0.7, 0.75, 0.04), (-2.65, -1.6, z), 'agua')

    # Ciclovia (vermelha) e calçada correndo ao longo do parque
    L.caixa((6.0, 0.45, 0.03), (0, 2.2, z), 'telhado_vermelho')
    L.caixa((6.0, 0.4, 0.03), (0, -2.6, z), 'piso')
    for i in range(6):
        L.caixa((0.35, 0.05, 0.005), (-2.5 + i * 1.0, 2.2, z + 0.03), 'parede')   # faixa tracejada
    # Ponte de madeira sobre o córrego
    L.caixa((0.5, 1.6, 0.08), (-0.2, -0.65, z + 0.18), 'madeira', rot=(0, 0, 15))
    for dx in (-0.22, 0.22):
        L.caixa((0.05, 1.6, 0.12), (-0.2 + dx, -0.65, z + 0.26), 'madeira_escura', rot=(0, 0, 15))
    L.caixa((0.6, 0.15, 0.2), (-0.4, -1.4, z), 'pedra', rot=(0, 0, 15))
    L.caixa((0.6, 0.15, 0.2), (0.0, 0.1, z), 'pedra', rot=(0, 0, 15))

    # Mata ciliar: árvores e arbustos nas duas margens
    for (x, y, s, cor, tipo) in ((-2.3, -0.5, 1.1, 'verde', 'redonda'), (-1.4, 0.3, 1.0, 'verde_escuro', 'pinheiro'),
                                 (0.2, 0.9, 1.2, 'verde', 'redonda'), (1.2, 1.6, 0.9, 'folha', 'redonda'),
                                 (2.5, -0.3, 1.1, 'verde_escuro', 'pinheiro'), (1.3, -0.9, 1.0, 'verde', 'redonda'),
                                 (-0.9, -1.9, 0.9, 'folha', 'redonda'), (-2.6, 1.3, 1.0, 'verde', 'redonda'),
                                 (2.6, 2.7, 0.9, 'verde_escuro', 'pinheiro')):
        L.arvore((x, y, z), s, cor, tipo=tipo)
    for (x, y) in ((-1.7, -0.6), (0.9, 0.3), (-0.5, -0.3), (2.3, 0.2), (1.5, -1.7)):
        L.arbusto((x, y, z), 0.17, 'verde')
    for (x, y) in ((-0.6, -1.2), (1.4, 0.2), (2.6, 0.5)):
        L.cone(0.07, 0.3, (x, y, z), 'verde_escuro', lados=4)   # capim da margem

    # Bancos e postes ao longo da ciclovia
    for x in (-1.6, 1.0):
        L.caixa((0.6, 0.2, 0.06), (x, 1.7, z + 0.14), 'madeira')
        L.caixa((0.6, 0.04, 0.16), (x, 1.8, z + 0.2), 'madeira')
        L.caixa((0.5, 0.16, 0.14), (x, 1.7, z), 'metal_escuro')
    for x in (-2.4, -0.2, 2.0):
        L.cano((x, 2.55, z), (x, 2.55, z + 0.85), 0.025, 'escuro', lados=4)
        L.esfera(0.07, (x, 2.55, z + 0.9), 'amarelo')


L.principal(__file__, construir)
