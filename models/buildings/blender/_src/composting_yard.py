"""Pátio de Compostagem (composting_yard, 2×2): folhas verdes e restos de poda chegando (frente-esquerda),
três leiras de composto que escurecem conforme amadurecem (do marrom-claro misturado com verde ao adubo
escuro pronto), galpão aberto com o adubo peneirado, sacos de adubo prontos e uma composteira rotativa
(tambor que gira em pé, "gira_1")."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.1


def leira(x, y, comp, larg, alt, cor):
    """Monte alongado de composto (perfil arredondado em x/z, estendido ao longo de Y)."""
    perfil = [(-larg / 2, 0), (larg / 2, 0), (larg * 0.36, alt * 0.6), (larg * 0.16, alt),
              (-larg * 0.16, alt), (-larg * 0.36, alt * 0.6)]
    return L.prisma(perfil, comp, (x, y, PISO), cor, eixo='Y', chanfro=0.03)


def saco(x, y, z, rot=0):
    L.caixa((0.26, 0.17, 0.11), (x, y, z), 'creme', rot=(0, 0, rot))
    L.caixa((0.27, 0.06, 0.112), (x, y, z), 'verde', rot=(0, 0, rot))


def construir():
    L.caixa((4.0, 4.0, PISO), (0, 0, 0), 'grama', chanfro=0.03)
    L.caixa((3.5, 3.5, 0.02), (0.05, 0.05, PISO), 'areia')  # pátio de terra batida
    p = PISO + 0.02

    # Folhas e restos de poda chegando (frente-esquerda) + carrinho de mão
    for (x, y, r, cor) in ((-1.35, -1.25, 0.32, 'folha'), (-0.95, -1.4, 0.24, 'verde'),
                           (-1.45, -0.85, 0.22, 'verde_escuro')):
        L.esfera(r, (x, y, p + r * 0.3), cor, escala=(1.2, 1, 0.6))
    L.cano((-0.7, -1.0, p + 0.08), (-1.05, -0.75, p + 0.08), 0.025, 'madeira_escura', lados=4)  # galho
    L.caixa((0.32, 0.22, 0.12), (-0.35, -1.35, p + 0.12), 'cano', rot=(0, 0, 20))  # carrinho
    L.caixa((0.22, 0.14, 0.03), (-0.35, -1.35, p + 0.22), 'folha', rot=(0, 0, 20))
    L.cilindro(0.07, 0.03, (-0.2, -1.4, p + 0.07), 'escuro', lados=6, rot=(90, 0, 20))
    L.cano((-0.5, -1.29, p + 0.15), (-0.62, -1.24, p + 0.03), 0.015, 'metal_escuro', lados=4)

    # Três leiras: fresca (com verde) → maturando → pronta (escura)
    leira(-1.2, 0.75, 1.9, 0.75, 0.42, 'terra')
    for (dx, dy) in ((-0.1, 0.2), (0.08, 1.2), (-0.05, 0.65), (0.1, -0.1)):
        L.caixa((0.12, 0.1, 0.05), (-1.2 + dx, dy + 0.15, p + 0.36), 'folha', rot=(0, 0, 40 * dy))
    leira(-0.3, 0.75, 1.9, 0.75, 0.42, 'madeira_escura')
    leira(0.6, 0.85, 1.7, 0.7, 0.38, 'composto')
    # termômetro espetado na leira do meio (o calor mostra que está compostando)
    L.cano((-0.3, 0.0, p + 0.3), (-0.3, 0.0, p + 0.6), 0.015, 'metal', lados=4)
    L.cilindro(0.04, 0.04, (-0.3, 0.0, p + 0.6), 'vermelho', lados=6)

    # Galpão aberto (fundo-direita) com adubo peneirado
    gx, gy, w, d = 1.45, 1.15, 0.95, 1.4
    for (sx, sy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        L.caixa((0.06, 0.06, 0.62), (gx + sx * (w / 2 - 0.04), gy + sy * (d / 2 - 0.04), p), 'madeira')
    L.telhado(w, d, 0.3, (gx, gy, p + 0.62), 'telhado_vermelho', beiral=0.08, eixo='Y')
    L.caixa((w - 0.1, 0.05, 0.3), (gx, gy + d / 2 - 0.06, p), 'madeira_escura')  # parede de fundo baixa
    L.cone(0.35, 0.3, (gx, gy + 0.15, p), 'composto', lados=7)

    # Sacos de adubo prontos (frente-direita do galpão)
    saco(1.35, 0.15, p)
    saco(1.65, 0.15, p)
    saco(1.5, 0.15, p + 0.11, 10)
    saco(1.5, -0.12, p, -8)

    # Composteira rotativa (frente-direita): base fixa + tambor que gira em pé
    tx, ty = 0.9, -1.0
    L.cilindro(0.38, 0.08, (tx, ty, p), 'concreto_escuro', lados=8)
    L.cano((tx, ty, p + 0.08), (tx, ty, p + 0.22), 0.06, 'metal_escuro', lados=6)
    z0 = p + 0.2
    pecas = [L.cilindro(0.34, 0.5, (tx, ty, z0), 'verde_garrafa', lados=8, chanfro=0.02)]
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 8
        pecas.append(L.caixa((0.06, 0.04, 0.54), (tx + 0.33 * math.cos(a), ty + 0.33 * math.sin(a), z0 - 0.02),
                             'metal_escuro', rot=(0, 0, math.degrees(a))))
    pecas.append(L.caixa((0.04, 0.2, 0.2), (tx + 0.33 * math.cos(math.pi * 1.375), ty + 0.33 *
                                             math.sin(math.pi * 1.375), z0 + 0.15), 'composto',
                         rot=(0, 0, math.degrees(math.pi * 1.375))))  # portinhola com composto
    pecas.append(L.cilindro(0.2, 0.08, (tx, ty, z0 + 0.5), 'metal', lados=8, r_topo=0.26))  # boca de carga
    L.animar(pecas, 'gira_1', (tx, ty, z0))
    L.cone(0.2, 0.12, (tx + 0.55, ty - 0.1, p), 'composto', lados=6)  # composto saindo do tambor

    # Verde em volta
    L.arbusto((1.7, -1.7, PISO), 0.16, 'verde_escuro')
    L.arvore((-1.7, 1.75, PISO), 1.0, 'verde_escuro')
    L.arbusto((0.1, -1.75, PISO), 0.14, 'verde')


L.principal(__file__, construir)
