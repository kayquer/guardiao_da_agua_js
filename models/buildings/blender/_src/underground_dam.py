"""Barragem Subterrânea (underground_dam, 2×2): leito de riacho do semiárido em corte. A frente mostra o chão
cortado: a parede de lona (preta) enterrada até a rocha segura a água dentro da areia (faixa turquesa), e o poço
amazonas (anel de concreto com sarilho que gira, nó "gira_1") tira essa água. Em cima, plantação verde."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    TOPO = 0.6  # superfície do chão (o bloco é um corte de terra)
    # Camadas do corte: rocha embaixo, areia molhada (água guardada) e terra em cima
    L.caixa((4.0, 4.0, 0.16), (0, 0, 0), 'pedra', chanfro=0.02)
    L.caixa((4.0, 4.0, 0.24), (0, 0, 0.16), 'areia')
    L.caixa((2.2, 4.01, 0.18), (0.9, 0, 0.18), 'agua')          # água presa na areia, a montante
    L.caixa((4.0, 4.0, 0.2), (0, 0, 0.4), 'terra')
    L.caixa((4.0, 4.0, 0.02), (0, 0, TOPO - 0.02), 'grama')

    # A parede enterrada (lona preta) atravessa o vale, da rocha até perto da superfície
    L.caixa((0.06, 4.02, 0.44), (-0.2, 0, 0.16), 'escuro')
    L.caixa((0.18, 4.02, 0.04), (-0.2, 0, TOPO - 0.02), 'pedra')  # marca de pedras em cima

    # Leito do riacho (seco a jusante, úmido a montante) cortando o terreno
    L.caixa((4.0, 0.7, 0.03), (0, 0.2, TOPO - 0.01), 'areia')
    L.caixa((1.9, 0.5, 0.03), (0.95, 0.2, TOPO), 'agua')
    for (x, y) in ((-1.2, 0.25), (-0.8, 0.05), (-1.6, 0.0)):
        L.esfera(0.07, (x, y, TOPO + 0.02), 'pedra', escala=(1.3, 1, 0.6))

    # Poço amazonas: anel de concreto, água dentro, telhadinho e sarilho que gira
    px, py = 1.15, -1.15
    L.tanque_redondo(0.32, 0.3, (px, py, TOPO - 0.02), 'agua_funda', 'concreto', lados=10, borda=0.06)
    for dx in (-0.3, 0.3):
        L.caixa((0.05, 0.05, 0.55), (px + dx, py, TOPO + 0.26), 'madeira')
    L.telhado(0.8, 0.5, 0.18, (px, py, TOPO + 0.8), 'telhado_vermelho', eixo='X')
    sarilho = [L.cilindro(0.05, 0.6, (px, py, TOPO + 0.6), 'madeira_escura', lados=6, rot=(0, 90, 0)),
               L.caixa((0.04, 0.04, 0.16), (px + 0.32, py, TOPO + 0.6), 'metal_escuro'),
               L.caixa((0.04, 0.12, 0.03), (px + 0.32, py - 0.06, TOPO + 0.68), 'metal_escuro')]
    L.animar(sarilho, 'gira_1', (px, py, TOPO + 0.6))
    L.caixa((0.12, 0.12, 0.14), (px, py - 0.02, TOPO + 0.32), 'agua')  # balde subindo

    # Plantação verdinha ao lado (a terra úmida dá comida o ano todo)
    for i in range(4):
        for j in range(3):
            L.cone(0.09, 0.22, (-1.55 + i * 0.32, 1.0 + j * 0.3, TOPO), 'verde' if (i + j) % 2 else 'folha', lados=5)
    L.arvore((1.6, 1.4, TOPO), 0.8, 'verde')
    L.arvore((-1.6, -1.4, TOPO), 0.65, 'verde_escuro')
    L.arbusto((0.3, -1.5, TOPO), 0.14, 'verde')


L.principal(__file__, construir)
