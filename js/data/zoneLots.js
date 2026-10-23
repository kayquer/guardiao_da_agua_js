/**
 * GUARDIÃO DA ÁGUA - LOTES DAS ZONAS (residencial, comercial, industrial) — dado puro, sem funções
 *
 * Uma zona pronta (depois do canteiro de obras padrão) cresce sozinha em 4 fases
 * (js/systems/building/ZoneGrowth.js):
 *   0 = área livre para construção (terra batida, estacas, marcação na cor da zona)
 *   1 = início do desenvolvimento (fundações, a primeira construção, máquinas)
 *   2 = desenvolvimento (metade do lote construído, andaimes no resto)
 *   3 = fase final (lote completo)
 *
 * ZONE_LOTS[idDaZona] = { ground, stages: [fase0, fase1, fase2, fase3] }
 *   ground   chão da fase final: 'grass' (residencial), 'paved' (comercial), 'concrete' (industrial)
 *   peça     { file, x, z, rot?, scale?, w?, d?, h? }
 *     file   '.glb' relativo a models/buildings/ (Kenney, CC0) ou 'prop:<nome>' (peça de obra procedural, ZONE_PROPS)
 *     x, z   centro da peça em CÉLULAS, a partir do canto do lote (0..size). +X = direita da câmera isométrica,
 *            -Z = frente (a câmera olha de +X/-Z): o que é alto vai para o fundo (z grande, x pequeno)
 *     rot    quartos de volta (0-3), como building.rotation (rotation.y = rot × 90°): 0 = fachada para -Z
 *            (para a câmera), 1 = -X, 2 = +Z, 3 = +X
 *     scale  multiplica o tamanho (padrão 1). Modelo: 1 unidade do .glb = ZONE_LOT_MODEL_SCALE células
 *     w,d,h  só para 'prop:': tamanho em células (andaime e fundação esticam para caber na casa futura)
 *   Toda peça cabe dentro de size × size células (tests/unit/zones.test.js confere pela caixa do .glb).
 *
 * Ritmo (ZONE_GROWTH): cada fase leva stageMs de TEMPO DE JOGO (BuildingSystem.simNow) com tudo bem;
 * satisfação, água e energia aceleram, freiam ou param o crescimento. Os efeitos da zona
 * (capacidade de população, empregos e receita) valem effectScale[fase] do valor cheio.
 */
const ZONE_LOT_MODEL_SCALE = 0.65; // células por unidade dos modelos da Kenney (casa ≈ 0,85 × 0,65 célula)

const ZONE_GROWTH = {
    stageMs: [50000, 65000, 80000],        // fase 0→1, 1→2, 2→3 (tempo de jogo com ritmo 1)
    effectScale: [0.25, 0.5, 0.75, 1],     // fração de população/empregos/receita por fase
    stageNames: ['Área livre', 'Início', 'Desenvolvimento', 'Completa'],
    growMs: 900                            // animação das peças novas subindo do chão
};

// Peças de obra procedurais (BuildingSystem.createZonePropTemplate). Tamanho base em células (w × d × h)
const ZONE_PROPS = {
    stake:      { w: 0.06, d: 0.06, h: 0.3 },   // estaca de madeira com ponta laranja
    cone:       { w: 0.1, d: 0.1, h: 0.14 },    // cone de obra
    dirt:       { w: 0.5, d: 0.4, h: 0.18 },    // monte de terra
    bricks:     { w: 0.3, d: 0.24, h: 0.16 },   // palete de tijolos
    pipes:      { w: 0.42, d: 0.2, h: 0.12 },   // tubos empilhados
    foundation: { w: 1, d: 1, h: 0.06 },        // laje de concreto com ferragens (w/d da peça)
    scaffold:   { w: 1, d: 1, h: 1 },           // andaime (w/d/h da peça)
    digger:     { w: 0.5, d: 0.26, h: 0.3 },    // escavadeira
    crane:      { w: 1.3, d: 0.16, h: 2.0 }     // grua (lança para -X)
};

const SUB = 'kenney/suburban/';
const COM = 'kenney/commercial/';
const IND = 'kenney/industrial/';

