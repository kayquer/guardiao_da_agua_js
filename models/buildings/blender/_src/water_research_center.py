"""Centro de Pesquisas Hídricas (water_research_center, 3×3): laboratório moderno com fachada de vidro e faixa
turquesa, tanques de experimento com águas de cores diferentes, estação meteorológica e painéis solares."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((6.0, 6.0, 0.08), (0, 0, 0), 'grama', chanfro=0.02)
    L.caixa((5.4, 2.4, 0.04), (0, -1.6, 0.08), 'piso')   # pátio dos tanques
    piso = 0.12

    # Bloco principal (dois andares) e anexo mais baixo à direita
    bx, by, w, d, h = -0.55, 1.15, 3.9, 2.2, 1.45
    L.caixa((w, d, h), (bx, by, piso), 'parede', chanfro=0.04)
    L.caixa((w + 0.08, d + 0.08, 0.1), (bx, by, piso + h), 'concreto', chanfro=0.02)
    frente = by - d / 2
    for z in (piso + 0.42, piso + 1.0):
        L.placa(w - 0.4, 0.38, (bx, frente, z), 'vidro', 'frente')
        for i in range(1, 8):
            L.placa(0.04, 0.38, (bx - (w - 0.4) / 2 + i * (w - 0.4) / 8, frente - 0.03, z), 'parede', 'frente')
    L.placa(w + 0.02, 0.12, (bx, frente - 0.01, piso + 0.72), 'agua', 'frente', espessura=0.05)   # faixa turquesa
    L.placa(0.6, 0.4, (bx - 1.2, frente - 0.02, piso + 0.2), 'vidro_escuro', 'frente')           # entrada
    L.caixa((1.0, 0.6, 0.06), (bx - 1.2, frente - 0.3, piso + 0.45), 'agua')                      # marquise
    L.caixa((1.6, 1.8, 0.95), (2.0, 1.25, piso), 'parede', chanfro=0.03)
    L.caixa((1.66, 1.86, 0.08), (2.0, 1.25, piso + 0.95), 'agua')
    L.janelas('frente', 1.25 - 0.9, piso + 0.5, 1.4, 2.6, 2, 0.4, 0.3)
    L.janelas('direita', 2.8, piso + 0.5, 0.6, 1.9, 3, 0.3, 0.3)
    # Cúpula de observação e painéis solares no telhado
    L.cupula(0.5, (bx + 1.1, by + 0.2, piso + h + 0.1), 'vidro_escuro', lados=10, aneis=3)
    for i in range(3):
        L.caixa((0.65, 0.5, 0.04), (bx - 1.3 + i * 0.7, by + 0.3, piso + h + 0.25), 'painel_solar', rot=(25, 0, 0))
        L.caixa((0.05, 0.05, 0.2), (bx - 1.3 + i * 0.7, by + 0.45, piso + h + 0.1), 'metal')

    # Tanques de experimento no pátio: água limpa, turva e com plantas
    for i, (cor, plantas) in enumerate((('agua', False), ('agua_suja', False), ('agua_funda', True))):
        tx = -1.9 + i * 1.35
        L.tanque(1.1, 1.1, 0.3, (tx, -1.6, piso), cor, 'concreto', parede=0.09, nivel=0.07)
        if plantas:
            L.arbusto((tx - 0.2, -1.5, piso + 0.18), 0.14, 'folha')
            L.cone(0.08, 0.35, (tx + 0.2, -1.75, piso + 0.18), 'verde', lados=5)
        # sonda amarela em cada tanque
        L.cano((tx + 0.35, -1.25, piso + 0.3), (tx + 0.35, -1.25, piso + 0.65), 0.025, 'metal', lados=4)
        L.caixa((0.14, 0.08, 0.1), (tx + 0.35, -1.25, piso + 0.6), 'amarelo')
    # Canos ligando os tanques ao laboratório
    L.cano((-1.9, -1.05, piso + 0.15), (-1.9, frente, piso + 0.15), 0.05)
    L.cano((0.8, -1.05, piso + 0.15), (0.8, frente, piso + 0.15), 0.05)

    # Estação meteorológica e árvores
    mx, my = 2.3, -1.6
    L.cano((mx, my, piso), (mx, my, piso + 1.5), 0.03, 'metal', lados=5)
    for (dx, dy) in ((0.14, 0), (-0.07, 0.12), (-0.07, -0.12)):
        L.cano((mx, my, piso + 1.5), (mx + dx, my + dy, piso + 1.5), 0.012, 'metal_escuro', lados=3)
        L.esfera(0.04, (mx + dx, my + dy, piso + 1.5), 'amarelo')
    L.caixa((0.2, 0.2, 0.25), (mx, my, piso + 0.8), 'parede')
    L.arvore((2.5, 2.55, piso), 1.0, 'verde')
    L.arvore((-2.6, -2.6, piso), 0.9, 'verde_escuro', tipo='pinheiro')


L.principal(__file__, construir)
