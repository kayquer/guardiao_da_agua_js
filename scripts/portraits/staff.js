// Gera os retratos animados dos funcionários da prefeitura (mesmo pipeline dos retratos da Cláudia, do Paulo e da Márcia):
// 1. base 1024 px (OpenRouter /api/v1/images), 2. cinco edições da base (input_references = a base): olhos fechados,
// boca "a", boca "o", feliz, preocupado, 3. caixa de cada camada pela diferença de pixels entre a edição e a base
// (refaz até 2 vezes se a edição mexeu na imagem toda: olhos/boca com caixa > MAX_SMALL_BOX da imagem),
// 4. tudo em 640 px WebP em assets/characters/staff/<cargo>-<f|m>-<n>/, 5. caixas + quadrado do rosto em
// js/data/staffPortraits.js (estende PORTRAIT_MANIFEST), 6. registro de cada arquivo em assets/images/_prompts.json.
// Retomável: o que já está pronto (no jogo ou nos rascunhos) é pulado. No máximo 3 pedidos ao mesmo tempo.
//
// A chave vem só da variável OPENROUTER_KEY (ou OPENROUTER_API_KEY), nunca gravada.
// Uso: OPENROUTER_KEY=... node scripts/portraits/staff.js [--only id,id] [--wave 2|all] [--mosaic arquivo.png]
//   --only   só estes ids (ex.: eng_ambiental-f-3,obras-m-1)
//   --wave   1 (padrão) = variantes 1-3; 2 = variantes 4 e 5; 3 = 6-8 (só obras e serviços); all = todas
//   --mosaic além de gerar, monta um mosaico (base + 5 camadas) de cada pessoa pronta em <arquivo>-<id>.png
//   --bases  monta só o mosaico de todas as bases prontas em <arquivo> (sem gerar nada)
//   --offline não gera nada: só refaz js/data/staffPortraits.js e os registros das pessoas já prontas
// Rascunhos (respostas brutas, diferenças, tentativas): $STAFF_RAW (padrão: <tmp>/guardiao-staff-raw).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const RAW = process.env.STAFF_RAW || path.join(os.tmpdir(), 'guardiao-staff-raw');
const KEY = process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY;
const MODEL = process.env.PORTRAIT_MODEL || 'meta/muse-image';
const API = 'https://openrouter.ai/api/v1/images';
const OUT_DIR = 'assets/characters/staff';
const DATA_FILE = 'js/data/staffPortraits.js';
const PROMPTS_FILE = 'assets/images/_prompts.json';
const SIZE = 640;          // = PORTRAIT_SIZE (js/data/portraits.js)
const GEN = 1024;          // base e edições normalizadas para 1024 x 1024
const DIFF = 256;          // resolução do mapa de diferença
const MAX_SMALL_BOX = 0.45; // olhos/boca: caixa maior que isso = a edição mexeu na imagem toda
const MAX_RETRIES = 2;
const PARALLEL = 3;

const STYLE = JSON.parse(fs.readFileSync(path.join(ROOT, PROMPTS_FILE), 'utf8')).style;

