"""Monitor de Qualidade (water_quality_monitor, 1×1): laboratório pequeno com sonda mergulhada num tanque
de amostra, boia medidora e painel mostrando a qualidade (barras verdes)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((2.0, 2.0, 0.1), (0, 0, 0), 'concreto', chanfro=0.03)
    piso = 0.1

    # Laboratório (telhado azul-água de duas águas)
    cx, cy, w, d, h = -0.35, 0.4, 1.05, 0.8, 0.7
    L.caixa((w, d, h), (cx, cy, piso), 'parede', chanfro=0.03)
    L.telhado(w, d, 0.3, (cx, cy, piso + h), 'agua', beiral=0.08, eixo='X')
    frente = cy - d / 2
    L.placa(0.26, 0.48, (cx - 0.3, frente, piso + 0.24), 'cano', 'frente')       # porta azul
    L.placa(0.4, 0.24, (cx + 0.18, frente, piso + 0.45), 'vidro', 'frente')     # janela
    L.placa(0.3, 0.22, (cx + w / 2, cy, piso + 0.45), 'vidro', 'direita')

    # Painel de leitura: tela escura com barras verdes e amarela
    px, py = 0.55, 0.3
    L.cano((px, py, piso), (px, py, piso + 0.45), 0.03, 'metal_escuro', lados=4)
    L.caixa((0.55, 0.08, 0.42), (px, py, piso + 0.42), 'parede', chanfro=0.01)
    L.placa(0.45, 0.32, (px, py - 0.04, piso + 0.79), 'escuro', 'frente')
    for i, (alt, cor) in enumerate(((0.12, 'verde'), (0.2, 'verde'), (0.26, 'verde'), (0.08, 'amarelo'))):
        L.caixa((0.07, 0.02, alt), (px - 0.15 + i * 0.1, py - 0.07, piso + 0.5), cor)

    # Tanque de amostra com água turquesa, boia e sonda
    tx, ty = 0.3, -0.5
    L.tanque(1.2, 0.75, 0.3, (tx, ty, piso), 'agua', 'concreto_escuro', parede=0.08, nivel=0.08)
    L.esfera(0.12, (tx + 0.25, ty, piso + 0.24), 'laranja', escala=(1, 1, 0.8))      # boia
    L.cano((tx + 0.25, ty, piso + 0.3), (tx + 0.25, ty, piso + 0.5), 0.015, 'escuro', lados=3)
    L.esfera(0.04, (tx + 0.25, ty, piso + 0.5), 'vermelho')                            # luzinha
    # Sonda: cano saindo do laboratório e mergulhando na água
    L.cano((cx + 0.3, frente - 0.02, piso + 0.55), (cx + 0.3, ty, piso + 0.55), 0.035, 'metal')
    L.cano((cx + 0.3, ty, piso + 0.55), (cx + 0.3, ty, piso + 0.12), 0.035, 'metal')
    L.cilindro(0.06, 0.12, (cx + 0.3, ty, piso + 0.06), 'amarelo', lados=6)
    # Frascos de amostra numa bancada ao lado da porta
    L.caixa((0.35, 0.2, 0.25), (-0.75, -0.25, piso), 'madeira')
    for i, cor in enumerate(('agua', 'agua_suja', 'agua')):
        L.cilindro(0.04, 0.12, (-0.86 + i * 0.11, -0.25, piso + 0.25), cor, lados=6)
    # Arbusto
    L.arbusto((-0.82, 0.85, piso), 0.14, 'verde')


L.principal(__file__, construir)
