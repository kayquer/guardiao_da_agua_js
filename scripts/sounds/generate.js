// Gera vozes e sons de seleção com o ElevenLabs Sound Effects v2. A chave vem só da variável ELEVEN_KEY (nunca gravada).
// Uso: ELEVEN_KEY=... node scripts/sounds/generate.js [filtro]  → $SOUNDS_RAW/<nome>.mp3 (pula o que já existe)
// Depois: node scripts/sounds/master.js (masteriza para Sounds/SFX/Player e registra em Sounds/_prompts.json) e
// acrescente as chaves/arquivos em js/data/audioManifest.js.
const fs = require('fs');
const path = require('path');
const RAW = process.env.SOUNDS_RAW || path.join(require('os').tmpdir(), 'guardiao-sounds-raw');
fs.mkdirSync(RAW, { recursive: true });
const KEY = process.env.ELEVEN_KEY;
if (!KEY) { console.error('sem ELEVEN_KEY'); process.exit(1); }

const VOICE = 'no words, close-mic, dry, no music, no background';
const SFX = 'cozy kids city-building game, friendly and charming, not scary, no music, no voice, mono, dry';
const jobs = [];
const voice = (name, text, seconds) => jobs.push({ name, text: `${text}, ${VOICE}`, seconds, kind: 'voice' });
const sel = (group, text, seconds = 0.9) => { for (let i = 1; i <= 3; i++) jobs.push({ name: `sfx_select_${group}_${i}`, text: `${text}, ${SFX}`, seconds, kind: 'select' }); };

// ----- Vozes de entrada (normal ×5, animado, preocupado, triste) -----
voice('voc_claudia_hello_2', "Friendly adult Brazilian woman's short warm 'hey!' greeting vocal, smiling", 0.5);
voice('voc_claudia_hello_3', "Adult woman's soft cheerful inviting 'mm-hm?' hum, friendly and curious", 0.6);
voice('voc_claudia_hello_4', "Adult Brazilian woman's gentle welcoming 'oi!' greeting vocal, kind teacher smile", 0.5);
voice('voc_claudia_hello_5', "Adult woman's short pleased 'aha!' vocal, warm and encouraging", 0.5);
voice('voc_claudia_happy', "Adult woman's delighted short laugh 'ha-ha!', joyful and celebrating", 0.8);
voice('voc_claudia_sad', "Adult woman's soft sad sigh 'aww...', gently disappointed", 0.9);

voice('voc_jose_hello_2', "Warm older Brazilian man's friendly calling 'ô!' greeting vocal, relaxed and kind", 0.5);
voice('voc_jose_hello_3', "Older man's calm content 'hmm-hm' hum, kind and easygoing", 0.6);
voice('voc_jose_hello_4', "Older Brazilian man's relaxed friendly 'eh-eh' little chuckle greeting, easygoing fisherman", 0.6);
voice('voc_jose_hello_5', "Older man's warm calm 'opa' greeting vocal, slow and kind", 0.5);
voice('voc_jose_happy', "Older man's hearty happy laugh 'ha-ha-ha', proud and warm", 0.9);
voice('voc_jose_worried', "Older man's low concerned 'hmm...' grumble, worried", 0.8);
voice('voc_jose_sad', "Older man's heavy sad sigh, tired and disappointed", 0.9);

voice('voc_marcia_hello_2', "Young adult woman's bright energetic 'hey!' vocal chirp, friendly", 0.5);
voice('voc_marcia_hello_3', "Young woman's curious thoughtful upward 'hmm?' hum, interested", 0.6);
voice('voc_marcia_hello_4', "Young adult woman's quick upbeat 'oi-oi!' greeting vocal, lively", 0.5);
voice('voc_marcia_hello_5', "Young woman's interested 'ooh!' vocal reaction, curious and friendly", 0.5);
voice('voc_marcia_happy', "Young woman's excited 'yay!' cheer with a small laugh, joyful", 0.8);
voice('voc_marcia_worried', "Young woman's anxious short 'uh-oh' gasp, worried", 0.7);
voice('voc_marcia_sad', "Young woman's soft disappointed 'ohh...' sigh, sad", 0.9);