// ===== QUEM =====
const ROLES = {
    obras: {
        label: 'Equipe de obras',
        job: 'a member of the city public works construction crew',
        outfit: () => 'a plain yellow safety hard hat with no logo, a fluorescent orange high-visibility vest with silver reflective stripes over a gray work t-shirt, a pair of work gloves tucked into the vest pocket'
    },
    servicos: {
        label: 'Serviços gerais',
        job: 'a general services and maintenance worker of the city hall',
        outfit: (g, k) => `a ${['navy-blue', 'dark-gray', 'teal'][k % 3]} maintenance work uniform shirt with two chest pockets, a plain blank ID badge clipped to the pocket, a small screwdriver and a pencil peeking discreetly out of the chest pocket`
    },
    eng_civil: {
        label: 'Engenharia civil',
        job: 'a civil engineer of the city hall',
        outfit: (g, k) => `a plain white safety hard hat with no logo, a ${['light-blue', 'white', 'light-gray'][k % 3]} button-up shirt with rolled sleeves, ${k % 2 ? 'holding a clipboard against the chest' : 'a rolled-up blank blueprint tucked under one arm'}`
    },
    eng_ambiental: {
        label: 'Engenharia ambiental',
        job: 'an environmental engineer of the city hall who works in the field',
        outfit: (g, k) => `a leaf-green multi-pocket field vest over a ${['white', 'light-gray', 'turquoise'][k % 3]} t-shirt, ${k % 2 ? 'holding a tablet with a blank screen' : 'holding a small clear water-sample bottle with clean water'}`
    },
    eng_agronomo: {
        label: 'Engenharia agronômica',
        job: 'an agronomist engineer of the city hall who helps local farmers',
        outfit: (g, k) => `${k % 2 ? 'a plain beige cap with no logo' : 'a wide-brimmed straw field hat'}, a ${['red-and-navy', 'green-and-white', 'blue-and-brown'][k % 3]} plaid button-up shirt, holding a small green seedling in a little biodegradable pot`
    },
    veterinario: {
        label: 'Medicina veterinária',
        job: 'a veterinarian of the city hall',
        outfit: (g, k) => k % 2
            ? 'a short-sleeved khaki field shirt, a stethoscope around the neck'
            : `a white lab coat over a ${['teal', 'navy-blue', 'green'][k % 3]} scrub top, a stethoscope around the neck`
    },
    economista: {
        label: 'Economia',
        job: 'an economist of the city hall finance office',
        outfit: (g, k) => g === 'm'
            ? `a simple ${['navy', 'gray', 'brown'][k % 3]} blazer over a light button-up shirt, open collar, no tie`
            : `a simple ${['navy', 'gray', 'wine-red'][k % 3]} blazer over a plain light blouse`
    },
    assistente_social: {
        label: 'Assistência social',
        job: 'a social worker of the city hall, kind and welcoming',
        outfit: (g, k) => `a simple ${['light-yellow', 'soft-lilac', 'light-green'][k % 3]} ${g === 'f' ? 'blouse' : 'polo shirt'}, a plain blank city-hall ID badge on a turquoise lanyard`
    },
    geografo: {
        label: 'Geografia',
        job: 'a geographer of the city hall who maps the river basin',
        outfit: (g, k) => `a khaki field vest over a ${['white', 'navy', 'olive'][k % 3]} t-shirt, ${k % 2 ? 'a handheld GPS device with a blank screen in one hand' : 'a folded paper map with no readable writing in one hand and a compass on a cord around the neck'}`
    }
};
const GENDERS = { f: { word: 'woman' }, m: { word: 'man' } };
// Variantes de aparência (v1…v5), só para o texto do prompt (desc). Nomes de arquivo, pastas, ids e chaves usam
// apenas o número n da variante (nada de cor ou raça neles). wave 1 nesta rodada (n 1-3); a 2ª leva é n 4 e 5.
const GROUPS = {
    v1: { n: 1, wave: 1, desc: 'a pardo (mixed-race) Brazilian with warm medium-brown skin' },
    v2: { n: 2, wave: 1, desc: 'a white Brazilian with fair skin' },
    v3: { n: 3, wave: 1, desc: 'a Black Brazilian with dark brown skin' },
    v4: { n: 4, wave: 2, desc: 'an East Asian Brazilian (Japanese-Brazilian descent) with light warm skin' },
    v5: { n: 5, wave: 2, desc: 'an Indigenous Brazilian with warm copper-brown skin, wearing ordinary everyday clothes like any city employee' },
    // 3ª leva: os cargos com mais vagas (obras 3, serviços 2) ganham mais rostos — outra pessoa, outro cabelo e porte
    v6: { n: 6, wave: 3, desc: 'a pardo (mixed-race) Brazilian with warm medium-brown skin', roles: ['obras', 'servicos'] },
    v7: { n: 7, wave: 3, desc: 'a white Brazilian with fair skin', roles: ['obras', 'servicos'] },
    v8: { n: 8, wave: 3, desc: 'a Black Brazilian with dark brown skin', roles: ['obras', 'servicos'] }
};
const HAIR = {
    v1: {
        f: ['long wavy dark-brown hair tied in a low ponytail', 'shoulder-length curly dark hair', 'short curly dark hair', 'long straight black hair in a side braid'],
        m: ['short wavy black hair', 'a short buzz cut and a neat short beard', 'short curly dark hair', 'a receding hairline and a thin mustache']
    },
    v2: {
        f: ['straight light-brown hair in a bob', 'long straight blonde hair in a braid', 'short wavy auburn hair', 'dark-brown hair in a messy bun'],
        m: ['short light-brown hair', 'short dark hair and a full beard', 'balding with short hair on the sides', 'wavy blond hair']
    },
    v3: {
        f: ['natural afro hair in a rounded puff', 'long box braids tied back', 'short natural coily hair', 'locs pulled into a bun'],
        m: ['very short close-cropped black hair', 'short twists', 'a shaved head and a short beard', 'a short afro and a goatee']
    },
    v4: {
        f: ['straight black hair in a shoulder-length bob', 'long straight black hair in a low ponytail', 'short straight black hair with bangs', 'black hair in a neat bun'],
        m: ['short straight black hair', 'short black hair parted to the side', 'a short buzz cut', 'short black hair and thin rectangular glasses']
    },
    v5: {
        f: ['long straight black hair loose over the shoulders', 'long straight black hair in a braid', 'straight black hair with straight bangs', 'black hair tied in a low ponytail'],
        m: ['straight black hair in a bowl cut', 'short straight black hair', 'shoulder-length straight black hair', 'straight black hair tied back']
    }
};
HAIR.v6 = HAIR.v1; HAIR.v7 = HAIR.v2; HAIR.v8 = HAIR.v3;
// O estilo comum fala em aquarela e natureza: sem isto o modelo enche o fundo de respingos e folhas
const BACKGROUND = 'The background is one single flat cream color with nothing on it: no watercolor splashes, no paint spots, no leaves, no plants, no frame, no border, exactly like a plain character sheet.';
const BODIES = ['a slim build', 'an average build', 'a stocky build with broad shoulders', 'a plus-size build and a round face', 'an athletic build'];
const ROLE_IDS = Object.keys(ROLES);
const GROUP_IDS = Object.keys(GROUPS);

