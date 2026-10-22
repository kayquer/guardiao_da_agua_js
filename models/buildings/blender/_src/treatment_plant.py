"""Estação de Tratamento de Água (treatment_plant, 2×2): água bruta → floculação → decantadores →
filtros de areia → reservatório de água tratada, com prédio de controle. A cor da água muda a cada etapa."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((4.0, 4.0, 0.1), (0, 0, 0), 'concreto', chanfro=0.03)
    piso = 0.1

    # 1) Chegada de água bruta (esverdeada) pela esquerda + tanque de floculação com misturadores
    L.cano((-2.0, -1.25, piso + 0.25), (-1.55, -1.25, piso + 0.25), 0.09, 'agua_suja', lados=8)
    L.tanque(0.75, 0.9, 0.4, (-1.15, -1.25, piso), 'agua_suja', 'concreto_escuro', parede=0.08)
    for dy in (-0.2, 0.2):
        L.cano((-1.15, -1.25 + dy, piso + 0.35), (-1.15, -1.25 + dy, piso + 0.62), 0.025, 'metal_escuro', lados=4)
        L.caixa((0.12, 0.12, 0.08), (-1.15, -1.25 + dy, piso + 0.6), 'amarelo')  # motor do misturador

    # 2) Dois decantadores compridos (água clareando) com passarela no meio
    L.tanque(1.9, 0.62, 0.4, (0.2, -1.52, piso), 'agua', 'concreto', parede=0.08)
    L.tanque(1.9, 0.62, 0.4, (0.2, -0.88, piso), 'agua', 'concreto', parede=0.08)
    # placas inclinadas (lamelas) aparecendo num deles
    for i in range(5):
        L.caixa((0.05, 0.46, 0.04), (-0.45 + i * 0.16, -0.88, piso + 0.31), 'parede', rot=(0, 30, 0))
    L.caixa((1.95, 0.12, 0.04), (0.2, -1.2, piso + 0.4), 'metal_escuro')  # passarela
    L.cano((-0.78, -1.25, piso + 0.3), (-0.73, -1.25, piso + 0.3), 0.06, 'agua')

    # 3) Filtros de areia (três células: areia, areia com água e água limpa)
    fy = 0.0
    for i, cor in enumerate(('areia', 'agua', 'areia')):
        L.tanque(0.55, 0.6, 0.35, (-1.2 + i * 0.6, fy, piso), cor, 'concreto', parede=0.07, nivel=0.1)
    L.caixa((1.75, 0.1, 0.05), (-0.6, fy - 0.36, piso + 0.12), 'cano')  # canaleta

    # 4) Reservatório redondo de água tratada (azul) e casa de química
    rx, ry = 1.25, 0.15
    L.cilindro(0.72, 0.85, (rx, ry, piso), 'parede', lados=14, chanfro=0.02)
    L.cilindro(0.73, 0.14, (rx, ry, piso + 0.5), 'cano', lados=14)
    L.cilindro(0.76, 0.18, (rx, ry, piso + 0.85), 'agua_funda', lados=14, r_topo=0.35)
    L.cano((0.0, 0.0, piso + 0.2), (rx - 0.7, 0.0, piso + 0.2), 0.07)
    L.cano((rx + 0.6, ry - 0.45, piso + 0.2), (2.0, ry - 0.45, piso + 0.2), 0.08)  # saída para a cidade

    # 5) Prédio de controle no fundo (janelas, telhado azul, letreiro com gota)
    bx, by, w, d, h = -0.55, 1.3, 2.3, 1.1, 0.95
    L.caixa((w, d, h), (bx, by, piso), 'parede', chanfro=0.03)
    L.caixa((w + 0.1, d + 0.1, 0.1), (bx, by, piso + h), 'telhado_azul', chanfro=0.02)
    frente = by - d / 2
    L.janelas('frente', frente, piso + 0.55, bx - 1.0, bx + 1.0, 5, 0.26, 0.28)
    L.placa(0.35, 0.45, (bx + 0.0, frente, piso + 0.23), 'escuro', 'frente')
    L.janelas('direita', bx + w / 2, piso + 0.55, by - 0.3, by + 0.3, 2, 0.26, 0.28)
    L.placa(0.9, 0.16, (bx, frente, piso + h - 0.05), 'agua', 'frente')  # letreiro
    # Laboratório no telhado: caixa d'água pequena e tubo de ventilação
    L.cilindro(0.22, 0.35, (bx + 0.8, by + 0.15, piso + h + 0.1), 'metal', lados=8)
    L.cilindro(0.05, 0.3, (bx - 0.7, by, piso + h + 0.1), 'metal_escuro', lados=6)
    # Árvores na lateral direita do fundo
    L.arvore((1.5, 1.5, piso), 1.1, 'verde')
    L.arvore((1.0, 1.65, piso), 0.8, 'verde_escuro', tipo='pinheiro')


L.principal(__file__, construir)
