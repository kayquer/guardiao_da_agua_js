"""Biodigestor (biodigester, 2×2): restos de comida e lodo de esgoto entram pela caixa de carga (marrom), viram
biogás em dois tanques de concreto com cúpula de lona, o gás vai por canos amarelos ao gasômetro e dele ao
gerador (casinha com faixa amarela e ventilador no telhado, nó "gira_1") ou ao queimador de segurança."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def ventilador(pos, r, nome, pas=4):
    """Hélice horizontal (gira em pé, eixo Z) com o pivô no cubo."""
    x, y, z = pos
    pecas = [L.cilindro(0.05, 0.06, (x, y, z), 'metal_escuro', lados=6)]
    for i in range(pas):
        ang = 180 * i / pas
        pecas.append(L.caixa((r * 2, 0.08, 0.02), (x, y, z + 0.02), 'metal', rot=(12, 0, ang)))
    return L.animar(pecas, nome, (x, y, z))


def digestor(x, y, r, h, cor_lona):
    L.cilindro(r, h, (x, y, PISO), 'concreto', lados=12, chanfro=0.02)
    L.cilindro(r + 0.02, 0.06, (x, y, PISO + h - 0.06), 'concreto_escuro', lados=12)
    L.cupula(r * 0.98, (x, y, PISO + h), cor_lona, lados=12, aneis=3)
    # bocal de saída do gás no topo
    L.cilindro(0.05, 0.12, (x, y, PISO + h + r * 0.92), 'amarelo', lados=6)
    return PISO + h + r * 0.98 + 0.06


PISO = 0.08


def construir():
    L.caixa((4.0, 4.0, PISO), (0, 0, 0), 'concreto_escuro', chanfro=0.02)
    L.caixa((3.7, 3.7, 0.01), (0, 0, PISO), 'piso')

    # 1) Caixa de carga: restos de comida e lodo (marrom) entrando
    L.tanque(0.8, 0.7, 0.32, (-1.35, -1.3, PISO), 'composto', 'concreto', parede=0.07)
    L.caixa((0.18, 0.14, 0.1), (-1.5, -1.38, PISO + 0.25), 'telhado_vermelho', rot=(0, 0, 25))  # resto de comida
    L.caixa((0.14, 0.14, 0.08), (-1.22, -1.2, PISO + 0.25), 'laranja', rot=(0, 0, -15))
    L.cano((-1.35, -0.95, PISO + 0.2), (-1.0, -0.2, PISO + 0.2), 0.06, 'marrom')

    # 2) Dois digestores com cúpula de lona (verde-escura e cinza)
    t1 = digestor(-0.85, 0.75, 0.82, 0.55, 'lona_verde')
    t2 = digestor(0.75, 1.15, 0.62, 0.48, 'lona_cinza')
    L.cano((-0.2, 0.9, PISO + 0.25), (0.15, 1.05, PISO + 0.25), 0.06, 'marrom')  # lodo passa de um ao outro

    # 3) Gasômetro (balão de gás) à direita
    gx, gy = 1.35, -0.05
    L.cilindro(0.5, 0.18, (gx, gy, PISO), 'concreto', lados=12)
    L.esfera(0.5, (gx, gy, PISO + 0.42), 'parede', escala=(1, 1, 0.62), sub=2)
    L.cilindro(0.04, 0.1, (gx, gy, PISO + 0.72), 'amarelo', lados=6)

    # Canos amarelos de gás: topo dos digestores → gasômetro → gerador
    alto = PISO + 1.55
    L.cano((-0.85, 0.75, t1 - 0.02), (-0.85, 0.75, alto), 0.04, 'amarelo')
    L.cano((-0.85, 0.75, alto), (gx, 0.75, alto), 0.04, 'amarelo')
    L.cano((0.75, 1.15, t2 - 0.02), (0.75, 1.15, alto - 0.3), 0.04, 'amarelo')
    L.cano((0.75, 1.15, alto - 0.3), (0.75, 0.75, alto - 0.3), 0.04, 'amarelo')
    L.cano((0.75, 0.75, alto - 0.3), (0.75, 0.75, alto), 0.04, 'amarelo')
    L.cano((gx, 0.75, alto), (gx, gy, PISO + 0.82), 0.04, 'amarelo')
    L.cano((gx, gy, PISO + 0.82), (gx, gy, PISO + 0.72), 0.04, 'amarelo')
    # suporte do cano alto
    L.cano((0.2, 0.75, PISO), (0.2, 0.75, alto), 0.025, 'metal_escuro', lados=4)

    # 4) Gerador: casinha com faixa amarela e ventilador no telhado
    hx, hy, w, d, h = 0.75, -1.25, 1.2, 0.85, 0.6
    L.caixa((w, d, h), (hx, hy, PISO), 'parede', chanfro=0.03)
    L.caixa((w + 0.01, d + 0.01, 0.12), (hx, hy, PISO + 0.36), 'amarelo')
    L.caixa((w + 0.08, d + 0.08, 0.06), (hx, hy, PISO + h), 'metal_escuro')
    L.placa(0.3, 0.36, (hx - 0.28, hy - d / 2, PISO + 0.36), 'escuro', 'frente')
    L.placa(0.3, 0.14, (hx + 0.25, hy - d / 2, PISO + 0.3), 'vidro', 'frente')
    L.placa(0.3, 0.14, (hx + w / 2, hy, PISO + 0.3), 'vidro', 'direita')
    L.cano((gx, gy - 0.4, PISO + 0.3), (gx, hy + d / 2, PISO + 0.3), 0.04, 'amarelo')
    topo = PISO + h + 0.06
    L.anel(0.3, 0.26, 0.1, (hx, hy, topo), 'metal_escuro', lados=12)
    ventilador((hx, hy, topo + 0.04), 0.24, 'gira_1')
    # raio de energia: cabo até o poste
    L.caixa((0.35, 0.3, 0.32), (1.65, -1.55, PISO), 'amarelo', chanfro=0.02)
    for xx in (1.55, 1.75):
        L.cilindro(0.025, 0.14, (xx, -1.55, PISO + 0.32), 'parede', lados=5)

    # 5) Queimador de segurança (queima o gás que sobra)
    qx, qy = 1.6, 1.55
    L.cano((qx, qy, PISO), (qx, qy, PISO + 1.25), 0.05, 'metal_escuro')
    L.cilindro(0.08, 0.06, (qx, qy, PISO + 1.25), 'metal', lados=6)
    L.cone(0.07, 0.22, (qx, qy, PISO + 1.31), 'laranja', lados=5)
    L.cone(0.04, 0.12, (qx, qy, PISO + 1.31), 'amarelo', lados=5)

    # Arbustos
    L.arbusto((-1.65, 1.7, PISO), 0.16, 'verde')
    L.arbusto((-1.75, -0.3, PISO), 0.14, 'verde_escuro')
    L.arbusto((-0.3, -1.7, PISO), 0.13, 'verde')


L.principal(__file__, construir)
