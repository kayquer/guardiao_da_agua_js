"""Eólica Offshore (wind_offshore, 3×3, sobre a água): três aerogeradores grandes cravados no fundo (monopilares)
com a peça de transição amarela saindo da água, plataforma e escadinha; pás em nós "pas_1".."pas_3" que giram
no jogo com o vento. Uma subestação sobre pernas junta a energia e um barquinho de manutenção passa por perto."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

MAR = 0.14


def espuma(x, y, r):
    L.esfera(r, (x, y, MAR - 0.02), 'parede', escala=(1.4, 1.0, 0.25))


def turbina(x, y, alt, raio, n):
    # monopilar escuro aparecendo na linha d'água + peça de transição amarela
    L.cilindro(0.17, 0.12, (x, y, MAR - 0.04), 'metal_escuro', lados=10)
    L.cilindro(0.15, 0.5, (x, y, MAR + 0.08), 'amarelo', lados=10)
    L.cilindro(0.3, 0.04, (x, y, MAR + 0.58), 'metal_escuro', lados=10)  # plataforma de acesso
    L.caixa((0.06, 0.03, 0.46), (x, y - 0.165, MAR + 0.1), 'metal')       # escadinha
    espuma(x - 0.05, y - 0.12, 0.24)
    # torre branca afinando, nacele e rotor
    base = MAR + 0.62
    L.cilindro(0.12, alt, (x, y, base), 'parede', lados=10, r_topo=0.07)
    topo = base + alt
    L.caixa((0.2, 0.55, 0.2), (x, y + 0.08, topo - 0.06), 'parede', chanfro=0.02)
    L.caixa((0.201, 0.12, 0.201), (x, y + 0.3, topo - 0.06), 'amarelo')
    L.rotor((x, y - 0.24, topo + 0.04), raio, 'parede', 'metal', nome=f'pas_{n}', largura=0.15)


def construir():
    # Mar: lâmina turquesa sobre o fundo azul
    L.caixa((6.0, 6.0, MAR), (0, 0, 0), 'agua')
    for (x, y, r) in ((-2.3, -2.2, 0.18), (0.6, 0.1, 0.14), (2.4, 0.6, 0.16), (-1.0, 2.5, 0.15), (2.5, 2.5, 0.12)):
        espuma(x, y, r)

    turbina(-1.55, 1.3, 3.7, 1.3, 1)
    turbina(1.35, 1.75, 3.4, 1.2, 2)
    turbina(-0.25, -1.25, 3.0, 1.1, 3)

    # Subestação offshore: quatro pernas amarelas, convés e casa de equipamentos
    sx, sy = 1.75, -1.35
    for (dx, dy) in ((-0.45, -0.38), (0.45, -0.38), (0.45, 0.38), (-0.45, 0.38)):
        L.cilindro(0.07, 0.62, (sx + dx, sy + dy, MAR - 0.04), 'amarelo', lados=6)
        espuma(sx + dx, sy + dy, 0.1)
    L.caixa((1.2, 1.0, 0.08), (sx, sy, MAR + 0.58), 'metal_escuro', chanfro=0.015)
    L.caixa((0.85, 0.65, 0.5), (sx - 0.08, sy + 0.08, MAR + 0.66), 'parede', chanfro=0.02)
    L.caixa((0.86, 0.66, 0.08), (sx - 0.08, sy + 0.08, MAR + 0.98), 'amarelo')
    L.caixa((0.9, 0.7, 0.05), (sx - 0.08, sy + 0.08, MAR + 1.16), 'metal_escuro')
    L.janelas('frente', sy + 0.08 - 0.325, MAR + 0.85, sx - 0.4, sx + 0.24, 2, 0.16, 0.14)
    L.placa(0.2, 0.14, (sx - 0.08 + 0.425, sy + 0.08, MAR + 0.85), 'vidro', 'direita')
    L.prisma([(-0.05, 0.0), (0.04, 0.1), (0.0, 0.1), (0.06, 0.2), (-0.025, 0.1), (0.012, 0.1)], 0.03,
             (sx - 0.08, sy + 0.08 - 0.34, MAR + 0.69), 'escuro', eixo='Y')
    # guindastezinho e antena
    L.cano((sx + 0.45, sy - 0.35, MAR + 0.66), (sx + 0.45, sy - 0.35, MAR + 1.25), 0.03, 'laranja', lados=4)
    L.cano((sx + 0.45, sy - 0.35, MAR + 1.22), (sx + 0.1, sy - 0.45, MAR + 1.3), 0.02, 'laranja', lados=4)
    L.cano((sx - 0.3, sy + 0.25, MAR + 1.21), (sx - 0.3, sy + 0.25, MAR + 1.55), 0.012, 'metal', lados=3)

    # Barco de manutenção
    bx, by = -1.85, -1.55
    L.prisma([(-0.32, 0.0), (0.22, 0.0), (0.38, 0.12), (-0.38, 0.12)], 0.32, (bx, by, MAR - 0.03), 'parede',
             eixo='X', rot=(0, 0, 90))
    L.caixa((0.22, 0.3, 0.06), (bx, by + 0.02, MAR + 0.09), 'laranja')
    L.caixa((0.2, 0.22, 0.16), (bx, by + 0.08, MAR + 0.15), 'parede', chanfro=0.01)
    L.placa(0.16, 0.06, (bx, by - 0.03, MAR + 0.27), 'vidro', 'frente', espessura=0.02)
    espuma(bx, by + 0.48, 0.14)


L.principal(__file__, construir)
