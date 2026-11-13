/**
 * Carrossel "Onde fica a sua cidade?" (js/ui/BasinPicker.js, css/basin-picker.css): textos curtos e ícones SVG.
 * Só dados. Nada de emoji nesta tela: cada bacia e cada traço tem o seu SVG, animado por CSS (classes bpi-*,
 * paradas com prefers-reduced-motion). Os SVGs ficam aqui como texto, fora do pipeline de assets/icons.
 *   BASIN_CARDS[id]      = { challenge } o desafio da bacia em poucas palavras (o resto do cartão sai de BASIN_MAPS:
 *                          BasinPicker.traitsFor)
 *   BASIN_ICONS[id]      = ícone grande da bacia (viewBox 64)
 *   BASIN_TRAIT_ICONS[k] = ícone de traço (viewBox 24). `{uid}` vira um id único por cópia (clipPath) e `{lvl}`
 *                          a altura da água no ícone do aquífero (0-18, BasinPicker.traitIcon).
 * Bacia nova em js/data/basinMaps.js = um cartão e um ícone aqui (tests/unit/basin-picker.test.js confere).
 */
const BASIN_CARDS = {
    vale: { challenge: 'Aprender o básico com calma' },
    serra: { challenge: 'Crescer sem causar erosão' },
    litoral: { challenge: 'Segurar a água da chuva forte' },
    sertao: { challenge: 'Guardar cada gota de água' }
};

const BASIN_ICONS = {
    // Vale: morros verdes e um rio em meandro que corre
    vale: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle class="bpi-pulse" cx="47" cy="15" r="7" fill="#ffd23f"/>
        <path d="M0 36 Q12 22 26 32 T52 26 T64 28 V64 H0Z" fill="#6fb35a"/>
        <path d="M0 46 Q16 36 32 44 T64 40 V64 H0Z" fill="#3e8a4f"/>
        <path d="M-2 62 C10 50 20 60 30 52 S46 44 66 50" fill="none" stroke="#1187d9" stroke-width="7" stroke-linecap="round"/>
        <path class="bpi-flow" d="M-2 62 C10 50 20 60 30 52 S46 44 66 50" fill="none" stroke="#9eeeff" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 7"/>
    </svg>`,
    // Serra: encostas, uma nascente que pinga e uma nuvem passando
    serra: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <g class="bpi-drift"><ellipse cx="14" cy="14" rx="9" ry="4.5" fill="#ffffff" opacity="0.9"/><ellipse cx="20" cy="11" rx="6" ry="4" fill="#ffffff" opacity="0.9"/></g>
        <path d="M0 58 L20 20 L30 34 L42 10 L64 58Z" fill="#3f7d45"/>
        <path d="M42 10 L64 58 H46 L38 40Z" fill="#2c5f36"/>
        <path d="M20 20 L30 34 L24 36 L14 32Z" fill="#5b9a52"/>
        <path d="M37 33 C36 42 38 48 35 58" fill="none" stroke="#48ddfa" stroke-width="3" stroke-linecap="round"/>
        <path class="bpi-drip" d="M37 30 q2 3 0 5 q-2 -2 0 -5z" fill="#9eeeff"/>
        <path d="M0 58 H64 V64 H0Z" fill="#7a5a3c"/>
    </svg>`,
    // Litoral: sol baixo e ondas que vão e voltam
    litoral: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle class="bpi-pulse" cx="46" cy="22" r="9" fill="#ffb84a"/>
        <path d="M0 34 H64 V64 H0Z" fill="#e8d59c"/>
        <path class="bpi-wave" d="M-16 40 q4 -4 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 V64 H-16Z" fill="#21bfef"/>
        <path class="bpi-wave bpi-wave--2" d="M-16 48 q4 -4 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 V64 H-16Z" fill="#1187d9"/>
        <path class="bpi-wave bpi-wave--3" d="M-16 56 q4 -4 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 V64 H-16Z" fill="#083f8a"/>
    </svg>`,
    // Sertão: sol com raios girando, chão seco e um mandacaru
    sertao: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <g class="bpi-spin" style="transform-origin: 20px 18px">
            <path d="M20 4 V9 M20 27 V32 M6 18 H11 M29 18 H34 M10 8 L13.5 11.5 M26.5 24.5 L30 28 M10 28 L13.5 24.5 M26.5 11.5 L30 8" stroke="#ff9a1f" stroke-width="2.6" stroke-linecap="round"/>
        </g>
        <circle cx="20" cy="18" r="6.5" fill="#ffd23f"/>
        <path d="M0 50 Q20 44 40 49 T64 47 V64 H0Z" fill="#c9a25e"/>
        <path d="M6 58 l5 -3 M20 60 l4 -4 M48 59 l5 -2" stroke="#9c7440" stroke-width="1.6" stroke-linecap="round"/>
        <g class="bpi-sway" style="transform-origin: 45px 52px">
            <rect x="42" y="22" width="7" height="31" rx="3.5" fill="#5f8a3a"/>
            <path d="M42 38 H36 a3 3 0 0 1 -3 -3 V29" fill="none" stroke="#5f8a3a" stroke-width="5" stroke-linecap="round"/>
            <path d="M49 34 H54 a3 3 0 0 0 3 -3 V25" fill="none" stroke="#5f8a3a" stroke-width="5" stroke-linecap="round"/>
        </g>
    </svg>`
};

