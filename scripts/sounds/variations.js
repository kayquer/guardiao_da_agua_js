// Variações de efeitos sonoros: todo efeito (kind 'sfx' no manifesto) fica com pelo menos MIN_VARIATIONS arquivos,
// sorteados sem repetir (AudioManager.pickFile). Usa o mesmo prompt registrado em Sounds/_prompts.json + um pedido de
// variação, a mesma duração do arquivo original e o mesmo alvo de volume. Também cria sons extras (EXTRAS).
// Uso: ELEVEN_KEY=... node scripts/sounds/variations.js [filtro]  (chave só por variável de ambiente, nunca gravada)
//   → gera em $SOUNDS_RAW/variations, masteriza na pasta do original, registra o prompt e atualiza o manifesto.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const RAW = path.join(process.env.SOUNDS_RAW || path.join(require('os').tmpdir(), 'guardiao-sounds-raw'), 'variations');
const KEY = process.env.ELEVEN_KEY;
const MIN_VARIATIONS = 3;
const MANIFEST_FILE = path.join(ROOT, 'js/data/audioManifest.js');
const PROMPTS_FILE = path.join(ROOT, 'Sounds/_prompts.json');
const today = new Date().toISOString().slice(0, 10);

// Sons novos (não são variações de um que já existe)
const STORM = 'thunderstorm ambience one-shot, natural, cinematic but not scary, no music, no voice, wide stereo';
const EXTRAS = {
    sfx_storm_extra: {
        dir: 'Sounds/SFX/Environment', volume: 0.55, gap: 6000, lufs: -20, channels: 2,
        prompts: [
            `Strong wind gust sweeping through a small town, rising and fading, ${STORM}`,
            `Sudden burst of heavy rain drumming on tin roofs and gutters overflowing, ${STORM}`,
            `Long low rolling thunder rumble far away moving across the sky, ${STORM}`,
            `Short burst of small hail tapping on roofs and car hoods, ${STORM}`,
            `Tree branches creaking and leaves thrashing in a stormy wind, ${STORM}`
        ],
        seconds: [3, 3.5, 4, 2.5, 3]
    },
    // Alertas dos botões de recurso do HUD (ui/ResourceHud.js): um som próprio por recurso quando ele piora de faixa,
    // e um de recuperação quando volta a ficar bem
    ...resourceAlerts()
};

function resourceAlerts() {
    const UI = 'short game UI alert for a cozy kids city-building game, clear and readable, gentle not scary, no music, no voice, no words, mono, dry';
    const alerts = {
        sfx_alert_water: [
            `Water running out: the last drops gurgle down an empty metal pipe and stop with a hollow plop, ${UI}`,
            `A tap sputtering and coughing air, a few final drips and then dry silence, ${UI}`,
            `Water level dropping in a tank: a descending glug-glug and a small empty echo, ${UI}`
        ],
        sfx_alert_energy: [
            `Electricity powering down: a soft electric hum sliding down in pitch with a little flicker buzz, ${UI}`,
            `A light bulb buzzing, flickering twice and switching off with a soft click, ${UI}`,
            `Machine running out of power: a whirring motor slowing down to a stop with a low electric sigh, ${UI}`
        ],
        sfx_alert_pollution: [
            `Pollution warning: a factory chimney puffing thick smoke with a hiss, then a soft muffled cough, ${UI}`,
            `Dirty air alert: a low murky whoosh of smog rolling in and a tiny wheezy cough, ${UI}`,
            `Sludgy polluted water bubble pops and a smoky hiss, a short warning tone underneath, ${UI}`
        ],
        sfx_alert_money: [
            `Money running low: a few coins dropping into an almost empty tin, the last one rolling and wobbling to a stop, ${UI}`,
            `An empty wallet being opened, a single coin falls out and spins on a wooden table, ${UI}`,
            `Piggy bank shaken with only one coin rattling inside, then a soft descending two-note tone, ${UI}`
        ],
        sfx_alert_population: [
            `People leaving town: footsteps and suitcase wheels rolling away on a sidewalk, fading out, ${UI}`,
            `A small crowd murmur fading away into the distance and a door closing softly, ${UI}`,
            `Moving truck door sliding shut and the engine driving away, short and gentle, ${UI}`
        ],
        sfx_alert_satisfaction: [
            `Unhappy citizens: a small group making a disappointed non-verbal groan, soft and comic, ${UI}`,
            `A short descending sad trombone-like wobble played on a soft woodwind, ${UI}`,
            `A few people tutting and sighing in disappointment, non-verbal, gentle, ${UI}`
        ],
        sfx_alert_recover: [
            `Resource recovered: a bright rising three-note marimba chime with a tiny sparkle, ${UI}`,
            `Things are getting better: a soft upward whoosh ending in a warm bell ding, ${UI}`,
            `Happy little rising glockenspiel arpeggio with a water-bubble pop at the end, ${UI}`
        ]
    };
    const out = {};
    for (const [key, prompts] of Object.entries(alerts)) {
        out[key] = { dir: 'Sounds/SFX/Player', volume: 0.6, gap: 4000, lufs: -16, channels: 1, prompts, seconds: [1.6, 1.6, 1.6] };
    }
    return out;
}

