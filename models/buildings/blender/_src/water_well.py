"""Poço Artesiano (water_well, 1×1): torre de perfuração sobre a boca do poço, cano até a caixa e bica no cocho."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((2.0, 2.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    piso = 0.08
    # Laje redonda de concreto em volta da boca do poço
    L.cilindro(0.62, 0.08, (-0.3, -0.1, piso), 'concreto', lados=10)
    z0 = piso + 0.08
    # Boca do poço: tubo de revestimento, flange e registro
    L.cilindro(0.16, 0.32, (-0.3, -0.1, z0), 'metal', lados=8)
    L.cilindro(0.21, 0.05, (-0.3, -0.1, z0 + 0.3), 'metal_escuro', lados=8)
    L.cilindro(0.11, 0.12, (-0.3, -0.1, z0 + 0.35), 'cano', lados=8)
    # Torre de perfuração (tripé) com polia no alto
    topo = (-0.3, -0.1, z0 + 1.55)
    for (dx, dy) in ((-0.5, -0.38), (0.5, -0.38), (0.0, 0.55)):
        L.cano((-0.3 + dx, -0.1 + dy, z0), topo, 0.035, 'laranja', lados=5)
    L.cano((-0.55, -0.29, z0 + 0.55), (-0.05, -0.29, z0 + 0.55), 0.025, 'laranja', lados=4)
    L.cilindro(0.1, 0.06, (topo[0], topo[1] + 0.03, topo[2] - 0.05), 'metal_escuro', lados=8, rot=(90, 0, 0))
    L.cano((topo[0], topo[1], topo[2] - 0.1), (-0.3, -0.1, z0 + 0.47), 0.012, 'escuro', lados=3)  # cabo

    # Caixa d'água azul que recebe a água do poço
    tx, ty = 0.5, 0.45
    L.caixa((0.62, 0.62, 0.1), (tx, ty, piso), 'concreto_escuro')
    L.cilindro(0.3, 0.55, (tx, ty, piso + 0.1), 'cano', lados=10, chanfro=0.02)
    L.cilindro(0.32, 0.12, (tx, ty, piso + 0.65), 'telhado_azul', lados=10, r_topo=0.12)
    # Cano: boca do poço → caixa
    L.cano((-0.3, -0.1, z0 + 0.22), (0.1, -0.1, z0 + 0.22), 0.06)
    L.cano((0.1, -0.1, z0 + 0.22), (0.1, ty, z0 + 0.22), 0.06)
    L.cano((0.1, ty, z0 + 0.22), (tx - 0.28, ty, z0 + 0.22), 0.06)

    # Bica e cocho de pedra com água na frente
    cx, cy = 0.5, -0.55
    L.tanque(0.75, 0.38, 0.22, (cx, cy, piso), 'agua', 'pedra', parede=0.07, nivel=0.06)
    L.cano((tx, ty - 0.3, piso + 0.4), (tx, cy + 0.05, piso + 0.4), 0.04)
    L.cano((tx, cy + 0.05, piso + 0.4), (tx, cy + 0.05, piso + 0.3), 0.04)
    L.caixa((0.04, 0.04, 0.12), (tx, cy + 0.05, piso + 0.17), 'agua')  # filete de água caindo
    # Arbustos e pedras
    L.arbusto((-0.82, 0.75, piso), 0.16, 'verde')
    L.arbusto((-0.55, 0.82, piso), 0.12, 'verde_escuro')
    L.esfera(0.09, (0.88, -0.1, piso + 0.03), 'pedra', escala=(1.2, 1, 0.6))


L.principal(__file__, construir)
