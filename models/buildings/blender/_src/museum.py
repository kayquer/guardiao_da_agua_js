"""Museu (museum, 3×3): templo clássico com escadaria larga, seis colunas, frontão, faixas roxas,
claraboia de vidro no telhado e uma escultura de gota d'água na praça da frente."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((6.0, 6.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    L.caixa((5.0, 5.2, 0.06), (0, 0.1, 0.08), 'piso')
    piso = 0.14

    # Corpo do museu
    by, w, d, h = 0.75, 4.2, 2.8, 1.5
    L.caixa((w, d, 0.2), (0, by, piso), 'pedra', chanfro=0.03)          # embasamento
    L.caixa((w - 0.3, d - 0.3, h), (0, by + 0.1, piso + 0.2), 'creme', chanfro=0.03)
    L.caixa((w, d, 0.16), (0, by, piso + 0.2 + h), 'parede', chanfro=0.02)  # entablamento
    L.telhado(w - 0.1, d - 0.1, 0.55, (0, by, piso + 0.36 + h), 'telhado_vermelho', beiral=0.05, eixo='Y')
    # Frontão branco cobrindo a empena da frente
    frente = by - d / 2
    L.prisma([(-w / 2, 0), (w / 2, 0), (0, 0.6)], 0.08, (0, frente - 0.02, piso + 0.36 + h), 'parede', eixo='Y')
    L.prisma([(-w / 2 + 0.35, 0.08), (w / 2 - 0.35, 0.08), (0, 0.45)], 0.04, (0, frente - 0.07, piso + 0.36 + h),
             'roxo', eixo='Y')
    # Claraboia de vidro em cima
    L.caixa((0.9, 1.0, 0.25), (0, by + 0.3, piso + 0.8 + h), 'vidro_escuro', chanfro=0.02)

    # Seis colunas na frente sobre a escadaria
    for i, (lw, ly) in enumerate(((4.4, 1.3), (4.2, 1.1), (4.0, 0.9))):
        L.caixa((lw, ly, 0.08), (0, frente - ly / 2 + 0.2, piso + i * 0.08 - 0.02), 'parede')
    zc = piso + 0.22
    for i in range(6):
        x = -1.75 + i * 0.7
        L.cilindro(0.15, 0.08, (x, frente - 0.45, zc), 'pedra', lados=8)
        L.cilindro(0.11, h - 0.14, (x, frente - 0.45, zc + 0.08), 'parede', lados=8)
        L.caixa((0.3, 0.3, 0.06), (x, frente - 0.45, zc + h - 0.08), 'pedra')
    L.caixa((w, 0.65, 0.16), (0, frente - 0.28, piso + 0.2 + h), 'parede')
    # Porta grande e faixas (banners) roxas entre as colunas
    L.placa(0.6, 0.85, (0, frente + 0.15, zc + 0.43), 'madeira_escura', 'frente')
    for x in (-1.05, 1.05):
        L.placa(0.32, 0.8, (x, frente + 0.15, zc + 0.72), 'roxo', 'frente')
        L.placa(0.16, 0.16, (x, frente + 0.12, zc + 0.85), 'flor_amarela', 'frente')
    L.janelas('direita', w / 2 - 0.15, piso + 0.95, by - 0.7, by + 1.0, 3, 0.3, 0.6, moldura='parede')

    # Escultura de gota d'água sobre pedestal na praça
    sx, sy = 0.0, -2.0
    L.cilindro(0.55, 0.12, (sx, sy, piso), 'pedra', lados=10)
    L.caixa((0.35, 0.35, 0.4), (sx, sy, piso + 0.12), 'parede', chanfro=0.02)
    L.esfera(0.24, (sx, sy, piso + 0.78), 'agua', escala=(1, 1, 0.95), sub=2)
    L.cone(0.2, 0.32, (sx, sy, piso + 0.86), 'agua', lados=10)
    # Árvores, bancos e postes
    for (x, y) in ((-2.3, -2.2), (2.3, -2.2), (-2.4, 2.4), (2.4, 2.4)):
        L.arvore((x, y, piso), 1.0, 'verde')
    for x in (-1.3, 1.3):
        L.caixa((0.6, 0.2, 0.08), (x, -2.1, piso + 0.12), 'madeira')
        L.caixa((0.06, 0.18, 0.12), (x - 0.25, -2.1, piso), 'metal_escuro')
        L.caixa((0.06, 0.18, 0.12), (x + 0.25, -2.1, piso), 'metal_escuro')


L.principal(__file__, construir)
