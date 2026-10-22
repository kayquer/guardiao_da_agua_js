"""Usina a Carvão (coal_plant, 2×2, escondida em FEATURE_FLAGS): pilha de carvão, esteira até a caldeira,
chaminé alta com fumaça escura — a fonte de energia que mais polui."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((4.0, 4.0, 0.08), (0, 0, 0), 'terra', chanfro=0.02)
    piso = 0.08
    # Prédio da caldeira (cinza escuro, telhado em duas águas)
    L.caixa((2.0, 1.6, 1.2), (0.6, 0.7, piso), 'concreto_escuro', chanfro=0.03)
    L.telhado(2.0, 1.6, 0.35, (0.6, 0.7, piso + 1.2), 'metal_escuro', beiral=0.06, eixo='X')
    L.janelas('frente', 0.7 - 0.8, piso + 0.75, -0.2, 1.4, 4, 0.22, 0.3, cor='amarelo')   # janelas acesas
    L.placa(0.5, 0.55, (1.1, -0.1, piso + 0.28), 'escuro', 'frente')
    L.janelas('direita', 1.6, piso + 0.75, 0.2, 1.2, 2, 0.22, 0.3, cor='amarelo')
    # Chaminé alta com faixas e fumaça preta
    cx, cy = -1.1, 1.2
    L.cilindro(0.3, 3.0, (cx, cy, piso), 'concreto', lados=10, r_topo=0.2)
    L.cilindro(0.26, 0.25, (cx, cy, piso + 2.2), 'vermelho', lados=10)
    L.cilindro(0.215, 0.2, (cx, cy, piso + 2.75), 'vermelho', lados=10)
    for i, (dz, r) in enumerate(((3.25, 0.28), (3.6, 0.36), (3.95, 0.42))):
        L.esfera(r, (cx + i * 0.15, cy + i * 0.05, piso + dz), 'escuro', escala=(1, 1, 0.8))
    # Pilha de carvão e esteira inclinada até a caldeira
    L.esfera(0.75, (-1.0, -1.1, piso - 0.1), 'escuro', escala=(1.2, 1, 0.55), sub=1)
    L.esfera(0.45, (-0.4, -1.45, piso - 0.05), 'escuro', escala=(1.1, 1, 0.55), sub=1)
    L.caixa((0.25, 1.6, 0.06), (-0.55, -0.15, piso + 0.55), 'metal_escuro', rot=(-22, 0, 0))
    for y in (-0.75, 0.3):
        L.cano((-0.55, y, piso), (-0.55, y, piso + 0.55 + (y + 0.15) * 0.4), 0.03, 'metal', lados=4)
    # Vagão de carvão nos trilhos
    L.caixa((4.0, 0.06, 0.03), (0, -1.75, piso), 'metal')
    L.caixa((4.0, 0.06, 0.03), (0, -1.55, piso), 'metal')
    L.caixa((0.9, 0.42, 0.3), (1.1, -1.65, piso + 0.06), 'madeira_escura', chanfro=0.02)
    L.esfera(0.24, (1.1, -1.65, piso + 0.32), 'escuro', escala=(1.6, 0.8, 0.5))


L.principal(__file__, construir)
