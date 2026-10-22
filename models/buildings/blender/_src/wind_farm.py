"""Campo Eólico (wind_farm, 2×2): três aerogeradores brancos de alturas diferentes (pás como nós separados,
"pas_1".."pas_3", pivô no cubo) sobre um morrinho de grama, com subestação de faixa amarela."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def turbina(x, y, alt, raio, n):
    L.cilindro(0.2, 0.08, (x, y, 0.08), 'concreto', lados=8)
    L.cilindro(0.11, alt, (x, y, 0.16), 'parede', lados=8, r_topo=0.06)
    L.cilindro(0.115, 0.06, (x, y, 0.3), 'agua', lados=8)  # faixa colorida da base
    topo = 0.16 + alt
    L.caixa((0.16, 0.4, 0.16), (x, y + 0.05, topo - 0.04), 'parede', chanfro=0.02)  # nacele
    L.rotor((x, y - 0.18, topo + 0.04), raio, 'parede', 'metal', nome=f'pas_{n}')


def construir():
    L.caixa((4.0, 4.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    turbina(-1.0, 0.85, 3.2, 1.05, 1)
    turbina(0.95, 0.35, 2.7, 0.95, 2)
    turbina(-0.55, -1.05, 2.2, 0.85, 3)
    # Caminho de terra ligando as torres
    L.caixa((0.3, 2.2, 0.02), (-0.75, -0.1, 0.08), 'areia', rot=(0, 0, 12))
    L.caixa((2.0, 0.3, 0.02), (0.15, 0.55, 0.08), 'areia', rot=(0, 0, -15))
    # Subestação (faixa amarela + raio)
    sx, sy = 1.2, -1.25
    L.caixa((1.0, 0.7, 0.5), (sx, sy, 0.08), 'parede', chanfro=0.03)
    L.caixa((1.05, 0.75, 0.06), (sx, sy, 0.58), 'metal_escuro')
    L.caixa((1.01, 0.71, 0.1), (sx, sy, 0.4), 'amarelo')
    L.placa(0.24, 0.32, (sx - 0.2, sy - 0.35, 0.24), 'escuro', 'frente')
    L.placa(0.24, 0.16, (sx + 0.2, sy - 0.35, 0.28), 'vidro', 'frente')
    # Arbustos
    for (x, y, r) in ((1.6, 1.6, 0.18), (-1.65, -1.6, 0.16), (0.2, 1.7, 0.14), (-1.7, 0.0, 0.15)):
        L.arbusto((x, y, 0.08), r, 'verde')


L.principal(__file__, construir)
