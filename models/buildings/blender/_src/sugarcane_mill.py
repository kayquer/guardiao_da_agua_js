"""Usina Sucroenergética (sugarcane_mill, 3×3): o caminhão traz cana para o pátio, a esteira leva à moenda
(galpão), o caldo vira açúcar e etanol (tanques cilíndricos) e o bagaço (monte amarelado) queima na caldeira
de chaminé alta, gerando vapor e eletricidade (subestação de faixa amarela). Torre de resfriamento baixa com
ventilador no topo (nó "gira_1")."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.08


def ventilador(pos, r, nome, pas=4):
    """Hélice horizontal (gira em pé, eixo Z) com o pivô no cubo."""
    x, y, z = pos
    pecas = [L.cilindro(0.06, 0.06, (x, y, z), 'metal_escuro', lados=6)]
    for i in range(pas):
        pecas.append(L.caixa((r * 2, 0.1, 0.02), (x, y, z + 0.02), 'metal', rot=(12, 0, 180 * i / pas)))
    return L.animar(pecas, nome, (x, y, z))


def feixe(pos, comp, cor):
    """Feixe de cana deitado ao longo de X (caixa com o topo arredondado por um prisma baixo)."""
    perfil = [(-0.13, 0), (0.13, 0), (0.09, 0.22), (-0.09, 0.22)]
    L.prisma(perfil, comp, pos, cor, eixo='X')


def construir():
    L.caixa((6.0, 6.0, PISO), (0, 0, 0), 'concreto_escuro', chanfro=0.02)
    L.caixa((5.7, 5.7, 0.01), (0, 0, PISO), 'piso')

    # 1) Pátio de cana (frente à esquerda): feixes verdes e maduros + caminhão chegando
    yx, yy = -1.55, -1.6
    L.caixa((2.5, 2.2, 0.02), (yx, yy, PISO), 'terra')
    z0 = PISO + 0.02
    for k, cor in enumerate(('cana', 'cana_seca', 'cana', 'cana_seca')):
        feixe((yx - 0.55, yy + 0.4 - k * 0.27, z0), 1.2, cor)
    for k, cor in enumerate(('cana_seca', 'cana', 'cana_seca')):
        feixe((yx - 0.55, yy + 0.27 - k * 0.27, z0 + 0.24), 1.15, cor)
    # caminhão (cabine vermelha + carroceria com cana)
    tx, ty = yx + 0.75, yy - 0.15
    L.caixa((0.45, 1.3, 0.12), (tx, ty, PISO + 0.12), 'escuro')
    L.caixa((0.45, 0.4, 0.42), (tx, ty - 0.6, PISO + 0.14), 'vermelho', chanfro=0.03)
    L.placa(0.36, 0.14, (tx, ty - 0.8, PISO + 0.48), 'vidro', 'frente')
    L.caixa((0.47, 0.88, 0.1), (tx, ty + 0.2, PISO + 0.24), 'madeira')
    L.caixa((0.43, 0.84, 0.24), (tx, ty + 0.2, PISO + 0.34), 'cana')
    for dy in (-0.55, 0.4):  # rodas (eixos) aparecendo dos dois lados
        L.cilindro(0.1, 0.52, (tx - 0.26, ty + dy, PISO + 0.1), 'escuro', lados=6, rot=(0, 90, 0))

    # 2) Esteira inclinada do pátio até a moenda
    L.caixa((0.3, 1.5, 0.06), (-1.3, -0.25, PISO + 0.45), 'metal_escuro', rot=(-22, 0, 0))
    L.caixa((0.24, 1.45, 0.04), (-1.3, -0.25, PISO + 0.5), 'cana', rot=(-22, 0, 0))
    L.cano((-1.3, -0.6, PISO), (-1.3, -0.6, PISO + 0.4), 0.03, 'metal_escuro', lados=4)

    # 3) Moenda (galpão grande de telhado de duas águas)
    mx, my, w, d, h = -1.45, 1.2, 2.3, 1.6, 0.95
    L.caixa((w, d, h), (mx, my, PISO), 'metal', chanfro=0.03)
    L.telhado(w, d, 0.4, (mx, my, PISO + h), 'telhado_azul', eixo='X')
    L.placa(0.6, 0.55, (mx + 0.15, my - d / 2, PISO + 0.6), 'escuro', 'frente')
    L.janelas('frente', my - d / 2, PISO + 0.75, mx - 1.0, mx - 0.4, 2, 0.22, 0.2)
    L.janelas('direita', mx + w / 2, PISO + 0.65, my - 0.5, my + 0.5, 3, 0.24, 0.22)

    # 4) Monte de bagaço e caldeira com chaminé alta
    L.esfera(0.6, (0.25, 0.55, PISO - 0.08), 'bagaco', escala=(0.95, 0.9, 0.62), sub=1)
    L.caixa((0.22, 0.8, 0.05), (0.6, 1.05, PISO + 0.35), 'metal_escuro', rot=(25, 0, -45))  # esteira de bagaço
    cx, cy = 1.15, 1.75
    L.caixa((1.1, 1.1, 1.35), (cx, cy, PISO), 'concreto', chanfro=0.03)
    L.caixa((1.16, 1.16, 0.08), (cx, cy, PISO + 1.35), 'metal_escuro')
    L.janelas('frente', cy - 0.55, PISO + 0.95, cx - 0.4, cx + 0.4, 2, 0.22, 0.22)
    L.placa(0.35, 0.4, (cx, cy - 0.55, PISO + 0.4), 'laranja', 'frente')  # boca da fornalha (fogo)
    hx, hy = 1.95, 2.35
    L.cilindro(0.25, 3.1, (hx, hy, PISO), 'concreto', lados=10, r_topo=0.17)
    L.cilindro(0.215, 0.22, (hx, hy, PISO + 2.2), 'vermelho', lados=10)
    L.cilindro(0.185, 0.2, (hx, hy, PISO + 2.75), 'vermelho', lados=10)
    L.esfera(0.28, (hx + 0.06, hy, PISO + 3.4), 'parede', escala=(1.1, 1, 0.8))  # vapor branco
    L.cano((cx + 0.55, cy + 0.3, PISO + 0.8), (hx - 0.22, hy, PISO + 0.8), 0.07, 'metal_escuro')

    # 5) Tanques de etanol (frente à direita)
    for (x, y, r, a) in ((0.9, -1.95, 0.4, 0.75), (1.85, -1.95, 0.4, 0.75), (2.4, -1.0, 0.32, 0.6)):
        L.cilindro(r, a, (x, y, PISO), 'parede', lados=8)
        L.cilindro(r + 0.01, 0.1, (x, y, PISO + a * 0.6), 'verde', lados=8)
        L.cilindro(r + 0.02, 0.08, (x, y, PISO + a), 'metal', lados=8, r_topo=r * 0.4)
    L.cano((0.9, -1.55, PISO + 0.3), (0.9, -0.4, PISO + 0.3), 0.05, 'verde')
    L.cano((0.9, -0.4, PISO + 0.3), (-0.3, -0.4, PISO + 0.3), 0.05, 'verde')
    L.cano((-0.3, -0.4, PISO + 0.3), (-0.3, 0.4, PISO + 0.3), 0.05, 'verde')

    # 6) Torre de resfriamento baixa com ventilador
    rx, ry = 1.75, 0.35
    L.caixa((1.0, 1.0, 0.6), (rx, ry, PISO), 'concreto', chanfro=0.03)
    L.caixa((1.02, 1.02, 0.1), (rx, ry, PISO + 0.15), 'agua')  # cortina d'água
    L.anel(0.4, 0.34, 0.25, (rx, ry, PISO + 0.6), 'metal_escuro', lados=12)
    ventilador((rx, ry, PISO + 0.72), 0.32, 'gira_1')

    # 7) Subestação com faixa amarela
    sx, sy = -0.15, -2.15
    L.caixa((0.7, 0.55, 0.4), (sx, sy, PISO), 'parede', chanfro=0.02)
    L.caixa((0.71, 0.56, 0.1), (sx, sy, PISO + 0.26), 'amarelo')
    for xx in (sx - 0.18, sx, sx + 0.18):
        L.cilindro(0.03, 0.16, (xx, sy, PISO + 0.4), 'parede', lados=5)
    L.cano((sx + 0.6, sy, PISO), (sx + 0.6, sy, PISO + 1.0), 0.03, 'madeira_escura', lados=5)
    L.caixa((0.4, 0.04, 0.04), (sx + 0.6, sy, PISO + 0.92), 'madeira_escura')

    # Arbustos
    for (x, y) in ((-2.6, 0.2), (-2.65, 2.6), (2.65, 1.3)):
        L.arbusto((x, y, PISO), 0.16, 'verde')


L.principal(__file__, construir)
