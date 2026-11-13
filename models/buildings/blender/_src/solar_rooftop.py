"""Telhados Solares (solar_rooftop, 1×1): três casinhas de telha cerâmica com placas solares azul-escuras no
telhado, inversor com raio amarelo na parede e o poste do medidor ligando o bairro à rede — geração distribuída,
cada casa produz a própria energia."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def placas(x, y0, z0, larg, p, alt, n):
    """Placas solares sobre a água da frente de um telhado de duas águas (cumeeira em X)."""
    ang = math.atan2(alt, p)
    graus = math.degrees(ang)
    comp = math.hypot(p, alt)
    # ponto do meio da água da frente, um pouco acima da telha
    nz, ny = math.cos(ang), -math.sin(ang)
    cy = y0 - p * 0.5 + ny * 0.012
    cz = z0 + alt * 0.5 + nz * 0.012
    L.caixa((larg * 0.86, comp * 0.72, 0.025), (x, cy, cz), 'metal', rot=(graus, 0, 0))
    L.caixa((larg * 0.82, comp * 0.66, 0.03), (x, cy + ny * 0.004, cz + nz * 0.004), 'painel_solar', rot=(graus, 0, 0))
    for i in range(1, n):
        dx = -larg * 0.41 + i * larg * 0.82 / n
        L.caixa((0.018, comp * 0.66, 0.032), (x + dx, cy + ny * 0.005, cz + nz * 0.005), 'vidro', rot=(graus, 0, 0))


def casa(x, y, w, d, h, parede, n_placas, porta='madeira'):
    L.caixa((w, d, h), (x, y, 0.08), parede, chanfro=0.02)
    L.caixa((w + 0.02, d + 0.02, 0.06), (x, y, 0.08), 'concreto_escuro')  # rodapé
    alt = 0.3
    L.telhado(w, d, alt, (x, y, 0.08 + h), 'telhado_vermelho', beiral=0.07)
    placas(x, y, 0.08 + h, w + 0.14, d / 2 + 0.07, alt, n_placas)
    # porta e janela na frente, janela no lado direito
    L.placa(0.14, 0.26, (x - w * 0.22, y - d / 2, 0.08 + 0.26), porta, 'frente')
    L.placa(0.18, 0.14, (x + w * 0.2, y - d / 2, 0.08 + h * 0.68), 'vidro', 'frente')
    L.placa(0.16, 0.13, (x + w / 2, y, 0.08 + h * 0.68), 'vidro', 'direita')


def construir():
    L.caixa((2.0, 2.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    # Calçada na frente e caminhos até as portas
    L.caixa((2.0, 0.3, 0.02), (0, -0.85, 0.08), 'concreto')
    # Três casinhas: duas na frente, uma maior atrás
    casa(-0.48, -0.25, 0.72, 0.62, 0.42, 'creme', 3)
    casa(0.45, -0.32, 0.62, 0.52, 0.38, 'parede', 2, porta='madeira_escura')
    casa(0.05, 0.55, 0.95, 0.6, 0.5, 'parede', 4)
    L.caixa((0.12, 0.3, 0.02), (-0.66, -0.64, 0.085), 'concreto')
    L.caixa((0.12, 0.3, 0.02), (0.3, -0.68, 0.085), 'concreto')

    # Inversor (caixa cinza com raio amarelo) na parede direita da casa da frente
    ix, iy = 0.76 + 0.02, -0.38
    L.caixa((0.06, 0.16, 0.2), (ix + 0.03, iy, 0.2), 'metal', chanfro=0.01)
    L.placa(0.1, 0.1, (ix + 0.06, iy, 0.36), 'amarelo', 'direita', espessura=0.02)
    L.prisma([(-0.025, 0.0), (0.018, 0.04), (0.0, 0.04), (0.028, 0.08), (-0.01, 0.04), (0.007, 0.04)], 0.01,
             (ix + 0.075, iy, 0.27), 'escuro', eixo='X')
    L.cano((ix + 0.03, iy, 0.4), (ix + 0.03, iy, 0.47), 0.012, 'escuro', lados=4)

    # Poste com o medidor (relógio de luz) na calçada e cabos para as casas
    px, py = 0.88, -0.86
    L.cano((px, py, 0.08), (px, py, 1.15), 0.03, 'concreto', lados=6)
    L.caixa((0.3, 0.04, 0.04), (px, py, 1.05), 'concreto_escuro')
    L.caixa((0.12, 0.08, 0.16), (px, py - 0.05, 0.42), 'parede', chanfro=0.01)
    L.placa(0.08, 0.07, (px, py - 0.09, 0.53), 'vidro', 'frente', espessura=0.015)
    L.caixa((0.122, 0.082, 0.035), (px, py - 0.05, 0.47), 'amarelo')
    L.cano((px - 0.12, py, 1.07), (0.6, -0.38, 0.62), 0.008, 'escuro', lados=3)
    L.cano((px - 0.12, py, 1.07), (-0.3, -0.25, 0.68), 0.008, 'escuro', lados=3)
    L.cano((px + 0.12, py, 1.07), (0.35, 0.55, 0.72), 0.008, 'escuro', lados=3)

    # Quintal: arbustos e uma árvore no fundo
    L.arvore((-0.75, 0.62, 0.08), 0.75, 'verde')
    L.arbusto((0.82, 0.25, 0.08), 0.12, 'verde_escuro')
    L.arbusto((-0.86, -0.75, 0.08), 0.1, 'verde')
    # Murinhos baixos dos lotes
    L.caixa((0.04, 0.5, 0.1), (-0.02, -0.4, 0.08), 'concreto')


L.principal(__file__, construir)
