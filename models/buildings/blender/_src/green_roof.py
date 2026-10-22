"""Teto Verde (green_roof, 2×2): prédio de três andares com o telhado coberto de grama, arbustos,
canteiros e uma árvore pequena; a calha leva a água que sobra para uma cisterna azul."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib as L  # noqa: E402


def construir():
    L.caixa((4.0, 4.0, 0.08), (0, 0, 0), 'piso', chanfro=0.02)
    L.caixa((4.0, 0.8, 0.02), (0, 1.6, 0.08), 'grama')
    piso = 0.08

    bx, by, w, d, h = -0.1, 0.0, 3.2, 2.8, 1.75
    L.caixa((w, d, h), (bx, by, piso), 'creme', chanfro=0.04)
    frente, direita = by - d / 2, bx + w / 2
    for andar in range(3):
        zc = piso + 0.35 + andar * 0.52
        L.janelas('frente', frente, zc, bx - 1.3, bx + 1.3, 5, 0.32, 0.28, moldura='parede')
        L.janelas('direita', direita, zc, by - 1.1, by + 1.1, 4, 0.32, 0.28, moldura='parede')
    L.placa(0.5, 0.42, (bx - 1.0, frente, piso + 0.21), 'madeira_escura', 'frente')
    # Telhado verde: borda, camada de terra e grama, plantas e caminho
    tz = piso + h
    L.caixa((w + 0.08, d + 0.08, 0.12), (bx, by, tz), 'concreto', chanfro=0.02)
    L.caixa((w - 0.12, d - 0.12, 0.08), (bx, by, tz + 0.08), 'grama')
    L.caixa((0.35, d - 0.2, 0.02), (bx + 0.3, by, tz + 0.16), 'piso')
    for (x, y, r, cor) in ((-1.2, -0.9, 0.22, 'verde'), (-1.3, 0.2, 0.2, 'verde_escuro'), (-0.6, 0.9, 0.18, 'folha'),
                           (1.0, -0.9, 0.2, 'verde'), (1.2, 0.6, 0.22, 'folha'), (-0.5, -0.4, 0.16, 'verde_escuro')):
        L.arbusto((bx + x + 0.1, by + y, tz + 0.16), r, cor)
    for (x, y, cor) in ((-0.9, -0.3, 'flor_rosa'), (0.9, 0.1, 'flor_amarela'), (-0.2, 0.6, 'flor_rosa'),
                        (1.0, -0.4, 'vermelho')):
        L.esfera(0.08, (bx + x, by + y, tz + 0.22), cor, escala=(1, 1, 0.7))
    L.arvore((bx + 0.9, by + 1.0, tz + 0.16), 0.9, 'verde')
    # Calha e cano descendo até a cisterna azul
    L.caixa((w + 0.1, 0.1, 0.08), (bx, frente - 0.06, tz + 0.02), 'metal')
    L.cano((direita + 0.08, frente - 0.06, tz + 0.04), (direita + 0.08, frente - 0.06, piso + 0.75), 0.04, 'metal', lados=6)
    L.cano((direita + 0.08, frente - 0.06, piso + 0.75), (direita + 0.08, frente - 0.4, piso + 0.75), 0.04, 'metal', lados=6)
    L.cilindro(0.3, 0.65, (direita + 0.08, frente - 0.45, piso), 'cano', lados=10, chanfro=0.02)
    L.cilindro(0.31, 0.06, (direita + 0.08, frente - 0.45, piso + 0.65), 'telhado_azul', lados=10)
    # Floreiras na calçada
    for x in (-1.1, 0.3):
        L.caixa((0.6, 0.25, 0.15), (x, -1.75, piso), 'madeira')
        L.arbusto((x, -1.75, piso + 0.15), 0.14, 'verde')


L.principal(__file__, construir)
