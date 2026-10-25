// Gera músicas de fundo com o Google Lyria 3 (OpenRouter, /chat/completions com saída de áudio).
// A chave vem só da variável OPENROUTER_API_KEY (nunca gravada). Prompts = os registrados em Sounds/_prompts.json
// para cada categoria + um sufixo curto de variação (para as faixas novas não saírem iguais às antigas).
// Uso: OPENROUTER_API_KEY=... node scripts/music/generate.js [filtro]  → $MUSIC_RAW/<nome>.mp3 (pula o que já existe)
// Depois: node scripts/music/master.js [filtro] (masteriza para Sounds/BGM e registra em Sounds/_prompts.json).
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const RAW = process.env.MUSIC_RAW || path.join(require('os').tmpdir(), 'guardiao-music-raw');
fs.mkdirSync(RAW, { recursive: true });
const KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/lyria-3-pro-preview';

const prompts = JSON.parse(fs.readFileSync(path.join(ROOT, 'Sounds/_prompts.json'), 'utf8')).music;
const base = file => prompts[`Sounds/BGM/${file}`].prompt;
const CATEGORIES = {
    day: base('gameplay-day-1.mp3'),
    night: base('gameplay-night.mp3'),
    rain: base('gameplay-rain.mp3'),
    alert: base('gameplay-alert.mp3'),
    thriving: base('gameplay-thriving.mp3')
};
// Mesma instrumentação e clima; muda a melodia e o desenho para a playlist variar
const VARIATIONS = {
    2: 'New composition in the same style: a different main melody and chord progression.',
    3: 'New composition in the same style: a different melody led by another instrument of the same palette, slightly different groove.',
    4: 'New composition in the same style: a fresh theme with a gentle key change in the middle, same tempo and mood.'
};
const jobs = [];
for (const [cat, prompt] of Object.entries(CATEGORIES)) {
    for (const n of [2, 3, 4]) jobs.push({ name: `gameplay-${cat}-${n}`, cat, prompt: `${prompt} ${VARIATIONS[n]}` });
}
fs.writeFileSync(path.join(RAW, 'jobs.json'), JSON.stringify({ model: MODEL, jobs }, null, 2));

async function generate(job) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: job.prompt }], modalities: ['text', 'audio'], audio: { format: 'mp3' }, stream: true })
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
    const chunks = [];
    let cost = null, buffer = '';
    const decoder = new TextDecoder();
    for await (const part of res.body) {
        buffer += decoder.decode(part, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            const json = JSON.parse(data);
            if (json.usage?.cost != null) cost = json.usage.cost;
            for (const choice of json.choices || []) if (choice.delta?.audio?.data) chunks.push(choice.delta.audio.data);
        }
    }
    const audio = Buffer.concat(chunks.map(c => Buffer.from(c, 'base64')));
    if (!audio.length) throw new Error('sem áudio');
    fs.writeFileSync(path.join(RAW, `${job.name}.mp3`), audio);
    return cost;
}

if (require.main === module) {
    if (!KEY) { console.error('sem OPENROUTER_API_KEY'); process.exit(1); }
    const filter = process.argv[2];
    const todo = jobs.filter(j => (!filter || j.name.includes(filter)) && !fs.existsSync(path.join(RAW, `${j.name}.mp3`)));
    (async () => {
        let total = 0;
        // 5 de cada vez: a API demora ~1 min por faixa
        for (let i = 0; i < todo.length; i += 5) {
            await Promise.all(todo.slice(i, i + 5).map(async job => {
                try {
                    const cost = await generate(job);
                    total += cost || 0;
                    console.log('ok', job.name, cost);
                } catch (e) {
                    console.error('erro', job.name, e.message);
                }
            }));
        }
        console.log('fim, custo', total.toFixed(3));
    })();
}

module.exports = { jobs, MODEL, RAW };
