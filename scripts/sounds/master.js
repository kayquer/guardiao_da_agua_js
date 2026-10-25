// Masteriza os sons de raw/ (ffmpeg: corta silêncio das pontas, -18 LUFS, pico -1,5 dBTP, mono 96 kbps)
// → Sounds/SFX/Player/<nome>.mp3 e registra o prompt em Sounds/_prompts.json. Imprime o que entrou.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const RAW = process.env.SOUNDS_RAW || path.join(require('os').tmpdir(), 'guardiao-sounds-raw');
const allJobs = JSON.parse(fs.readFileSync(path.join(RAW, 'jobs.json'), 'utf8'));
// node master.js [filtro]: só os sons cujo nome contém o filtro (não regrava os que já estão no jogo)
const filter = process.argv[2];
const jobs = allJobs.filter(job => !filter || job.name.includes(filter));
const today = new Date().toISOString().slice(0, 10);
// Quantas variações tem o som (voc_x_hello_1.._5 → 5), para o registro "variação N de M"
const variationsOf = name => allJobs.filter(j => j.name.replace(/_\d$/, '') === name.replace(/_\d$/, '')).length;
const promptsFile = path.join(ROOT, 'Sounds/_prompts.json');
const raw = fs.readFileSync(promptsFile, 'utf8');
const crlf = raw.includes('\r\n');
const prompts = JSON.parse(raw);
const done = [];
for (const job of jobs) {
    const src = path.join(RAW, `${job.name}.mp3`);
    if (!fs.existsSync(src)) continue;
    const rel = `Sounds/SFX/Player/${job.name}.mp3`;
    const out = path.join(ROOT, rel);
    const trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse';
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-af', `${trim},loudnorm=I=-18:TP=-1.5:LRA=7`,
        '-ac', '1', '-ar', '44100', '-b:a', '96k', out]);
    const variation = job.name.match(/_(\d)$/);
    prompts.sfx[rel] = {
        generator: 'ElevenLabs Sound Effects v2', model: 'eleven_text_to_sound_v2', prompt: job.text,
        date: today, chosenVersion: variation ? `variação ${variation[1]} de ${Math.max(variationsOf(job.name), Number(variation[1]))}` : 'única', loop: false,
        loudnessTarget: '-18 LUFS', channels: 1
    };
    done.push(`${rel} ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
}
// Insere só as entradas novas no fim de "sfx", como texto (reserializar mudaria 22.0 → 22 no arquivo todo)
const original = JSON.parse(raw);
let text = raw.replace(/\r\n/g, '\n');
const fresh = Object.keys(prompts.sfx).filter(k => !original.sfx[k]);
const entries = fresh.map(k => `    ${JSON.stringify(k)}: ${JSON.stringify(prompts.sfx[k], null, 2).replace(/\n/g, '\n    ')}`).join(',\n');
const end = text.lastIndexOf('\n    }\n  }\n}');
if (fresh.length) text = text.slice(0, end) + '\n    },\n' + entries + text.slice(end + '\n    }'.length);
if (crlf) text = text.replace(/\n/g, '\r\n');
fs.writeFileSync(promptsFile, text);
console.log(done.join('\n'));
