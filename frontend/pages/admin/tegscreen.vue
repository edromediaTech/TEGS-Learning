<template>
  <div>
    <NuxtLayout name="admin">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Licences TegScreen</h1>
          <p class="text-gray-500 mt-1">Gerer les codes d'activation TegScreen (superadmin uniquement)</p>
        </div>
        <button
          @click="openCreate"
          class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm"
        >+ Nouveau client</button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Total clients</p>
          <p class="text-3xl font-bold text-primary-700">{{ customers.length }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Actives</p>
          <p class="text-3xl font-bold text-green-600">{{ customers.filter(c => c.status === 'active').length }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">En attente</p>
          <p class="text-3xl font-bold text-amber-600">{{ customers.filter(c => c.status === 'pending').length }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">PCs activés</p>
          <p class="text-3xl font-bold text-blue-600">{{ totalMachines }}</p>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left p-4">Client</th>
              <th class="text-left p-4">Code</th>
              <th class="text-center p-4">PCs</th>
              <th class="text-center p-4">Téléphones / PC</th>
              <th class="text-left p-4">Email</th>
              <th class="text-center p-4">Statut</th>
              <th class="text-right p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in customers" :key="c.id" class="border-t hover:bg-gray-50">
              <td class="p-4 font-medium">{{ c.name }}</td>
              <td class="p-4 font-mono text-base tracking-wider">{{ c.code }}</td>
              <td class="p-4 text-center">{{ (c.machines || []).length }} / {{ c.numPcs }}</td>
              <td class="p-4 text-center">{{ c.numPhonesPerPc }}</td>
              <td class="p-4 text-gray-500">{{ c.email || '-' }}</td>
              <td class="p-4 text-center">
                <span :class="statusClass(c.status)" class="px-2 py-1 rounded-full text-xs">
                  {{ statusLabel(c.status) }}
                </span>
              </td>
              <td class="p-4 text-right space-x-2">
                <button @click="copy(c.code)" class="text-gray-600 hover:underline text-xs">Copier code</button>
                <button @click="resendCode(c)" class="text-emerald-600 hover:underline text-xs">Renvoyer email</button>
                <button @click="openEdit(c)" class="text-blue-600 hover:underline text-xs">Modifier</button>
                <button @click="openMachines(c)" v-if="(c.machines || []).length" class="text-indigo-600 hover:underline text-xs">
                  Machines ({{ c.machines.length }})
                </button>
                <button v-if="c.status !== 'revoked'" @click="revoke(c)" class="text-red-600 hover:underline text-xs">
                  Révoquer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="customers.length === 0" class="text-center text-gray-400 py-8">Aucune licence</p>
      </div>

      <!-- Create / Edit Modal -->
      <div v-if="showForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
          <h2 class="text-lg font-bold mb-4">{{ editing ? 'Modifier le client' : 'Nouveau client TegScreen' }}</h2>
          <form @submit.prevent="save" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nom du client</label>
              <input v-model="form.name" required class="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email <span class="text-red-500">*</span></label>
              <input v-model="form.email" type="email" required class="w-full px-3 py-2 border rounded-lg" />
              <p class="text-xs text-gray-500 mt-1">Le code d'activation sera envoyé à cet email. Le client devra l'utiliser pour activer.</p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nb de PCs</label>
                <input v-model.number="form.numPcs" type="number" min="1" max="1000" required class="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Téléphones / PC</label>
                <input v-model.number="form.numPhonesPerPc" type="number" min="1" max="1000" required class="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea v-model="form.notes" rows="2" class="w-full px-3 py-2 border rounded-lg"></textarea>
            </div>
            <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
            <div class="flex justify-end gap-2">
              <button type="button" @click="closeForm" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button type="submit" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                {{ editing ? 'Enregistrer' : 'Créer' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Machines drawer -->
      <div v-if="machinesOf" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold">Machines de {{ machinesOf.name }}</h2>
            <button @click="machinesOf = null" class="text-gray-400 hover:text-gray-600">×</button>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="text-left p-3">machine_id</th>
                <th class="text-left p-3">Label</th>
                <th class="text-left p-3">Activé</th>
                <th class="text-left p-3">Vu</th>
                <th class="text-right p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in machinesOf.machines" :key="m.machineId" class="border-t">
                <td class="p-3 font-mono text-xs break-all">{{ m.machineId }}</td>
                <td class="p-3">{{ m.label || '-' }}</td>
                <td class="p-3 text-gray-500">{{ formatDate(m.activatedAt) }}</td>
                <td class="p-3 text-gray-500">{{ formatDate(m.lastSeenAt) }}</td>
                <td class="p-3 text-right">
                  <button @click="removeMachine(machinesOf, m)" class="text-red-600 hover:underline text-xs">Retirer</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!machinesOf.machines?.length" class="text-center text-gray-400 py-6">Aucune machine activée</p>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const { apiFetch } = useApi()
const router = useRouter()

// Hard-stop: page reservee aux superadmins.
if (process.client && !auth.isSuperAdmin) {
  router.replace('/admin/users')
}

interface Machine { machineId: string; label: string; activatedAt: string; lastSeenAt: string }
interface Customer {
  id: string; name: string; email: string; code: string;
  numPcs: number; numPhonesPerPc: number;
  status: 'pending' | 'active' | 'revoked';
  machines: Machine[]; notes: string;
  createdAt: string; updatedAt: string;
}

const customers = ref<Customer[]>([])
const showForm = ref(false)
const editing = ref<Customer | null>(null)
const machinesOf = ref<Customer | null>(null)
const formError = ref('')

const form = reactive({
  name: '',
  email: '',
  numPcs: 1,
  numPhonesPerPc: 1,
  notes: '',
})

const totalMachines = computed(() =>
  customers.value.reduce((s, c) => s + (c.machines?.length || 0), 0)
)

function statusClass(status: string) {
  if (status === 'active') return 'bg-green-100 text-green-700'
  if (status === 'pending') return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}
function statusLabel(status: string) {
  if (status === 'active') return 'Active'
  if (status === 'pending') return 'En attente'
  return 'Révoquée'
}
function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

async function load() {
  try {
    const res = await apiFetch('/tegscreen/customers')
    customers.value = (res.data as Customer[]) || []
  } catch (e) {
    console.error('Load tegscreen customers error', e)
  }
}

function openCreate() {
  editing.value = null
  form.name = ''
  form.numPcs = 1
  form.numPhonesPerPc = 1
  form.email = ''
  form.notes = ''
  formError.value = ''
  showForm.value = true
}

function openEdit(c: Customer) {
  editing.value = c
  form.name = c.name
  form.numPcs = c.numPcs
  form.numPhonesPerPc = c.numPhonesPerPc
  form.email = c.email || ''
  form.notes = c.notes || ''
  formError.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
}

async function save() {
  formError.value = ''
  try {
    if (editing.value) {
      await apiFetch(`/tegscreen/customers/${editing.value.id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      })
    } else {
      await apiFetch('/tegscreen/customers', {
        method: 'POST',
        body: JSON.stringify(form),
      })
    }
    closeForm()
    await load()
  } catch (e: any) {
    formError.value = e.data?.error || 'Erreur'
  }
}

async function resendCode(c: Customer) {
  try {
    const res = await apiFetch(`/tegscreen/customers/${c.id}/resend`, { method: 'POST' })
    const emailed = (res.data as { emailed: boolean })?.emailed
    if (emailed) alert(`Code envoyé à ${c.email}`)
    else alert(`SMTP non configuré côté serveur. Code à transmettre manuellement : ${c.code}`)
  } catch (e: any) {
    alert(e.data?.error || 'Erreur')
  }
}

async function revoke(c: Customer) {
  if (!confirm(`Révoquer la licence de ${c.name} ?`)) return
  try {
    await apiFetch(`/tegscreen/customers/${c.id}/revoke`, { method: 'POST' })
    await load()
  } catch (e) {
    console.error(e)
  }
}

function openMachines(c: Customer) {
  machinesOf.value = c
}

async function removeMachine(c: Customer, m: Machine) {
  if (!confirm(`Retirer la machine ${m.label || m.machineId.slice(0, 12)} ?`)) return
  try {
    await apiFetch(`/tegscreen/customers/${c.id}/machines/remove`, {
      method: 'POST',
      body: JSON.stringify({ machine_id: m.machineId }),
    })
    machinesOf.value = null
    await load()
  } catch (e) {
    console.error(e)
  }
}

function copy(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
  }
}

onMounted(() => {
  if (auth.isSuperAdmin) load()
})
</script>
