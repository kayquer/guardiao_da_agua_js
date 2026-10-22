"""Usina Solar (solar_farm, 3×3): fileiras de painéis inclinados para o sol, inversor com raio amarelo
e transformador ligado à rede."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def painel(x, y, larg, prof=0.95, alt=0.35, incl=28):
    """Mesa de painéis: dois pés, painel azul inclinado (frente baixa) com moldura e linhas das células."""
    L.cano((x - larg / 2 + 0.15, y + 0.2, 0.08), (x - larg / 2 + 0.15, y + 0.2, alt + 0.25), 0.03, 'metal', lados=4)
    L.cano((x + larg / 2 - 0.15, y + 0.2, 0.08), (x + larg / 2 - 0.15, y + 0.2, alt + 0.25), 0.03, 'metal', lados=4)
    L.caixa((larg + 0.06, prof + 0.06, 0.04), (x, y, alt), 'metal', rot=(incl, 0, 0))
    L.caixa((larg, prof, 0.05), (x, y, alt + 0.005), 'painel_solar', rot=(incl, 0, 0))
    # linhas brancas das células (faixas finas no plano do painel)
    for i in range(1, 4):
        L.caixa((0.025, prof, 0.052), (x - larg / 2 + i * larg / 4, y, alt + 0.006), 'vidro', rot=(incl, 0, 0))


def construir():
    L.caixa((6.0, 6.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    # Caminho de cascalho na frente e no meio
    L.caixa((6.0, 0.5, 0.02), (0, -2.55, 0.08), 'areia')
    L.caixa((0.45, 5.0, 0.02), (0.75, 0.0, 0.08), 'areia')
    # Três fileiras × duas mesas de painéis
    for y in (-1.6, -0.15, 1.3):
        painel(-1.15, y, 2.6)
        painel(2.05, y, 1.6)
    # Inversor + transformador no fundo à direita (com raio amarelo)
    ix, iy = 2.2, 2.5
    L.caixa((1.2, 0.6, 0.6), (ix - 0.1, iy, 0.08), 'parede', chanfro=0.03)
    L.caixa((1.25, 0.65, 0.06), (ix - 0.1, iy, 0.68), 'metal_escuro')
    L.placa(0.3, 0.3, (ix - 0.35, iy - 0.3, 0.45), 'amarelo', 'frente')
    L.prisma([(-0.06, 0.0), (0.05, 0.12), (0.0, 0.12), (0.08, 0.24), (-0.03, 0.12), (0.02, 0.12)], 0.03,
             (ix - 0.35, iy - 0.33, 0.33), 'escuro', eixo='Y')
    L.placa(0.3, 0.42, (ix + 0.15, iy - 0.3, 0.3), 'metal', 'frente')
    # transformador com isoladores
    L.caixa((0.45, 0.4, 0.45), (-1.6, 2.5, 0.08), 'metal_escuro', chanfro=0.02)
    for x in (-1.75, -1.6, -1.45):
        L.cilindro(0.04, 0.2, (x, 2.5, 0.53), 'parede', lados=5)
    # Poste com cabo saindo para a cidade
    L.cano((-2.6, 2.6, 0.08), (-2.6, 2.6, 1.5), 0.04, 'madeira_escura', lados=5)
    L.caixa((0.5, 0.05, 0.05), (-2.6, 2.6, 1.38), 'madeira_escura')
    L.cano((-2.6, 2.6, 1.42), (-1.6, 2.5, 0.75), 0.012, 'escuro', lados=3)
    # Cerca em volta
    L.cerca(-2.85, -2.85, 2.85, 2.85, alt=0.22, cor='metal_escuro')


L.principal(__file__, construir)
