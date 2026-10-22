"""Estação de Monitoramento (monitoring_station, 1×1): cabine de dados com antena, painel solar,
anemômetro, pluviômetro e régua de nível d'água (linímetro) — mede chuva, vento e o nível do rio."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((2.0, 2.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    L.caixa((1.7, 1.7, 0.06), (0, 0, 0.08), 'piso')
    piso = 0.14
    L.cerca(-0.82, -0.82, 0.82, 0.82, alt=0.24, cor='metal')

    # Cabine de dados (branca, faixa azul-água, porta e janelinha)
    cx, cy, w, d, h = -0.25, 0.35, 0.85, 0.7, 0.62
    L.caixa((w, d, h), (cx, cy, piso), 'parede', chanfro=0.03)
    L.caixa((w + 0.08, d + 0.08, 0.06), (cx, cy, piso + h), 'metal_escuro')
    L.caixa((w + 0.01, d + 0.01, 0.07), (cx, cy, piso + h - 0.15), 'agua')
    L.placa(0.24, 0.42, (cx - 0.18, cy - d / 2, piso + 0.21), 'escuro', 'frente')
    L.placa(0.2, 0.16, (cx + 0.2, cy - d / 2, piso + 0.36), 'vidro', 'frente')
    L.placa(0.24, 0.16, (cx + w / 2, cy, piso + 0.36), 'vidro', 'direita')
    # Painel solar inclinado no teto
    L.caixa((0.6, 0.45, 0.04), (cx, cy + 0.02, piso + h + 0.12), 'painel_solar', rot=(25, 0, 0))
    L.cano((cx - 0.2, cy + 0.15, piso + h), (cx - 0.2, cy + 0.15, piso + h + 0.2), 0.02, 'metal', lados=4)
    L.cano((cx + 0.2, cy + 0.15, piso + h), (cx + 0.2, cy + 0.15, piso + h + 0.2), 0.02, 'metal', lados=4)

    # Mastro com antena, anemômetro e cata-vento
    mx, my = 0.5, 0.45
    L.cano((mx, my, piso), (mx, my, piso + 1.75), 0.035, 'metal', lados=6)
    L.cano((mx - 0.25, my, piso + 1.3), (mx + 0.25, my, piso + 1.3), 0.02, 'metal', lados=4)
    L.cilindro(0.04, 0.12, (mx - 0.25, my, piso + 1.3), 'parede', lados=6)         # sensor de temperatura
    L.cone(0.16, 0.08, (mx + 0.25, my, piso + 1.32), 'parede', lados=8)            # antena parabólica
    # anemômetro: três conchas
    topo = piso + 1.75
    for (dx, dy) in ((0.16, 0), (-0.08, 0.14), (-0.08, -0.14)):
        L.cano((mx, my, topo), (mx + dx, my + dy, topo), 0.012, 'metal_escuro', lados=3)
        L.esfera(0.045, (mx + dx, my + dy, topo), 'amarelo', escala=(1, 1, 0.8))
    L.cone(0.03, 0.12, (mx, my, topo), 'vermelho', lados=4)

    # Pluviômetro (funil sobre poste)
    L.cano((0.45, -0.35, piso), (0.45, -0.35, piso + 0.45), 0.025, 'metal', lados=4)
    L.cilindro(0.08, 0.16, (0.45, -0.35, piso + 0.45), 'parede', lados=8)
    L.cilindro(0.1, 0.06, (0.45, -0.35, piso + 0.61), 'agua', lados=8)

    # Linímetro: régua azul e branca num pequeno poço d'água na frente
    L.tanque(0.55, 0.42, 0.14, (-0.35, -0.42, piso), 'agua', 'pedra', parede=0.06, nivel=0.04)
    for i in range(5):
        L.caixa((0.08, 0.04, 0.12), (-0.35, -0.6, piso + 0.06 + i * 0.12), 'cano' if i % 2 == 0 else 'parede')


L.principal(__file__, construir)
