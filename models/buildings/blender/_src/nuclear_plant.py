"""Usina Nuclear (nuclear_plant, 4×4, escondida em FEATURE_FLAGS): duas torres de resfriamento soltando
vapor branco, prédio do reator com cúpula, sala de turbinas com faixa amarela e cerca de segurança."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def torre(x, y, r=1.15, h=2.6):
    """Torre de resfriamento: base larga, cintura fina, boca abrindo de novo (três troncos de cone)."""
    L.cilindro(r, h * 0.55, (x, y, 0.1), 'concreto', lados=14, r_topo=r * 0.68)
    L.cilindro(r * 0.68, h * 0.3, (x, y, 0.1 + h * 0.55), 'concreto', lados=14, r_topo=r * 0.72)
    L.anel(r * 0.72, r * 0.64, h * 0.15, (x, y, 0.1 + h * 0.85), 'concreto', lados=14)
    L.cilindro(r * 0.66, 0.03, (x, y, 0.1 + h * 0.97), 'parede', lados=14)
    L.cilindro(r * 1.01, 0.15, (x, y, 0.4), 'vermelho', lados=14, r_topo=r * 0.93)
    for i, (dz, rr) in enumerate(((0.25, 0.65), (0.6, 0.75), (0.95, 0.6))):
        L.esfera(rr, (x + i * 0.2, y + i * 0.1, 0.1 + h + dz), 'parede', escala=(1, 1, 0.65))


def construir():
    L.caixa((8.0, 8.0, 0.1), (0, 0, 0), 'grama', chanfro=0.02)
    L.caixa((7.2, 7.2, 0.04), (0, 0, 0.1), 'piso')
    torre(-2.2, 1.9)
    torre(0.7, 2.3, r=1.0, h=2.3)
    # Prédio do reator: cilindro com cúpula
    rx, ry = 2.2, -0.6
    L.cilindro(1.0, 1.3, (rx, ry, 0.14), 'parede', lados=14, chanfro=0.02)
    L.cupula(1.0, (rx, ry, 1.44), 'parede', lados=14, aneis=3)
    L.cilindro(1.01, 0.12, (rx, ry, 1.0), 'amarelo', lados=14)
    # Sala de turbinas (caixa comprida) com faixa amarela e janelas
    L.caixa((3.2, 1.4, 1.1), (-1.2, -1.2, 0.14), 'concreto', chanfro=0.03)
    L.caixa((3.26, 1.46, 0.08), (-1.2, -1.2, 1.24), 'metal_escuro')
    L.caixa((3.21, 1.41, 0.12), (-1.2, -1.2, 0.95), 'amarelo')
    L.janelas('frente', -1.9, 0.6, -2.6, 0.2, 5, 0.3, 0.3)
    L.placa(0.6, 0.55, (-0.1, -1.9, 0.42), 'escuro', 'frente')
    # Símbolo de radiação simplificado (círculo amarelo com centro escuro) na sala de turbinas
    L.cilindro(0.22, 0.03, (-2.3, -1.92, 0.8), 'amarelo', lados=10, rot=(90, 0, 0))
    L.cilindro(0.07, 0.04, (-2.3, -1.93, 0.8), 'escuro', lados=8, rot=(90, 0, 0))
    # Cano entre reator e turbinas
    L.cano((1.2, -0.6, 0.6), (0.4, -0.9, 0.6), 0.1, 'metal')
    # Cerca de segurança
    L.cerca(-3.7, -3.7, 3.7, 3.7, alt=0.3, cor='metal')
    # Árvores no canto
    L.arvore((3.3, 3.2, 0.14), 1.1, 'verde')
    L.arvore((2.6, 3.4, 0.14), 0.9, 'verde_escuro', tipo='pinheiro')


L.principal(__file__, construir)
