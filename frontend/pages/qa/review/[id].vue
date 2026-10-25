<template>
  <div v-if="error" class="min-h-screen bg-slate-900 text-red-300 p-8">{{ error }}</div>
  <div v-else-if="!detail || !modelUrl" class="min-h-screen bg-slate-900 text-slate-300 p-8">Chargement du composant...</div>
  <CrnsTpPlayer v-else mode="qa" :manifest="detail.manifest" :model-url="modelUrl">
    <template #panel-top="{ tp }">
      <div class="rounded-xl border border-slate-600 p-4 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm text-slate-300">{{ detail.component.component_id }} · v{{ detail.component.version }}</span>
          <span class="rounded-full px-3 py-1 text-xs font-bold" :class="statusClass" data-testid="statut">{{ detail.component.status }}</span>
        </div>
        <p class="text-sm" :class="lint?.ok ? 'text-emerald-300' : 'text-red-300'" data-testid="linter">
          Linter : {{ lint?.ok ? 'conforme' : `${lint?.errors?.length ?? '?'} erreur(s) bloquante(s)` }}
          <span v-if="lint?.metrics" class="text-slate-400">
            · {{ lint.metrics.triangles }} polygones · {{ lint.metrics.links_checked }} contacts vérifiés
          </span>
        </p>
        <ul v-if="lint?.errors?.length" class="text-xs text-red-300 list-disc pl-5">
          <li v-for="(e, i) in lint.errors" :key="i">[{{ e.code }}] {{ e.message }}</li>
        </ul>
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button class="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm" data-testid="qa-rayons-x"
                  @click="tp.setInterieur(!tp.interieur.value, QA_OPACITY)">
            {{ tp.interieur.value ? 'Capot opaque' : `Rayons X (opacité ${Math.round(QA_OPACITY * 100)} %)` }}
          </button>
          <button class="rounded-lg px-3 py-2 text-sm" data-testid="qa-chemin"
                  :class="tp.pathHighlight.value ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700 hover:bg-slate-600'"
                  @click="tp.setPathHighlight(!tp.pathHighlight.value)">
            Chemin conducteur
          </button>
          <button class="col-span-2 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm" data-testid="qa-declenchement" @click="tp.trip">
            Tester le déclenchement
          </button>
        </div>
      </div>
    </template>

    <template #panel-bottom>
      <QaChecklist v-model="checklist" :labels="detail.checklist_labels" :disabled="detail.component.status !== 'REVIEW_PENDING' || !auth.isAdmin" />
      <div class="space-y-2">
        <button v-if="detail.component.status === 'CI_PASSED'" class="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-3 font-semibold"
                data-testid="soumettre" @click="act('submit')">
          Soumettre à la revue
        </button>
        <template v-if="detail.component.status === 'REVIEW_PENDING' && auth.isAdmin">
          <button class="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-3 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="!allChecked || busy" data-testid="approuver" @click="act('approve')">
            Approuver pour le catalogue
          </button>
          <textarea v-model="comment" rows="3" class="w-full rounded-lg bg-slate-800 border border-slate-600 p-2 text-sm"
                    placeholder="Rapport d'anomalies (obligatoire pour rejeter)" data-testid="commentaire" />
          <button class="w-full rounded-lg bg-red-700 hover:bg-red-600 px-4 py-2 font-semibold disabled:opacity-40"
                  :disabled="comment.trim().length < 10 || busy" data-testid="rejeter" @click="act('reject')">
            Rejeter
          </button>
        </template>
        <p v-if="message" class="text-sm" :class="messageOk ? 'text-emerald-300' : 'text-red-300'" data-testid="message">{{ message }}</p>
      </div>
      <details class="text-sm text-slate-300">
        <summary class="cursor-pointer">Historique ({{ detail.history.length }})</summary>
        <ol class="mt-2 space-y-1">
          <li v-for="(h, i) in detail.history" :key="i" class="text-xs">
            {{ new Date(h.at).toLocaleString('fr-FR') }} · <b>{{ h.status }}</b><span v-if="h.note"> · {{ h.note }}</span>
          </li>
        </ol>
      </details>
    </template>
  </CrnsTpPlayer>
</template>

<script setup lang="ts">
// Cockpit de revue QA (verrou n°2) : inspection assistee d'un composant 3D avant le catalogue.
// Rayons X a 25 %, chemin conducteur lumineux, test de declenchement, rapport du linter, et
// check-list a 4 points : « Approuver » n'est actif que si tout est coche (le serveur le
// verifie aussi et relance le linter).
definePageMeta({ layout: false, middleware: ['auth'] });
useHead({ title: 'Revue qualité · Composant 3D' });

const route = useRoute();
const auth = useAuthStore();
const { apiFetch, baseURL } = useApi();

const detail = ref<any>(null);
const modelUrl = ref('');
const error = ref('');
const checklist = ref<Record<string, boolean>>({});
const comment = ref('');
const busy = ref(false);
const message = ref('');
const messageOk = ref(true);

const lint = computed(() => detail.value?.lint_report);
const QA_OPACITY = computed(() => detail.value?.manifest?.interaction?.qa_opacity ?? 0.25);
const allChecked = computed(() => Object.keys(detail.value?.checklist_labels || {}).every((k) => checklist.value[k]));
const statusClass = computed(() => ({
  APPROVED: 'bg-emerald-500 text-slate-900',
  REVIEW_PENDING: 'bg-amber-400 text-slate-900',
  CI_PASSED: 'bg-cyan-500 text-slate-900',
  REJECTED: 'bg-red-600 text-white',
  DRAFT: 'bg-slate-600 text-white',
}[detail.value?.component?.status as string] || 'bg-slate-600'));

async function load() {
  const id = route.params.id as string;
  const { data } = await apiFetch(`/v1/components/${id}`);
  detail.value = data;
  checklist.value = { ...(data.review?.checklist || {}) };
  if (!modelUrl.value) {
    // Modele non public tant qu'il n'est pas approuve : recupere avec le jeton, servi en URL blob.
    const session = useCookie<{ token: string } | null>('__session').value;
    const res = await fetch(`${baseURL}/v1/components/${id}/model.glb`, { headers: { Authorization: `Bearer ${session?.token || ''}` } });
    if (!res.ok) throw new Error(`modèle indisponible (HTTP ${res.status})`);
    modelUrl.value = URL.createObjectURL(await res.blob());
  }
}

async function act(action: 'submit' | 'approve' | 'reject') {
  busy.value = true;
  message.value = '';
  try {
    const body = action === 'approve' ? { checklist: checklist.value, comment: comment.value }
      : action === 'reject' ? { checklist: checklist.value, comment: comment.value } : {};
    await apiFetch(`/v1/components/${route.params.id}/${action}`, { method: 'POST', body: JSON.stringify(body) });
    messageOk.value = true;
    message.value = { submit: 'Composant soumis à la revue.', approve: 'Composant approuvé : il est publié dans le catalogue.', reject: 'Composant rejeté avec rapport d\'anomalies.' }[action];
    await load();
  } catch (e: any) {
    messageOk.value = false;
    message.value = e?.data?.error || e?.message || 'Action refusée';
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  try {
    await load();
  } catch (e: any) {
    error.value = `Composant indisponible : ${e?.data?.error || e?.message || e}`;
  }
});
onBeforeUnmount(() => { if (modelUrl.value) URL.revokeObjectURL(modelUrl.value); });
</script>