function loadManifest() {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(`${fs.readFileSync(MANIFEST_FILE, 'utf8')};this.M = SOUND_MANIFEST;`, ctx);
    return ctx.M;
}

const probe = file => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
const stemOf = file => path.basename(file, '.mp3').replace(/_\d+$/, '');

/** Trabalhos: { key, out (caminho relativo), prompt, seconds, lufs, channels, n, total } */
function plan(filter) {
    const manifest = loadManifest();
    const prompts = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8')).sfx;
    const jobs = [];
    for (const [key, entry] of Object.entries(manifest)) {
        if (entry.kind !== 'sfx' || entry.files.length >= MIN_VARIATIONS) continue;
        if (filter && !key.includes(filter)) continue;
        const first = entry.files[0];
        const record = prompts[first] || Object.entries(prompts).find(([, r]) => (r.alsoUsedAs || []).includes(key))?.[1];
        if (!record) { console.warn('sem prompt registrado:', key, first); continue; }
        const lufs = Number(String(record.loudnessTarget || '-16').match(/-?\d+(\.\d+)?/)[0]);
        const seconds = Math.min(22, Math.max(0.5, Math.round(probe(path.join(ROOT, first)) * 10) / 10));
        const used = new Set(entry.files.map(f => Number((path.basename(f, '.mp3').match(/_(\d+)$/) || [0, 1])[1])));
        const dir = path.dirname(first);
        const stem = stemOf(first);
        let n = 1;
        for (let have = entry.files.length; have < MIN_VARIATIONS; have++) {
            while (used.has(n)) n++;
            used.add(n);
            jobs.push({ key, out: `${dir}/${stem}_${n}.mp3`, n, total: MIN_VARIATIONS, lufs, channels: record.channels || 1, seconds,
                prompt: `${record.prompt.replace(/\s+$/, '')} Variation ${n}: a fresh take of the same sound, slightly different timing and character, same mood and length.` });
        }
    }
    for (const [key, extra] of Object.entries(EXTRAS)) {
        if (filter && !key.includes(filter)) continue;
        if (manifest[key]) continue;
        extra.prompts.forEach((prompt, i) => jobs.push({ key, extra: true, out: `${extra.dir}/${key}_${i + 1}.mp3`, n: i + 1,
            total: extra.prompts.length, lufs: extra.lufs, channels: extra.channels, seconds: extra.seconds[i], prompt }));
    }
    return jobs;
}

async function generate(job) {
    const raw = path.join(RAW, path.basename(job.out));
    if (fs.existsSync(raw)) return raw;
    const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: job.prompt, duration_seconds: job.seconds, prompt_influence: 0.45, model_id: 'eleven_text_to_sound_v2' })
    });
    if (!res.ok) {
        const msg = `${res.status} ${(await res.text()).slice(0, 200)}`;
        if ([401, 402, 429].includes(res.status)) throw Object.assign(new Error(msg), { fatal: true });
        throw new Error(msg);
    }
    fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
    return raw;
}

