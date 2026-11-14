/**
 * Manifesto das ilustrações animadas (js/ui/AnimatedIllustration.js), uma entrada por arquivo de
 * assets/images/tutorial/ e assets/images/lessons/ (chave = caminho depois de assets/images/).
 * Coordenadas em fração da imagem (0 a 1): box = [x, y, largura, altura]; at/from/to = [x, y]; points = [[x, y], ...].
 *
 * cuts — recortes da própria imagem (elipse esfumada na box) com um movimento; amp/dur opcionais:
 *   water (vai e volta, px), cloud (deriva, px), sway (balança pela base, graus), hang (balança pelo topo, graus),
 *   sun (pulsa, %), bob (sobe e desce, px), swim (nada de lado, px), fall (escorre, px), rise (sobe e some, px).
 *   (px = unidades do viewBox 1600 × 900)
 * fx — desenhos vetoriais por cima:
 *   glints {box, count} brilho correndo na água · rain {box, count} · drops {from, to, count, dur} gota + onda
 *   bubbles {box, count} · stream {box, dir: [dx, dy], tone: water|mud|dirty|leaf, count, size, dur}
 *   flow {points, tone: (água)|dirty|good, spacing, dur} setas acendendo ao longo do caminho
 *   rays {at, r} sol · glow {at, r, squash} · smoke {at, tone: smoke|steam, rise, drift} · birds {box, count}
 *   ripples {points, rx} · sparkles {box, count}
 * Nada de texto dentro da figura. tests/unit/illustrations.test.js confere arquivos e limites.
 */
