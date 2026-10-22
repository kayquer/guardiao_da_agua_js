"""Bomba de Água (water_pump, 1×1): casa de máquinas + bomba com motor + canos azuis saindo do chão."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    # Base de concreto (define o tamanho: 1 célula = 2 unidades)
    L.caixa((2.0, 2.0, 0.1), (0, 0, 0), 'concreto', chanfro=0.03)
    piso = 0.1

    # Casa de máquinas: paredes brancas, telhado azul, porta e janelas
    cx, cy, w, d, h = -0.35, 0.3, 1.1, 1.0, 0.85
    L.caixa((w, d, h), (cx, cy, piso), 'parede', chanfro=0.03)
    L.caixa((w + 0.06, d + 0.06, 0.08), (cx, cy, piso), 'concreto_escuro')  # rodapé
    L.telhado(w, d, 0.4, (cx, cy, piso + h), 'telhado_azul', beiral=0.1, eixo='Y')
    frente = cy - d / 2
    L.placa(0.34, 0.55, (cx - 0.18, frente, piso + 0.3), 'escuro', 'frente')               # porta
    L.placa(0.28, 0.22, (cx + 0.28, frente, piso + 0.55), 'vidro', 'frente')               # janela
    L.placa(0.3, 0.22, (cx + w / 2, cy - 0.1, piso + 0.55), 'vidro', 'direita')            # janela lateral
    L.placa(0.3, 0.22, (cx + w / 2, cy + 0.32, piso + 0.55), 'vidro', 'direita')
    # Plaquinha azul-água com uma gota sobre a porta
    L.placa(0.34, 0.12, (cx - 0.18, frente, piso + 0.72), 'agua', 'frente')

    # Bomba: base, corpo (voluta) azul e motor
    bx, by = 0.55, -0.45
    L.caixa((0.7, 0.45, 0.08), (bx, by, piso), 'concreto_escuro')
    L.cilindro(0.18, 0.2, (bx - 0.12, by + 0.1, piso + 0.27), 'cano', lados=10, rot=(90, 0, 0))   # voluta
    L.cilindro(0.13, 0.34, (bx + 0.05, by, piso + 0.22), 'amarelo', lados=8, rot=(0, 90, 0))     # motor
    L.cilindro(0.14, 0.04, (bx + 0.05, by, piso + 0.22), 'metal_escuro', lados=8, rot=(0, 90, 0))

    # Cano que vem do poço (sai do chão) até a bomba
    L.cano((bx - 0.12, by - 0.55, -0.05), (bx - 0.12, by - 0.55, piso + 0.27), 0.07)
    L.cano((bx - 0.12, by - 0.55, piso + 0.27), (bx - 0.12, by - 0.05, piso + 0.27), 0.07)
    # Recalque: da bomba sobe e entra na casa de máquinas
    L.cano((bx - 0.12, by + 0.1, piso + 0.27), (bx - 0.12, by + 0.1, piso + 0.62), 0.07)
    L.cano((bx - 0.12, by + 0.1, piso + 0.62), (cx + w / 2 - 0.02, by + 0.1, piso + 0.62), 0.07)
    # Registro vermelho no cano
    L.cilindro(0.12, 0.04, (bx - 0.12, by + 0.1, piso + 0.48), 'vermelho', lados=8, rot=(0, 90, 0))
    # Saída para a cidade: cano pela lateral direita, desce e some no chão
    L.cano((cx + w / 2, cy + 0.25, piso + 0.35), (0.9, cy + 0.25, piso + 0.35), 0.08)
    L.cano((0.9, cy + 0.25, piso + 0.35), (0.9, cy + 0.25, -0.05), 0.08)
    # Respiro no telhado
    L.cilindro(0.06, 0.25, (cx + 0.25, cy + 0.2, piso + h + 0.15), 'metal', lados=6)


L.principal(__file__, construir)
