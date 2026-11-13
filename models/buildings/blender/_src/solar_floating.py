"""Usina Solar Flutuante (solar_floating, 3×3, sobre a água): fileiras de painéis sobre flutuadores brancos no
reservatório, em grade, com passarelas e água à vista entre as fileiras; boias amarelas ancoram os blocos, uma
plataforma flutuante com o inversor (faixa amarela) junta a energia e um cabo com boinhas leva até a margem.
Os painéis fazem sombra na água e ela evapora menos."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

AGUA = 0.12
FLUT = 0.05  # altura dos flutuadores


def fileira(x0, x1, y):
    """Flutuador comprido + mesa de painéis pouco inclinada (frente baixa)."""
    xc, larg = (x0 + x1) / 2, x1 - x0
    L.caixa((larg, 0.5, FLUT), (xc, y, AGUA - 0.02), 'parede')
    L.caixa((larg - 0.08, 0.4, 0.035), (xc, y + 0.02, AGUA + FLUT + 0.03), 'painel_solar', rot=(14, 0, 0))
    for i in range(1, 4):
        L.caixa((0.02, 0.4, 0.04), (x0 + 0.04 + i * (larg - 0.08) / 4, y + 0.02, AGUA + FLUT + 0.031), 'vidro',
                rot=(14, 0, 0))


def boia(x, y, ax, ay):
    L.cilindro(0.08, 0.12, (x, y, AGUA - 0.03), 'amarelo', lados=6)
    L.cone(0.06, 0.08, (x, y, AGUA + 0.09), 'laranja', lados=6)
    L.cano((x, y, AGUA + 0.01), (ax, ay, AGUA + 0.03), 0.01, 'escuro', lados=3)


def construir():
    # Reservatório e a margem de grama no fundo
    L.caixa((6.0, 5.55, AGUA), (0, -0.225, 0), 'agua')
    L.caixa((6.0, 0.45, 0.32), (0, 2.775, 0), 'grama', chanfro=0.02)
    L.caixa((6.0, 0.08, 0.26), (0, 2.51, 0), 'terra')

    # Dois blocos de fileiras, com água entre elas, e passarelas ligando as fileiras
    ys = (-2.2, -1.5, -0.8, -0.1, 0.6, 1.3)
    blocos = ((-2.65, -0.35), (0.35, 2.65))
    for (x0, x1) in blocos:
        for y in ys:
            fileira(x0, x1, y)
        # passarela lateral (flutuadores) de ponta a ponta
        xp = x1 + 0.12 if x0 < 0 else x0 - 0.12
        L.caixa((0.2, ys[-1] - ys[0] + 0.5, FLUT * 0.8), (xp, (ys[0] + ys[-1]) / 2, AGUA - 0.02), 'concreto')
    # passarela central ligando os dois blocos à plataforma do inversor
    L.caixa((0.2, 0.75, FLUT * 0.8), (0.0, 1.95, AGUA - 0.02), 'concreto')

    # Boias de ancoragem nos cantos
    for (x, y, ax, ay) in ((-2.85, -2.7, -2.6, -2.4), (2.85, -2.7, 2.6, -2.4), (-2.85, 1.85, -2.6, 1.5),
                           (2.85, 1.85, 2.6, 1.5), (0.0, -2.75, 0.0, -2.45)):
        boia(x, y, ax, ay)

    # Plataforma flutuante do inversor (faixa amarela) atrás, no meio
    px, py = 0.0, 2.05
    L.caixa((1.0, 0.6, FLUT + 0.03), (px + 0.8, py, AGUA - 0.02), 'concreto', chanfro=0.01)
    L.caixa((0.55, 0.38, 0.36), (px + 0.85, py, AGUA + FLUT + 0.01), 'parede', chanfro=0.02)
    L.caixa((0.551, 0.381, 0.08), (px + 0.85, py, AGUA + FLUT + 0.24), 'amarelo')
    L.caixa((0.6, 0.43, 0.04), (px + 0.85, py, AGUA + FLUT + 0.37), 'metal_escuro')
    L.placa(0.16, 0.18, (px + 0.73, py - 0.19, AGUA + FLUT + 0.21), 'metal', 'frente')
    L.prisma([(-0.035, 0.0), (0.026, 0.06), (0.0, 0.06), (0.04, 0.12), (-0.016, 0.06), (0.009, 0.06)], 0.02,
             (px + 1.0, py - 0.2, AGUA + FLUT + 0.06), 'escuro', eixo='Y')

    # Cabo até a margem (com boinhas) e poste com a caixa de ligação na terra
    L.cano((px + 1.15, py + 0.1, AGUA + 0.03), (px + 1.55, 2.6, 0.3), 0.025, 'escuro', lados=4)
    for t in (0.35, 0.7):
        L.esfera(0.05, (px + 1.15 + 0.4 * t, py + 0.1 + (2.6 - py - 0.1) * t, AGUA + 0.02 + 0.27 * t * t), 'laranja')
    qx, qy = px + 1.7, 2.8
    L.caixa((0.3, 0.22, 0.3), (qx, qy, 0.32), 'parede', chanfro=0.015)
    L.caixa((0.301, 0.221, 0.06), (qx, qy, 0.5), 'amarelo')
    L.cano((qx + 0.35, qy, 0.32), (qx + 0.35, qy, 1.3), 0.03, 'madeira_escura', lados=5)
    L.caixa((0.4, 0.04, 0.04), (qx + 0.35, qy, 1.2), 'madeira_escura')
    L.cano((qx + 0.15, qy, 0.6), (qx + 0.35, qy, 1.2), 0.01, 'escuro', lados=3)
    # Árvores na margem
    L.arvore((-2.3, 2.8, 0.32), 0.7, 'verde')
    L.arvore((-1.2, 2.85, 0.32), 0.6, 'verde_escuro', tipo='pinheiro')
    L.arbusto((2.6, 2.75, 0.32), 0.14, 'verde')


L.principal(__file__, construir)
