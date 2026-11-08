/**
 * @OnlyCurrentDoc
 * (pede só acesso a ESTA planilha — escopo spreadsheets.currentonly — e não a todo o Google Drive;
 *  sem isso o Google pode bloquear a autorização com "This app is blocked")
 */

/**
 * Guardião da Água — recebedor dos dados de pesquisa (Google Apps Script ligado a uma Planilha Google).
 * O jogo (js/systems/ResearchSync.js) envia, a cada 5 minutos e pelo botão "☁️ Enviar para a pesquisa",
 * um POST com { format, version, sentAt, profile: { id, age, city }, events: [...] }.
 *
 * COMO PUBLICAR (uma vez):
 *  1. Crie uma Planilha Google na conta da pesquisa → Extensões → Apps Script.
 *  2. Apague o conteúdo de Code.gs, cole este arquivo inteiro e salve.
 *  3. Implantar → Nova implantação → tipo "App da Web":
 *       Executar como: Eu (sua conta)  ·  Quem pode acessar: Qualquer pessoa
 *  4. Autorize o acesso à planilha e copie a URL que termina em /exec.
 *  5. Cole a URL em RESEARCH_SYNC.ENDPOINT (js/config/GameConstants.js).
 *  Teste: abrir a URL /exec no navegador deve mostrar {"ok":true,"service":"guardiao-da-agua-pesquisa"}.
 *  Ao mudar este código: Implantar → Gerenciar implantações → editar → Nova versão (a URL continua a mesma).
 *
 * A planilha ganha duas abas (criadas sozinhas):
 *  - "Eventos": uma linha por registro, no mesmo formato do CSV baixado no jogo (sem UF e sem apelido).
 *  - "Perfis": um jogador por linha, com o último número de registro recebido (registros repetidos são ignorados).
 */

const FORMAT = 'guardiao-da-agua-pesquisa';
const MAX_EVENTS = 1000;   // por requisição (o jogo manda até 500)
const MAX_TEXT = 5000;     // corta só textos absurdos (o detalhe de um quiz cabe com folga)
const EVENT_HEAD = ['recebido_em', 'perfil', 'idade', 'cidade', 'registro', 'data_hora', 'sessao', 'tempo_jogo_s',
    'tipo', 'origem', 'alvo', 'titulo', 'valor', 'acerto', 'detalhe'];
const PROFILE_HEAD = ['perfil', 'idade', 'cidade', 'ultimo_registro', 'ultimo_envio', 'total_registros'];

function doGet() {
    return json({ ok: true, service: FORMAT });
}

function doPost(e) {
    let data;
    try {
        data = JSON.parse(e.postData.contents);
    } catch (err) {
        return json({ ok: false, error: 'json' });
    }
    const problem = validate(data);
    if (problem) return json({ ok: false, error: problem });

    const lock = LockService.getScriptLock();
    lock.waitLock(25000); // uma turma inteira pode enviar ao mesmo tempo
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const events = sheet(ss, 'Eventos', EVENT_HEAD);
        const profiles = sheet(ss, 'Perfis', PROFILE_HEAD);

        const p = data.profile;
        const id = String(p.id);
        const age = Number.isFinite(Number(p.age)) ? Number(p.age) : '';
        const city = text(p.city);

        // Último registro já recebido deste perfil (ignora reenvios)
        const ids = profiles.getLastRow() > 1 ? profiles.getRange(2, 1, profiles.getLastRow() - 1, 1).getValues() : [];
        let row = -1;
        for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { row = i + 2; break; }
        const lastN = row > 0 ? Number(profiles.getRange(row, 4).getValue()) || 0 : 0;
        const total = row > 0 ? Number(profiles.getRange(row, 6).getValue()) || 0 : 0;

        const now = new Date();
        const fresh = data.events.filter(ev => Number(ev.n) > lastN).sort((a, b) => a.n - b.n);
        if (fresh.length) {
            const rows = fresh.map(ev => {
                const known = ['n', 't', 's', 'gt', 'type', 'source', 'target', 'title', 'value', 'ok'];
                const extra = {};
                Object.keys(ev).forEach(k => { if (known.indexOf(k) < 0) extra[k] = ev[k]; });
                return [now, id, age, city, Number(ev.n), text(ev.t), num(ev.s), num(ev.gt), text(ev.type),
                    text(ev.source), text(ev.target), text(ev.title), typeof ev.value === 'number' ? ev.value : text(ev.value),
                    ev.ok === undefined || ev.ok === null ? '' : (ev.ok ? 1 : 0),
                    Object.keys(extra).length ? text(JSON.stringify(extra)) : ''];
            });
            events.getRange(events.getLastRow() + 1, 1, rows.length, EVENT_HEAD.length).setValues(rows);
        }
        const newLast = fresh.length ? Number(fresh[fresh.length - 1].n) : lastN;
        const profileRow = [id, age, city, newLast, now, total + fresh.length];
        if (row > 0) profiles.getRange(row, 1, 1, PROFILE_HEAD.length).setValues([profileRow]);
        else profiles.appendRow(profileRow);

        return json({ ok: true, received: fresh.length, last: newLast });
    } finally {
        lock.releaseLock();
    }
}

function validate(data) {
    if (!data || data.format !== FORMAT) return 'format';
    if (!data.profile || !/^[A-Za-z0-9_-]{1,64}$/.test(String(data.profile.id))) return 'profile';
    if (!Array.isArray(data.events) || data.events.length > MAX_EVENTS) return 'events';
    for (const ev of data.events) {
        if (!ev || !Number.isInteger(Number(ev.n)) || Number(ev.n) < 1) return 'event';
    }
    return null;
}

function sheet(ss, name, head) {
    let sh = ss.getSheetByName(name);
    if (!sh) {
        sh = ss.insertSheet(name);
        sh.appendRow(head);
        sh.setFrozenRows(1);
    }
    return sh;
}

function text(v) {
    if (v === undefined || v === null) return '';
    let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (s.length > MAX_TEXT) s = s.slice(0, MAX_TEXT);
    return /^[=+\-@]/.test(s) ? "'" + s : s; // não deixa texto virar fórmula na planilha
}

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : '';
}

function json(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