const ILLUSTRATIONS = {
    // ===================== AULAS (figuras dentro do texto) =====================
    'lessons/agricultura.webp': {
        cuts: [
            { kind: 'cloud', box: [0.42, 0, 0.42, 0.16] },
            { kind: 'sun', box: [0.82, 0, 0.14, 0.12] },
            { kind: 'sway', box: [0, 0, 0.4, 0.5], amp: 0.6 },
            { kind: 'rise', box: [0.52, 0.25, 0.25, 0.14], amp: 14 },
            { kind: 'water', box: [0.12, 0.45, 0.4, 0.55] },
            { kind: 'bob', box: [0.8, 0.58, 0.16, 0.28], amp: 2 }
        ],
        fx: [
            { kind: 'glints', box: [0.18, 0.5, 0.3, 0.45], count: 7 },
            { kind: 'stream', box: [0.58, 0.22, 0.2, 0.06], dir: [0, 0.14], tone: 'dirty', count: 10, size: 3, dur: 2.4 },
            { kind: 'ripples', points: [[0.73, 0.72], [0.86, 0.85], [0.7, 0.6]] },
            { kind: 'flow', points: [[0.62, 0.62], [0.56, 0.8], [0.5, 0.95]], tone: 'dirty' }
        ]
    },
    'lessons/agua-para-todos.webp': {
        cuts: [
            { kind: 'cloud', box: [0.3, 0, 0.3, 0.14] },
            { kind: 'water', box: [0.32, 0.3, 0.2, 0.35] },
            { kind: 'fall', box: [0.26, 0.72, 0.1, 0.1], amp: 10 },
            { kind: 'water', box: [0.06, 0.8, 0.5, 0.2] },
            { kind: 'bob', box: [0.76, 0.66, 0.24, 0.32], amp: 3 },
            { kind: 'sway', box: [0, 0.6, 0.25, 0.4], amp: 0.8 }
        ],
        fx: [
            { kind: 'drops', from: [0.235, 0.2], to: [0.18, 0.34], count: 3, dur: 1.1 },
            { kind: 'flow', points: [[0.36, 0.69], [0.5, 0.7], [0.58, 0.55], [0.58, 0.36], [0.65, 0.3], [0.78, 0.24]] },
            { kind: 'smoke', at: [0.91, 0.36], tone: 'smoke', rise: 0.1 },
            { kind: 'glints', box: [0.34, 0.35, 0.18, 0.55], count: 6 },
            { kind: 'glints', box: [0.64, 0.68, 0.14, 0.25], count: 4 }
        ]
    },
    'lessons/agua-subterranea.webp': {
        cuts: [
            { kind: 'cloud', box: [0.55, 0, 0.35, 0.1] },
            { kind: 'sway', box: [0.08, 0, 0.14, 0.17], amp: 1.2 },
            { kind: 'fall', box: [0.9, 0.22, 0.08, 0.2], amp: 12 },
            { kind: 'water', box: [0, 0.66, 0.56, 0.3], amp: 8 },
            { kind: 'water', box: [0.68, 0.66, 0.32, 0.3], amp: 6 }
        ],
        fx: [
            { kind: 'stream', box: [0.36, 0.26, 0.1, 0.1], dir: [0.02, 0.4], tone: 'dirty', count: 14, size: 5, dur: 5 },
            { kind: 'stream', box: [0.617, 0.76, 0.006, 0.1], dir: [0, -0.48], tone: 'water', count: 6, size: 4, dur: 2.6 },
            { kind: 'flow', points: [[0.06, 0.8], [0.3, 0.78], [0.62, 0.82], [0.88, 0.76]], spacing: 90, dur: 3.4 },
            { kind: 'glints', box: [0.55, 0.7, 0.4, 0.2], count: 6 }
        ]
    },
    'lessons/bacia-hidrografica.webp': {
        cuts: [
            { kind: 'cloud', box: [0.6, 0, 0.4, 0.09] },
            { kind: 'fall', box: [0.285, 0.03, 0.04, 0.12], amp: 10 },
            { kind: 'water', box: [0.72, 0.58, 0.28, 0.42], amp: 7 },
            { kind: 'sway', box: [0, 0.6, 0.35, 0.4], amp: 0.7 }
        ],
        fx: [
            { kind: 'birds', box: [0.62, 0.02, 0.3, 0.1], count: 2 },
            { kind: 'flow', points: [[0.31, 0.15], [0.38, 0.3], [0.45, 0.42], [0.52, 0.55], [0.6, 0.72], [0.66, 0.86]], spacing: 80 },
            { kind: 'flow', points: [[0.62, 0.18], [0.55, 0.3], [0.5, 0.4]], spacing: 80 },
            { kind: 'flow', points: [[0.15, 0.22], [0.3, 0.3], [0.4, 0.36]], spacing: 80 },
            { kind: 'glints', box: [0.75, 0.65, 0.23, 0.3], count: 6 }
        ]
    },
    'lessons/caderno-de-campo.webp': {
        cuts: [
            { kind: 'water', box: [0.47, 0.12, 0.53, 0.3], amp: 5 },
            { kind: 'sway', box: [0.22, 0.24, 0.24, 0.32], amp: 0.8 },
            { kind: 'swim', box: [0.18, 0.6, 0.25, 0.18], amp: 5 },
            { kind: 'bob', box: [0.51, 0.31, 0.1, 0.24], amp: 3 },
            { kind: 'sway', box: [0, 0.78, 0.2, 0.22], amp: 1.2 },
            { kind: 'hang', box: [0.1, 0, 0.35, 0.2], amp: 0.8 }
        ],
        fx: [
            { kind: 'glints', box: [0.5, 0.18, 0.45, 0.22], count: 6 },
            { kind: 'sparkles', box: [0.52, 0.34, 0.08, 0.16], count: 2 }
        ]
    },
    'lessons/causa-e-efeito.webp': {
        cuts: [
            { kind: 'sway', box: [0.35, 0, 0.4, 0.27], amp: 0.6 },
            { kind: 'water', box: [0.58, 0.24, 0.42, 0.18], amp: 5 },
            { kind: 'swim', box: [0.08, 0.66, 0.4, 0.3], amp: 5 },
            { kind: 'fall', box: [0.615, 0.55, 0.07, 0.13], amp: 10 },
            { kind: 'water', box: [0.52, 0.68, 0.48, 0.32], amp: 4, dur: 8 }
        ],
        fx: [
            { kind: 'glints', box: [0.03, 0.56, 0.44, 0.38], count: 7 },
            { kind: 'sparkles', box: [0.05, 0.56, 0.4, 0.3], count: 3 },
            { kind: 'bubbles', box: [0.6, 0.66, 0.3, 0.22], count: 6 },
            { kind: 'ripples', points: [[0.68, 0.7], [0.8, 0.76]] }
        ]
    },
    'lessons/ciclo-da-agua.webp': {
        cuts: [
            { kind: 'sun', box: [0.06, 0.04, 0.2, 0.26], amp: 4 },
            { kind: 'rise', box: [0.16, 0.28, 0.18, 0.3], amp: 16 },
            { kind: 'cloud', box: [0.27, 0.08, 0.32, 0.22] },
            { kind: 'cloud', box: [0.55, 0, 0.45, 0.28], amp: 10 },
            { kind: 'fall', box: [0.63, 0.5, 0.06, 0.16], amp: 10 },
            { kind: 'water', box: [0.02, 0.5, 0.52, 0.26] },
            { kind: 'fall', box: [0.68, 0.76, 0.28, 0.12], amp: 10 }
        ],
        fx: [
            { kind: 'rays', at: [0.155, 0.17], r: 0.075 },
            { kind: 'rain', box: [0.6, 0.27, 0.24, 0.22], count: 16 },
            { kind: 'glints', box: [0.06, 0.55, 0.42, 0.2], count: 6 },
            { kind: 'stream', box: [0.57, 0.9, 0.12, 0.05], dir: [0.3, 0], tone: 'water', count: 8, size: 4, dur: 4 }
        ]
    },
    'lessons/cidade-sustentavel.webp': {
        cuts: [
            { kind: 'sun', box: [0.82, 0.14, 0.12, 0.16], amp: 4 },
            { kind: 'cloud', box: [0.68, 0, 0.3, 0.12] },
            { kind: 'water', box: [0.6, 0.42, 0.3, 0.56], amp: 5 },
            { kind: 'sway', box: [0, 0, 0.3, 0.2], amp: 0.8 },
            { kind: 'sway', box: [0.9, 0.08, 0.1, 0.45], amp: 0.5 },
            { kind: 'bob', box: [0.93, 0.78, 0.06, 0.14], amp: 2 }
        ],
        fx: [
            { kind: 'rays', at: [0.88, 0.22], r: 0.06 },
            { kind: 'glow', at: [0.86, 0.55], r: 0.035, squash: 3 },
            { kind: 'glints', box: [0.64, 0.5, 0.3, 0.45], count: 8 },
            { kind: 'birds', box: [0.58, 0.04, 0.3, 0.1], count: 2 }
        ]
    },
    'lessons/enchente.webp': {
        cuts: [
            { kind: 'cloud', box: [0.12, 0, 0.3, 0.1] },
            { kind: 'sway', box: [0.7, 0, 0.3, 0.3], amp: 0.6 },
            { kind: 'water', box: [0.36, 0.42, 0.28, 0.24], amp: 5 },
            { kind: 'water', box: [0, 0.86, 0.3, 0.14], amp: 4 },
            { kind: 'bob', box: [0.26, 0.58, 0.13, 0.13], amp: 3 }
        ],
        fx: [
            { kind: 'glints', box: [0.2, 0.42, 0.45, 0.35], count: 8 },
            { kind: 'ripples', points: [[0.33, 0.7], [0.12, 0.83], [0.38, 0.57], [0.5, 0.62]] },
            { kind: 'rain', box: [0, 0, 1, 0.6], count: 10 }
        ]
    },
    'lessons/erosao.webp': {
        cuts: [
            { kind: 'cloud', box: [0.55, 0.02, 0.32, 0.12] },
            { kind: 'sway', box: [0.3, 0, 0.25, 0.22], amp: 0.8 },
            { kind: 'water', box: [0.42, 0.2, 0.58, 0.26], amp: 6 },
            { kind: 'water', box: [0.15, 0.5, 0.7, 0.5], amp: 3, dur: 8 },
            { kind: 'bob', box: [0.51, 0.78, 0.12, 0.13], amp: 3 },
            { kind: 'bob', box: [0.73, 0.73, 0.16, 0.24], amp: 2 },
            { kind: 'sway', box: [0, 0.5, 0.35, 0.5], amp: 0.8 }
        ],
        fx: [
            { kind: 'stream', box: [0.08, 0.22, 0.25, 0.2], dir: [0.12, 0.2], tone: 'mud', count: 16, size: 5, dur: 3.5 },
            { kind: 'flow', points: [[0.25, 0.5], [0.38, 0.62], [0.52, 0.7], [0.7, 0.68]], tone: 'dirty', spacing: 80 },
            { kind: 'glints', box: [0.6, 0.22, 0.38, 0.22], count: 5 },
            { kind: 'ripples', points: [[0.57, 0.86], [0.8, 0.8]] }
        ]
    },
    'lessons/esgoto-oxigenio.webp': {
        cuts: [
            { kind: 'sun', box: [0.88, 0, 0.12, 0.1] },
            { kind: 'cloud', box: [0.62, 0, 0.26, 0.1] },
            { kind: 'sway', box: [0.42, 0, 0.25, 0.26], amp: 0.6 },
            { kind: 'fall', box: [0.17, 0.32, 0.15, 0.24], amp: 14 },
            { kind: 'water', box: [0.42, 0.3, 0.3, 0.4], amp: 5 },
            { kind: 'bob', box: [0.72, 0.28, 0.28, 0.72], amp: 3, dur: 4 },
            { kind: 'bob', box: [0.39, 0.78, 0.12, 0.14], amp: 3 }
        ],
        fx: [
            { kind: 'bubbles', box: [0.28, 0.6, 0.18, 0.26], count: 9 },
            { kind: 'flow', points: [[0.27, 0.55], [0.36, 0.62], [0.48, 0.68]], tone: 'dirty', spacing: 75 },
            { kind: 'glints', box: [0.5, 0.32, 0.22, 0.3], count: 5 },
            { kind: 'ripples', points: [[0.44, 0.88], [0.6, 0.83]] }
        ]
    },
    'lessons/guardiao-da-agua.webp': {
        cuts: [
            { kind: 'cloud', box: [0.42, 0, 0.5, 0.1] },
            { kind: 'fall', box: [0.74, 0.55, 0.1, 0.12], amp: 10 },
            { kind: 'water', box: [0.3, 0.84, 0.7, 0.16], amp: 5 },
            { kind: 'hang', box: [0, 0, 0.15, 0.35], amp: 1 },
            { kind: 'sway', box: [0, 0.6, 0.18, 0.4], amp: 1 }
        ],
        fx: [
            { kind: 'drops', from: [0.375, 0.79], to: [0.375, 0.92], count: 3, dur: 0.9 },
            { kind: 'drops', from: [0.6, 0.79], to: [0.6, 0.9], count: 3, dur: 0.9 },
            { kind: 'glints', box: [0.4, 0.8, 0.55, 0.18], count: 7 },
            { kind: 'sparkles', box: [0.34, 0.68, 0.3, 0.1], count: 3 }
        ]
    },
    'lessons/hidrosfera.webp': {
        cuts: [
            { kind: 'sun', box: [0.9, 0, 0.1, 0.13] },
            { kind: 'cloud', box: [0.36, 0, 0.36, 0.24] },
            { kind: 'fall', box: [0.07, 0.3, 0.08, 0.15], amp: 10 },
            { kind: 'water', box: [0.3, 0.46, 0.45, 0.2], amp: 5 },
            { kind: 'water', box: [0.78, 0.52, 0.22, 0.26], amp: 8 },
            { kind: 'bob', box: [0.13, 0.5, 0.16, 0.14], amp: 1.5, dur: 5 }
        ],
        fx: [
            { kind: 'rays', at: [0.965, 0.06], r: 0.06 },
            { kind: 'rain', box: [0.38, 0.22, 0.22, 0.22], count: 14 },
            { kind: 'smoke', at: [0.82, 0.36], tone: 'steam', rise: 0.2, drift: 0 },
            { kind: 'flow', points: [[0.12, 0.85], [0.35, 0.9], [0.6, 0.86], [0.82, 0.8]], spacing: 85, dur: 3 },
            { kind: 'glints', box: [0.25, 0.52, 0.5, 0.15], count: 6 }
        ]
    },
    'lessons/infraestrutura-verde.webp': {
        cuts: [
            { kind: 'sway', box: [0.1, 0, 0.3, 0.35], amp: 0.6 },
            { kind: 'sway', box: [0.9, 0, 0.1, 0.25], amp: 1 },
            { kind: 'fall', box: [0.2, 0.55, 0.06, 0.1], amp: 8 },
            { kind: 'fall', box: [0.1, 0.77, 0.06, 0.13], amp: 8 },
            { kind: 'water', box: [0.5, 0.46, 0.45, 0.14], amp: 5 }
        ],
        fx: [
            { kind: 'rain', box: [0, 0, 1, 0.65], count: 18 },
            { kind: 'stream', box: [0.77, 0.73, 0.12, 0.05], dir: [0, 0.2], tone: 'water', count: 10, size: 5, dur: 2.2 },
            { kind: 'ripples', points: [[0.6, 0.53], [0.75, 0.55], [0.86, 0.5], [0.6, 0.85]] },
            { kind: 'glints', box: [0.5, 0.46, 0.45, 0.12], count: 5 }
        ]
    },
    'lessons/jardim-flutuante.webp': {
        cuts: [
            { kind: 'bob', box: [0.04, 0.02, 0.88, 0.95], amp: 2.5, dur: 4 },
            { kind: 'bob', box: [0.82, 0.23, 0.09, 0.1], amp: 4, dur: 1.2 },
            { kind: 'water', box: [0, 0.3, 0.12, 0.22], amp: 6 },
            { kind: 'water', box: [0.86, 0.3, 0.14, 0.22], amp: 6 },
            { kind: 'sway', box: [0, 0.65, 0.2, 0.35], amp: 1 }
        ],
        fx: [
            { kind: 'bubbles', box: [0.2, 0.55, 0.6, 0.4], count: 10 },
            { kind: 'glow', at: [0.86, 0.6], r: 0.07, squash: 2.5 },
            { kind: 'glints', box: [0.02, 0.43, 0.96, 0.06], count: 7 }
        ]
    },
    'lessons/laboratorio.webp': {
        cuts: [
            { kind: 'sway', box: [0.43, 0.08, 0.12, 0.3], amp: 2 },
            { kind: 'water', box: [0.74, 0.28, 0.24, 0.24], amp: 4 },
            { kind: 'sway', box: [0, 0.58, 0.24, 0.42], amp: 1 },
            { kind: 'hang', box: [0.86, 0, 0.14, 0.22], amp: 1.2 },
            { kind: 'bob', box: [0.91, 0.48, 0.08, 0.16], amp: 2 }
        ],
        fx: [
            { kind: 'bubbles', box: [0.515, 0.62, 0.04, 0.26], count: 4 },
            { kind: 'bubbles', box: [0.58, 0.62, 0.04, 0.26], count: 4 },
            { kind: 'bubbles', box: [0.73, 0.65, 0.1, 0.2], count: 5 },
            { kind: 'sparkles', box: [0.15, 0.73, 0.24, 0.15], count: 3 },
            { kind: 'glints', box: [0.76, 0.32, 0.2, 0.15], count: 4 }
        ]
    },
    'lessons/mata-ciliar.webp': {
        cuts: [
            { kind: 'hang', box: [0.3, 0, 0.48, 0.3], amp: 0.6 },
            { kind: 'bob', box: [0.8, 0.04, 0.13, 0.25], amp: 2 },
            { kind: 'water', box: [0.32, 0.52, 0.68, 0.18], amp: 5 },
            { kind: 'swim', box: [0.48, 0.72, 0.22, 0.2], amp: 7 },
            { kind: 'swim', box: [0.84, 0.75, 0.16, 0.12], amp: 6, dur: 5 },
            { kind: 'swim', box: [0.28, 0.72, 0.12, 0.08], amp: 5, dur: 3.6 },
            { kind: 'bob', box: [0.36, 0.13, 0.08, 0.2], amp: 3 }
        ],
        fx: [
            { kind: 'drops', from: [0.405, 0.32], to: [0.4, 0.6], count: 1, dur: 3.2 },
            { kind: 'ripples', points: [[0.68, 0.66], [0.51, 0.63]] },
            { kind: 'glints', box: [0.35, 0.55, 0.6, 0.12], count: 7 },
            { kind: 'bubbles', box: [0.45, 0.72, 0.4, 0.25], count: 6 }
        ]
    },

    // ===================== TUTORIAL (fundos das páginas de história) =====================
    'tutorial/bg-agricultura.webp': {
        cuts: [
            { kind: 'cloud', box: [0.3, 0, 0.55, 0.1] },
            { kind: 'sun', box: [0.85, 0, 0.15, 0.1] },
            { kind: 'hang', box: [0, 0, 0.4, 0.15], amp: 0.8 },
            { kind: 'sway', box: [0.3, 0.2, 0.15, 0.3], amp: 0.6 },
            { kind: 'water', box: [0.6, 0.25, 0.4, 0.75], amp: 5 }
        ],
        fx: [
            { kind: 'glints', box: [0.64, 0.4, 0.33, 0.55], count: 8 },
            { kind: 'birds', box: [0.45, 0.04, 0.3, 0.1], count: 2 }
        ]
    },
    'tutorial/bg-agua-para-todos.webp': {
        cuts: [
            { kind: 'cloud', box: [0.1, 0, 0.8, 0.1] },
            { kind: 'water', box: [0.4, 0.22, 0.32, 0.78], amp: 5 },
            { kind: 'bob', box: [0.04, 0.73, 0.1, 0.18], amp: 2 },
            { kind: 'sway', box: [0.86, 0.72, 0.14, 0.28], amp: 1 },
            { kind: 'sway', box: [0.88, 0.28, 0.12, 0.25], amp: 0.6 }
        ],
        fx: [
            { kind: 'smoke', at: [0.826, 0.11], tone: 'smoke', rise: 0.12 },
            { kind: 'smoke', at: [0.15, 0.53], tone: 'steam', rise: 0.04, drift: 0.01 },
            { kind: 'glints', box: [0.42, 0.3, 0.3, 0.65], count: 9 },
            { kind: 'flow', points: [[0.62, 0.24], [0.56, 0.45], [0.52, 0.7], [0.55, 0.95]], spacing: 90, dur: 3.2 }
        ]
    },
    'tutorial/bg-agua-subterranea.webp': {
        cuts: [
            { kind: 'cloud', box: [0.35, 0, 0.55, 0.08] },
            { kind: 'sway', box: [0, 0, 0.12, 0.1], amp: 1 },
            { kind: 'fall', box: [0.76, 0.31, 0.05, 0.15], amp: 10 },
            { kind: 'water', box: [0.8, 0.3, 0.2, 0.22], amp: 6 },
            { kind: 'water', box: [0, 0.58, 0.29, 0.22], amp: 6 },
            { kind: 'water', box: [0.36, 0.58, 0.5, 0.22], amp: 7 }
        ],
        fx: [
            { kind: 'stream', box: [0.321, 0.7, 0.006, 0.08], dir: [0, -0.32], tone: 'water', count: 6, size: 4, dur: 2.4 },
            { kind: 'flow', points: [[0.82, 0.55], [0.6, 0.68], [0.35, 0.7], [0.05, 0.66]], spacing: 95, dur: 3.4 },
            { kind: 'glints', box: [0.05, 0.62, 0.75, 0.14], count: 8 }
        ]
    },
    'tutorial/bg-bacia.webp': {
        cuts: [
            { kind: 'sun', box: [0.82, 0, 0.14, 0.08] },
            { kind: 'cloud', box: [0, 0.1, 0.2, 0.08], amp: 18 },
            { kind: 'cloud', box: [0.38, 0.08, 0.16, 0.08], amp: 18 },
            { kind: 'cloud', box: [0.9, 0.22, 0.1, 0.1], amp: 14 },
            { kind: 'water', box: [0.43, 0.52, 0.57, 0.48], amp: 5 },
            { kind: 'bob', box: [0.02, 0.4, 0.09, 0.12], amp: 2 }
        ],
        fx: [
            { kind: 'flow', points: [[0.58, 0.14], [0.6, 0.25], [0.52, 0.38], [0.62, 0.55], [0.5, 0.7], [0.6, 0.82], [0.8, 0.9]], spacing: 95, dur: 3.6 },
            { kind: 'glints', box: [0.47, 0.6, 0.45, 0.35], count: 8 },
            { kind: 'birds', box: [0.15, 0.02, 0.4, 0.12], count: 3 }
        ]
    },
    'tutorial/bg-caderno-campo.webp': {
        cuts: [
            { kind: 'cloud', box: [0.4, 0, 0.36, 0.1] },
            { kind: 'water', box: [0.5, 0.15, 0.32, 0.35], amp: 4 },
            { kind: 'bob', box: [0.8, 0.07, 0.07, 0.15], amp: 2 },
            { kind: 'hang', box: [0.66, 0, 0.28, 0.18], amp: 1 },
            { kind: 'bob', box: [0.24, 0.52, 0.09, 0.18], amp: 1.5, dur: 1.4 },
            { kind: 'sway', box: [0.8, 0.78, 0.2, 0.22], amp: 1.2 }
        ],
        fx: [
            { kind: 'glints', box: [0.54, 0.25, 0.25, 0.22], count: 6 }
        ]
    },
    'tutorial/bg-causa-efeito.webp': {
        cuts: [
            { kind: 'cloud', box: [0.56, 0.04, 0.2, 0.12] },
            { kind: 'sway', box: [0.13, 0, 0.37, 0.4], amp: 0.5 },
            { kind: 'bob', box: [0.02, 0.05, 0.1, 0.16], amp: 2 },
            { kind: 'water', box: [0, 0.4, 0.5, 0.3], amp: 5 },
            { kind: 'swim', box: [0.12, 0.68, 0.36, 0.24], amp: 6 },
            { kind: 'fall', box: [0.8, 0.36, 0.1, 0.16], amp: 12 },
            { kind: 'bob', box: [0.62, 0.6, 0.38, 0.4], amp: 2.5, dur: 4 }
        ],
        fx: [
            { kind: 'birds', box: [0.42, 0.02, 0.35, 0.14], count: 2 },
            { kind: 'glints', box: [0.03, 0.45, 0.45, 0.25], count: 7 },
            { kind: 'bubbles', box: [0.7, 0.5, 0.2, 0.2], count: 5 }
        ]
    },
    'tutorial/bg-centro-pesquisa.webp': {
        cuts: [
            { kind: 'water', box: [0.66, 0.2, 0.3, 0.2], amp: 4 },
            { kind: 'bob', box: [0.81, 0.3, 0.07, 0.07], amp: 2 },
            { kind: 'sway', box: [0.55, 0.12, 0.08, 0.15], amp: 2 },
            { kind: 'sway', box: [0, 0.7, 0.26, 0.3], amp: 1 },
            { kind: 'sway', box: [0.88, 0.5, 0.12, 0.4], amp: 1 },
            { kind: 'hang', box: [0, 0, 0.25, 0.2], amp: 1 }
        ],
        fx: [
            { kind: 'bubbles', box: [0.56, 0.66, 0.12, 0.24], count: 6 },
            { kind: 'bubbles', box: [0.72, 0.74, 0.2, 0.2], count: 6 },
            { kind: 'glints', box: [0.68, 0.24, 0.26, 0.14], count: 5 }
        ]
    },
    'tutorial/bg-ciclo-agua.webp': {
        cuts: [
            { kind: 'sun', box: [0.12, 0.04, 0.2, 0.24], amp: 4 },
            { kind: 'rise', box: [0.25, 0.36, 0.18, 0.22], amp: 16 },
            { kind: 'cloud', box: [0.3, 0.1, 0.25, 0.25] },
            { kind: 'cloud', box: [0.5, 0, 0.5, 0.2], amp: 10 },
            { kind: 'water', box: [0.12, 0.52, 0.62, 0.28], amp: 6 },
            { kind: 'water', box: [0.76, 0.45, 0.24, 0.45], amp: 5 },
            { kind: 'bob', box: [0.02, 0.18, 0.08, 0.15], amp: 2 }
        ],
        fx: [
            { kind: 'rays', at: [0.218, 0.155], r: 0.085 },
            { kind: 'rain', box: [0.65, 0.18, 0.27, 0.18], count: 18 },
            { kind: 'flow', points: [[0.85, 0.42], [0.88, 0.55], [0.86, 0.7], [0.76, 0.84]], spacing: 80 },
            { kind: 'glints', box: [0.15, 0.56, 0.55, 0.22], count: 8 }
        ]
    },
    'tutorial/bg-cidade-rio.webp': {
        cuts: [
            { kind: 'cloud', box: [0.72, 0.02, 0.28, 0.2] },
            { kind: 'sun', box: [0.9, 0.2, 0.1, 0.14] },
            { kind: 'hang', box: [0, 0, 0.6, 0.14], amp: 0.5 },
            { kind: 'water', box: [0.42, 0.4, 0.58, 0.32], amp: 6 },
            { kind: 'water', box: [0.18, 0.7, 0.24, 0.26], amp: 3 },
            { kind: 'sway', box: [0.6, 0.78, 0.4, 0.22], amp: 1 }
        ],
        fx: [
            { kind: 'birds', box: [0.6, 0.12, 0.3, 0.12], count: 3 },
            { kind: 'glow', at: [0.94, 0.42], r: 0.05, squash: 3 },
            { kind: 'glints', box: [0.45, 0.42, 0.5, 0.3], count: 9 }
        ]
    },
    'tutorial/bg-coleta-rio.webp': {
        cuts: [
            { kind: 'cloud', box: [0.42, 0, 0.45, 0.1] },
            { kind: 'hang', box: [0, 0, 0.35, 0.22], amp: 0.8 },
            { kind: 'water', box: [0.57, 0.22, 0.43, 0.52], amp: 5 },
            { kind: 'fall', box: [0.89, 0.2, 0.05, 0.1], amp: 8 },
            { kind: 'bob', box: [0.92, 0.66, 0.07, 0.1], amp: 2 }
        ],
        fx: [
            { kind: 'ripples', points: [[0.44, 0.47], [0.54, 0.45]] },
            { kind: 'glints', box: [0.45, 0.3, 0.5, 0.4], count: 9 },
            { kind: 'flow', points: [[0.9, 0.3], [0.8, 0.36], [0.68, 0.4]], tone: 'dirty', spacing: 70 }
        ]
    },
    'tutorial/bg-erosao.webp': {
        cuts: [
            { kind: 'cloud', box: [0.15, 0, 0.5, 0.25] },
            { kind: 'sway', box: [0.55, 0.04, 0.45, 0.32], amp: 0.5 },
            { kind: 'water', box: [0.4, 0.55, 0.6, 0.45], amp: 6 },
            { kind: 'sway', box: [0, 0.68, 0.3, 0.32], amp: 1 }
        ],
        fx: [
            { kind: 'stream', box: [0.22, 0.3, 0.2, 0.3], dir: [0.08, 0.18], tone: 'mud', count: 18, size: 5, dur: 4 },
            { kind: 'flow', points: [[0.45, 0.4], [0.55, 0.6], [0.7, 0.75], [0.9, 0.85]], tone: 'dirty', spacing: 95, dur: 3.2 },
            { kind: 'glints', box: [0.78, 0.45, 0.2, 0.3], count: 5 }
        ]
    },
    'tutorial/bg-jardins-flutuantes.webp': {
        cuts: [
            { kind: 'bob', box: [0.5, 0.18, 0.5, 0.48], amp: 3, dur: 4.2 },
            { kind: 'bob', box: [0.17, 0.1, 0.3, 0.27], amp: 2.5, dur: 3.6 },
            { kind: 'bob', box: [0.54, 0.16, 0.12, 0.1], amp: 2, dur: 3 },
            { kind: 'swim', box: [0.4, 0.78, 0.55, 0.22], amp: 6 },
            { kind: 'sway', box: [0, 0.25, 0.42, 0.75], amp: 0.6 }
        ],
        fx: [
            { kind: 'glints', box: [0.15, 0.3, 0.8, 0.3], count: 10 },
            { kind: 'ripples', points: [[0.55, 0.6], [0.92, 0.6], [0.3, 0.35]] },
            { kind: 'bubbles', box: [0.5, 0.65, 0.4, 0.3], count: 6 }
        ]
    },
    'tutorial/bg-rio-boas-vindas.webp': {
        cuts: [
            { kind: 'sun', box: [0.88, 0, 0.12, 0.12] },
            { kind: 'cloud', box: [0.42, 0, 0.3, 0.1] },
            { kind: 'hang', box: [0, 0, 0.4, 0.2], amp: 0.6 },
            { kind: 'water', box: [0.36, 0.64, 0.64, 0.36], amp: 6 },
            { kind: 'bob', box: [0.82, 0.47, 0.14, 0.15], amp: 4 },
            { kind: 'bob', box: [0.72, 0.36, 0.08, 0.07], amp: 3, dur: 2.6 },
            { kind: 'sway', box: [0, 0.6, 0.22, 0.4], amp: 1 }
        ],
        fx: [
            { kind: 'rays', at: [0.95, 0.06], r: 0.06 },
            { kind: 'glints', box: [0.4, 0.42, 0.55, 0.5], count: 10 }
        ]
    },
    'tutorial/bg-rio-pescador.webp': {
        cuts: [
            { kind: 'sun', box: [0.58, 0.26, 0.1, 0.1], amp: 4 },
            { kind: 'cloud', box: [0.2, 0.4, 0.55, 0.12], amp: 18, dur: 12 },
            { kind: 'hang', box: [0.1, 0.04, 0.17, 0.42], amp: 1 },
            { kind: 'hang', box: [0.3, 0, 0.35, 0.25], amp: 0.6 },
            { kind: 'bob', box: [0.16, 0.48, 0.27, 0.32], amp: 4, dur: 4 },
            { kind: 'swim', box: [0.45, 0.72, 0.5, 0.28], amp: 7 }
        ],
        fx: [
            { kind: 'glow', at: [0.635, 0.55], r: 0.035, squash: 4 },
            { kind: 'glints', box: [0.4, 0.5, 0.55, 0.25], count: 9 },
            { kind: 'ripples', points: [[0.3, 0.74], [0.4, 0.66]] }
        ]
    },
    'tutorial/bg-solucoes-verdes.webp': {
        cuts: [
            { kind: 'cloud', box: [0.62, 0.2, 0.3, 0.2] },
            { kind: 'sway', box: [0.3, 0, 0.3, 0.45], amp: 0.5 },
            { kind: 'hang', box: [0.75, 0, 0.25, 0.22], amp: 0.8 },
            { kind: 'water', box: [0.6, 0.78, 0.22, 0.22], amp: 4 },
            { kind: 'sway', box: [0.75, 0.6, 0.25, 0.4], amp: 1 }
        ],
        fx: [
            { kind: 'sparkles', box: [0.6, 0.02, 0.15, 0.22], count: 3 },
            { kind: 'glints', box: [0.3, 0.8, 0.45, 0.18], count: 6 },
            { kind: 'ripples', points: [[0.5, 0.88], [0.68, 0.9]] }
        ]
    }
};