function personFor(role, gender, group) {
    const r = ROLE_IDS.indexOf(role), g = gender === 'f' ? 0 : 1, k = GROUP_IDS.indexOf(group);
    const age = 25 + (r * 13 + g * 7 + k * 11) % 36; // 25 a 60, espalhado
    const hairList = HAIR[group][gender];
    let hair = hairList[(r + g + k) % hairList.length];
    if (age >= 50) hair += ', with some gray';
    const body = BODIES[(r * 3 + k * 2 + g) % BODIES.length];
    const glasses = (r + 2 * k + g) % 4 === 0 && !hair.includes('glasses') ? ', thin-framed glasses' : '';
    const id = `${role}-${gender}-${GROUPS[group].n}`;
    const desc = `${GROUPS[group].desc}, a ${age}-year-old ${GENDERS[gender].word} with ${body}, ${hair}${glasses}`;
    const prompt = 'Character portrait, head and shoulders, three-quarter view facing slightly to the viewer\'s left, looking at the viewer with a warm friendly closed-mouth smile. ' +
        `A city hall employee of a small Brazilian town, ${ROLES[role].job}: ${desc}, wearing ${ROLES[role].outfit(gender, k)}. ` +
        'An ordinary everyday Brazilian person, not a model, natural and respectful features, no caricature. ' +
        'Plain flat soft cream background (#F6F1E1), no scenery, no text, character centered with space above the head. Consistent character design sheet quality. ' +
        STYLE + ' ' + BACKGROUND;
    return { id, slug: id, role, gender, group, variant: GROUPS[group].n, age, wave: GROUPS[group].wave, prompt };
}

const EDITS = {
    'eyes': 'Edit this exact illustration: keep everything identical (same pose, framing, lines, colors, clothes, hair, background, smile) and change ONLY the eyes so that they are gently closed, like a natural blink. Do not change anything else.',
    'mouth-a': 'Edit this exact illustration: keep everything identical (same pose, framing, lines, colors, eyes, clothes, hair, background) and change ONLY the mouth so it is open mid-speech saying "ah", showing a little of the teeth, friendly. Do not change anything else.',
    'mouth-o': 'Edit this exact illustration: keep everything identical (same pose, framing, lines, colors, eyes, clothes, hair, background) and change ONLY the mouth to a small rounded "oh" shape, as if talking. Do not change anything else.',
    'happy': 'Edit this exact illustration: keep the same character, pose, framing, clothes, hair, accessories, colors, line work and plain cream background identical, and change ONLY the facial expression to joyful and celebrating: a big happy open smile showing teeth, eyes happily squinting, cheeks raised. Do not change anything else. No text, no letters, no watermark.',
    'worried': 'Edit this exact illustration: keep the same character, pose, framing, clothes, hair, accessories, colors, line work and plain cream background identical, and change ONLY the facial expression to worried and concerned: eyebrows raised and drawn together, slight frown, mouth closed. Do not change anything else. No text, no letters, no watermark.'
};
const LAYERS = Object.keys(EDITS);
const SMALL = new Set(['eyes', 'mouth-a', 'mouth-o']);

// ===== API =====
let running = 0;
const waiting = [];
async function slot(fn) {
    if (running >= PARALLEL) await new Promise(resolve => waiting.push(resolve));
    running++;
    try { return await fn(); } finally { running--; waiting.shift()?.(); }
}

