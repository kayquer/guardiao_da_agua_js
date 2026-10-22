"""Universidade (university, 3×3): prédio principal em U com pórtico de colunas, torre do relógio,
telhados de telha, frontão e torre roxos, gramado com caminho, árvores e mastro."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((6.0, 6.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    piso = 0.08
    L.caixa((0.8, 2.6, 0.03), (0, -1.6, piso), 'piso')       # caminho até a entrada
    L.caixa((4.6, 0.5, 0.03), (0, -0.25, piso), 'piso')      # calçada ao longo do prédio
    piso2 = piso + 0.03

    # Bloco central (2 andares + ático) e alas laterais avançadas (U)
    cy, cw, cd, ch = 1.15, 2.6, 1.6, 1.35
    L.caixa((cw, cd, ch), (0, cy, piso2), 'creme', chanfro=0.03)
    L.caixa((cw + 0.06, cd + 0.06, 0.1), (0, cy, piso2 + ch), 'parede')
    L.telhado4(cw, cd, 0.5, (0, cy, piso2 + ch + 0.1), 'telhado_vermelho', beiral=0.06)
    for x in (-1.85, 1.85):
        L.caixa((1.1, 2.9, 1.1), (x, 0.55, piso2), 'creme', chanfro=0.03)
        L.caixa((1.16, 2.96, 0.08), (x, 0.55, piso2 + 1.1), 'parede')
        L.telhado4(1.1, 2.9, 0.45, (x, 0.55, piso2 + 1.18), 'telhado_vermelho', beiral=0.06)
        # janelas da frente (testa da ala) e laterais internas
        L.janelas('frente', 0.55 - 1.45, piso2 + 0.35, x - 0.35, x + 0.35, 2, 0.22, 0.28, moldura='parede')
        L.janelas('frente', 0.55 - 1.45, piso2 + 0.8, x - 0.35, x + 0.35, 2, 0.22, 0.28, moldura='parede')
    L.janelas('direita', 1.85 + 0.55, piso2 + 0.35, -0.6, 1.7, 4, 0.22, 0.28, moldura='parede')
    L.janelas('direita', 1.85 + 0.55, piso2 + 0.8, -0.6, 1.7, 4, 0.22, 0.28, moldura='parede')
    frente = cy - cd / 2
    L.janelas('frente', frente, piso2 + 1.0, -1.0, 1.0, 5, 0.2, 0.3, moldura='parede')

    # Pórtico de colunas e frontão roxo na entrada
    for i, (lw, ly) in enumerate(((1.7, 0.7), (1.55, 0.55))):
        L.caixa((lw, ly, 0.07), (0, frente - ly / 2 + 0.05, piso2 + i * 0.07), 'parede')
    for x in (-0.6, -0.2, 0.2, 0.6):
        L.cilindro(0.07, 0.68, (x, frente - 0.3, piso2 + 0.14), 'parede', lados=8)
    L.caixa((1.5, 0.5, 0.1), (0, frente - 0.2, piso2 + 0.82), 'parede')
    L.telhado(1.5, 0.5, 0.34, (0, frente - 0.15, piso2 + 0.92), 'telhado_vermelho', beiral=0.05, eixo='Y')
    L.prisma([(-0.78, 0), (0.78, 0), (0, 0.34)], 0.05, (0, frente - 0.475, piso2 + 0.92), 'parede', eixo='Y')
    L.prisma([(-0.58, 0.05), (0.58, 0.05), (0, 0.27)], 0.04, (0, frente - 0.515, piso2 + 0.92), 'roxo', eixo='Y')
    L.placa(0.45, 0.55, (0, frente, piso2 + 0.42), 'madeira_escura', 'frente')
    # Torre do relógio central
    ty = cy + 0.2
    L.caixa((0.6, 0.6, 1.0), (0, ty, piso2 + ch + 0.3), 'creme', chanfro=0.02)
    L.caixa((0.68, 0.68, 0.08), (0, ty, piso2 + ch + 1.3), 'parede')
    L.cilindro(0.2, 0.03, (0, ty - 0.3, piso2 + ch + 1.0), 'parede', lados=10, rot=(90, 0, 0))
    L.caixa((0.03, 0.02, 0.14), (0, ty - 0.335, piso2 + ch + 0.98), 'escuro')
    L.caixa((0.11, 0.02, 0.03), (0.04, ty - 0.335, piso2 + ch + 0.98), 'escuro')
    L.telhado4(0.6, 0.6, 0.55, (0, ty, piso2 + ch + 1.38), 'roxo_escuro', beiral=0.05)

    # Gramado: árvores, bancos e mastro
    for (x, y, s, cor) in ((-1.6, -2.1, 1.0, 'verde'), (1.6, -2.1, 1.1, 'verde_escuro'),
                           (-2.5, -1.2, 0.9, 'folha'), (2.5, -1.2, 0.9, 'verde'), (-2.5, 2.5, 1.0, 'verde')):
        L.arvore((x, y, piso), s, cor)
    for x in (-0.75, 0.75):
        L.caixa((0.18, 0.55, 0.06), (x, -1.9, piso + 0.12), 'madeira')
        L.caixa((0.16, 0.06, 0.12), (x, -2.1, piso), 'metal_escuro')
        L.caixa((0.16, 0.06, 0.12), (x, -1.7, piso), 'metal_escuro')
    L.cano((0.75, -0.75, piso), (0.75, -0.75, piso + 1.6), 0.025, 'metal', lados=5)
    L.caixa((0.04, 0.45, 0.28), (0.75, -0.53, piso + 1.28), 'roxo')


L.principal(__file__, construir)
