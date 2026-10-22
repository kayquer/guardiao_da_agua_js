"""Hospital (hospital, 2×2): bloco branco de três andares com faixas de janelas azuis, cruz vermelha na
fachada, marquise de entrada, ala baixa de pronto-socorro com ambulância e heliponto no terraço."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((4.0, 4.0, 0.08), (0, 0, 0), 'asfalto', chanfro=0.02)
    L.caixa((4.0, 1.0, 0.06), (0, -1.5, 0.08), 'piso')      # calçada da frente
    L.caixa((1.0, 2.9, 0.07), (-1.5, 0.55, 0.08), 'grama')  # jardim lateral
    piso = 0.14

    # Bloco principal (3 andares)
    bx, by, w, d, h = 0.35, 0.55, 2.6, 2.0, 2.1
    L.caixa((w, d, h), (bx, by, piso), 'parede', chanfro=0.04)
    L.caixa((w + 0.08, d + 0.08, 0.1), (bx, by, piso + h), 'concreto', chanfro=0.02)  # platibanda
    frente, direita = by - d / 2, bx + w / 2
    for andar in range(3):
        zc = piso + 0.55 + andar * 0.58
        L.placa(w - 0.2, 0.3, (bx, frente, zc), 'vidro', 'frente')
        L.placa(d - 0.3, 0.3, (direita, by, zc), 'vidro', 'direita')
        # montantes das janelas
        for i in range(1, 6):
            L.placa(0.04, 0.3, (bx - (w - 0.2) / 2 + i * (w - 0.2) / 6, frente - 0.03, zc), 'parede', 'frente')
        for i in range(1, 4):
            L.placa(0.04, 0.3, (direita + 0.03, by - (d - 0.3) / 2 + i * (d - 0.3) / 4, zc), 'parede', 'direita')
    # Faixa vermelha e cruz na fachada
    L.placa(0.5, 0.5, (bx + 0.9, frente - 0.01, piso + h - 0.12), 'parede', 'frente', espessura=0.05)
    L.placa(0.12, 0.38, (bx + 0.9, frente - 0.06, piso + h - 0.18), 'vermelho', 'frente')
    L.placa(0.38, 0.12, (bx + 0.9, frente - 0.06, piso + h - 0.31), 'vermelho', 'frente')

    # Entrada: porta de vidro e marquise com pilares
    L.placa(0.7, 0.4, (bx - 0.6, frente, piso + 0.22), 'vidro_escuro', 'frente')
    L.caixa((1.3, 0.75, 0.08), (bx - 0.6, frente - 0.35, piso + 0.5), 'agua', chanfro=0.01)
    for x in (-0.55, 0.55):
        L.cano((bx - 0.6 + x, frente - 0.65, piso), (bx - 0.6 + x, frente - 0.65, piso + 0.5), 0.03, 'metal', lados=4)

    # Ala do pronto-socorro (baixa) à esquerda e ambulância
    L.caixa((0.9, 1.3, 0.75), (-1.35, 0.95, piso), 'parede', chanfro=0.03)
    L.caixa((0.95, 1.35, 0.07), (-1.35, 0.95, piso + 0.75), 'vermelho')
    L.placa(0.5, 0.45, (-1.35, 0.3, piso + 0.23), 'vidro_escuro', 'frente')
    ax, ay = -1.35, -0.25
    L.caixa((0.42, 0.75, 0.3), (ax, ay, piso + 0.06), 'parede', chanfro=0.03)
    L.caixa((0.42, 0.25, 0.22), (ax, ay - 0.48, piso + 0.06), 'parede', chanfro=0.03)
    L.caixa((0.43, 0.76, 0.06), (ax, ay, piso + 0.2), 'vermelho')
    L.placa(0.36, 0.1, (ax, ay - 0.605, piso + 0.22), 'vidro_escuro', 'frente')
    L.caixa((0.12, 0.08, 0.05), (ax, ay - 0.2, piso + 0.36), 'cano')  # sirene
    for (dx, dy) in ((-0.2, -0.45), (0.2, -0.45), (-0.2, 0.25), (0.2, 0.25)):
        L.cilindro(0.07, 0.05, (ax + dx, ay + dy, piso + 0.07), 'escuro', lados=6, rot=(0, 90, 0))

    # Heliponto no terraço + casas de máquinas
    tz = piso + h + 0.1
    L.cilindro(0.72, 0.03, (bx + 0.2, by + 0.1, tz), 'escuro', lados=12)
    L.anel(0.66, 0.6, 0.035, (bx + 0.2, by + 0.1, tz), 'amarelo', lados=12)
    L.caixa((0.08, 0.5, 0.04), (bx + 0.05, by + 0.1, tz), 'parede')
    L.caixa((0.08, 0.5, 0.04), (bx + 0.35, by + 0.1, tz), 'parede')
    L.caixa((0.3, 0.08, 0.04), (bx + 0.2, by + 0.1, tz), 'parede')
    L.caixa((0.4, 0.4, 0.3), (bx - 0.95, by + 0.6, tz), 'concreto', chanfro=0.02)
    L.caixa((0.3, 0.5, 0.2), (bx - 0.95, by - 0.3, tz), 'metal', chanfro=0.02)
    # Árvores no jardim lateral
    L.arvore((-1.6, 1.85, piso), 0.9, 'verde')
    L.arbusto((-1.75, 0.0, piso), 0.16, 'verde_escuro')


L.principal(__file__, construir)
