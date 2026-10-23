"""
Reservatório (water_tank, 1×1): tanque cilíndrico apoiado no chão, com faixas azuis, teto cônico,
escada lateral com guarda-corpo, régua de nível mostrando a água por dentro, cano de entrada (vem da
captação/tratamento) e de saída (vai para a cidade) com registro, e uma bordinha de grama.
Pedagógico: a régua azul na frente mostra "quanto de água está guardada".
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    # Base: grama com laje de concreto (1 célula = 2 unidades)
    L.caixa((2.0, 2.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    piso = 0.08
    L.cilindro(0.86, 0.1, (0.05, 0.1, piso), 'concreto', lados=12, chanfro=0.02)
    z0 = piso + 0.1

    # Tanque: corpo de metal claro, rodapé escuro e duas faixas azuis
    tx, ty, r, h = 0.05, 0.1, 0.72, 1.35
    L.cilindro(r + 0.03, 0.1, (tx, ty, z0), 'metal_escuro', lados=12)
    L.cilindro(r, h, (tx, ty, z0), 'metal', lados=12, chanfro=0.02)
    L.cilindro(r + 0.012, 0.09, (tx, ty, z0 + 0.42), 'cano', lados=12)
    L.cilindro(r + 0.012, 0.09, (tx, ty, z0 + 0.95), 'cano', lados=12)
    # Teto cônico baixo com borda e respiro
    topo = z0 + h
    L.cilindro(r + 0.06, 0.05, (tx, ty, topo), 'telhado_azul', lados=12)
    L.cilindro(r + 0.06, 0.28, (tx, ty, topo + 0.05), 'telhado_azul', lados=12, r_topo=0.14)
    L.cilindro(0.09, 0.14, (tx, ty, topo + 0.3), 'metal_escuro', lados=6)
    L.cilindro(0.13, 0.04, (tx, ty, topo + 0.44), 'metal_escuro', lados=6)

    # Régua de nível na frente (-Y): moldura escura com a água turquesa até 2/3
    fy = ty - r - 0.005
    L.placa(0.2, 1.0, (tx - 0.2, fy, z0 + 1.15), 'escuro', 'frente', espessura=0.03)
    L.placa(0.12, 0.62, (tx - 0.2, fy - 0.03, z0 + 0.8), 'agua', 'frente', espessura=0.03)
    # Plaquinha com gota (azul-água) e portinhola de inspeção
    L.placa(0.3, 0.16, (tx + 0.22, fy, z0 + 0.78), 'agua_funda', 'frente', espessura=0.03)
    L.placa(0.26, 0.34, (tx + 0.22, fy, z0 + 0.36), 'metal_escuro', 'frente', espessura=0.03)

    # Escada no lado direito (+X) com guarda-corpo no topo
    ex = tx + r + 0.06
    for dy in (-0.12, 0.12):
        L.caixa((0.03, 0.03, h + 0.05), (ex, ty + dy, z0), 'amarelo')
    for i in range(6):
        L.caixa((0.03, 0.24, 0.025), (ex, ty, z0 + 0.15 + i * 0.22), 'amarelo')
    L.cano((ex - 0.04, ty - 0.12, topo + 0.05), (ex - 0.04, ty - 0.12, topo + 0.3), 0.018, 'amarelo', lados=4)
    L.cano((ex - 0.04, ty + 0.12, topo + 0.05), (ex - 0.04, ty + 0.12, topo + 0.3), 0.018, 'amarelo', lados=4)
    L.cano((ex - 0.04, ty - 0.12, topo + 0.3), (ex - 0.04, ty + 0.12, topo + 0.3), 0.018, 'amarelo', lados=4)

    # Cano de entrada (atrás, vem do chão e sobe até o topo)
    ix, iy = tx - 0.45, ty + r - 0.05
    L.cano((ix, iy + 0.2, -0.05), (ix, iy + 0.2, topo - 0.1), 0.06)
    L.cano((ix, iy + 0.2, topo - 0.1), (ix, iy - 0.05, topo - 0.1), 0.06)
    # Cano de saída (frente-esquerda, embaixo) com registro vermelho, desce e some no chão
    ox, oy = tx - 0.55, ty - 0.45
    L.cano((ox + 0.12, oy + 0.1, z0 + 0.18), (-0.82, -0.62, z0 + 0.18), 0.07)
    L.cano((-0.82, -0.62, z0 + 0.18), (-0.82, -0.62, -0.05), 0.07)
    L.cilindro(0.11, 0.04, (-0.6, -0.48, z0 + 0.12), 'vermelho', lados=8, rot=(0, 90, 33))
    L.cano((-0.6, -0.48, z0 + 0.18), (-0.6, -0.48, z0 + 0.32), 0.02, 'escuro', lados=4)
    L.cilindro(0.08, 0.02, (-0.6, -0.48, z0 + 0.32), 'vermelho', lados=6)

    # Arbustos nos cantos livres
    L.arbusto((0.8, -0.78, piso), 0.15, 'verde')
    L.arbusto((-0.82, 0.8, piso), 0.14, 'verde_escuro')
    L.arbusto((0.85, 0.85, piso), 0.12, 'verde')


L.principal(__file__, construir)
