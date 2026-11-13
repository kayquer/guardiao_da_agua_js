// Som de descoberta do caderno de campo (sfx_discovery): arpejo ascendente de sino + harpa que termina num acorde
// brilhante — o "achei algo especial!" dos jogos de aventura, com melodia própria (não copia nenhum jogo).
// Sintetizado aqui (soma de senoides com envelope de sino, sem amostras de terceiros), gravado em WAV e
// masterizado com ffmpeg (-16 LUFS, mono, MP3 96 kbps) como os outros efeitos de interface.
// Uso: node scripts/sounds/discovery.js   → Sounds/SFX/Player/sfx_discovery{,_2,_3}.mp3 (+ registro em Sounds/_prompts.json)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'Sounds', 'SFX', 'Player');
const RATE = 44100;

const midi = n => 440 * Math.pow(2, (n - 69) / 12);

/** Uma nota de sino/harpa: parciais levemente inarmônicas com queda exponencial e ataque curto. */
function bell(buf, start, freq, dur, gain) {
    const partials = [[1, 1, 1.0], [2.01, 0.42, 1.6], [3.02, 0.22, 2.4], [4.17, 0.1, 3.4], [5.43, 0.05, 4.6]];
    const s0 = Math.floor(start * RATE);
    const n = Math.floor(dur * RATE);
    for (let i = 0; i < n && s0 + i < buf.length; i++) {
        const t = i / RATE;
        const attack = Math.min(1, t / 0.004);
        let v = 0;
        for (const [mult, amp, decay] of partials) v += amp * Math.sin(2 * Math.PI * freq * mult * t) * Math.exp(-t * decay * 2.2);
        buf[s0 + i] += v * attack * gain;
    }
}

/** Brilho de fundo: acorde em tremolo suave que aparece e some (a "aura" da descoberta). */
function shimmer(buf, start, notes, dur, gain) {
    const s0 = Math.floor(start * RATE);
    const n = Math.floor(dur * RATE);
    for (let i = 0; i < n && s0 + i < buf.length; i++) {
        const t = i / RATE;
        const env = Math.sin(Math.PI * Math.min(1, t / dur)) ** 1.5;
        const trem = 0.75 + 0.25 * Math.sin(2 * Math.PI * 7 * t);
        let v = 0;
        notes.forEach((m, k) => { v += Math.sin(2 * Math.PI * midi(m) * t + k) * (1 / (k + 1.5)); });
        buf[s0 + i] += v * env * trem * gain;
    }
}

/** Eco curto (sala pequena) para os sinos não soarem secos. */
function echo(buf, delay, feedback) {
    const d = Math.floor(delay * RATE);
    for (let i = d; i < buf.length; i++) buf[i] += buf[i - d] * feedback;
}

function render(root) {
    const len = 2.4;
    const buf = new Float32Array(Math.floor(len * RATE));
    // arpejo ascendente (graus 1-3-5-7-9-12 da escala maior) e acorde final aberto
    const steps = [0, 4, 7, 11, 14, 19];
    steps.forEach((s, i) => bell(buf, i * 0.075, midi(root + s), 1.2, 0.28 - i * 0.015));
    const end = steps.length * 0.075 + 0.05;
    [12, 16, 19, 24].forEach(s => bell(buf, end, midi(root + s), 1.6, 0.16));
    shimmer(buf, end - 0.05, [root + 24, root + 28, root + 31], 1.5, 0.05);
    echo(buf, 0.11, 0.28);
    // fade final e normalização de pico (a loudness fica com o ffmpeg)
    let peak = 0;
    for (let i = 0; i < buf.length; i++) {
        const left = (buf.length - i) / RATE;
        if (left < 0.3) buf[i] *= left / 0.3;
        peak = Math.max(peak, Math.abs(buf[i]));
    }
    for (let i = 0; i < buf.length; i++) buf[i] = (buf[i] / peak) * 0.89;
    return buf;
}

function wav(samples) {
    const data = Buffer.alloc(samples.length * 2);
    samples.forEach((v, i) => data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2));
    const h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
    h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(RATE, 24);
    h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
    return Buffer.concat([h, data]);
}

const variants = [['sfx_discovery', 72], ['sfx_discovery_2', 74], ['sfx_discovery_3', 69]]; // Dó, Ré e Lá maiores
const prompts = JSON.parse(fs.readFileSync(path.join(ROOT, 'Sounds', '_prompts.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);
for (const [name, root] of variants) {
    const tmp = path.join(os.tmpdir(), `${name}.wav`);
    fs.writeFileSync(tmp, wav(render(root)));
    const out = path.join(OUT, `${name}.mp3`);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', '44100', '-ac', '1', '-b:a', '96k', out]);
    fs.unlinkSync(tmp);
    prompts.sfx[`Sounds/SFX/Player/${name}.mp3`] = {
        generator: 'Síntese própria (scripts/sounds/discovery.js)',
        model: 'senoides com envelope de sino + eco curto',
        prompt: `Descoberta no caderno de campo: arpejo ascendente de sino e harpa (graus 1-3-5-7-9-12, nota base MIDI ${root}) que termina num acorde aberto com brilho em tremolo, 2,4 s. Melodia própria, no espírito do "achei algo especial" dos jogos de aventura.`,
        date: today,
        chosenVersion: 'única',
        loop: false,
        loudnessTarget: '-16 LUFS',
        channels: 1
    };
    console.log('ok', out);
}
// grava como texto, sem reformatar o resto do arquivo (re-serializar o JSON troca 22.0 por 22)
const raw = fs.readFileSync(path.join(ROOT, 'Sounds', '_prompts.json'), 'utf8');
if (!raw.includes('sfx_discovery.mp3')) {
    const entries = variants.map(([name]) => `    ${JSON.stringify(`Sounds/SFX/Player/${name}.mp3`)}: ${JSON.stringify(prompts.sfx[`Sounds/SFX/Player/${name}.mp3`])}`).join(',\n');
    const at = raw.indexOf('"sfx": {') + '"sfx": {'.length;
    fs.writeFileSync(path.join(ROOT, 'Sounds', '_prompts.json'), raw.slice(0, at) + '\n' + entries + ',' + raw.slice(at));
}