let totalCost = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function requestImage(prompt, inputPng) {
    const body = { model: MODEL, prompt, aspect_ratio: '1:1', n: 1 };
    if (MODEL.startsWith('openai/')) body.quality = 'medium';
    if (inputPng) body.input_references = [{ type: 'image_url', image_url: { url: `data:image/png;base64,${fs.readFileSync(inputPng).toString('base64')}` } }];
    for (let attempt = 0; ; attempt++) {
        let res, text;
        try {
            res = await slot(() => fetch(API, {
                method: 'POST',
                headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Guardiao da Agua - retratos' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(300000)
            }).then(async r => { text = await r.text(); return r; }));
        } catch (e) {
            if (attempt >= 5) throw e;
            await sleep(10000 * 2 ** attempt);
            continue;
        }
        if (res.status === 429 || res.status >= 500) {
            if (attempt >= 5) throw new Error(`${res.status} ${text.slice(0, 200)}`);
            await sleep(10000 * 2 ** attempt);
            continue;
        }
        if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`);
        const json = JSON.parse(text);
        const image = json.data?.[0]?.b64_json;
        if (!image) throw new Error(`sem imagem: ${text.slice(0, 200)}`);
        totalCost += json.usage?.cost || 0;
        return { bytes: Buffer.from(image, 'base64'), cost: json.usage?.cost || 0 };
    }
}

// ===== IMAGEM (ffmpeg) =====
const ff = (args, input) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { input, maxBuffer: 256 << 20 });
const SQUARE = `crop='min(iw,ih)':'min(iw,ih)'`;
/** Resposta do gerador → PNG quadrado de GEN px (corta o centro se vier retangular). */
function normalize(bytes, outPng) {
    const tmp = `${outPng}.src`;
    fs.writeFileSync(tmp, bytes);
    ff(['-i', tmp, '-vf', `${SQUARE},scale=${GEN}:${GEN}:flags=lanczos`, '-frames:v', '1', outPng]);
    fs.unlinkSync(tmp);
}
const rgb = (file, size, blur = 1.2) => ff(['-i', file, '-vf', `scale=${size}:${size}:flags=area,gblur=sigma=${blur}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);

/**
 * Região que mudou entre a base e a edição, em px de SIZE: mapa de diferença (máx. por canal, imagens borradas),
 * limiar acima do ruído geral da imagem (quando o modelo redesenha tudo de leve), manchas pequenas descartadas.
 * Devolve { box: [x, y, w, h] (sem margem), share: fração de pixels mudados } ou null se nada mudou.
 */
function changedRegion(basePng, editPng, debugPng, window = null) {
    const a = rgb(basePng, DIFF), b = rgb(editPng, DIFF);
    const n = DIFF * DIFF;
    const diff = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        diff[i] = Math.max(Math.abs(a[i * 3] - b[i * 3]), Math.abs(a[i * 3 + 1] - b[i * 3 + 1]), Math.abs(a[i * 3 + 2] - b[i * 3 + 2]));
    }
    const sorted = Array.from(diff).sort((x, y) => x - y);
    const p75 = sorted[Math.floor(n * 0.75)];
    const threshold = Math.max(32, p75 * 3);
    // janela (px de SIZE): só o que mudou ali conta (o modelo redesenha de leve o resto: capacete, roupa)
    const k0 = DIFF / SIZE;
    const [wx0, wy0, wx1, wy1] = window ? window.map(v => Math.round(v * k0)) : [0, 0, DIFF, DIFF];
    const mask = new Uint8Array(n);
    let count = 0;
    for (let i = 0; i < n; i++) {
        const x = i % DIFF, y = (i / DIFF) | 0;
        if (diff[i] > threshold && x >= wx0 && x < wx1 && y >= wy0 && y < wy1) { mask[i] = 1; count++; }
    }
    if (debugPng) ff(['-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${DIFF}x${DIFF}`, '-i', '-', debugPng], Buffer.from(diff.map(v => Math.min(255, v * 3))));
    if (!count) return null;
    // componentes (8-vizinhança, com 2 px de folga para juntar traços do mesmo olho/boca)
    const label = new Int32Array(n).fill(-1);
    const comps = [];
    const R = 2;
    for (let start = 0; start < n; start++) {
        if (!mask[start] || label[start] >= 0) continue;
        const c = { area: 0, x0: DIFF, y0: DIFF, x1: -1, y1: -1 };
        const stack = [start];
        label[start] = comps.length;
        while (stack.length) {
            const p = stack.pop();
            const x = p % DIFF, y = (p / DIFF) | 0;
            c.area++;
            if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x;
            if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
            for (let dy = -R; dy <= R; dy++) {
                for (let dx = -R; dx <= R; dx++) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= DIFF || ny >= DIFF) continue;
                    const q = ny * DIFF + nx;
                    if (mask[q] && label[q] < 0) { label[q] = comps.length; stack.push(q); }
                }
            }
        }
        comps.push(c);
    }
    const biggest = Math.max(...comps.map(c => c.area));
    const keep = comps.filter(c => c.area >= Math.max(6, biggest * 0.08));
    const x0 = Math.min(...keep.map(c => c.x0)), y0 = Math.min(...keep.map(c => c.y0));
    const x1 = Math.max(...keep.map(c => c.x1)), y1 = Math.max(...keep.map(c => c.y1));
    const k = SIZE / DIFF;
    return { box: [x0 * k, y0 * k, (x1 - x0 + 1) * k, (y1 - y0 + 1) * k], share: count / n, threshold };
}