function master(raw, job) {
    const trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse';
    const args = ['-hide_banner', '-y', '-loglevel', 'error', '-i', raw, '-af', `${trim},loudnorm=I=${job.lufs}:TP=-1.5:LRA=7`,
        '-ac', String(job.channels), '-ar', '44100', '-b:a', job.channels === 1 ? '96k' : '128k', path.join(ROOT, job.out)];
    const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr.slice(-300));
}

/** Registra os prompts (texto no fim de "sfx": reserializar mudaria 22.0 → 22) e põe os arquivos no manifesto. */
function register(done) {
    let text = fs.readFileSync(PROMPTS_FILE, 'utf8');
    const crlf = text.includes('\r\n');
    text = text.replace(/\r\n/g, '\n');
    const existing = JSON.parse(text).sfx;
    const fresh = done.filter(j => !existing[j.out]);
    if (fresh.length) {
        const entries = fresh.map(j => `    ${JSON.stringify(j.out)}: ${JSON.stringify({
            generator: 'ElevenLabs Sound Effects v2', model: 'eleven_text_to_sound_v2', prompt: j.prompt, date: today,
            chosenVersion: `variação ${j.n} de ${j.total}`, loop: false, loudnessTarget: `${j.lufs} LUFS`, channels: j.channels
        }, null, 2).replace(/\n/g, '\n    ')}`).join(',\n');
        const end = text.lastIndexOf('\n    }\n  }\n}');
        text = text.slice(0, end) + '\n    },\n' + entries + text.slice(end + '\n    }'.length);
        JSON.parse(text);
        fs.writeFileSync(PROMPTS_FILE, crlf ? text.replace(/\n/g, '\r\n') : text);
    }
    let src = fs.readFileSync(MANIFEST_FILE, 'utf8');
    const mcrlf = src.includes('\r\n');
    src = src.replace(/\r\n/g, '\n');
    const byKey = {};
    done.forEach(j => (byKey[j.key] = byKey[j.key] || []).push(j));
    for (const [key, list] of Object.entries(byKey)) {
        const files = list.map(j => `'${j.out}'`).join(', ');
        const start = src.indexOf(`    ${key}: {`);
        if (start < 0) {
            // som novo: entra antes do fecho do bloco de clima (sfx_thunder_far) ou no fim do objeto
            const extra = EXTRAS[key];
            const line = `    ${key}: { kind: 'sfx', files: [${files}], volume: ${extra.volume}, gap: ${extra.gap} },\n`;
            const anchor = src.indexOf('    sfx_thunder_far:');
            src = src.slice(0, anchor) + line + src.slice(anchor);
            continue;
        }
        const close = src.indexOf(']', start);
        src = src.slice(0, close) + `, ${files}` + src.slice(close);
    }
    fs.writeFileSync(MANIFEST_FILE, mcrlf ? src.replace(/\n/g, '\r\n') : src);
}

if (require.main === module) {
    if (!KEY) { console.error('sem ELEVEN_KEY'); process.exit(1); }
    fs.mkdirSync(RAW, { recursive: true });
    const jobs = plan(process.argv[2]);
    console.log(`${jobs.length} sons para gerar`);
    (async () => {
        const done = [];
        for (let i = 0; i < jobs.length; i += 4) {
            const batch = jobs.slice(i, i + 4);
            const results = await Promise.allSettled(batch.map(async job => { master(await generate(job), job); return job; }));
            for (const [k, r] of results.entries()) {
                if (r.status === 'fulfilled') { done.push(r.value); console.log('ok', batch[k].out); } else {
                    console.error('erro', batch[k].out, r.reason.message);
                    if (r.reason.fatal) { register(done); console.log('parou (crédito/limite):', done.length, 'feitos'); return; }
                }
            }
        }
        register(done);
        console.log('fim', done.length);
    })();
}

module.exports = { plan };
