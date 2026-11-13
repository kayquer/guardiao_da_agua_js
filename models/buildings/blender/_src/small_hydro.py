"""PCH — Pequena Central Hidrelétrica (small_hydro, 2×2, sobre a água): soleira baixa de concreto atravessando
o riacho, represinha atrás, vertedouro com a água descendo, tomada d'água com um conduto forçado até a casa de
força na margem e a água devolvida ao rio (canal de fuga). Mostra que a PCH usa a queda sem alagar o vale."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    NIVEL = 0.5        # nível da represinha
    RIO = 0.12         # nível do rio abaixo da soleira
    XE, XD = -1.3, 0.9  # margens (esquerda / direita) do leito
    YS = 0.3           # linha da soleira

    # Rio embaixo (frente) e represinha (fundo)
    L.caixa((XD - XE, 2.0 + YS - 0.05, RIO), ((XE + XD) / 2, (-2.0 + YS - 0.05) / 2, 0), 'agua')
    L.caixa((XD - XE, 2.0 - YS - 0.1, NIVEL), ((XE + XD) / 2, (2.0 + YS + 0.1) / 2, 0), 'agua_funda')

    # Margens: altas atrás (represa), baixas na frente
    for (x0, x1) in ((-2.0, XE), (XD, 2.0)):
        L.caixa((x1 - x0, 2.0 - YS + 0.2, NIVEL + 0.1), ((x0 + x1) / 2, (2.0 + YS - 0.2) / 2, 0), 'grama', chanfro=0.03)
        L.caixa((x1 - x0, 2.0 + YS - 0.2, 0.22), ((x0 + x1) / 2, (-2.0 + YS - 0.2) / 2, 0), 'grama', chanfro=0.03)
    # barranco de terra na transição das margens
    L.caixa((2.0 - XD, 0.08, NIVEL + 0.08), ((XD + 2.0) / 2, YS - 0.2, 0), 'terra')
    L.caixa((XE + 2.0, 0.08, NIVEL + 0.08), ((XE - 2.0) / 2, YS - 0.2, 0), 'terra')

    # Soleira (barragem baixa): parte alta à direita, vertedouro mais baixo à esquerda
    perfil = lambda h: [(-0.38, 0), (0.2, 0), (0.2, h), (0.05, h)]  # noqa: E731
    xv = -0.4  # divisa vertedouro | soleira alta
    L.prisma(perfil(0.66), XD - xv, ((xv + XD) / 2, YS, 0), 'concreto', eixo='X', chanfro=0.02)
    L.prisma(perfil(NIVEL - 0.04), xv - XE, ((XE + xv) / 2, YS, 0), 'concreto_escuro', eixo='X')
    L.caixa((XD - xv + 0.02, 0.18, 0.05), ((xv + XD) / 2, YS + 0.12, 0.66), 'concreto_escuro')
    # Lâmina d'água passando por cima do vertedouro e descendo a face
    h = NIVEL - 0.04
    lam = [(-0.36, RIO), (-0.28, RIO), (0.05, h), (0.2, h), (0.2, h + 0.06), (0.02, h + 0.06), (-0.33, RIO + 0.06)]
    L.prisma(lam, xv - XE - 0.02, ((XE + xv) / 2, YS - 0.03, 0), 'agua', eixo='X')
    for (dx, dy, r) in ((-0.3, -0.22, 0.12), (0.05, -0.28, 0.14), (0.32, -0.2, 0.11), (-0.1, -0.5, 0.09),
                        (0.22, -0.48, 0.08)):
        L.esfera(r, ((XE + xv) / 2 + dx, YS + dy, RIO), 'parede', escala=(1.3, 1, 0.5))
    # Pilares das comportas no vertedouro
    for x in (XE + 0.05, xv - 0.05):
        L.caixa((0.08, 0.3, 0.32), (x, YS + 0.1, h), 'concreto')

    # Tomada d'água (com grade) na soleira alta e conduto forçado até a casa de força
    ix = 0.62
    L.caixa((0.36, 0.3, 0.3), (ix, YS + 0.1, 0.66), 'concreto', chanfro=0.02)
    L.caixa((0.38, 0.32, 0.05), (ix, YS + 0.1, 0.96), 'metal_escuro')
    L.placa(0.26, 0.22, (ix, YS + 0.25, 0.9), 'metal_escuro', 'tras')
    L.caixa((0.04, 0.3, 0.12), (ix - 0.12, YS + 0.1, 1.01), 'amarelo')

    # Casa de força na margem direita, embaixo (paredes brancas, faixa e telhado amarelos)
    cx, cy, w, d, hc = 1.45, -1.05, 0.74, 0.6, 0.5
    z0 = 0.22
    L.caixa((w, d, hc), (cx, cy, z0), 'parede', chanfro=0.02)
    L.caixa((w + 0.08, d + 0.08, 0.08), (cx, cy, z0 + hc), 'amarelo', chanfro=0.015)
    L.caixa((w + 0.01, d + 0.01, 0.08), (cx, cy, z0 + hc - 0.18), 'amarelo')
    L.janelas('frente', cy - d / 2, z0 + 0.3, cx - 0.3, cx + 0.3, 2, 0.2, 0.18)
    L.janelas('direita', cx + w / 2, z0 + 0.3, cy - 0.2, cy + 0.2, 2, 0.18, 0.18)
    L.prisma([(-0.05, 0.0), (0.04, 0.1), (0.0, 0.1), (0.06, 0.2), (-0.025, 0.1), (0.012, 0.1)], 0.03,
             (cx, cy - d / 2 - 0.02, z0 + hc - 0.17), 'escuro', eixo='Y')
    L.cano((ix + 0.05, YS + 0.05, 0.82), (cx - 0.15, cy + d / 2 - 0.02, z0 + 0.38), 0.085,
           'metal_escuro', lados=8)
    L.cilindro(0.1, 0.06, (cx - 0.15, cy + d / 2 + 0.02, z0 + 0.32), 'metal', lados=8, rot=(90, 0, 0))
    # Canal de fuga: a água sai da casa de força e volta para o rio
    L.caixa((0.5, 0.36, 0.08), (XD - 0.05, cy - 0.12, RIO + 0.02), 'agua')
    for (dx, dy) in ((-0.18, -0.05), (-0.32, -0.2)):
        L.esfera(0.07, (XD + dx, cy - 0.12 + dy, RIO + 0.02), 'parede', escala=(1.3, 1, 0.5))

    # Torre de transmissão amarela na margem alta e cabo até a casa de força
    tx, ty, tz = 1.62, 0.75, NIVEL + 0.1
    for (dx, dy) in ((-0.13, -0.13), (0.13, -0.13), (0.13, 0.13), (-0.13, 0.13)):
        L.cano((tx + dx, ty + dy, tz), (tx + dx * 0.25, ty + dy * 0.25, tz + 1.3), 0.022, 'amarelo', lados=4)
    L.caixa((0.5, 0.05, 0.05), (tx, ty, tz + 1.05), 'amarelo')
    for x in (-0.22, 0.22):
        L.cilindro(0.022, 0.08, (tx + x, ty, tz + 0.97), 'parede', lados=5)
    L.cano((tx - 0.22, ty, tz + 0.99), (cx + 0.1, cy + 0.1, z0 + hc + 0.08), 0.01, 'escuro', lados=3)

    # Mata ciliar nas margens altas
    L.arvore((-1.65, 1.6, NIVEL + 0.1), 0.85, 'verde_escuro', tipo='pinheiro')
    L.arvore((-1.7, 0.75, NIVEL + 0.1), 0.7, 'verde')
    L.arvore((1.65, 1.6, NIVEL + 0.1), 0.8, 'verde')
    L.arvore((1.15, 1.3, NIVEL + 0.1), 0.6, 'verde_escuro', tipo='pinheiro')
    L.arbusto((-1.65, -1.4, 0.22), 0.14, 'verde')
    L.arbusto((-1.55, -0.6, 0.22), 0.12, 'verde_escuro')


L.principal(__file__, construir)
