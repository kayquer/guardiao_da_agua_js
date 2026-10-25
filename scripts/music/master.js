// Masteriza as músicas de $MUSIC_RAW (scripts/music/generate.js) para Sounds/BGM: corta o silêncio das pontas,
// loudnorm em duas passadas (-16 LUFS, pico -1,5 dBTP, linear), fade de 1,5 s no fim, MP3 128 kbps estéreo 44,1 kHz.
// Registra cada faixa em Sounds/_prompts.json ("music"), inserindo como texto (reserializar mudaria 22.0 → 22).
// Uso: node scripts/music/master.js [filtro]. Nome final: a próxima numeração livre da categoria
// (o "dia" já tem -1 e -2, então as novas viram -3..-5; as outras categorias tinham um arquivo só, sem número).
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { jobs, MODEL, RAW } = require('./generate');
const ROOT = path.resolve(__dirname, '..', '..');
const promptsFile = path.join(ROOT, 'Sounds/_prompts.json');
const raw = fs.readFileSync(promptsFile, 'utf8');
const crlf = raw.includes('\r\n');
const original = JSON.parse(raw);
const filter = process.argv[2];
const today = new Date().toISOString().slice(0, 10);

const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
const probe = file => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
const TRIM = 'silenceremove=start_periods=1:start_threshold=-55dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse';

const offsets = { day: 1 }; // day: as novas 2..4 do gerador viram 3..5
const added = {};
const report = [];
for (const job of jobs) {
    if (filter && !job.name.includes(filter)) continue;
    const src = path.join(RAW, `${job.name}.mp3`);
    if (!fs.existsSync(src)) continue;
    const n = Number(job.name.match(/-(\d)$/)[1]) + (offsets[job.cat] || 0);
    const rel = `Sounds/BGM/gameplay-${job.cat}-${n}.mp3`;
    const out = path.join(ROOT, rel);
    const tmp = path.join(RAW, `${job.name}.trim.wav`);
    ff(['-i', src, '-af', TRIM, tmp]);
    const seconds = probe(tmp);
    // 1ª passada: medir; 2ª: aplicar (linear) + fade no fim
    const m = JSON.parse(lastJson(runStderr(['-i', tmp, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'])));
    const norm = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
    ff(['-i', tmp, '-af', `${norm},afade=t=out:st=${Math.max(0, seconds - 1.5).toFixed(2)}:d=1.5`, '-ar', '44100', '-ac', '2', '-b:a', '128k', out]);
    fs.unlinkSync(tmp);
    const after = JSON.parse(lastJson(runStderr(['-i', out, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'])));
    added[rel] = {
        generator: 'Google Lyria 3 (OpenRouter)', model: MODEL, prompt: job.prompt, date: today,
        chosenVersion: `faixa ${n} da playlist`, source: `${job.name}.mp3`,
        why: 'Variação nova do mesmo prompt da categoria (mais faixas na playlist, menos repetição).',
        loudness: `${m.input_i} → ${after.input_i} LUFS, pico ${after.input_tp} dBTP`,
        seconds: Math.round(probe(out) * 10) / 10
    };
    report.push(`${rel} ${added[rel].seconds}s ${after.input_i} LUFS ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
}

// O loudnorm imprime o relatório no stderr (e sai com 0)
function runStderr(args) {
    return spawnSync('ffmpeg', ['-hide_banner', ...args], { encoding: 'utf8' }).stderr || '';
}
function lastJson(text) {
    return text.slice(text.lastIndexOf('{'), text.lastIndexOf('}') + 1);
}

// Insere no fim de "music" só o que é novo
const fresh = Object.keys(added).filter(k => !original.music[k]);
if (fresh.length) {
    let text = raw.replace(/\r\n/g, '\n');
    const musicStart = text.indexOf('"music": {');
    const musicEnd = text.indexOf('\n  },\n', musicStart);
    const entries = fresh.map(k => `    ${JSON.stringify(k)}: ${JSON.stringify(added[k], null, 2).replace(/\n/g, '\n    ')}`).join(',\n');
    text = text.slice(0, musicEnd) + ',\n' + entries + text.slice(musicEnd);
    JSON.parse(text);
    fs.writeFileSync(promptsFile, crlf ? text.replace(/\n/g, '\r\n') : text);
}
console.log(report.join('\n'));