voice('voc_paulo_hello_1', "Middle-aged Brazilian man's friendly energetic 'hey!' greeting vocal, confident and warm", 0.5);
voice('voc_paulo_hello_2', "Middle-aged man's warm approving 'mm-hm!' hum, confident and kind", 0.6);
voice('voc_paulo_hello_3', "Middle-aged man's upbeat short 'opa!' exclamation vocal, cheerful", 0.5);
voice('voc_paulo_hello_4', "Middle-aged Brazilian man's friendly 'e aí!' greeting vocal, relaxed and confident", 0.5);
voice('voc_paulo_hello_5', "Middle-aged man's short affirmative 'hm-hm!' nod sound, warm and reliable", 0.5);
voice('voc_paulo_happy', "Middle-aged man's hearty cheerful laugh 'ha-ha!', excited", 0.8);
voice('voc_paulo_worried', "Middle-aged man's concerned 'hmm...' with a tense exhale, worried", 0.8);
voice('voc_paulo_sad', "Middle-aged man's disappointed long sigh 'aaah...', sad", 0.9);

// ----- Seleção no mapa (estilo "clique no prédio pronto" de jogos de estratégia): 3 variações por grupo -----
sel('water', 'Selecting a water pump building: short mechanical pump thunk followed by a bubbly water gurgle', 0.8);
sel('treatment', 'Selecting a water treatment plant: bubbling aeration tanks, soft filter swoosh and a tiny clean chime');
sel('waste', 'Selecting a recycling center: plastic bottles and aluminum cans clinking into a bin with a cheerful little conveyor whir');
sel('nature', 'Selecting a rain garden: leaves rustling, water trickling into soil and one happy bird chirp');
sel('science', 'Selecting a research laboratory: friendly computer beeps and a glass test tube clink', 0.8);
sel('power_clean', 'Selecting a wind and solar power plant: airy wind turbine whoosh with a soft electric hum rising');
sel('power_heavy', 'Selecting a big power plant: deep steam turbine hum and a short steam hiss, powerful but friendly cartoon');
sel('public', 'Selecting city hall: a small warm civic bell ding with distant friendly crowd murmur');
sel('homes', 'Selecting a residential neighborhood: a front door opening, kids laughing far away, a little dog bark', 1);
sel('commerce', 'Selecting a shopping street: shop door bell jingle and a soft cash register cha-ching');
sel('industry', 'Selecting a factory: rhythmic machinery clank and a short hydraulic press hiss, cartoon');
sel('tourism', 'Selecting a tourist attraction: camera shutter click and a small delighted crowd ooh');
sel('roads', 'Selecting a city street: a small car passing by with a light friendly horn beep', 0.8);
sel('soil', 'Clicking on grassy ground: soft footsteps on grass and earth with a tiny pebble crunch', 0.6);
sel('trees', 'Clicking on a tree: leaves rustling in a breeze and a bird chirping', 0.8);
sel('river', 'Clicking on a river: gentle water lapping and a small fish splash', 0.8);

const filter = process.argv[2];
fs.writeFileSync(path.join(RAW, 'jobs.json'), JSON.stringify(jobs, null, 2));

(async () => {
    let done = 0;
    for (const job of jobs) {
        if (filter && !job.name.includes(filter)) continue;
        const out = path.join(RAW, `${job.name}.mp3`);
        if (fs.existsSync(out)) continue;
        const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
            method: 'POST',
            headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
            body: JSON.stringify({ text: job.text, duration_seconds: job.seconds, prompt_influence: 0.45, model_id: 'eleven_text_to_sound_v2' })
        });
        if (!res.ok) {
            console.error(job.name, res.status, (await res.text()).slice(0, 300));
            if (res.status === 401 || res.status === 402 || res.status === 429) process.exit(2);
            continue;
        }
        fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
        console.log('ok', job.name, ++done);
    }
    console.log('fim', done);
})();
