"""Centro de Controle de Perdas (loss_control_center, 2×2): prédio de operação com telão (mapa da rede em azul),
antena de telemetria girando (nó "gira_1"), canos azuis da rede que entram no chão com medidores e um trecho
aberto com o vazamento consertado (remendo amarelo). Mostra a ideia: achar e tapar vazamentos = água nova."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402

PISO = 0.08


def construir():
    L.caixa((4.0, 4.0, PISO), (0, 0, 0), 'concreto_escuro', chanfro=0.02)
    L.caixa((3.7, 3.7, 0.01), (0, 0, PISO), 'grama')
    L.caixa((1.2, 3.7, 0.012), (-1.2, 0, PISO), 'piso')

    # Prédio de operação (fundo), dois andares, faixa turquesa
    bx, by, w, d, h = 0.35, 0.75, 2.4, 1.5, 1.1
    L.caixa((w, d, h), (bx, by, PISO), 'parede', chanfro=0.04)
    L.caixa((w + 0.01, d + 0.01, 0.14), (bx, by, PISO + 0.5), 'agua')
    L.caixa((w + 0.1, d + 0.1, 0.07), (bx, by, PISO + h), 'metal_escuro')
    L.janelas('frente', by - d / 2, PISO + 0.82, bx - 1.0, bx + 1.0, 4, 0.34, 0.22)
    L.janelas('direita', bx + w / 2, PISO + 0.82, by - 0.5, by + 0.5, 2, 0.34, 0.22)
    L.placa(0.36, 0.42, (bx - 0.75, by - d / 2, PISO), 'vidro_escuro', 'frente')
    # Telão do mapa da rede na fachada: tela escura com "canos" azuis
    L.placa(0.9, 0.34, (bx + 0.4, by - d / 2, PISO + 0.08), 'escuro', 'frente')
    for (x, z, ww, hh) in ((0.15, 0.25, 0.6, 0.03), (0.4, 0.15, 0.03, 0.22), (0.62, 0.2, 0.3, 0.03), (0.2, 0.15, 0.03, 0.14)):
        L.placa(ww, hh, (bx + x, by - d / 2 - 0.005, PISO + z), 'agua', 'frente', espessura=0.01)
    L.esfera(0.04, (bx + 0.4, by - d / 2 - 0.02, PISO + 0.37), 'vermelho')  # o vazamento achado no mapa

    # Antena de telemetria no telhado (prato que gira em pé)
    topo = PISO + h + 0.07
    L.cano((bx + 0.7, by, topo), (bx + 0.7, by, topo + 0.45), 0.03, 'metal_escuro', lados=5)
    prato = [L.cilindro(0.2, 0.04, (bx + 0.7, by - 0.05, topo + 0.48), 'metal', lados=10, rot=(70, 0, 0)),
             L.cano((bx + 0.7, by - 0.05, topo + 0.48), (bx + 0.7, by - 0.25, topo + 0.55), 0.015, 'metal_escuro', lados=4),
             L.esfera(0.035, (bx + 0.7, by - 0.27, topo + 0.56), 'amarelo')]
    L.animar(prato, 'gira_1', (bx + 0.7, by, topo + 0.48))
    # sensores na beirada
    for x in (bx - 0.9, bx - 0.3):
        L.cano((x, by + 0.4, topo), (x, by + 0.4, topo + 0.22), 0.015, 'metal', lados=4)
        L.esfera(0.035, (x, by + 0.4, topo + 0.24), 'vermelho')

    # Rede de canos azuis na frente, com medidores (caixinhas) e o trecho aberto do conserto
    y = -1.2
    L.cano((-1.9, y, PISO + 0.1), (1.9, y, PISO + 0.1), 0.07, 'cano')
    L.cano((0.9, y, PISO + 0.1), (0.9, 0.0, PISO + 0.1), 0.06, 'cano')
    for x in (-1.3, 0.2, 1.5):
        L.caixa((0.22, 0.18, 0.2), (x, y - 0.02, PISO + 0.1), 'parede', chanfro=0.01)
        L.placa(0.12, 0.08, (x, y - 0.11, PISO + 0.2), 'escuro', 'frente', espessura=0.01)
    # vala aberta com o remendo amarelo
    L.tanque(0.7, 0.5, 0.1, (-0.5, y, PISO), 'terra', 'concreto', parede=0.05, nivel=0.02)
    L.cilindro(0.085, 0.16, (-0.5, y, PISO + 0.1), 'amarelo', lados=8, rot=(0, 90, 0))
    L.cone(0.06, 0.24, (-0.95, y - 0.35, PISO), 'laranja', lados=6)
    L.cone(0.06, 0.24, (-0.05, y - 0.35, PISO), 'laranja', lados=6)

    # Van de manutenção
    L.caixa((0.62, 0.32, 0.26), (-1.25, 0.2, PISO + 0.06), 'parede', chanfro=0.03)
    L.caixa((0.2, 0.33, 0.12), (-1.0, 0.2, PISO + 0.32), 'vidro')
    L.caixa((0.63, 0.33, 0.06), (-1.25, 0.2, PISO + 0.16), 'agua')
    for xx in (-1.45, -1.05):
        L.cilindro(0.07, 0.34, (xx, 0.2, PISO + 0.07), 'escuro', lados=8, rot=(90, 0, 0))

    L.arbusto((1.75, 1.75, PISO), 0.16, 'verde')
    L.arbusto((-1.75, 1.7, PISO), 0.14, 'verde_escuro')
    L.arvore((1.7, -0.3, PISO), 0.75, 'verde')


L.principal(__file__, construir)
