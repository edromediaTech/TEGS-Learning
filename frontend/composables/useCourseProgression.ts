// Detecte la progression de l'eleve dans un parcours en interrogeant
// les statements xAPI deja stockes dans MongoDB (`GET /api/xapi/statements`).
//
// Un module est considere COMPLETE si l'eleve a au moins un statement
// avec un verbe de la liste `completionVerbs` sur l'`activityId` du module.

interface ModuleSpec {
  id: string;
  activityId: string;
  /** Verbes acceptes comme preuve de completion (defaut : passed/completed) */
  completionVerbs?: string[];
}

const ADL = 'http://adlnet.gov/expapi/verbs/';

export function useCourseProgression(modules: ModuleSpec[]) {
  const { apiFetch } = useApi();
  const completed = ref<Set<string>>(new Set());
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function refresh() {
    loading.value = true;
    error.value = null;
    try {
      // On ramene jusqu'a 500 statements de l'eleve (le backend filtre tenant + role).
      const { data } = await apiFetch<{ statements: any[]; count: number }>(
        '/xapi/statements?limit=500',
        { method: 'GET' },
      );
      const stmts = data.statements || [];
      const next = new Set<string>();
      for (const m of modules) {
        const verbs = m.completionVerbs || ['passed', 'completed', 'experienced'];
        const verbIris = verbs.map((v) => v.startsWith('http') ? v : `${ADL}${v}`);
        const hit = stmts.some((s) =>
          s?.object?.id === m.activityId
          && verbIris.some((vi) => s?.verb?.id === vi),
        );
        if (hit) next.add(m.id);
      }
      completed.value = next;
    } catch (e: any) {
      error.value = e?.message || 'Erreur de chargement progression';
    } finally {
      loading.value = false;
    }
  }

  function isCompleted(moduleId: string): boolean {
    return completed.value.has(moduleId);
  }

  function statusOf(moduleId: string, prerequisiteIds: string[] = []): 'completed' | 'available' | 'locked' {
    if (completed.value.has(moduleId)) return 'completed';
    const allPrereqsDone = prerequisiteIds.every((p) => completed.value.has(p));
    return allPrereqsDone ? 'available' : 'locked';
  }

  return { completed, loading, error, refresh, isCompleted, statusOf };
}
