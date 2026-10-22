/**
 * LessonProgress — quais aulas (LESSON_CHAPTERS) cada jogador já concluiu, no localStorage.
 * Por perfil (PlayerProfile): cada aluno no mesmo computador tem o seu progresso.
 * Sem DOM (testável em tests/unit): a central de aulas fica em js/systems/ui/LessonBookUI.js.
 */
class LessonProgress {
    static STORAGE_KEY = 'guardiao_agua_lessons';

    static profileKey() {
        return PlayerProfile.getActive()?.id || 'guest';
    }

    static readAll() {
        try {
            return JSON.parse(localStorage.getItem(LessonProgress.STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    }

    static doneChapters() {
        const entry = LessonProgress.readAll()[LessonProgress.profileKey()];
        return Array.isArray(entry?.done) ? entry.done.map(Number) : [];
    }

    static isDone(chapter) {
        return LessonProgress.doneChapters().includes(Number(chapter));
    }

    /** Marca a aula como concluída. Retorna true se é a primeira vez. */
    static markDone(chapter) {
        chapter = Number(chapter);
        if (!LESSON_CHAPTERS[chapter] || LessonProgress.isDone(chapter)) return false;
        const all = LessonProgress.readAll();
        const key = LessonProgress.profileKey();
        all[key] = { done: [...LessonProgress.doneChapters(), chapter].sort((a, b) => a - b), updatedAt: Date.now() };
        try {
            localStorage.setItem(LessonProgress.STORAGE_KEY, JSON.stringify(all));
        } catch {
            return false;
        }
        return true;
    }

    /** { done, total, next } — next = primeira aula ainda não feita (null se terminou todas). */
    static summary() {
        const chapters = Object.keys(LESSON_CHAPTERS).map(Number);
        const done = LessonProgress.doneChapters().filter(c => chapters.includes(c));
        return { done: done.length, total: chapters.length, next: chapters.find(c => !done.includes(c)) ?? null };
    }

    /** Apaga o progresso do jogador (perfil apagado). */
    static clear(profileId) {
        const all = LessonProgress.readAll();
        delete all[profileId];
        localStorage.setItem(LessonProgress.STORAGE_KEY, JSON.stringify(all));
    }
}
