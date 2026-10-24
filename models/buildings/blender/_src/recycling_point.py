"""Ponto de Coleta Reciclável / PEV (recycling_point, 1×1): piso de concreto com cinco contêineres da coleta
seletiva (azul = papel, vermelho = plástico, verde = vidro, amarelo = metal, marrom = orgânico) sob uma
cobertura leve, com um saco e uma garrafa já separados e uma árvore ao fundo."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def conteiner(x, y, cor):
    """Contêiner de coleta: corpo colorido, tampa um pouco maior e boca escura na frente."""
    piso = 0.1
    L.caixa((0.3, 0.42, 0.46), (x, y, piso), cor, chanfro=0.025)
    L.caixa((0.33, 0.45, 0.05), (x, y + 0.01, piso + 0.46), cor, chanfro=0.015)
    L.placa(0.18, 0.06, (x, y - 0.21, piso + 0.38), 'escuro', 'frente')
    L.placa(0.12, 0.1, (x, y - 0.21, piso + 0.2), 'parede', 'frente', espessura=0.02)  # etiqueta clara


def construir():
    L.caixa((2.0, 2.0, 0.1), (0, 0, 0), 'concreto', chanfro=0.03)
    L.caixa((1.9, 0.2, 0.012), (0, -0.85, 0.1), 'verde')  # faixa verde de calçada na frente

    # Cinco contêineres em fila (frente para a câmera)
    cores = ('telhado_azul', 'vermelho', 'verde_garrafa', 'amarelo', 'marrom')
    for i, cor in enumerate(cores):
        conteiner(-0.7 + i * 0.35, 0.1, cor)

    # Cobertura leve: quatro postes e telha inclinada para trás
    for (px, py) in ((-0.9, -0.2), (0.9, -0.2), (-0.9, 0.5), (0.9, 0.5)):
        L.caixa((0.05, 0.05, 0.85 if py < 0 else 0.75), (px, py, 0.1), 'metal_escuro')
    L.caixa((1.95, 0.95, 0.04), (0, 0.15, 0.88), 'telhado_verde', rot=(-6, 0, 0), chanfro=0.01)

    # Coisas separadas no chão: um saco de papel e uma garrafa de vidro
    L.caixa((0.14, 0.1, 0.16), (0.55, -0.45, 0.1), 'creme', rot=(0, 0, 15))
    L.cilindro(0.035, 0.14, (0.25, -0.5, 0.1), 'verde_garrafa', lados=6)
    L.cilindro(0.015, 0.05, (0.25, -0.5, 0.24), 'verde_garrafa', lados=5)

    # Árvore e arbustos ao fundo
    L.arvore((-0.78, -0.58, 0.1), 0.8, 'verde')
    L.arbusto((0.7, 0.8, 0.1), 0.16, 'verde_escuro')
    L.arbusto((-0.75, 0.8, 0.1), 0.14, 'verde')


L.principal(__file__, construir)