/** Caixa com folga (a máscara radial do AnimatedPortrait apaga as bordas e os cantos), inteira e dentro de 0..SIZE. */
function padBox([x, y, w, h], small) {
    const f = small ? 1.6 : 1.3, m = small ? 12 : 18;
    let W = Math.round(w * f + 2 * m), H = Math.round(h * f + 2 * m);
    W = Math.min(W, SIZE); H = Math.min(H, SIZE);
    let X = Math.round(x + w / 2 - W / 2), Y = Math.round(y + h / 2 - H / 2);
    X = Math.max(0, Math.min(SIZE - W, X)); Y = Math.max(0, Math.min(SIZE - H, Y));
    return [X, Y, W, H];
}
const area = box => box[2] * box[3] / (SIZE * SIZE);

/** Quadrado do rosto (retratos pequenos em círculo): dos olhos à boca, um pouco acima do meio; em 3/4 virado para a
 *  esquerda de quem vê, a cabeça passa dos olhos para a direita (orelha, nuca), então o centro anda um pouco para lá. */
function faceSquare(raw) {
    const c = b => [b[0] + b[2] / 2, b[1] + b[3] / 2];
    const [ex, ey] = c(raw.eyes), [mx, my] = c(raw['mouth-a']);
    const d = Math.max(my - ey, raw.eyes[2] * 0.6);
    const size = Math.round(Math.max(150, Math.min(420, Math.max(2.6 * d, raw.eyes[2] * 1.9))));
    const cx = ex * 0.6 + mx * 0.4 + size * 0.06;
    const cy = ey + 0.3 * d;
    const X = Math.round(Math.max(0, Math.min(SIZE - size, cx - size / 2)));
    const Y = Math.round(Math.max(0, Math.min(SIZE - size, cy - size / 2)));
    return [X, Y, size, size];
}

/** Janela onde cada camada pode mudar, ancorada nos olhos (px de SIZE): boca abaixo deles, expressão = rosto inteiro. */
function layerWindow(name, eyes) {
    if (name === 'eyes') return null;
    const [ex, ey, ew, eh] = eyes;
    const cx = ex + ew / 2;
    const w = Math.max(ew, 60);
    const box = name.startsWith('mouth')
        ? [cx - 0.75 * w, ey + eh * 0.6, cx + 0.75 * w, ey + eh + 1.3 * w]
        : [cx - 0.95 * w, ey - 0.75 * w, cx + 0.95 * w, ey + eh + 1.35 * w];
    return box.map(v => Math.max(0, Math.min(SIZE, v)));
}

/** Olhos plausíveis: mais largos que altos, nem a cabeça inteira (senão a edição mexeu demais e é refeita). */
const eyesOk = raw => raw[2] <= SIZE * 0.5 && raw[3] <= SIZE * 0.22 && raw[3] < raw[2];

// ===== PIPELINE POR PESSOA =====
const rawDir = person => path.join(RAW, person.slug);
const outDir = person => path.join(ROOT, OUT_DIR, person.slug);
const readMeta = person => {
    const file = path.join(rawDir(person), 'meta.json');
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { id: person.id, cost: 0, attempts: {}, raw: {} };
};
const writeMeta = (person, meta) => fs.writeFileSync(path.join(rawDir(person), 'meta.json'), JSON.stringify(meta, null, 2));
const isDone = person => ['portrait', ...LAYERS].every(name => fs.existsSync(path.join(outDir(person), `${name}.webp`)));
const tryFile = (person, name, attempt) => path.join(rawDir(person), `${name}.try${attempt}.png`);

async function fetchTry(person, meta, name, attempt, base) {
    const file = tryFile(person, name, attempt);
    if (fs.existsSync(file)) return file;
    const { bytes, cost } = await requestImage(EDITS[name], base);
    meta.cost += cost;
    normalize(bytes, file);
    return file;
}

/**
 * Camada pronta = a melhor tentativa: caixa da imagem inteira ≤ MAX_SMALL_BOX (olhos/boca; maior = a edição mexeu em
 * tudo) e, nos olhos, forma de olhos. A caixa usada é a da janela ancorada nos olhos. Até MAX_RETRIES refações.
 */
