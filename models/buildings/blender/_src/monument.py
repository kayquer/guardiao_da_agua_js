"""Monumento Histórico (monument, 2×2): obelisco de pedra sobre base em degraus, cercado por um chafariz,
com placa dourada, postes de luz e canteiros nos cantos da praça."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((4.0, 4.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    L.cilindro(1.75, 0.06, (0, 0, 0.08), 'piso', lados=16)  # praça redonda
    L.anel(1.75, 1.6, 0.07, (0, 0, 0.08), 'pedra', lados=16)
    piso = 0.14
    # Caminho até a frente
    L.caixa((0.7, 0.6, 0.06), (0, -1.75, 0.08), 'piso')

    # Chafariz em volta do monumento
    L.tanque_redondo(1.05, 0.22, (0, 0, piso), 'agua', 'pedra', lados=14, borda=0.12, nivel=0.06)
    # Base em degraus
    for i, lado in enumerate((1.0, 0.8, 0.6)):
        L.caixa((lado, lado, 0.14), (0, 0, piso + i * 0.14), 'pedra', chanfro=0.02)
    z = piso + 0.42
    # Pedestal com placa dourada na frente
    L.caixa((0.45, 0.45, 0.4), (0, 0, z), 'creme', chanfro=0.02)
    L.placa(0.28, 0.18, (0, -0.225, z + 0.22), 'dourado', 'frente')
    L.caixa((0.52, 0.52, 0.06), (0, 0, z + 0.4), 'pedra')
    # Obelisco afilado com ponta dourada
    L.cilindro(0.25, 1.9, (0, 0, z + 0.46), 'creme', lados=4, r_topo=0.15, rot=(0, 0, 45))
    L.cilindro(0.15, 0.22, (0, 0, z + 2.36), 'dourado', lados=4, r_topo=0.0, rot=(0, 0, 45))
    # Jatos d'água em volta da base
    for (x, y) in ((0.75, 0), (-0.75, 0), (0, 0.75), (0, -0.75)):
        L.cilindro(0.04, 0.32, (x, y, piso + 0.16), 'agua', lados=5, r_topo=0.02)
        L.esfera(0.06, (x, y, piso + 0.5), 'agua')

    # Postes de luz e canteiros floridos nos cantos
    for (x, y) in ((1.3, -1.3), (-1.3, -1.3), (1.3, 1.3), (-1.3, 1.3)):
        L.cano((x, y, piso), (x, y, piso + 0.85), 0.03, 'escuro', lados=5)
        L.esfera(0.08, (x, y, piso + 0.9), 'amarelo')
    for (x, y) in ((1.7, -1.7), (-1.7, -1.7), (1.7, 1.7), (-1.7, 1.7)):
        L.arbusto((x, y, 0.08), 0.22, 'verde')
        L.esfera(0.07, (x + 0.12, y - 0.12, 0.3), 'flor_rosa')
        L.esfera(0.06, (x - 0.12, y + 0.05, 0.3), 'flor_amarela')


L.principal(__file__, construir)
