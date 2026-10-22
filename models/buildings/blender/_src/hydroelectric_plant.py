"""Hidrelétrica (hydroelectric_plant, 3×3, sobre a água): represa alta atrás, barragem de concreto, vertedouro
com a queda d'água, casa de força com as tubulações (condutos forçados) e torre de transmissão amarela."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    H = 1.35          # altura da barragem
    NIVEL = 1.12      # nível da represa

    def face(z):
        """y da face de jusante (frente inclinada) da barragem na altura z."""
        return -0.7 + 0.9 * (z / H)

    # Rio embaixo (frente) e represa cheia (fundo, nível alto)
    L.caixa((6.0, 2.6, 0.12), (0, -1.7, 0), 'agua')
    L.caixa((6.0, 2.6, NIVEL), (0, 1.7, 0), 'agua_funda')
    # Margens de grama nos lados da represa
    L.caixa((0.55, 2.6, H), (-2.72, 1.7, 0), 'grama', chanfro=0.03)
    L.caixa((0.55, 2.6, H), (2.72, 1.7, 0), 'grama', chanfro=0.03)
    L.arvore((-2.7, 2.4, H), 0.9, 'verde_escuro', tipo='pinheiro')
    L.arvore((2.7, 2.5, H), 0.9, 'verde')
    L.arvore((2.75, 1.4, H), 0.7, 'verde_escuro', tipo='pinheiro')

    # Barragem: perfil trapezoidal (mais grossa embaixo), de lado a lado
    L.prisma([(-0.7, 0), (0.45, 0), (0.45, H), (0.2, H)], 6.0, (0, 0.0, 0), 'concreto', eixo='X', chanfro=0.03)
    L.caixa((6.0, 0.36, 0.1), (0, 0.32, H), 'concreto_escuro')  # coroamento (estrada no topo)
    for x in (-2.4, -1.2, 0.0, 1.2, 2.4):
        L.cano((x, 0.2, H + 0.1), (x, 0.2, H + 0.36), 0.02, 'metal', lados=4)
        L.esfera(0.05, (x, 0.2, H + 0.38), 'amarelo')

    # Vertedouro: a água sai da represa por comportas e desce pela face da barragem
    vx, vl = -1.2, 1.2
    L.caixa((vl, 0.5, 0.06), (vx, 0.3, NIVEL - 0.02), 'agua')
    L.prisma([(face(0.12) - 0.1, 0.12), (face(0.12) + 0.02, 0.12), (face(NIVEL) + 0.02, NIVEL + 0.04),
              (face(NIVEL) - 0.08, NIVEL + 0.04)], vl, (vx, 0.0, 0), 'agua', eixo='X')
    # muros do canal acompanhando a inclinação
    for dx in (-vl / 2 - 0.05, vl / 2 + 0.05):
        L.prisma([(-0.82, 0), (0.45, 0), (0.45, H + 0.12), (face(H) - 0.1, H + 0.12)], 0.1, (vx + dx, 0.0, 0),
                 'concreto_escuro', eixo='X')
    # comportas no topo do vertedouro
    for i in range(3):
        L.caixa((0.08, 0.12, 0.28), (vx - 0.4 + i * 0.4, 0.3, H), 'metal_escuro')
    # Espuma da queda d'água
    for (dx, dy, r) in ((-0.35, -0.95, 0.16), (0.0, -1.05, 0.2), (0.35, -0.95, 0.15), (-0.15, -1.3, 0.12),
                        (0.2, -1.3, 0.13)):
        L.esfera(r, (vx + dx, dy, 0.12), 'parede', escala=(1.2, 1, 0.6))

    # Casa de força ao pé da barragem (paredes brancas, faixa amarela de energia)
    cx, cy, w, d, h = 1.0, -1.15, 2.2, 1.0, 0.85
    L.caixa((w, d, h), (cx, cy, 0.12), 'parede', chanfro=0.03)
    L.caixa((w + 0.1, d + 0.1, 0.1), (cx, cy, 0.12 + h), 'amarelo', chanfro=0.02)
    L.caixa((w + 0.01, d + 0.01, 0.12), (cx, cy, 0.12 + h - 0.22), 'amarelo')
    L.janelas('frente', cy - d / 2, 0.55, cx - 0.9, cx + 0.9, 4, 0.3, 0.28)
    L.janelas('direita', cx + w / 2, 0.55, cy - 0.3, cy + 0.3, 2, 0.26, 0.28)
    # Raio no letreiro amarelo da frente
    L.prisma([(-0.08, 0.0), (0.06, 0.16), (0.0, 0.16), (0.1, 0.32), (-0.04, 0.16), (0.02, 0.16)], 0.04,
             (cx, cy - d / 2 - 0.02, 0.12 + h - 0.33 + 0.02), 'escuro', eixo='Y')
    # Condutos forçados: da barragem até a casa de força
    for x in (0.55, 1.45):
        L.cano((x, face(1.0) + 0.05, 1.0), (x, -0.5, 0.55), 0.12, 'metal_escuro', lados=8)
    # Água saindo da casa de força (canal de fuga)
    L.caixa((1.6, 0.5, 0.05), (cx, cy - d / 2 - 0.25, 0.12), 'parede')

    # Torre de transmissão (treliça simplificada) e cabos
    tx, ty = 2.45, -1.3
    base = 0.12
    for (dx, dy) in ((-0.2, -0.2), (0.2, -0.2), (0.2, 0.2), (-0.2, 0.2)):
        L.cano((tx + dx, ty + dy, base), (tx + dx * 0.25, ty + dy * 0.25, base + 2.1), 0.03, 'amarelo', lados=4)
    L.caixa((0.75, 0.06, 0.06), (tx, ty, base + 1.6), 'amarelo')
    L.caixa((0.55, 0.06, 0.06), (tx, ty, base + 1.95), 'amarelo')
    for x in (-0.35, 0.35):
        L.cilindro(0.03, 0.12, (tx + x, ty, base + 1.48), 'parede', lados=5)
    L.cano((tx - 0.35, ty, base + 1.5), (cx + w / 2 - 0.1, cy, 0.12 + h + 0.1), 0.012, 'escuro', lados=3)


L.principal(__file__, construir)