async function makeLayer(person, meta, name, base) {
    const dir = rawDir(person);
    const file = path.join(dir, `${name}.png`);
    if (fs.existsSync(file) && meta.raw[name]) return;
    const small = SMALL.has(name);
    const window = layerWindow(name, meta.raw.eyes);
    let best = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const edit = await fetchTry(person, meta, name, attempt, base);
        const debug = path.join(dir, `${name}.try${attempt}.diff.png`);
        const whole = changedRegion(base, edit, debug);
        const region = window ? changedRegion(base, edit, null, window) : whole;
        const wholeBox = whole && padBox(whole.box, small);
        const box = region && padBox(region.box, small);
        let ok = !!box && (!small || area(wholeBox) <= MAX_SMALL_BOX);
        if (ok && name === 'eyes') ok = eyesOk(region.box);
        meta.attempts[name] = attempt + 1;
        const score = box ? (ok ? 0 : 1) + area(wholeBox) : Infinity;
        if (box && (!best || score < best.score)) best = { file: edit, raw: region.box, score, ok };
        if (ok) break;
        console.log(`  ${person.id} ${name}: tentativa ${attempt + 1} ${box ? `imagem inteira ${(area(wholeBox) * 100).toFixed(0)}%` : 'sem mudança'} → refazer`);
    }
    if (!best) throw new Error(`${person.id} ${name}: nenhuma edição mudou a imagem`);
    fs.copyFileSync(best.file, file);
    meta.raw[name] = best.raw.map(v => Math.round(v));
    meta.flagged = meta.flagged || {};
    if (!best.ok) meta.flagged[name] = 'nenhuma tentativa passou; ficou a melhor';
    writeMeta(person, meta);
}

async function runPerson(person) {
    if (isDone(person)) return { person, skipped: true };
    const dir = rawDir(person);
    fs.mkdirSync(dir, { recursive: true });
    const meta = readMeta(person);
    meta.prompt = person.prompt;
    const base = path.join(dir, 'base.png');
    if (!fs.existsSync(base)) {
        const { bytes, cost } = await requestImage(person.prompt);
        meta.cost += cost;
        normalize(bytes, base);
        writeMeta(person, meta);
    }
    // as 5 primeiras edições saem juntas; as caixas dependem dos olhos, então olhos primeiro
    await Promise.all(LAYERS.map(name => (fs.existsSync(path.join(dir, `${name}.png`)) ? null : fetchTry(person, meta, name, 0, base))));
    writeMeta(person, meta);
    await makeLayer(person, meta, 'eyes', base);
    await Promise.all(LAYERS.filter(name => name !== 'eyes').map(name => makeLayer(person, meta, name, base)));
    return { person, meta, entry: finalize(person, meta) };
}

const webp = (args, out, quality) => ff([...args, '-c:v', 'libwebp', '-quality', String(quality), '-compression_level', '6', '-frames:v', '1', out]);

/** Arquivos finais (640 px WebP) e entrada do manifesto. */
function finalize(person, meta) {
    const dir = rawDir(person);
    const out = outDir(person);
    fs.mkdirSync(out, { recursive: true });
    const layers = {};
    for (const name of LAYERS) layers[name] = padBox(meta.raw[name], SMALL.has(name));
    webp(['-i', path.join(dir, 'base.png'), '-vf', `scale=${SIZE}:${SIZE}:flags=lanczos`], path.join(out, 'portrait.webp'), 72);
    for (const name of LAYERS) {
        const [x, y, w, h] = layers[name];
        webp(['-i', path.join(dir, `${name}.png`), '-vf', `scale=${SIZE}:${SIZE}:flags=lanczos,crop=${w}:${h}:${x}:${y}`], path.join(out, `${name}.webp`), 80);
    }
    const entry = { face: faceSquare(meta.raw), layers };
    meta.entry = entry;
    writeMeta(person, meta);
    return entry;
}

// ===== DADOS (js/data/staffPortraits.js) =====
function readData() {
    const file = path.join(ROOT, DATA_FILE);
    if (!fs.existsSync(file)) return { manifest: {}, people: {} };
    const vm = require('vm');
    const ctx = { PORTRAIT_MANIFEST: {} };
    vm.runInNewContext(`${fs.readFileSync(file, 'utf8')}\nthis.out = { manifest: STAFF_PORTRAITS, people: STAFF_PEOPLE };`, ctx);
    return JSON.parse(JSON.stringify(ctx.out));
}

