"""Estação de Tratamento de Esgoto — ETE (treatment_plant, 2×2): esgoto marrom chega pela grade → tanque de
aeração (bolhas: as bactérias comem a sujeira) → decantador redondo com a ponte raspadora girando (gira_1) →
água limpa saindo pelo cano da direita de volta ao rio. Leitos de secagem do lodo no fundo e prédio de controle
de telhado verde (a ETA, de água, tem telhado azul). A cor da água clareia a cada etapa."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((4.0, 4.0, 0.1), (0, 0, 0), 'concreto', chanfro=0.03)
    piso = 0.1

    # 1) Chegada do esgoto (marrom) pela esquerda: canal com a grade que segura o lixo grande
    L.cano((-2.0, -1.45, piso + 0.18), (-1.75, -1.45, piso + 0.18), 0.09, 'metal_escuro', lados=8)
    L.tanque(0.5, 0.36, 0.3, (-1.5, -1.45, piso), 'chorume', 'concreto_escuro', parede=0.06)
    for i in range(5):
        L.caixa((0.025, 0.25, 0.24), (-1.36, -1.55 + i * 0.05, piso + 0.06), 'metal_escuro')

    # 2) Tanque de aeração comprido (esgoto marrom-esverdeado) com bolhas brancas subindo
    L.tanque(1.7, 0.85, 0.42, (-0.3, -1.25, piso), 'agua_suja', 'concreto', parede=0.08)
    for x, y in ((-0.95, -1.4), (-0.6, -1.1), (-0.3, -1.42), (0.0, -1.08), (0.3, -1.35), (-0.45, -1.28), (0.15, -1.2)):
        L.esfera(0.05, (x, y, piso + 0.37), 'parede', sub=1)
    L.caixa((1.75, 0.1, 0.04), (-0.3, -0.78, piso + 0.42), 'metal_escuro')  # passarela
    L.cilindro(0.08, 0.3, (0.75, -1.6, piso), 'amarelo', lados=8)          # soprador de ar
    L.cano((0.75, -1.6, piso + 0.3), (0.55, -1.6, piso + 0.3), 0.04, 'metal', lados=6)

    # 3) Decantador redondo (água clareando) com ponte raspadora que gira devagar no centro
    dx, dy = 1.15, -0.55
    L.tanque_redondo(0.78, 0.38, (dx, dy, piso), 'agua', 'concreto', lados=16)
    L.cilindro(0.1, 0.42, (dx, dy, piso), 'concreto_escuro', lados=8)  # pilar central
    ponte = [
        L.caixa((0.76, 0.12, 0.05), (dx + 0.38, dy, piso + 0.42), 'amarelo'),
        L.caixa((0.06, 0.16, 0.14), (dx + 0.72, dy, piso + 0.3), 'metal_escuro'),  # rodinha na borda
        L.cilindro(0.12, 0.06, (dx, dy, piso + 0.42), 'metal', lados=8)
    ]
    L.animar(ponte, 'gira_1', (dx, dy, piso + 0.42))
    L.cano((0.55, -1.0, piso + 0.22), (dx - 0.62, dy - 0.3, piso + 0.22), 0.05, 'metal_escuro', lados=6)

    # 4) Saída de água limpa (turquesa) pela direita, de volta ao rio
    L.cano((dx + 0.7, dy + 0.35, piso + 0.18), (2.0, dy + 0.35, piso + 0.18), 0.08, 'cano', lados=8)
    L.caixa((0.18, 0.3, 0.06), (1.95, dy + 0.35, piso), 'agua')

    # 5) Leitos de secagem do lodo (terra escura) no fundo à esquerda
    for i in range(3):
        L.tanque(0.5, 0.7, 0.12, (-1.55 + i * 0.55, 0.35, piso), 'composto', 'concreto_escuro', parede=0.05, nivel=0.04)

    # 6) Prédio de controle no fundo (janelas, telhado verde) e laboratório
    bx, by, w, d, h = -0.35, 1.35, 2.2, 1.0, 0.85
    L.caixa((w, d, h), (bx, by, piso), 'parede', chanfro=0.03)
    L.caixa((w + 0.1, d + 0.1, 0.1), (bx, by, piso + h), 'telhado_verde', chanfro=0.02)
    frente = by - d / 2
    L.janelas('frente', frente, piso + 0.5, bx - 0.9, bx + 0.9, 5, 0.24, 0.26)
    L.placa(0.32, 0.42, (bx + 0.1, frente, piso + 0.2), 'escuro', 'frente')
    L.janelas('direita', bx + w / 2, piso + 0.5, by - 0.25, by + 0.25, 2, 0.24, 0.26)
    L.placa(0.85, 0.15, (bx, frente, piso + h - 0.05), 'agua', 'frente')  # letreiro
    L.cilindro(0.05, 0.3, (bx + 0.8, by, piso + h + 0.1), 'metal_escuro', lados=6)

    # Árvore na lateral direita do fundo
    L.arvore((1.55, 1.2, piso), 1.0, 'verde')
    L.arbusto((1.45, 0.55, piso), 0.16, 'verde_escuro')


L.principal(__file__, construir)
