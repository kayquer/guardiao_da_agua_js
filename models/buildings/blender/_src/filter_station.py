"""Estação de Filtros (filter_station, 1×1): casa de controle, dois filtros de pressão e uma coluna em corte
mostrando as camadas do filtro (água, areia, cascalho e carvão)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((2.0, 2.0, 0.1), (0, 0, 0), 'concreto', chanfro=0.03)
    piso = 0.1

    # Casa de controle no fundo (telhado plano verde, faixa azul)
    cx, cy, w, d, h = -0.25, 0.5, 1.4, 0.85, 0.75
    L.caixa((w, d, h), (cx, cy, piso), 'parede', chanfro=0.03)
    L.caixa((w + 0.08, d + 0.08, 0.08), (cx, cy, piso + h), 'telhado_verde', chanfro=0.02)
    L.caixa((w + 0.01, d + 0.01, 0.06), (cx, cy, piso + h - 0.16), 'cano')
    frente = cy - d / 2
    L.placa(0.3, 0.48, (cx - 0.45, frente, piso + 0.24), 'escuro', 'frente')
    L.janelas('frente', frente, piso + 0.42, cx - 0.2, cx + 0.65, 2, 0.28, 0.2)
    L.janelas('direita', cx + w / 2, piso + 0.42, cy - 0.25, cy + 0.25, 1, 0.34, 0.2)

    # Dois filtros de pressão azuis (cilindro com tampa em cúpula) sobre pés
    for i, fx in enumerate((-0.6, -0.05)):
        fy = -0.45
        L.cilindro(0.26, 0.08, (fx, fy, piso), 'concreto_escuro', lados=10)
        L.cilindro(0.24, 0.62, (fx, fy, piso + 0.08), 'cano', lados=10)
        L.cupula(0.24, (fx, fy, piso + 0.7), 'cano', lados=10, aneis=2)
        L.cilindro(0.245, 0.05, (fx, fy, piso + 0.45), 'metal', lados=10)
        L.cilindro(0.06, 0.03, (fx, fy - 0.24, piso + 0.55), 'parede', lados=6, rot=(90, 0, 0))  # manômetro

    # Coluna em corte: as camadas do filtro (de baixo para cima: carvão, cascalho, areia, água)
    kx, ky = 0.62, -0.42
    L.cilindro(0.3, 0.06, (kx, ky, piso), 'metal_escuro', lados=10)
    camadas = (('escuro', 0.16), ('pedra', 0.18), ('areia', 0.24), ('agua', 0.26))
    z = piso + 0.06
    for cor, alt in camadas:
        L.cilindro(0.26, alt, (kx, ky, z), cor, lados=10)
        z += alt
    L.anel(0.28, 0.26, 0.06, (kx, ky, z - 0.02), 'metal', lados=10)
    # Pedrinhas no cascalho para dar textura
    L.esfera(0.05, (kx - 0.12, ky - 0.24, piso + 0.32), 'concreto_escuro', escala=(1, 0.6, 0.8))
    L.esfera(0.05, (kx + 0.1, ky - 0.24, piso + 0.28), 'concreto_escuro', escala=(1, 0.6, 0.8))

    # Coletor: cano de entrada (água bruta, verde) e de saída (azul) ligando os filtros à casa
    L.cano((-0.95, -0.45, piso + 0.85), (-0.6, -0.45, piso + 0.85), 0.05, 'agua_suja')
    L.cano((-0.6, -0.45, piso + 0.85), (-0.6, -0.45, piso + 0.7), 0.05, 'agua_suja')
    L.cano((-0.05, -0.45, piso + 0.25), (-0.05, cy - d / 2 + 0.02, piso + 0.25), 0.05)
    L.cano((-0.6, -0.45, piso + 0.25), (-0.05, -0.45, piso + 0.25), 0.05)
    L.cano((kx, ky + 0.3, piso + 0.15), (kx, cy - d / 2 + 0.1, piso + 0.15), 0.05)
    L.cano((kx, cy - d / 2 + 0.1, piso + 0.15), (cx + w / 2, cy - d / 2 + 0.1, piso + 0.15), 0.05)
    # Saída de água limpa pela direita
    L.cano((cx + w / 2, cy + 0.2, piso + 0.3), (0.95, cy + 0.2, piso + 0.3), 0.06)
    L.cano((0.95, cy + 0.2, piso + 0.3), (0.95, cy + 0.2, -0.04), 0.06)


L.principal(__file__, construir)