function writeData(manifest, people) {
    const ids = Object.keys(manifest).sort();
    const line = id => {
        const e = manifest[id];
        const layers = LAYERS.map(n => `${JSON.stringify(n)}: [${e.layers[n].join(', ')}]`).join(', ');
        return `    ${JSON.stringify(id)}: { lazy: true, face: [${e.face.join(', ')}], layers: { ${layers} } }`;
    };
    const who = id => `    ${JSON.stringify(id)}: ${JSON.stringify(people[id]).replace(/,"/g, ', "').replace(/":/g, '": ')}`;
    const text = `/**
 * Retratos animados dos funcionários da prefeitura (gerado por scripts/portraits/staff.js; não edite à mão).
 * Mesmo formato de PORTRAIT_MANIFEST (js/data/portraits.js): arquivos em assets/characters/<id>/, caixas em px de 640.
 * Id = staff/<cargo>-<f|m>-<n> (n = variante de aparência). lazy = fora do preload crítico
 * (AssetLoader.criticalImages): são muitos e só aparecem quando o funcionário entra em cena.
 */
const STAFF_PORTRAITS = {
${ids.map(line).join(',\n')}
};

/** Quem é cada retrato: cargo, gênero (f/m), variante (n do id) e idade usada no prompt. */
const STAFF_PEOPLE = {
${ids.map(who).join(',\n')}
};

Object.assign(PORTRAIT_MANIFEST, STAFF_PORTRAITS);
`;
    fs.writeFileSync(path.join(ROOT, DATA_FILE), text);
}

