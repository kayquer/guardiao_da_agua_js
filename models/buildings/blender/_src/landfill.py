"""Aterro Sanitário (landfill, 3×3): morro em degraus (camadas de terra com grama por cima) com drenos de gás
e um queimador aceso no topo; na frente, uma célula aberta mostrando a manta impermeável escura no fundo e o
lixo chegando; ao lado, a lagoa de chorume ligada por cano à pequena estação que trata o chorume antes de
devolver a água. Cerca em volta e guarita na entrada."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.1


def dreno(x, y, z, alt=0.35):
    """Dreno de gás: cano vertical saindo do morro, com chapéu."""
    L.cano((x, y, z), (x, y, z + alt), 0.035, 'metal_escuro', lados=6)
    L.cilindro(0.07, 0.04, (x, y, z + alt), 'metal_escuro', lados=6)


def construir():
    L.caixa((6.0, 6.0, PISO), (0, 0, 0), 'grama', chanfro=0.03)
    L.caixa((0.7, 2.0, 0.012), (2.2, -2.0, PISO), 'areia')   # acesso de terra até a guarita
    L.caixa((3.0, 0.5, 0.012), (-0.5, -1.55, PISO), 'areia')  # estrada de serviço na frente do morro

    # Morro em degraus: cada camada de lixo coberta de terra e grama
    z = PISO
    for (lx, ly, h, cor) in ((4.2, 3.6, 0.38, 'grama'), (3.2, 2.7, 0.36, 'verde'), (2.1, 1.8, 0.32, 'grama')):
        L.caixa((lx, ly, h), (-0.45, 0.85, z), 'terra', chanfro=0.04)
        L.caixa((lx - 0.08, ly - 0.08, 0.04), (-0.45, 0.85, z + h), cor)
        z += h + 0.04
    topo = z
    # Drenos de gás nas camadas + queimador (flare) aceso no topo
    for (x, y, zz) in ((-2.2, -0.6, PISO + 0.42), (1.3, -0.6, PISO + 0.42),
                       (-1.6, 0.0, PISO + 0.82), (0.75, 0.0, PISO + 0.82)):
        dreno(x, y, zz)
    fx, fy = -0.45, 0.85
    L.cilindro(0.12, 0.08, (fx, fy, topo), 'concreto_escuro', lados=6)
    L.cano((fx, fy, topo), (fx, fy, topo + 0.85), 0.05, 'metal', lados=6)
    L.cilindro(0.09, 0.08, (fx, fy, topo + 0.85), 'metal_escuro', lados=6)
    L.cone(0.15, 0.48, (fx, fy, topo + 0.93), 'laranja', lados=5)
    L.cone(0.09, 0.3, (fx, fy, topo + 0.93), 'amarelo', lados=5)
    L.cano((fx - 0.4, fy - 0.1, topo), (fx, fy, topo + 0.04), 0.03, 'metal_escuro', lados=5)  # coleta de gás

    # Célula aberta (frente-esquerda): bermas de terra, manta escura no fundo, lixo chegando
    cx, cy, cl, cp = -1.45, -2.35, 2.2, 1.05
    L.tanque(cl, cp, 0.28, (cx, cy, PISO), 'escuro', 'terra', parede=0.16, nivel=0.24)
    L.caixa((cl - 0.32, 0.03, 0.2), (cx, cy + cp / 2 - 0.175, PISO + 0.04), 'escuro')  # manta subindo a berma
    L.caixa((0.03, cp - 0.32, 0.2), (cx + cl / 2 - 0.175, cy, PISO + 0.04), 'escuro')
    L.cone(0.42, 0.26, (cx - 0.5, cy + 0.05, PISO + 0.04), 'concreto_escuro', lados=6)  # lixo espalhado
    for i, (dx, dy, cor) in enumerate(((-0.75, -0.15, 'telhado_azul'), (-0.25, 0.15, 'vermelho'),
                                        (-0.55, 0.25, 'amarelo'), (-0.15, -0.2, 'parede'),
                                        (0.05, 0.12, 'verde_garrafa'))):
        L.caixa((0.12, 0.1, 0.08), (cx + dx, cy + dy, PISO + 0.05), cor, rot=(0, 0, 30 * i))
    # trator de esteira espalhando o lixo
    L.caixa((0.36, 0.24, 0.1), (cx + 0.45, cy, PISO + 0.04), 'escuro')
    L.caixa((0.24, 0.2, 0.16), (cx + 0.47, cy, PISO + 0.14), 'amarelo')
    L.caixa((0.06, 0.3, 0.12), (cx + 0.22, cy, PISO + 0.05), 'metal_escuro')

    # Lagoa de chorume (frente-direita), com manta escura na borda
    lx, ly = 0.8, -2.3
    L.tanque(1.3, 1.0, 0.22, (lx, ly, PISO), 'chorume', 'escuro', parede=0.08, nivel=0.07)
    L.cano((lx - 0.2, ly + 0.5, PISO + 0.15), (lx - 0.2, -0.95, PISO + 0.15), 0.05, 'concreto_escuro')  # dreno

    # Estação de tratamento do chorume (lado direito): chorume → tanque escuro → tanque limpo
    L.cano((lx + 0.65, ly + 0.1, PISO + 0.15), (2.05, ly + 0.1, PISO + 0.15), 0.05, 'cano')
    L.cano((2.05, ly + 0.1, PISO + 0.15), (2.05, -0.6, PISO + 0.15), 0.05, 'cano')
    L.caixa((1.4, 2.6, 0.06), (2.3, 0.6, PISO), 'concreto')
    L.tanque_redondo(0.42, 0.42, (2.3, -0.35, PISO + 0.06), 'agua_suja', 'concreto', lados=8)
    L.tanque_redondo(0.42, 0.42, (2.3, 0.65, PISO + 0.06), 'agua', 'concreto', lados=8)
    L.cano((2.3, 0.05, PISO + 0.35), (2.3, 0.25, PISO + 0.35), 0.05, 'cano')
    L.caixa((0.75, 0.55, 0.5), (2.3, 1.55, PISO + 0.06), 'parede', chanfro=0.03)  # casa de controle
    L.caixa((0.82, 0.62, 0.06), (2.3, 1.55, PISO + 0.56), 'telhado_azul')
    L.placa(0.3, 0.2, (2.675, 1.55, PISO + 0.42), 'vidro', 'direita')
    L.placa(0.2, 0.32, (2.3, 1.275, PISO + 0.38), 'escuro', 'frente')

    # Cerca em volta e guarita na entrada (frente-direita)
    L.cerca(-2.9, -2.9, 2.9, 2.9, alt=0.24, cor='metal_escuro')
    gx, gy = 2.35, -2.35
    L.caixa((0.5, 0.45, 0.42), (gx, gy, PISO), 'creme', chanfro=0.02)
    L.caixa((0.6, 0.55, 0.06), (gx, gy, PISO + 0.42), 'telhado_vermelho')
    L.placa(0.3, 0.16, (gx, gy - 0.225, PISO + 0.34), 'vidro', 'frente')
    L.placa(0.26, 0.16, (gx + 0.25, gy, PISO + 0.34), 'vidro', 'direita')
    L.caixa((0.06, 0.06, 0.25), (gx - 0.4, gy - 0.3, PISO), 'escuro')
    L.caixa((0.04, 0.6, 0.04), (gx - 0.4, gy - 0.02, PISO + 0.22), 'amarelo')  # cancela

    # Cinturão verde nos fundos
    for (x, y, a) in ((-2.5, 2.55, 1.0), (-1.7, 2.65, 0.85), (1.9, 2.55, 0.95), (2.55, 2.1, 0.8)):
        L.arvore((x, y, PISO), a, 'verde_escuro', tipo='pinheiro')
    L.arvore((-2.55, -0.9, PISO), 0.8, 'verde')


L.principal(__file__, construir)
