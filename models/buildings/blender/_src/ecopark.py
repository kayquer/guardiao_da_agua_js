"""Ecoparque (ecopark, 3×3): central de tratamento avançado de resíduos. Galpão de triagem automatizada com
telhado de painéis solares e lixeiras coloridas na entrada, biodigestor pequeno com cúpula, pátio de
compostagem com leiras, área verde com árvores e um aerogerador pequeno (rotor "pas_1"): o lixo vira
material reciclado, adubo e energia."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.08


def construir():
    L.caixa((6.0, 6.0, PISO), (0, 0, 0), 'concreto', chanfro=0.02)
    # área verde (fundo à direita) e faixa de grama na frente
    L.caixa((2.7, 2.5, 0.02), (1.55, 1.6, PISO), 'grama')
    L.caixa((5.6, 0.35, 0.02), (0, -2.7, PISO), 'grama')

    # 1) Galpão de triagem automatizada (frente à esquerda)
    gx, gy, w, d, h = -1.25, -1.0, 3.0, 2.0, 0.95
    L.caixa((w, d, h), (gx, gy, PISO), 'parede', chanfro=0.03)
    L.caixa((w + 0.01, d + 0.01, 0.1), (gx, gy, PISO + 0.12), 'telhado_verde')  # rodapé verde
    frente = gy - d / 2
    L.placa(w - 0.3, 0.22, (gx, frente, PISO + h - 0.12), 'vidro', 'frente')    # faixa de vidro contínua
    L.placa(d - 0.4, 0.22, (gx + w / 2, gy, PISO + h - 0.12), 'vidro', 'direita')
    # portões de entrada dos caminhões e da esteira
    L.placa(0.6, 0.55, (gx - 0.8, frente, PISO + 0.6), 'metal_escuro', 'frente')
    L.placa(0.6, 0.55, (gx + 0.1, frente, PISO + 0.6), 'metal_escuro', 'frente')
    L.placa(0.3, 0.45, (gx + 1.05, frente, PISO + 0.5), 'vidro_escuro', 'frente')
    # telhado plano com painéis solares inclinados
    topo = PISO + h
    L.caixa((w + 0.1, d + 0.1, 0.06), (gx, gy, topo), 'metal_escuro')
    for i in range(4):
        L.caixa((w - 0.5, 0.34, 0.035), (gx, gy - 0.66 + i * 0.44, topo + 0.1), 'painel_solar', rot=(15, 0, 0))
        L.caixa((w - 0.5, 0.04, 0.1), (gx, gy - 0.5 + i * 0.44, topo + 0.06), 'metal')  # suporte
    # esteira saindo do galpão com fardos de reciclável prensado
    L.caixa((0.25, 0.9, 0.05), (gx + w / 2 + 0.25, gy - 0.3, PISO + 0.25), 'escuro')
    for k, cor in enumerate(('telhado_azul', 'vermelho', 'amarelo')):
        L.caixa((0.24, 0.24, 0.22), (gx + w / 2 + 0.3, gy + 0.55 + k * 0.3, PISO), cor, chanfro=0.015)
    # lixeiras coletivas coloridas na frente
    for k, cor in enumerate(('telhado_azul', 'vermelho', 'amarelo', 'verde_garrafa', 'marrom')):
        bx = gx - 1.1 + k * 0.32
        L.caixa((0.24, 0.24, 0.28), (bx, frente - 0.35, PISO), cor, chanfro=0.015)

    # 2) Biodigestor pequeno com cúpula (fundo à esquerda)
    dx, dy = -1.75, 1.75
    L.cilindro(0.7, 0.4, (dx, dy, PISO), 'concreto_escuro', lados=12, chanfro=0.02)
    L.cupula(0.68, (dx, dy, PISO + 0.4), 'lona_verde', lados=12, aneis=3)
    L.cano((dx, dy, PISO + 1.0), (dx, dy, PISO + 1.25), 0.04, 'amarelo')
    L.cano((dx, dy, PISO + 1.25), (dx + 1.1, dy, PISO + 1.25), 0.04, 'amarelo')
    L.cano((dx + 1.1, dy, PISO + 1.25), (dx + 1.1, dy, PISO), 0.04, 'amarelo')
    # pequeno gerador ao lado (faixa amarela)
    L.caixa((0.55, 0.45, 0.4), (dx + 1.1, dy - 0.4, PISO), 'parede', chanfro=0.02)
    L.caixa((0.56, 0.46, 0.08), (dx + 1.1, dy - 0.4, PISO + 0.24), 'amarelo')

    # 3) Pátio de compostagem com leiras (frente à direita)
    cx, cy = 1.65, -1.15
    L.caixa((2.4, 1.9, 0.04), (cx, cy, PISO), 'concreto_escuro')
    perfil = [(-0.28, 0), (0.28, 0), (0.12, 0.28), (-0.12, 0.28)]
    for k, cor in enumerate(('folha', 'terra', 'composto')):
        L.prisma(perfil, 1.7, (cx - 0.65 + k * 0.65, cy, PISO + 0.04), cor, eixo='Y')
    # carrinho / pá carregadeira pequena
    L.caixa((0.35, 0.22, 0.18), (cx + 0.5, cy - 1.15, PISO), 'amarelo', chanfro=0.02)
    L.caixa((0.15, 0.18, 0.14), (cx + 0.42, cy - 1.15, PISO + 0.18), 'vidro')

    # 4) Aerogerador pequeno (no gramado do fundo)
    tx, ty = 2.25, 0.55
    L.cilindro(0.18, 0.06, (tx, ty, PISO + 0.02), 'concreto', lados=8)
    L.cilindro(0.08, 2.5, (tx, ty, PISO + 0.08), 'parede', lados=8, r_topo=0.05)
    L.caixa((0.13, 0.32, 0.13), (tx, ty + 0.04, PISO + 2.52), 'parede', chanfro=0.02)
    L.rotor((tx, ty - 0.14, PISO + 2.6), 0.85, 'parede', 'metal', nome='pas_1')

    # 5) Árvores e caminho no gramado
    for (x, y, a, c, t) in ((0.6, 2.4, 1.0, 'verde', 'redonda'), (1.3, 2.5, 0.85, 'verde_escuro', 'pinheiro'),
                            (2.4, 2.35, 1.1, 'verde', 'redonda'), (0.7, 1.4, 0.8, 'folha', 'redonda'),
                            (1.6, 1.3, 0.75, 'verde_escuro', 'pinheiro'), (-2.6, 0.5, 0.8, 'verde', 'redonda')):
        L.arvore((x, y, PISO + 0.02), a, c, tipo=t)
    L.caixa((0.3, 2.4, 0.03), (0.15, 1.6, PISO), 'areia')
    for (x, y) in ((-2.6, -2.7), (2.5, -2.7), (-0.2, -2.7)):
        L.arbusto((x, y, PISO + 0.02), 0.15, 'verde')


L.principal(__file__, construir)
