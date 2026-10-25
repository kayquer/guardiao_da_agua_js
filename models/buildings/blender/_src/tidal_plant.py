"""Usina Maremotriz (tidal_plant, 2×2, sobre a água): uma barragem baixa de concreto atravessa a água com
comportas; na frente, o canal por onde a maré entra e sai gira uma turbina (nó "pas_1", gira no eixo do rotor);
casa de controle com faixa amarela e cabo até o poste. Inspiração: o projeto da Baía de São Marcos (MA)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    H = 0.62  # altura da barragem acima da água
    # Água: mar aberto atrás (mais funda) e o canal da frente
    L.caixa((4.0, 1.8, 0.14), (0, 1.1, 0), 'agua_funda')
    L.caixa((4.0, 2.2, 0.1), (0, -0.9, 0), 'agua')

    # Barragem baixa de lado a lado, com coroamento e guarda-corpo
    L.prisma([(-0.45, 0), (0.35, 0), (0.25, H), (-0.3, H)], 4.0, (0, 0.2, 0), 'concreto', eixo='X', chanfro=0.03)
    L.caixa((4.0, 0.5, 0.06), (0, 0.18, H), 'concreto_escuro')
    for x in (-1.7, -0.85, 0.85, 1.7):
        L.cano((x, 0.0, H + 0.06), (x, 0.0, H + 0.26), 0.018, 'metal', lados=4)
    L.cano((-1.9, 0.0, H + 0.26), (1.9, 0.0, H + 0.26), 0.018, 'metal', lados=4)

    # Comportas (azuis) nos dois lados da turbina
    for x in (-1.25, 1.25):
        L.caixa((0.55, 0.12, H - 0.1), (x, -0.22, 0.08), 'telhado_azul', chanfro=0.02)
        L.caixa((0.62, 0.16, 0.1), (x, -0.22, H - 0.04), 'amarelo')

    # Canal central: a abertura por onde a maré passa e a turbina gira (pás de 3 pontas no plano XZ, frente -Y)
    L.caixa((0.14, 0.7, H), (-0.62, -0.3, 0), 'concreto_escuro')
    L.caixa((0.14, 0.7, H), (0.62, -0.3, 0), 'concreto_escuro')
    L.caixa((1.38, 0.7, 0.1), (0, -0.3, H - 0.1), 'concreto_escuro')
    L.cilindro(0.09, 0.32, (0, -0.48, 0.3), 'metal_escuro', lados=8, rot=(90, 0, 0))
    L.rotor((0, -0.66, 0.3), 0.27, 'parede', 'metal', nome='pas_1', pas=3, largura=0.1)
    # marolas saindo do canal
    for i, x in enumerate((-0.35, 0.0, 0.35)):
        L.caixa((0.22, 0.05, 0.02), (x, -1.1 - 0.15 * i, 0.1), 'parede', rot=(0, 0, 10 * (i - 1)))

    # Casa de controle sobre a barragem (lado direito) com faixa amarela e janelas
    hx, hy, w, d, h = 1.35, 0.55, 0.95, 0.7, 0.55
    L.caixa((w, d, h), (hx, hy, H), 'parede', chanfro=0.03)
    L.caixa((w + 0.01, d + 0.01, 0.1), (hx, hy, H + 0.3), 'amarelo')
    L.caixa((w + 0.08, d + 0.08, 0.06), (hx, hy, H + h), 'metal_escuro')
    L.placa(0.26, 0.16, (hx - 0.2, hy - d / 2, H + 0.32), 'vidro', 'frente')
    L.placa(0.26, 0.16, (hx + 0.2, hy - d / 2, H + 0.32), 'vidro', 'frente')
    L.placa(0.3, 0.16, (hx + w / 2, hy, H + 0.32), 'vidro', 'direita')
    L.placa(0.22, 0.3, (hx, hy - d / 2, H), 'escuro', 'frente')

    # Poste de energia no lado esquerdo com a lua (símbolo da maré) em amarelo
    L.cano((-1.6, 0.55, H), (-1.6, 0.55, H + 0.95), 0.03, 'metal_escuro', lados=5)
    L.caixa((0.5, 0.05, 0.05), (-1.6, 0.55, H + 0.85), 'metal_escuro')
    L.cupula(0.12, (-1.6, 0.55, H + 0.97), 'amarelo', lados=8, aneis=2)
    # boias
    L.esfera(0.08, (-1.6, -1.3, 0.12), 'laranja')
    L.esfera(0.08, (1.6, -1.4, 0.12), 'laranja')


L.principal(__file__, construir)