const BASIN_TRAIT_ICONS = {
    'relief-few': `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <g class="bpi-drift"><ellipse cx="7" cy="7" rx="4" ry="2" fill="currentColor" opacity="0.45"/></g>
        <path d="M2 17 Q8 14.5 13 16 T22 15.5 V20 H2Z" fill="currentColor"/>
    </svg>`,
    'relief-some': `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <g class="bpi-drift"><ellipse cx="6" cy="6" rx="4" ry="2" fill="currentColor" opacity="0.45"/></g>
        <path d="M2 20 Q7 9 12 15 Q15 11 22 20Z" fill="currentColor"/>
    </svg>`,
    'relief-many': `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <g class="bpi-drift"><ellipse cx="18" cy="5" rx="4" ry="1.8" fill="currentColor" opacity="0.45"/></g>
        <path d="M1 21 L7 8 L11 14 L15 5 L23 21Z" fill="currentColor"/>
    </svg>`,
    rain: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6.5 13 a4 4 0 0 1 .6 -7.9 a5 5 0 0 1 9.4 1.4 a3.3 3.3 0 0 1 .5 6.5Z" fill="currentColor"/>
        <path class="bpi-rain" d="M8 15.5 l-1 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path class="bpi-rain bpi-rain--2" d="M12 15.5 l-1 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path class="bpi-rain bpi-rain--3" d="M16 15.5 l-1 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    flood: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 12 L12 5.5 L19 12 V20 H5Z" fill="currentColor" opacity="0.55"/>
        <path class="bpi-rise" d="M1 17 q2.5 -2 5.5 0 t5.5 0 t5.5 0 t5.5 0 V23 H1Z" fill="currentColor"/>
    </svg>`,
    drought: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <g class="bpi-spin" style="transform-origin: 12px 12px">
            <path d="M12 1.5 V4.5 M12 19.5 V22.5 M1.5 12 H4.5 M19.5 12 H22.5 M4.6 4.6 L6.7 6.7 M17.3 17.3 L19.4 19.4 M4.6 19.4 L6.7 17.3 M17.3 6.7 L19.4 4.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </g>
        <circle cx="12" cy="12" r="5" fill="currentColor"/>
    </svg>`,
    fire: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path class="bpi-flicker" d="M12 2 C13 7 18 9 18 15 a6 6 0 0 1 -12 0 C6 11 9 10 9 6.5 C11 8 11.5 9.5 11.5 11 C13 9.5 13 5.5 12 2Z" fill="currentColor"/>
        <path d="M12 13 C13 15 15 15.5 15 17.5 a3 3 0 0 1 -6 0 C9 16 10.5 15.5 12 13Z" fill="#fff" opacity="0.55"/>
    </svg>`,
    balance: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle class="bpi-pulse" cx="9" cy="9" r="4.5" fill="currentColor" opacity="0.6"/>
        <g class="bpi-drift"><path d="M8 19 a3.5 3.5 0 0 1 .4 -7 a4.5 4.5 0 0 1 8.6 1.3 a2.9 2.9 0 0 1 .4 5.7Z" fill="currentColor"/></g>
    </svg>`,
    aquifer: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <defs><clipPath id="bp-drop-{uid}"><path d="M12 2.5 C15 7 19 10.5 19 15 a7 7 0 0 1 -14 0 C5 10.5 9 7 12 2.5Z"/></clipPath></defs>
        <path d="M12 2.5 C15 7 19 10.5 19 15 a7 7 0 0 1 -14 0 C5 10.5 9 7 12 2.5Z" fill="currentColor" opacity="0.25"/>
        <g clip-path="url(#bp-drop-{uid})">
            <path class="bpi-slosh" d="M-6 {lvl} q3 -1.6 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 V24 H-6Z" fill="currentColor"/>
        </g>
        <path d="M12 2.5 C15 7 19 10.5 19 15 a7 7 0 0 1 -14 0 C5 10.5 9 7 12 2.5Z" fill="none" stroke="currentColor" stroke-width="1.6"/>
    </svg>`,
    challenge: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 2.5 V22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path class="bpi-flag" d="M6 3.5 C10 1.5 13 6 19 3.5 V12.5 C13 15 10 10.5 6 12.5Z" fill="currentColor"/>
    </svg>`,
    // Navegação e selo (sem emoji também)
    prev: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    next: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    play: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5 L19 12 L8 19Z" fill="currentColor"/></svg>`,
    star: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="bpi-pulse" d="M12 2.5 l2.9 6 6.6 .9 -4.8 4.6 1.2 6.5 L12 17.4 6.1 20.5 l1.2 -6.5 L2.5 9.4 l6.6 -.9Z" fill="currentColor"/></svg>`
};
