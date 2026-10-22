"""Jardim Flutuante (floating_garden, 3×3, sobre a água): ilhas de plantas filtradoras em balsas de madeira,
ligadas por passarelas, com boias de sinalização. As raízes (penduradas sob a balsa) limpam a água."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def ilha(x, y, r, lados=6, giro=0, plantas=4, flores=2):
    """Balsa hexagonal: boias, estrado de madeira, manta verde e plantas por cima."""
    L.cilindro(r + 0.06, 0.1, (x, y, 0.0), 'metal', lados=lados, rot=(0, 0, giro))           # flutuador
    L.cilindro(r, 0.08, (x, y, 0.1), 'madeira', lados=lados, rot=(0, 0, giro))                # estrado
    L.cilindro(r * 0.86, 0.07, (x, y, 0.18), 'verde_escuro', lados=lados, rot=(0, 0, giro))   # manta
    z = 0.25
    for i in range(plantas):
        a = giro + i * (360 / plantas)
        px = x + math.cos(math.radians(a)) * r * 0.48
        py = y + math.sin(math.radians(a)) * r * 0.48
        if i % 2 == 0:
            L.cone(0.13, 0.55, (px, py, z), 'verde', lados=5)        # junco/papiro
            L.cone(0.09, 0.42, (px + 0.1, py - 0.05, z), 'folha', lados=5)
        else:
            L.arbusto((px, py, z), 0.2, 'folha')
    for i in range(flores):
        a = giro + 30 + i * (360 / max(flores, 1))
        px = x + math.cos(math.radians(a)) * r * 0.2
        py = y + math.sin(math.radians(a)) * r * 0.2
        L.cilindro(0.16, 0.03, (px, py, z), 'verde', lados=6)            # folha de aguapé
        L.esfera(0.08, (px, py, z + 0.07), 'flor_rosa', escala=(1, 1, 0.8))


def construir():
    ilha(-1.25, -1.15, 1.05, giro=0, plantas=5, flores=2)
    ilha(1.2, -0.9, 0.9, giro=15, plantas=4, flores=1)
    ilha(-0.95, 1.3, 0.85, giro=30, plantas=4, flores=1)
    ilha(1.3, 1.35, 0.95, giro=10, plantas=4, flores=2)
    # Passarelas de madeira entre as ilhas, com pranchas
    for (a, b) in (((-0.3, -1.1), (0.4, -1.0)), ((-1.1, -0.2), (-1.0, 0.55)), ((1.25, 0.0), (1.28, 0.5))):
        (x0, y0), (x1, y1) = a, b
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        horizontal = abs(x1 - x0) > abs(y1 - y0)
        tam = (abs(x1 - x0) + 0.1, 0.32, 0.06) if horizontal else (0.32, abs(y1 - y0) + 0.1, 0.06)
        L.caixa(tam, (cx, cy, 0.12), 'madeira_escura')
        L.caixa((0.06, 0.06, 0.14), (cx, cy, 0.0), 'metal')  # flutuador da passarela
    # Ponto de coleta de amostra no centro: plataforma pequena com placa azul-água
    L.cilindro(0.32, 0.12, (0.15, 0.2, 0.0), 'metal', lados=8)
    L.cilindro(0.28, 0.06, (0.15, 0.2, 0.12), 'madeira', lados=8)
    L.cano((0.15, 0.2, 0.18), (0.15, 0.2, 0.75), 0.03, 'metal_escuro', lados=4)
    L.caixa((0.42, 0.05, 0.28), (0.15, 0.2, 0.62), 'agua')
    L.caixa((0.3, 0.02, 0.16), (0.15, 0.17, 0.68), 'parede')
    # Boias de sinalização (laranja e branca) nos cantos
    for (x, y) in ((-2.45, 0.2), (2.45, 0.25), (0.1, -2.3), (0.05, 2.45)):
        L.cilindro(0.13, 0.22, (x, y, 0.0), 'laranja', lados=8)
        L.cilindro(0.135, 0.06, (x, y, 0.12), 'parede', lados=8)
        L.cone(0.08, 0.16, (x, y, 0.22), 'laranja', lados=6)


L.principal(__file__, construir)
