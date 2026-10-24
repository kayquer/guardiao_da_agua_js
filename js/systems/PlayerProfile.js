/**
 * PlayerProfile — perfis de jogador (nome/apelido, idade, cidade) salvos no localStorage.
 * Sem DOM nem Babylon (testável em tests/unit): a tela de perfis fica em js/main.js.
 *
 * Perfil: { id, name, age, uf, city, lat, lon, createdAt, lastPlayedAt }
 * lat/lon vêm da geocodificação da cidade (Open-Meteo) e alimentam o clima; podem faltar (sem rede).
 */
class PlayerProfile {
    static STORAGE_KEY = 'guardiao_agua_profiles';
    static MAX_NAME = 20;
    static MIN_AGE = 5;
    static MAX_AGE = 99;

    static readStore() {
        try {
            const data = JSON.parse(localStorage.getItem(PlayerProfile.STORAGE_KEY));
            if (data && Array.isArray(data.profiles)) return data;
        } catch (error) {
            console.warn('⚠️ Perfis corrompidos no localStorage, começando do zero:', error);
        }
        return { profiles: [], activeId: null };
    }

    static writeStore(store) {
        localStorage.setItem(PlayerProfile.STORAGE_KEY, JSON.stringify(store));
    }

    /** Perfis do mais recente para o mais antigo. */
    static list() {
        return PlayerProfile.readStore().profiles
            .slice()
            .sort((a, b) => (b.lastPlayedAt || b.createdAt) - (a.lastPlayedAt || a.createdAt));
    }

    static get(id) {
        return PlayerProfile.readStore().profiles.find(p => p.id === id) || null;
    }

    static getActive() {
        const store = PlayerProfile.readStore();
        return store.profiles.find(p => p.id === store.activeId) || null;
    }

    /** Valida os campos do formulário. Retorna a lista de erros (vazia = ok). */
    static validate({ name, age, uf, city }) {
        const errors = [];
        const cleanName = String(name || '').trim();
        if (!cleanName) errors.push('Digite seu nome ou apelido.');
        else if (cleanName.length > PlayerProfile.MAX_NAME) errors.push(`O nome pode ter até ${PlayerProfile.MAX_NAME} letras.`);
        const numericAge = Number(age);
        if (!Number.isInteger(numericAge) || numericAge < PlayerProfile.MIN_AGE || numericAge > PlayerProfile.MAX_AGE) {
            errors.push(`Digite uma idade entre ${PlayerProfile.MIN_AGE} e ${PlayerProfile.MAX_AGE}.`);
        }
        if (!BRAZIL_STATES[uf]) errors.push('Escolha o seu estado.');
        if (!String(city || '').trim()) errors.push('Escolha a sua cidade.');
        return errors;
    }

    /** Cria o perfil (já validado), salva e o torna ativo. */
    static create({ name, age, uf, city, lat = null, lon = null }) {
        const store = PlayerProfile.readStore();
        const now = Date.now();
        const profile = {
            id: `p_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            name: String(name).trim().slice(0, PlayerProfile.MAX_NAME),
            age: Number(age),
            uf,
            city: String(city).trim(),
            lat,
            lon,
            createdAt: now,
            lastPlayedAt: now
        };
        store.profiles.push(profile);
        store.activeId = profile.id;
        PlayerProfile.writeStore(store);
        return profile;
    }

    static update(id, changes) {
        const store = PlayerProfile.readStore();
        const profile = store.profiles.find(p => p.id === id);
        if (!profile) return null;
        Object.assign(profile, changes);
        PlayerProfile.writeStore(store);
        return profile;
    }

    /** Escolhe o perfil que vai jogar (marca o último acesso). */
    static activate(id) {
        const store = PlayerProfile.readStore();
        const profile = store.profiles.find(p => p.id === id);
        if (!profile) return null;
        profile.lastPlayedAt = Date.now();
        store.activeId = id;
        PlayerProfile.writeStore(store);
        return profile;
    }

    static remove(id) {
        const store = PlayerProfile.readStore();
        store.profiles = store.profiles.filter(p => p.id !== id);
        if (store.activeId === id) store.activeId = null;
        PlayerProfile.writeStore(store);
        if (typeof ResearchLog !== 'undefined') ResearchLog.clear(id);
    }

    /** Dificuldade pela idade (DIFFICULTY_BY_AGE em GameConstants). */
    static difficultyForAge(age) {
        return DIFFICULTY_BY_AGE.find(level => Number(age) <= level.maxAge) || DIFFICULTY_BY_AGE[DIFFICULTY_BY_AGE.length - 1];
    }

    /** Nome para os textos do jogo ("Guardião" se não houver perfil). */
    static displayName() {
        return PlayerProfile.getActive()?.name || 'Guardião';
    }

    /**
     * Troca {nome} pelo nome do jogador. Use nos textos do tutorial, missões e avisos.
     * O nome sai escapado: esses textos vão para innerHTML e o nome é digitado pelo aluno.
     */
    static personalize(text) {
        if (typeof text !== 'string') return text;
        const name = PlayerProfile.displayName().replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
        return text.replace(/\{nome\}/g, name);
    }

    // ===== Dados externos (rede) =====

    /**
     * Sinal que aborta a requisição depois de WEATHER.FETCH_TIMEOUT_MS. A Open-Meteo às vezes segura a conexão
     * até o limite do navegador (~60 s): sem isso o cadastro ficava parado em "Procurando sua cidade no mapa".
     */
    static timeoutSignal() {
        return typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(WEATHER.FETCH_TIMEOUT_MS) : undefined;
    }

    /** Municípios do estado (API do IBGE). Lança erro se a rede falhar — a tela cai para texto livre. */
    static async fetchCities(uf) {
        const response = await fetch(WEATHER.CITIES_URL.replace('{uf}', encodeURIComponent(uf)), { signal: PlayerProfile.timeoutSignal() });
        if (!response.ok) throw new Error(`IBGE respondeu ${response.status}`);
        const cities = await response.json();
        return cities.map(c => c.nome);
    }

    /** Latitude/longitude da cidade (Open-Meteo), conferindo o estado. null se não achar. */
    static async geocode(city, uf) {
        const url = `${WEATHER.GEOCODING_URL}?name=${encodeURIComponent(city)}&count=10&language=pt&countryCode=BR`;
        const response = await fetch(url, { signal: PlayerProfile.timeoutSignal() });
        if (!response.ok) throw new Error(`Geocodificação respondeu ${response.status}`);
        const { results = [] } = await response.json();
        const stateName = BRAZIL_STATES[uf];
        const match = results.find(r => r.admin1 === stateName) || null;
        return match ? { lat: match.latitude, lon: match.longitude } : null;
    }
}
