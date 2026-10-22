"""Parede Verde (green_wall, 1×1): prédio estreito com as fachadas cobertas de módulos de plantas
(jardim vertical), cano de irrigação no alto e floreiras na calçada."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((2.0, 2.0, 0.08), (0, 0, 0), 'piso', chanfro=0.02)
    piso = 0.08
    bx, by, w, d, h = 0.05, 0.15, 1.5, 1.4, 2.0
    L.caixa((w, d, h), (bx, by, piso), 'parede', chanfro=0.03)
    L.caixa((w + 0.06, d + 0.06, 0.08), (bx, by, piso + h), 'concreto')
    frente, direita = by - d / 2, bx + w / 2
    cores = ('verde', 'folha', 'verde_escuro', 'verde', 'folha', 'verde_escuro', 'verde')
    # Fachada da frente: módulos de plantas com uma faixa de janelas no meio
    for linha in range(5):
        z = piso + 0.55 + linha * 0.3
        for col in range(4):
            x = bx - 0.54 + col * 0.36
            if linha == 2 and col in (1, 2):
                L.placa(0.32, 0.24, (x, frente, z), 'vidro', 'frente')
                continue
            L.placa(0.33, 0.27, (x, frente, z), cores[(linha + col) % 7], 'frente', espessura=0.08)
    # Lateral direita: jardim vertical inteiro
    for linha in range(6):
        z = piso + 0.25 + linha * 0.3
        for col in range(4):
            y = by - 0.5 + col * 0.33
            L.placa(0.3, 0.27, (direita, y, z), cores[(linha * 2 + col) % 7], 'direita', espessura=0.08)
    # Flores salpicadas
    for (x, z, cor) in ((bx - 0.5, 1.5, 'flor_rosa'), (bx + 0.35, 0.95, 'flor_amarela'), (bx + 0.1, 1.95, 'flor_rosa')):
        L.esfera(0.05, (x, frente - 0.1, piso + z), cor)
    for (y, z, cor) in ((by - 0.3, 1.2, 'flor_amarela'), (by + 0.4, 0.6, 'flor_rosa'), (by + 0.1, 1.8, 'flor_amarela')):
        L.esfera(0.05, (direita + 0.1, y, piso + z), cor)
    # Cano de irrigação azul no alto das duas fachadas
    L.cano((bx - w / 2, frente - 0.1, piso + h - 0.05), (direita + 0.1, frente - 0.1, piso + h - 0.05), 0.03, 'cano')
    L.cano((direita + 0.1, frente - 0.1, piso + h - 0.05), (direita + 0.1, by + d / 2, piso + h - 0.05), 0.03, 'cano')
    # Porta (térrea, sem plantas) e floreiras
    L.placa(0.34, 0.42, (bx - 0.35, frente, piso + 0.21), 'madeira_escura', 'frente')
    L.placa(0.3, 0.2, (bx + 0.3, frente, piso + 0.3), 'vidro', 'frente')
    L.caixa((0.5, 0.2, 0.14), (bx + 0.35, frente - 0.3, piso), 'madeira')
    L.arbusto((bx + 0.35, frente - 0.3, piso + 0.14), 0.12, 'verde')
    L.caixa((0.2, 0.6, 0.14), (direita + 0.3, by - 0.1, piso), 'madeira')
    L.arbusto((direita + 0.3, by - 0.1, piso + 0.14), 0.12, 'folha')


L.principal(__file__, construir)
