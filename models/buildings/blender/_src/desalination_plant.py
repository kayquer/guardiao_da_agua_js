"""Usina de Dessalinização (desalination_plant, 3×3): a água salgada (verde-azulada) entra por um cano grosso,
passa pelos pré-filtros e pelas fileiras de tubos brancos de membrana (osmose reversa), sai como água potável
(turquesa) para o reservatório azul. A salmoura volta por um cano marrom. Bombas de alta pressão com ventilador
no telhado (nó "gira_1") e muitos cabos de energia: ela gasta muita eletricidade."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.08


def construir():
    L.caixa((6.0, 6.0, PISO), (0, 0, 0), 'concreto_escuro', chanfro=0.02)
    L.caixa((5.7, 5.7, 0.01), (0, 0, PISO), 'piso')

    # Captação: cano grosso chegando pela esquerda até o tanque de água salgada
    L.cano((-3.0, -1.9, PISO + 0.2), (-2.0, -1.9, PISO + 0.2), 0.14, 'agua_funda')
    L.tanque(1.2, 1.0, 0.4, (-1.95, -1.6, PISO), 'agua_suja', 'concreto', parede=0.08)
    # Pré-filtros (dois cilindros cinza)
    for x in (-1.1, -0.65):
        L.cilindro(0.18, 0.7, (x, -1.75, PISO), 'metal', lados=10, chanfro=0.02)
        L.cupula(0.18, (x, -1.75, PISO + 0.7), 'metal', lados=10, aneis=2)
    L.cano((-1.35, -1.75, PISO + 0.3), (-0.65, -1.75, PISO + 0.3), 0.05, 'metal_escuro')

    # Galpão das membranas (fundo) com as fileiras de tubos brancos à mostra na lateral aberta
    gx, gy, w, d, h = 0.4, 1.0, 4.4, 2.6, 1.15
    L.caixa((w, 0.15, h), (gx, gy + d / 2 - 0.08, PISO), 'parede', chanfro=0.03)    # parede do fundo
    L.caixa((0.15, d, h), (gx - w / 2 + 0.08, gy, PISO), 'parede', chanfro=0.03)    # lateral esquerda
    L.telhado(w + 0.2, d + 0.2, 0.32, (gx, gy, PISO + h), 'telhado_azul', eixo='X')
    for col in range(4):
        L.caixa((0.06, d - 0.4, 0.06), (gx - 1.5 + col * 1.0, gy, PISO + 0.05), 'metal_escuro')
        for row in range(3):
            z = PISO + 0.22 + row * 0.26
            L.cilindro(0.09, d - 0.5, (gx - 1.5 + col * 1.0, gy, z), 'parede', lados=6, rot=(90, 0, 0))
    # cano de água potável saindo das membranas (turquesa) e cano de salmoura (marrom)
    L.cano((gx - 1.9, gy - 1.0, PISO + 0.5), (gx + 2.0, gy - 1.0, PISO + 0.5), 0.06, 'agua')
    L.cano((-0.65, -1.4, PISO + 0.3), (-0.65, gy - 1.0, PISO + 0.5), 0.05, 'metal_escuro')
    L.cano((gx - 1.9, gy - 1.25, PISO + 0.15), (-2.9, gy - 1.25, PISO + 0.15), 0.05, 'marrom')

    # Reservatório de água potável (turquesa) à direita
    rx, ry = 2.1, -1.55
    L.tanque_redondo(0.75, 0.6, (rx, ry, PISO), 'agua', 'telhado_azul', lados=14, borda=0.07)
    L.cano((gx + 2.0, gy - 1.0, PISO + 0.5), (rx, ry + 0.75, PISO + 0.55), 0.06, 'agua')

    # Casa de bombas de alta pressão com faixa amarela e ventilador no telhado
    bx, by, bw, bd, bh = 0.35, -1.6, 1.1, 0.9, 0.62
    L.caixa((bw, bd, bh), (bx, by, PISO), 'parede', chanfro=0.03)
    L.caixa((bw + 0.01, bd + 0.01, 0.1), (bx, by, PISO + 0.36), 'amarelo')
    L.caixa((bw + 0.08, bd + 0.08, 0.06), (bx, by, PISO + bh), 'metal_escuro')
    L.placa(0.3, 0.36, (bx - 0.25, by - bd / 2, PISO), 'escuro', 'frente')
    L.placa(0.28, 0.14, (bx + 0.25, by - bd / 2, PISO + 0.38), 'vidro', 'frente')
    topo = PISO + bh + 0.06
    L.anel(0.26, 0.22, 0.08, (bx, by, topo), 'metal_escuro', lados=10)
    helice = [L.cilindro(0.04, 0.05, (bx, by, topo + 0.04), 'metal_escuro', lados=6)]
    for i in range(3):
        helice.append(L.caixa((0.4, 0.07, 0.02), (bx, by, topo + 0.06), 'metal', rot=(12, 0, 60 * i)))
    L.animar(helice, 'gira_1', (bx, by, topo + 0.04))

    # Muitos cabos de energia: dois postes e o transformador
    L.caixa((0.45, 0.4, 0.4), (-2.3, 0.6, PISO), 'amarelo', chanfro=0.02)
    for (x, y) in ((-2.5, 2.4), (-2.5, -0.4)):
        L.cano((x, y, PISO), (x, y, PISO + 1.4), 0.03, 'metal_escuro', lados=5)
        L.caixa((0.4, 0.05, 0.05), (x, y, PISO + 1.3), 'metal_escuro')
    L.cano((-2.5, 2.4, PISO + 1.32), (-2.5, -0.4, PISO + 1.32), 0.012, 'escuro', lados=3)

    L.arbusto((2.6, 2.6, PISO), 0.16, 'verde')
    L.arbusto((2.7, 0.2, PISO), 0.14, 'verde_escuro')


L.principal(__file__, construir)
