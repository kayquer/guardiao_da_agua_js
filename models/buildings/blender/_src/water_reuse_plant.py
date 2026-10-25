"""Estação de Água de Reúso (water_reuse_plant, 3×3): esgoto já tratado (verde-claro) entra no tanque de
aeração com o misturador girando (nó "gira_1"), passa pelo galpão das membranas e vira água de reúso (lilás, a cor
usada no Brasil para os canos de água não potável) que segue em canos roxos para a fábrica vizinha. Inspiração:
o Aquapolo, em São Paulo, que entrega água de reúso para um polo industrial."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.08


def construir():
    L.caixa((6.0, 6.0, PISO), (0, 0, 0), 'concreto_escuro', chanfro=0.02)
    L.caixa((5.7, 5.7, 0.01), (0, 0, PISO), 'piso')
    L.caixa((1.4, 5.7, 0.012), (2.15, 0, PISO), 'grama')

    # 1) Entrada: esgoto tratado chegando (cano verde-claro) ao tanque de aeração
    L.cano((-3.0, 1.6, PISO + 0.2), (-2.2, 1.6, PISO + 0.2), 0.1, 'agua_suja')
    L.tanque(1.9, 1.5, 0.45, (-1.5, 1.4, PISO), 'agua_suja', 'concreto', parede=0.08)
    # bolhas de ar (aeração)
    for (x, y) in ((-2.0, 1.1), (-1.6, 1.6), (-1.1, 1.2), (-1.3, 1.8), (-1.85, 1.75)):
        L.esfera(0.05, (x, y, PISO + 0.42), 'parede', escala=(1, 1, 0.5))
    # ponte com o misturador
    L.caixa((0.25, 1.6, 0.06), (-1.5, 1.4, PISO + 0.5), 'metal_escuro')
    mix = [L.cano((-1.5, 1.4, PISO + 0.5), (-1.5, 1.4, PISO + 0.25), 0.03, 'metal', lados=5)]
    for i in range(2):
        mix.append(L.caixa((0.6, 0.06, 0.04), (-1.5, 1.4, PISO + 0.26), 'amarelo', rot=(0, 0, 90 * i)))
    L.animar(mix, 'gira_1', (-1.5, 1.4, PISO + 0.4))

    # 2) Galpão das membranas com janelas e faixa roxa
    gx, gy, w, d, h = -1.0, -1.0, 2.8, 1.8, 1.0
    L.caixa((w, d, h), (gx, gy, PISO), 'parede', chanfro=0.04)
    L.caixa((w + 0.01, d + 0.01, 0.12), (gx, gy, PISO + 0.5), 'roxo')
    L.telhado(w + 0.2, d + 0.2, 0.3, (gx, gy, PISO + h), 'telhado_verde', eixo='X')
    L.janelas('frente', gy - d / 2, PISO + 0.75, gx - 1.0, gx + 1.0, 4, 0.32, 0.18)
    L.janelas('direita', gx + w / 2, PISO + 0.75, gy - 0.5, gy + 0.5, 2, 0.32, 0.18)
    L.placa(0.4, 0.42, (gx - 0.8, gy - d / 2, PISO), 'escuro', 'frente')
    L.cano((-1.5, 0.65, PISO + 0.3), (-1.5, gy + d / 2, PISO + 0.3), 0.06, 'agua_suja')

    # 3) Reservatório elevado de água de reúso (lilás) e canos roxos até a fábrica
    tx, ty = 1.0, 0.9
    for (dx, dy) in ((-0.35, -0.35), (0.35, -0.35), (-0.35, 0.35), (0.35, 0.35)):
        L.cano((tx + dx, ty + dy, PISO), (tx + dx, ty + dy, PISO + 0.9), 0.04, 'metal_escuro', lados=5)
    L.cilindro(0.6, 0.55, (tx, ty, PISO + 0.9), 'roxo_escuro', lados=12, chanfro=0.02)
    L.cupula(0.6, (tx, ty, PISO + 1.45), 'roxo', lados=12, aneis=2)
    L.caixa((0.5, 0.02, 0.12), (tx, ty - 0.6, PISO + 1.15), 'parede')  # placa clara
    L.cano((gx + w / 2, gy, PISO + 0.35), (tx, ty - 0.6, PISO + 0.35), 0.06, 'roxo')
    L.cano((tx, ty - 0.6, PISO + 0.35), (tx, ty - 0.6, PISO + 0.9), 0.06, 'roxo')
    L.cano((tx + 0.6, ty, PISO + 1.0), (2.9, ty, PISO + 1.0), 0.06, 'roxo')
    L.cano((2.9, ty, PISO + 1.0), (2.9, ty, PISO + 0.1), 0.06, 'roxo')
    # pedacinho da fábrica vizinha (quem recebe a água)
    L.caixa((0.7, 1.2, 0.7), (2.45, -1.6, PISO), 'concreto', chanfro=0.03)
    L.telhado(0.8, 1.3, 0.22, (2.45, -1.6, PISO + 0.7), 'telhado_vermelho', eixo='Y')
    L.cano((2.6, -1.3, PISO + 0.92), (2.6, -1.3, PISO + 1.5), 0.08, 'concreto_escuro', lados=8)
    L.cano((2.9, ty, PISO + 0.1), (2.9, -1.0, PISO + 0.1), 0.05, 'roxo')

    L.arvore((2.3, 2.4, PISO), 0.8, 'verde')
    L.arbusto((-2.6, -2.5, PISO), 0.16, 'verde')
    L.arbusto((0.4, -2.6, PISO), 0.14, 'verde_escuro')


L.principal(__file__, construir)