// ===== REGISTRO (assets/images/_prompts.json, inserido como texto) =====
function registerPrompts(results) {
    const file = path.join(ROOT, PROMPTS_FILE);
    const raw = fs.readFileSync(file, 'utf8');
    const crlf = raw.includes('\r\n');
    const known = JSON.parse(raw).images;
    const today = new Date().toISOString().slice(0, 10);
    const fresh = [];
    for (const { person, meta } of results) {
        const baseRel = `${OUT_DIR}/${person.slug}/portrait.webp`;
        if (!known[baseRel]) {
            fresh.push([baseRel, {
                usedIn: `Retrato animado de funcionário da prefeitura (${ROLES[person.role].label}, ${person.gender === 'f' ? 'feminino' : 'masculino'}, variante ${person.variant}, ${person.age} anos): base`,
                aspect: '1:1', size: [SIZE, SIZE], model: MODEL, date: today,
                prompt: person.prompt,
                note: 'Gerado por scripts/portraits/staff.js (base em 1024 px). Para imagens novas desta pessoa, use a base como input_references.'
            }]);
        }
        for (const name of LAYERS) {
            const rel = `${OUT_DIR}/${person.slug}/${name}.webp`;
            if (known[rel]) continue;
            const record = {
                usedIn: 'Retrato animado: camada recortada (caixa automática pela diferença de pixels, em js/data/staffPortraits.js)',
                aspect: '1:1', model: MODEL,
                inputReference: `${baseRel} (a base em 1024 px)`,
                prompt: EDITS[name]
            };
            if (meta.attempts?.[name] > 1) record.attempts = meta.attempts[name];
            fresh.push([rel, record]);
        }
    }
    if (!fresh.length) return 0;
    let text = raw.replace(/\r\n/g, '\n');
    const entries = fresh.map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v, null, 2).replace(/\n/g, '\n    ')}`).join(',\n');
    const end = text.lastIndexOf('\n    }\n  }\n}');
    if (end < 0) throw new Error('fim de "images" não encontrado em _prompts.json');
    text = text.slice(0, end) + '\n    },\n' + entries + text.slice(end + '\n    }'.length);
    JSON.parse(text); // confere antes de gravar
    if (crlf) text = text.replace(/\n/g, '\r\n');
    fs.writeFileSync(file, text);
    return fresh.length;
}

// ===== MOSAICOS =====
/** Grade de imagens (cada uma reduzida a cell px) num PNG; com label opcional por linha via drawtext não (sem fontes): só imagens. */
function mosaic(files, cols, cell, out) {
    const inputs = files.flatMap(f => ['-i', f]);
    const scaled = files.map((_, i) => `[${i}:v]scale=${cell}:${cell}:force_original_aspect_ratio=decrease,pad=${cell}:${cell}:(ow-iw)/2:(oh-ih)/2:color=0x333333[v${i}]`).join(';');
    const layout = files.map((_, i) => `${(i % cols) * cell}_${Math.floor(i / cols) * cell}`).join('|');
    const filter = files.length > 1
        ? `${scaled};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=0x333333`
        : `${scaled};[v0]null`;
    ff([...inputs, '-filter_complex', filter, '-frames:v', '1', out]);
}

/** Base + as 5 camadas, cada camada mostrada sobre a base (recorte colado na caixa) e sozinha. */
function personMosaic(person, out) {
    const dir = outDir(person);
    const entry = readData().manifest[person.id] || readMeta(person).entry;
    const tmp = path.join(RAW, person.slug, 'mosaic');
    fs.mkdirSync(tmp, { recursive: true });
    const files = [path.join(dir, 'portrait.webp')];
    for (const name of LAYERS) {
        const [x, y] = entry.layers[name];
        const composed = path.join(tmp, `${name}-on-base.png`);
        ff(['-i', path.join(dir, 'portrait.webp'), '-i', path.join(dir, `${name}.webp`), '-filter_complex', `[0:v][1:v]overlay=${x}:${y},drawbox=x=${x}:y=${y}:w=${entry.layers[name][2]}:h=${entry.layers[name][3]}:color=red@0.8:t=2`, composed]);
        files.push(composed);
    }
    const [fx, fy, fs2] = entry.face;
    const face = path.join(tmp, 'face.png');
    ff(['-i', path.join(dir, 'portrait.webp'), '-vf', `crop=${fs2}:${fs2}:${fx}:${fy}`, face]);
    files.push(face);
    mosaic(files, 4, 300, out);
}

function allPeople(wave) {
    const list = [];
    for (const role of ROLE_IDS) for (const gender of Object.keys(GENDERS)) for (const group of GROUP_IDS) {
        if (GROUPS[group].roles && !GROUPS[group].roles.includes(role)) continue;
        const person = personFor(role, gender, group);
        if (wave === 'all' || String(person.wave) === String(wave)) list.push(person);
    }
    return list;
}

function arg(name) {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : null;
}

if (require.main === module) {
    (async () => {
        const wave = arg('wave') || '1';
        const only = arg('only')?.split(',');
        const people = allPeople(only ? 'all' : wave).filter(p => !only || only.includes(p.id)).map(p => ({ ...p, id: `staff/${p.slug}` }));
        if (arg('bases')) {
            const ready = people.filter(isDone);
            mosaic(ready.map(p => path.join(outDir(p), 'portrait.webp')), 9, 200, arg('bases'));
            console.log(`mosaico de ${ready.length} bases → ${arg('bases')}`);
            return;
        }
        // --offline: não gera nada; só refaz js/data/staffPortraits.js e o registro das pessoas já prontas
        const offline = process.argv.includes('--offline');
        if (!KEY && !offline) { console.error('sem OPENROUTER_KEY'); process.exit(1); }
        if (offline) people.splice(0, people.length, ...people.filter(isDone));
        const started = Date.now();
        const data = readData();
        const results = [];
        const toRegister = [];
        const failed = [];
        await Promise.all(people.map(async person => {
            try {
                const result = await runPerson(person);
                // já pronta: só garante o registro em _prompts.json (uma rodada interrompida não chegou a registrar)
                if (result.skipped) {
                    const meta = readMeta(person);
                    toRegister.push({ person, meta });
                    if (!data.manifest[person.id] && meta.entry) {
                        data.manifest[person.id] = meta.entry;
                        data.people[person.id] = { role: person.role, gender: person.gender, variant: person.variant, age: person.age };
                        writeData(data.manifest, data.people);
                    }
                    return;
                }
                toRegister.push(result);
                results.push(result);
                data.manifest[person.id] = result.entry;
                data.people[person.id] = { role: person.role, gender: person.gender, variant: person.variant, age: person.age };
                writeData(data.manifest, data.people);
                const redo = Object.entries(result.meta.attempts).filter(([, n]) => n > 1).map(([k, n]) => `${k}×${n}`);
                console.log(`ok ${person.id} US$ ${result.meta.cost.toFixed(3)}${redo.length ? ` refeito: ${redo.join(' ')}` : ''}${result.meta.flagged && Object.keys(result.meta.flagged).length ? ` ATENÇÃO ${JSON.stringify(result.meta.flagged)}` : ''}`);
                if (arg('mosaic')) personMosaic(person, `${arg('mosaic').replace(/\.png$/, '')}-${person.slug}.png`);
            } catch (e) {
                failed.push(person.id);
                console.error('erro', person.id, e.message);
            }
        }));
        const registered = registerPrompts(toRegister);
        console.log(`fim: ${results.length} novas, ${failed.length} com erro${failed.length ? ` (${failed.join(', ')})` : ''}, ${registered} registros em _prompts.json, custo US$ ${totalCost.toFixed(2)}, ${((Date.now() - started) / 60000).toFixed(1)} min`);
        if (failed.length) process.exitCode = 1;
    })();
}

module.exports = { personFor, allPeople, changedRegion, padBox, faceSquare, ROLES, GROUPS, LAYERS, MODEL };
