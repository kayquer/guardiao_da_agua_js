"""Usina de Biomassa (biomass_plant, 2×2): pilha de cavaco e toras (resíduos de madeira e da roça), esteira
inclinada que leva o combustível ao alto da caldeira, filtro de mangas antes da chaminé (fumaça clara),
prédio da turbina com faixa amarela e exaustor no telhado (nó "gira_1") e transformador de energia."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.08


def ventilador(pos, r, nome, pas=4):
    """Hélice horizontal (gira em pé, eixo Z) com o pivô no cubo."""
    x, y, z = pos
    pecas = [L.cilindro(0.05, 0.06, (x, y, z), 'metal_escuro', lados=6)]
    for i in range(pas):
        pecas.append(L.caixa((r * 2, 0.08, 0.02), (x, y, z + 0.02), 'metal', rot=(12, 0, 180 * i / pas)))
    return L.animar(pecas, nome, (x, y, z))


def construir():
    L.caixa((4.0, 4.0, PISO), (0, 0, 0), 'concreto_escuro', chanfro=0.02)
    L.caixa((3.7, 3.7, 0.01), (0, 0, PISO), 'piso')

    # 1) Pátio de combustível: monte de cavaco e toras empilhadas (frente à esquerda)
    L.caixa((1.7, 1.5, 0.02), (-1.0, -1.1, PISO), 'terra')
    L.esfera(0.62, (-1.2, -0.85, PISO - 0.05), 'cavaco', escala=(1.0, 0.9, 0.62), sub=1)
    for k, (dz, dx) in enumerate(((0.0, 0.0), (0.0, 0.2), (0.0, 0.4), (0.17, 0.1), (0.17, 0.3))):
        y = -1.55
        L.cilindro(0.09, 0.85, (-1.55 + dx + 0.1, y - 0.42, PISO + 0.11 + dz), 'madeira',
                   lados=6, rot=(-90, 0, 0))
    # pá carregadeira pequena
    L.caixa((0.3, 0.42, 0.18), (-0.25, -1.35, PISO), 'amarelo', chanfro=0.02)
    L.caixa((0.22, 0.18, 0.16), (-0.25, -1.28, PISO + 0.18), 'vidro')
    L.caixa((0.34, 0.08, 0.12), (-0.25, -1.6, PISO + 0.02), 'metal_escuro')

    # 2) Esteira inclinada: do pátio ao alto da caldeira
    a, b = (-0.85, -0.35, PISO + 0.25), (-0.85, 0.55, PISO + 1.45)
    L.cano(a, b, 0.11, 'metal_escuro', lados=4)
    L.cano((a[0], a[1] + 0.06, a[2] + 0.1), (b[0], b[1] + 0.06, b[2] + 0.1), 0.06, 'cavaco', lados=4)
    for t in (0.35, 0.75):
        y, z = a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t
        L.cano((a[0], y, PISO), (a[0], y, z), 0.03, 'metal_escuro', lados=4)

    # 3) Caldeira (alta, fundo à esquerda) com a boca do fogo
    cx, cy = -0.85, 1.15
    L.caixa((1.3, 1.2, 1.6), (cx, cy, PISO), 'concreto', chanfro=0.03)
    L.caixa((1.36, 1.26, 0.08), (cx, cy, PISO + 1.6), 'metal_escuro')
    L.placa(0.4, 0.4, (cx + 0.65, cy - 0.15, PISO + 0.5), 'laranja', 'direita')  # fogo da fornalha
    L.janelas('direita', cx + 0.65, PISO + 1.2, cy - 0.35, cy + 0.35, 2, 0.2, 0.2)

    # 4) Filtro de mangas (limpa a fumaça) e chaminé
    fx, fy = 0.35, 1.4
    L.caixa((0.7, 0.6, 0.65), (fx, fy, PISO + 0.45), 'metal', chanfro=0.02)
    for dx in (-0.17, 0.17):
        L.cilindro(0.16, 0.45, (fx + dx, fy, PISO), 'metal_escuro', lados=6, r_topo=0.28)  # funis
    L.cano((cx + 0.65, fy, PISO + 1.2), (fx - 0.35, fy, PISO + 0.9), 0.08, 'metal_escuro')
    hx, hy = 1.35, 1.4
    L.cano((fx + 0.35, fy, PISO + 0.8), (hx - 0.15, hy, PISO + 0.8), 0.08, 'metal_escuro')
    L.cilindro(0.2, 2.7, (hx, hy, PISO), 'concreto', lados=10, r_topo=0.14)
    L.cilindro(0.19, 0.2, (hx, hy, PISO + 1.9), 'verde', lados=10)  # faixa verde: fumaça filtrada
    L.esfera(0.22, (hx + 0.05, hy, PISO + 2.95), 'parede', escala=(1.1, 1, 0.8))

    # 5) Prédio da turbina (faixa amarela) com exaustor no telhado
    tx, ty, w, d, h = 0.8, -0.15, 1.6, 1.3, 0.75
    L.caixa((w, d, h), (tx, ty, PISO), 'parede', chanfro=0.03)
    L.caixa((w + 0.01, d + 0.01, 0.12), (tx, ty, PISO + 0.45), 'amarelo')
    L.caixa((w + 0.08, d + 0.08, 0.06), (tx, ty, PISO + h), 'metal_escuro')
    L.placa(0.36, 0.4, (tx - 0.4, ty - d / 2, PISO + 0.4), 'escuro', 'frente')
    L.janelas('frente', ty - d / 2, PISO + 0.3, tx - 0.05, tx + 0.65, 2, 0.24, 0.16)
    L.janelas('direita', tx + w / 2, PISO + 0.3, ty - 0.4, ty + 0.4, 2, 0.24, 0.16)
    L.cano((cx + 0.65, cy - 0.45, PISO + 0.6), (tx - 0.3, ty + d / 2, PISO + 0.6), 0.06, 'metal')  # vapor
    topo = PISO + h + 0.06
    L.anel(0.3, 0.26, 0.1, (tx + 0.2, ty, topo), 'metal_escuro', lados=12)
    ventilador((tx + 0.2, ty, topo + 0.04), 0.24, 'gira_1')

    # 6) Transformador amarelo
    L.caixa((0.45, 0.38, 0.36), (1.4, -1.45, PISO), 'amarelo', chanfro=0.02)
    for xx in (1.27, 1.4, 1.53):
        L.cilindro(0.025, 0.15, (xx, -1.45, PISO + 0.36), 'parede', lados=5)
    L.arbusto((1.7, 0.95, PISO), 0.14, 'verde')
    L.arbusto((0.5, -1.7, PISO), 0.13, 'verde_escuro')


L.principal(__file__, construir)
