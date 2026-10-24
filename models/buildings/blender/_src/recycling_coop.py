"""Cooperativa de Reciclagem (recycling_coop, 2×2): galpão de telhado em arco com a frente aberta mostrando a
esteira de triagem (funil → esteira com recicláveis coloridos → prensa), fardos prensados empilhados no pátio
(papel, plástico, latas), o caminhãozinho da coleta seletiva e um exaustor eólico no telhado ("gira_1")."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.1


def arco(meia, alt, esp, comp, pos, cor, n=6, nome='arco'):
    """Casca em arco (abóbada) com o perfil em (x, z), estendida ao longo de Y."""
    fora = [(meia * math.cos(math.pi * k / n), alt * math.sin(math.pi * k / n)) for k in range(n + 1)]
    dentro = [((meia - esp) * math.cos(math.pi * k / n), (alt - esp) * math.sin(math.pi * k / n))
              for k in range(n, -1, -1)]
    return L.prisma(fora + dentro, comp, pos, cor, eixo='Y', nome=nome)


def fardo(x, y, z, cor, faixa='escuro'):
    """Fardo prensado: cubo colorido com duas cintas."""
    L.caixa((0.34, 0.3, 0.28), (x, y, z), cor)
    L.caixa((0.35, 0.31, 0.04), (x, y, z + 0.12), faixa)


def caminhao(x, y):
    """Caminhãozinho da coleta seletiva, de lado (ao longo de X), cabine para +X."""
    for dx in (-0.45, 0.35):
        for dy in (-0.2, 0.2):
            L.cilindro(0.11, 0.08, (x + dx, y + dy - 0.04 * (1 if dy > 0 else -1), PISO + 0.11), 'escuro',
                       lados=8, rot=(90, 0, 0))
    L.caixa((1.2, 0.36, 0.08), (x, y, PISO + 0.1), 'escuro')
    L.caixa((0.78, 0.46, 0.5), (x - 0.18, y, PISO + 0.18), 'verde')  # caçamba
    L.caixa((0.79, 0.47, 0.08), (x - 0.18, y, PISO + 0.4), 'parede')  # faixa
    L.caixa((0.32, 0.44, 0.42), (x + 0.42, y, PISO + 0.18), 'parede')  # cabine
    L.placa(0.26, 0.16, (x + 0.42, y - 0.22, PISO + 0.52), 'vidro_escuro', 'frente')
    L.placa(0.3, 0.16, (x + 0.58, y, PISO + 0.52), 'vidro_escuro', 'direita')
    # recicláveis aparecendo por cima da caçamba
    L.caixa((0.18, 0.14, 0.1), (x - 0.35, y + 0.05, PISO + 0.68), 'telhado_azul', rot=(0, 0, 20))
    L.caixa((0.14, 0.14, 0.1), (x - 0.08, y - 0.05, PISO + 0.68), 'amarelo', rot=(0, 0, -15))


def construir():
    L.caixa((4.0, 4.0, PISO), (0, 0, 0), 'concreto', chanfro=0.03)

    # Galpão: paredes laterais baixas + abóbada; frente aberta
    gx, gy, larg, comp = -0.5, 1.0, 2.8, 1.7
    x0, x1 = gx - larg / 2, gx + larg / 2
    L.caixa((0.12, comp, 0.7), (x0 + 0.06, gy, PISO), 'creme', chanfro=0.02)
    L.caixa((0.12, comp, 0.7), (x1 - 0.06, gy, PISO), 'creme', chanfro=0.02)
    L.caixa((larg, 0.1, 0.7), (gx, gy + comp / 2 - 0.05, PISO), 'creme')
    L.prisma([(1.4 * math.cos(math.pi * k / 6), 0.8 * math.sin(math.pi * k / 6)) for k in range(7)], 0.06,
             (gx, gy + comp / 2 - 0.05, PISO + 0.7), 'creme', eixo='Y')  # fundo fechado
    arco(1.48, 0.86, 0.07, comp, (gx, gy + 0.05, PISO + 0.68), 'telhado_verde')
    L.janelas('direita', x1, PISO + 0.42, gy - 0.6, gy + 0.6, 3, 0.36, 0.22, moldura='parede')

    # Triagem: funil → esteira com recicláveis → prensa
    ey = 0.45
    L.caixa((2.0, 0.34, 0.06), (-0.55, ey, PISO + 0.34), 'escuro')
    L.caixa((2.04, 0.38, 0.04), (-0.55, ey, PISO + 0.3), 'metal_escuro')
    for x in (-1.45, -0.55, 0.35):
        for dy in (-0.14, 0.14):
            L.caixa((0.05, 0.05, 0.3), (x, ey + dy, PISO), 'metal_escuro')
    L.cilindro(0.3, 0.32, (-1.55, ey, PISO + 0.4), 'amarelo', lados=6, r_topo=0.4)  # funil
    cores = ('telhado_azul', 'vermelho', 'amarelo', 'verde_garrafa', 'telhado_azul', 'vermelho', 'metal')
    for i, cor in enumerate(cores):
        L.caixa((0.12, 0.13, 0.08), (-1.15 + i * 0.22, ey + (0.05 if i % 2 else -0.05), PISO + 0.4), cor,
                rot=(0, 0, 25 * (i % 3)))
    # caixas de separação na frente da esteira (cada cor numa caixa)
    for i, cor in enumerate(('telhado_azul', 'vermelho', 'amarelo', 'verde_garrafa')):
        L.caixa((0.3, 0.26, 0.2), (-1.3 + i * 0.42, ey - 0.4, PISO), cor)
    L.caixa((0.45, 0.45, 0.62), (0.45, ey + 0.35, PISO), 'metal_escuro', chanfro=0.03)  # prensa
    L.caixa((0.47, 0.47, 0.1), (0.45, ey + 0.35, PISO + 0.4), 'amarelo')
    fardo(0.45, ey - 0.25, PISO, 'telhado_azul')

    # Pátio de fardos (direita): papel, plástico, latas
    for i, (x, y) in enumerate(((1.25, 1.35), (1.65, 1.35), (1.25, 0.95), (1.65, 0.95))):
        cor = ('creme', 'vermelho', 'metal', 'telhado_azul')[i]
        fardo(x, y, PISO, cor)
        fardo(x, y, PISO + 0.28, cor)
    fardo(1.45, 0.45, PISO, 'amarelo')
    fardo(1.62, -0.05, PISO, 'verde_garrafa')

    # Caminhão da coleta na frente
    caminhao(-0.6, -1.4)

    # Exaustor eólico no alto da abóbada (gira em pé)
    fx, fy, fz = -0.5, 1.05, PISO + 0.68 + 0.86
    L.cilindro(0.1, 0.1, (fx, fy, fz - 0.04), 'metal_escuro', lados=8)
    pecas = [L.cupula(0.17, (fx, fy, fz + 0.2), 'metal', lados=8, aneis=2)]
    for k in range(6):
        pecas.append(L.caixa((0.03, 0.15, 0.18), (fx + 0.13 * math.cos(k * math.pi / 3),
                                                   fy + 0.13 * math.sin(k * math.pi / 3), fz + 0.04), 'metal',
                             rot=(0, 0, math.degrees(k * math.pi / 3) + 30)))
    pecas.append(L.cilindro(0.16, 0.03, (fx, fy, fz + 0.03), 'metal', lados=8))
    L.animar(pecas, 'gira_1', (fx, fy, fz))

    # Verde em volta
    L.arvore((1.6, -1.45, PISO), 0.9, 'verde')
    L.arbusto((-1.75, -0.4, PISO), 0.16, 'verde_escuro')
    L.arbusto((1.1, -1.7, PISO), 0.12, 'verde')


L.principal(__file__, construir)