const ZONE_LOTS = {
    // ===== RESIDENCIAL =====
    zone_residential_light: {
        ground: 'grass',
        stages: [
            [
                { file: 'prop:stake', x: 0.12, z: 0.12 }, { file: 'prop:stake', x: 1.88, z: 0.12 },
                { file: 'prop:stake', x: 0.12, z: 1.88 }, { file: 'prop:stake', x: 1.88, z: 1.88 },
                { file: 'prop:dirt', x: 0.55, z: 1.45 }, { file: 'prop:cone', x: 1.6, z: 0.3 }
            ],
            [
                { file: 'prop:foundation', x: 0.5, z: 0.5, w: 0.85, d: 0.68 },
                { file: 'prop:foundation', x: 0.5, z: 1.5, w: 0.85, d: 0.7 },
                { file: 'prop:foundation', x: 1.5, z: 1.5, w: 0.85, d: 0.68 },
                { file: SUB + 'building-type-h.glb', x: 1.5, z: 0.5 },
                { file: 'prop:bricks', x: 1.0, z: 1.0 }, { file: 'prop:digger', x: 0.5, z: 1.5, rot: 3 }
            ],
            [
                { file: SUB + 'building-type-h.glb', x: 1.5, z: 0.5 },
                { file: SUB + 'building-type-i.glb', x: 0.5, z: 0.5 },
                { file: 'prop:foundation', x: 0.5, z: 1.5, w: 0.85, d: 0.7 },
                { file: 'prop:scaffold', x: 1.5, z: 1.5, w: 0.85, d: 0.68, h: 0.45 },
                { file: 'prop:bricks', x: 1.0, z: 1.0 }, { file: 'prop:dirt', x: 0.5, z: 1.5 }
            ],
            [
                { file: SUB + 'building-type-h.glb', x: 1.5, z: 0.5 },
                { file: SUB + 'building-type-i.glb', x: 0.5, z: 0.5 },
                { file: SUB + 'building-type-g.glb', x: 0.5, z: 1.5 },
                { file: SUB + 'building-type-a.glb', x: 1.5, z: 1.5 },
                { file: SUB + 'tree-large.glb', x: 1.0, z: 1.0 },
                { file: SUB + 'tree-small.glb', x: 0.08, z: 1.0 }, { file: SUB + 'tree-small.glb', x: 1.92, z: 1.0 }
            ]
        ]
    },
    zone_residential_balanced: {
        ground: 'grass',
        stages: [
            [
                { file: 'prop:stake', x: 0.12, z: 0.12 }, { file: 'prop:stake', x: 1.88, z: 0.12 },
                { file: 'prop:stake', x: 0.12, z: 1.88 }, { file: 'prop:stake', x: 1.88, z: 1.88 },
                { file: 'prop:dirt', x: 1.4, z: 1.4 }, { file: 'prop:pipes', x: 0.5, z: 0.4 }
            ],
            [
                { file: 'prop:foundation', x: 0.5, z: 0.5, w: 0.88, d: 0.68 },
                { file: 'prop:foundation', x: 0.5, z: 1.5, w: 0.9, d: 0.66 },
                { file: 'prop:foundation', x: 1.5, z: 1.5, w: 0.9, d: 0.72 },
                { file: SUB + 'building-type-c.glb', x: 1.5, z: 0.5 },
                { file: 'prop:digger', x: 0.5, z: 1.5, rot: 3 }, { file: 'prop:bricks', x: 1.0, z: 1.0 }
            ],
            [
                { file: SUB + 'building-type-c.glb', x: 1.5, z: 0.5 },
                { file: SUB + 'building-type-j.glb', x: 0.5, z: 0.5 },
                { file: 'prop:scaffold', x: 0.5, z: 1.5, w: 0.9, d: 0.66, h: 0.6 },
                { file: 'prop:scaffold', x: 1.5, z: 1.5, w: 0.9, d: 0.72, h: 0.35 },
                { file: 'prop:bricks', x: 1.0, z: 1.02 }
            ],
            [
                { file: SUB + 'building-type-c.glb', x: 1.5, z: 0.5 },
                { file: SUB + 'building-type-j.glb', x: 0.5, z: 0.5 },
                { file: SUB + 'building-type-o.glb', x: 0.5, z: 1.5 },
                { file: SUB + 'building-type-s.glb', x: 1.5, z: 1.5 },
                { file: SUB + 'tree-large.glb', x: 1.0, z: 1.0 }, { file: SUB + 'tree-small.glb', x: 1.0, z: 0.1 }
            ]
        ]
    },
    zone_residential_heavy: {
        ground: 'grass',
        stages: [
            [
                { file: 'prop:stake', x: 0.12, z: 0.12 }, { file: 'prop:stake', x: 1.88, z: 0.12 },
                { file: 'prop:stake', x: 0.12, z: 1.88 }, { file: 'prop:stake', x: 1.88, z: 1.88 },
                { file: 'prop:dirt', x: 0.5, z: 1.4 }, { file: 'prop:dirt', x: 1.45, z: 1.5, scale: 0.8 },
                { file: 'prop:digger', x: 1.2, z: 0.5 }
            ],
            [
                { file: 'prop:foundation', x: 1.5, z: 1.5, w: 0.9, d: 0.85 },
                { file: 'prop:foundation', x: 0.5, z: 0.5, w: 0.85, d: 0.85 },
                { file: 'prop:foundation', x: 1.5, z: 0.5, w: 0.8, d: 0.8 },
                { file: COM + 'building-b.glb', x: 0.5, z: 1.5, scale: 1.35 },
                { file: 'prop:crane', x: 1.05, z: 1.0 }, { file: 'prop:pipes', x: 1.5, z: 0.5 }
            ],
            [
                { file: COM + 'building-b.glb', x: 0.5, z: 1.5, scale: 1.35 },
                { file: COM + 'building-a.glb', x: 1.5, z: 1.5, scale: 1.35 },
                { file: 'prop:scaffold', x: 0.5, z: 0.5, w: 0.85, d: 0.85, h: 0.75 },
                { file: 'prop:foundation', x: 1.5, z: 0.5, w: 0.8, d: 0.8 },
                { file: 'prop:crane', x: 1.05, z: 1.0 }, { file: 'prop:bricks', x: 1.5, z: 0.5 }
            ],
            [
                { file: COM + 'building-b.glb', x: 0.5, z: 1.5, scale: 1.35 },
                { file: COM + 'building-a.glb', x: 1.5, z: 1.5, scale: 1.35 },
                { file: COM + 'building-d.glb', x: 0.5, z: 0.5, scale: 1.4 },
                { file: SUB + 'tree-large.glb', x: 1.3, z: 0.65 }, { file: SUB + 'tree-large.glb', x: 1.75, z: 0.35 },
                { file: SUB + 'tree-small.glb', x: 1.75, z: 0.8 }, { file: SUB + 'planter.glb', x: 1.35, z: 0.25 }
            ]
        ]
    },

    // ===== INDUSTRIAL =====
    zone_industrial_light: {
        ground: 'concrete',
        stages: [
            [
                { file: 'prop:stake', x: 0.12, z: 0.12 }, { file: 'prop:stake', x: 1.88, z: 0.12 },
                { file: 'prop:stake', x: 0.12, z: 1.88 }, { file: 'prop:stake', x: 1.88, z: 1.88 },
                { file: 'prop:pipes', x: 1.4, z: 0.4 }, { file: 'prop:cone', x: 0.4, z: 0.3 }, { file: 'prop:cone', x: 0.6, z: 0.3 }
            ],
            [
                { file: 'prop:foundation', x: 0.5, z: 1.5, w: 0.9, d: 0.88 },
                { file: 'prop:foundation', x: 1.5, z: 1.5, w: 0.72, d: 0.88 },
                { file: IND + 'building-k.glb', x: 1.5, z: 0.5 },
                { file: 'prop:digger', x: 0.5, z: 0.5 }, { file: 'prop:pipes', x: 1.0, z: 1.0, rot: 1 }
            ],
            [
                { file: IND + 'building-k.glb', x: 1.5, z: 0.5 },
                { file: IND + 'building-h.glb', x: 0.5, z: 1.5 },
                { file: 'prop:scaffold', x: 1.5, z: 1.5, w: 0.72, d: 0.88, h: 0.4 },
                { file: IND + 'shipping-container-a.glb', x: 0.3, z: 0.45 }
            ],
            [
                { file: IND + 'building-k.glb', x: 1.5, z: 0.5 },
                { file: IND + 'building-h.glb', x: 0.5, z: 1.5 },
                { file: IND + 'building-i.glb', x: 1.5, z: 1.5 },
                { file: IND + 'shipping-container-a.glb', x: 0.3, z: 0.45 },
                { file: IND + 'shipping-container-b.glb', x: 0.6, z: 0.45 },
                { file: IND + 'detail-tank.glb', x: 0.5, z: 0.85, scale: 0.8 }
            ]
        ]
    },
    zone_industrial_balanced: {
        ground: 'concrete',
        stages: [
            [
                { file: 'prop:stake', x: 0.12, z: 0.12 }, { file: 'prop:stake', x: 1.88, z: 0.12 },
                { file: 'prop:stake', x: 0.12, z: 1.88 }, { file: 'prop:stake', x: 1.88, z: 1.88 },
                { file: 'prop:dirt', x: 0.6, z: 1.4 }, { file: 'prop:digger', x: 1.3, z: 0.6 }
            ],
            [
                { file: 'prop:foundation', x: 0.62, z: 1.5, w: 1.12, d: 0.86 },
                { file: 'prop:foundation', x: 1.55, z: 1.45, w: 0.6, d: 0.95 },
                { file: IND + 'building-p.glb', x: 1.0, z: 0.45 },
                { file: 'prop:crane', x: 1.05, z: 1.0, scale: 0.8 }
            ],
            [
                { file: IND + 'building-p.glb', x: 1.0, z: 0.45 },
                { file: IND + 'building-g.glb', x: 0.62, z: 1.5 },
                { file: 'prop:scaffold', x: 1.55, z: 1.45, w: 0.6, d: 0.95, h: 0.7 },
                { file: 'prop:pipes', x: 1.75, z: 0.95, rot: 1 }
            ],
            [
                { file: IND + 'building-p.glb', x: 1.0, z: 0.45 },
                { file: IND + 'building-g.glb', x: 0.62, z: 1.5 },
                { file: IND + 'building-d.glb', x: 1.55, z: 1.45 },
                { file: IND + 'chimney-medium.glb', x: 1.82, z: 0.42, scale: 0.8 },
                { file: IND + 'shipping-container-c.glb', x: 0.18, z: 0.45 }
            ]
        ]
    },
    zone_industrial_heavy: {
        ground: 'concrete',
        stages: [
            [
                { file: 'prop:stake', x: 0.12, z: 0.12 }, { file: 'prop:stake', x: 2.88, z: 0.12 },
                { file: 'prop:stake', x: 0.12, z: 2.88 }, { file: 'prop:stake', x: 2.88, z: 2.88 },
                { file: 'prop:dirt', x: 0.8, z: 2.2 }, { file: 'prop:dirt', x: 2.1, z: 2.3, scale: 0.8 },
                { file: 'prop:digger', x: 1.6, z: 1.2 }, { file: 'prop:pipes', x: 2.3, z: 0.5 }
            ],
            [
                { file: 'prop:foundation', x: 0.85, z: 2.25, w: 1.4, d: 1.1 },
                { file: 'prop:foundation', x: 2.3, z: 2.25, w: 0.9, d: 1.2 },
                { file: 'prop:foundation', x: 0.75, z: 0.7, w: 1.2, d: 1.2 },
                { file: IND + 'building-s.glb', x: 2.15, z: 0.55, scale: 1.1 },
                { file: 'prop:crane', x: 1.6, z: 1.55 }, { file: 'prop:digger', x: 0.75, z: 0.7, rot: 3 }
            ],
            [
                { file: IND + 'building-s.glb', x: 2.15, z: 0.55, scale: 1.1 },
                { file: IND + 'building-e.glb', x: 0.85, z: 2.25, scale: 1.25 },
                { file: 'prop:scaffold', x: 2.3, z: 2.25, w: 0.9, d: 1.2, h: 1.0 },
                { file: 'prop:foundation', x: 0.75, z: 0.7, w: 1.2, d: 1.2 },
                { file: 'prop:crane', x: 1.6, z: 1.55 }, { file: 'prop:pipes', x: 0.75, z: 0.7 }
            ],
            [
                { file: IND + 'building-s.glb', x: 2.15, z: 0.55, scale: 1.1 },
                { file: IND + 'building-e.glb', x: 0.85, z: 2.25, scale: 1.25 },
                { file: IND + 'building-n.glb', x: 2.3, z: 2.25, scale: 1.2 },
                { file: IND + 'detail-tank-large.glb', x: 0.75, z: 0.75, scale: 1.05 },
                { file: IND + 'chimney-large.glb', x: 1.65, z: 1.45, scale: 0.9 },
                { file: IND + 'shipping-container-a.glb', x: 1.45, z: 0.4, rot: 1 },
                { file: IND + 'shipping-container-c.glb', x: 1.45, z: 0.72, rot: 1 }
            ]
        ]
    },

    // ===== COMERCIAL =====
    zone_commercial_light: {
        ground: 'paved',
        stages: [
            [
                { file: 'prop:stake', x: 0.12, z: 0.12 }, { file: 'prop:stake', x: 1.88, z: 0.12 },
                { file: 'prop:stake', x: 0.12, z: 1.88 }, { file: 'prop:stake', x: 1.88, z: 1.88 },
                { file: 'prop:bricks', x: 0.6, z: 1.3 }, { file: 'prop:cone', x: 1.5, z: 0.25 }
            ],
            [
                { file: 'prop:foundation', x: 0.5, z: 1.45, w: 0.82, d: 0.9 },
                { file: 'prop:foundation', x: 1.5, z: 1.45, w: 0.82, d: 0.9 },
                { file: COM + 'building-c.glb', x: 1.5, z: 0.5, scale: 1.2 },
                { file: 'prop:digger', x: 0.5, z: 0.5 }, { file: 'prop:pipes', x: 1.0, z: 1.0, rot: 1 }
            ],
            [
                { file: COM + 'building-c.glb', x: 1.5, z: 0.5, scale: 1.2 },
                { file: COM + 'building-c.glb', x: 0.5, z: 1.45, scale: 1.2, rot: 3 },
                { file: 'prop:scaffold', x: 1.5, z: 1.45, w: 0.82, d: 0.9, h: 0.6 },
                { file: 'prop:bricks', x: 0.5, z: 0.5 }
            ],
            [
                { file: COM + 'building-c.glb', x: 1.5, z: 0.5, scale: 1.2 },
                { file: COM + 'building-c.glb', x: 0.5, z: 1.45, scale: 1.2, rot: 3 },
                { file: SUB + 'building-type-q.glb', x: 1.5, z: 1.45 },
                { file: COM + 'detail-parasol-a.glb', x: 0.3, z: 0.35 },
                { file: COM + 'detail-parasol-b.glb', x: 0.72, z: 0.55 },
                { file: SUB + 'planter.glb', x: 0.5, z: 0.9 }, { file: SUB + 'tree-small.glb', x: 0.92, z: 0.15 }
            ]
        ]
    },
    zone_commercial_balanced: {
        ground: 'paved',
        stages: [
            [
                { file: 'prop:stake', x: 0.12, z: 0.12 }, { file: 'prop:stake', x: 1.88, z: 0.12 },
                { file: 'prop:stake', x: 0.12, z: 1.88 }, { file: 'prop:stake', x: 1.88, z: 1.88 },
                { file: 'prop:dirt', x: 0.6, z: 1.4 }, { file: 'prop:digger', x: 1.3, z: 0.6 }
            ],
            [
                { file: 'prop:foundation', x: 0.5, z: 1.5, w: 0.82, d: 0.82 },
                { file: 'prop:foundation', x: 1.5, z: 1.5, w: 0.82, d: 0.82 },
                { file: 'prop:foundation', x: 0.5, z: 0.5, w: 0.8, d: 0.8 },
                { file: COM + 'building-d.glb', x: 1.5, z: 0.5, scale: 1.3 },
                { file: 'prop:crane', x: 1.0, z: 1.05, scale: 0.9 }
            ],
            [
                { file: COM + 'building-d.glb', x: 1.5, z: 0.5, scale: 1.3 },
                { file: COM + 'building-skyscraper-a.glb', x: 0.5, z: 1.5, scale: 0.85 },
                { file: 'prop:scaffold', x: 1.5, z: 1.5, w: 0.82, d: 0.82, h: 0.8 },
                { file: 'prop:foundation', x: 0.5, z: 0.5, w: 0.8, d: 0.8 },
                { file: 'prop:bricks', x: 0.5, z: 0.5 }
            ],
            [
                { file: COM + 'building-d.glb', x: 1.5, z: 0.5, scale: 1.3 },
                { file: COM + 'building-skyscraper-a.glb', x: 0.5, z: 1.5, scale: 0.85 },
                { file: COM + 'building-b.glb', x: 1.5, z: 1.5, scale: 1.3 },
                { file: COM + 'building-c.glb', x: 0.5, z: 0.5, scale: 1.2 },
                { file: COM + 'detail-awning-wide.glb', x: 0.5, z: 0.08 }
            ]
        ]
    },
    zone_commercial_heavy: {
        ground: 'paved',
        stages: [
            [
                { file: 'prop:stake', x: 0.12, z: 0.12 }, { file: 'prop:stake', x: 2.88, z: 0.12 },
                { file: 'prop:stake', x: 0.12, z: 2.88 }, { file: 'prop:stake', x: 2.88, z: 2.88 },
                { file: 'prop:dirt', x: 0.8, z: 2.2 }, { file: 'prop:dirt', x: 2.2, z: 2.3, scale: 0.8 },
                { file: 'prop:digger', x: 1.5, z: 1.3 }, { file: 'prop:cone', x: 2.5, z: 0.3 }
            ],
            [
                { file: 'prop:foundation', x: 0.55, z: 2.45, w: 0.95, d: 0.95 },
                { file: 'prop:foundation', x: 1.5, z: 2.45, w: 0.95, d: 0.95 },
                { file: 'prop:foundation', x: 2.45, z: 2.45, w: 0.95, d: 0.95 },
                { file: 'prop:foundation', x: 0.5, z: 1.45, w: 0.85, d: 0.85 },
                { file: COM + 'building-d.glb', x: 2.5, z: 0.5, scale: 1.4 },
                { file: 'prop:crane', x: 1.5, z: 1.55 }, { file: 'prop:digger', x: 1.0, z: 0.5 }
            ],
            [
                { file: COM + 'building-d.glb', x: 2.5, z: 0.5, scale: 1.4 },
                { file: COM + 'building-skyscraper-e.glb', x: 0.55, z: 2.45 },
                { file: COM + 'building-b.glb', x: 2.5, z: 1.5, scale: 1.4 },
                { file: 'prop:scaffold', x: 1.5, z: 2.45, w: 0.95, d: 0.95, h: 1.3 },
                { file: 'prop:scaffold', x: 2.45, z: 2.45, w: 0.95, d: 0.95, h: 0.7 },
                { file: 'prop:crane', x: 1.5, z: 1.55 }
            ],
            [
                { file: COM + 'building-d.glb', x: 2.5, z: 0.5, scale: 1.4 },
                { file: COM + 'building-skyscraper-e.glb', x: 0.55, z: 2.45 },
                { file: COM + 'building-b.glb', x: 2.5, z: 1.5, scale: 1.4 },
                { file: COM + 'building-skyscraper-a.glb', x: 1.5, z: 2.45 },
                { file: COM + 'building-skyscraper-e.glb', x: 2.45, z: 2.45, scale: 0.85 },
                { file: COM + 'building-a.glb', x: 0.5, z: 1.45, scale: 1.4 },
                { file: COM + 'building-c.glb', x: 1.5, z: 0.5, scale: 1.3 },
                { file: COM + 'detail-parasol-a.glb', x: 0.35, z: 0.4 },
                { file: COM + 'detail-parasol-b.glb', x: 0.8, z: 0.65 },
                { file: SUB + 'tree-large.glb', x: 1.5, z: 1.45 }
            ]
        ]
    }
};
