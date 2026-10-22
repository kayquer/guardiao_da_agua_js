"""Termelétrica (thermal_plant, 2×2, escondida em FEATURE_FLAGS): casa de caldeiras, turbina, duas chaminés
listradas soltando fumaça cinza e tanque de combustível — mostra que queimar combustível polui o ar."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((4.0, 4.0, 0.08), (0, 0, 0), 'concreto_escuro', chanfro=0.02)
    piso = 0.08
    # Casa de caldeiras (alta) e sala da turbina (baixa, faixa amarela)
    L.caixa((1.8, 1.6, 1.3), (-0.7, 0.6, piso), 'concreto', chanfro=0.03)
    L.caixa((1.86, 1.66, 0.08), (-0.7, 0.6, piso + 1.3), 'metal_escuro')
    L.janelas('frente', 0.6 - 0.8, piso + 0.9, -1.4, 0.0, 3, 0.26, 0.3)
    L.caixa((1.6, 1.3, 0.75), (1.0, 0.0, piso), 'parede', chanfro=0.03)
    L.caixa((1.61, 1.31, 0.12), (1.0, 0.0, piso + 0.5), 'amarelo')
    L.caixa((1.66, 1.36, 0.06), (1.0, 0.0, piso + 0.75), 'metal_escuro')
    L.placa(0.45, 0.4, (0.7, -0.65, piso + 0.2), 'escuro', 'frente')
    L.janelas('direita', 1.8, piso + 0.28, -0.4, 0.4, 2, 0.25, 0.2)
    # Chaminés listradas com fumaça
    for (x, y) in ((-1.2, 1.25), (-0.4, 1.25)):
        L.cilindro(0.22, 2.3, (x, y, piso), 'concreto', lados=10, r_topo=0.16)
        L.cilindro(0.2, 0.25, (x, y, piso + 1.65), 'vermelho', lados=10)
        L.cilindro(0.175, 0.2, (x, y, piso + 2.05), 'vermelho', lados=10)
        for i, (dz, r) in enumerate(((2.55, 0.22), (2.85, 0.3), (3.15, 0.36))):
            L.esfera(r, (x + i * 0.12, y + i * 0.05, piso + dz), 'concreto_escuro' if i else 'metal_escuro',
                     escala=(1, 1, 0.8))
    # Tanque de combustível e canos
    L.cilindro(0.5, 0.6, (1.2, -1.3, piso), 'metal', lados=12, chanfro=0.02)
    L.cilindro(0.52, 0.1, (1.2, -1.3, piso + 0.6), 'laranja', lados=12, r_topo=0.3)
    L.cano((0.7, -1.3, piso + 0.3), (-0.2, -1.3, piso + 0.3), 0.06, 'metal_escuro')
    L.cano((-0.2, -1.3, piso + 0.3), (-0.2, -0.2, piso + 0.3), 0.06, 'metal_escuro')
    # Transformador amarelo
    L.caixa((0.5, 0.4, 0.4), (-1.4, -1.3, piso), 'amarelo', chanfro=0.02)
    for x in (-1.55, -1.4, -1.25):
        L.cilindro(0.03, 0.18, (x, -1.3, piso + 0.4), 'parede', lados=5)


L.principal(__file__, construir)
