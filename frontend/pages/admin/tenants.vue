<template>
  <div>
    <NuxtLayout name="admin">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Gestion des Ecoles</h1>
          <p class="text-gray-500 mt-1">Creer et gerer les tenants</p>
        </div>
        <button @click="showCreateModal = true" class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">
          + Nouvelle Ecole
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Total Ecoles</p>
          <p class="text-3xl font-bold text-primary-700">{{ tenants.length }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Ecoles Actives</p>
          <p class="text-3xl font-bold text-green-600">{{ tenants.filter(t => t.isActive).length }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Total Utilisateurs</p>
          <p class="text-3xl font-bold text-blue-600">{{ tenants.reduce((sum, t) => sum + (t.userCount || 0), 0) }}</p>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left p-4">Nom</th>
              <th class="text-left p-4">Code</th>
              <th class="text-left p-4">Email Contact</th>
              <th class="text-center p-4">Utilisateurs</th>
              <th class="text-center p-4">Statut</th>
              <th class="text-right p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tenants" :key="t._id" class="border-t hover:bg-gray-50">
              <td class="p-4 font-medium">{{ t.name }}</td>
              <td class="p-4 font-mono text-xs">{{ t.code }}</td>
              <td class="p-4 text-gray-500">{{ t.contactEmail || '-' }}</td>
              <td class="p-4 text-center">{{ t.userCount || 0 }}</td>
              <td class="p-4 text-center">
                <span :class="t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'" class="px-2 py-1 rounded-full text-xs">
                  {{ t.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="p-4 text-right space-x-2">
                <button @click="editTenant(t)" class="text-blue-600 hover:underline text-xs">Modifier</button>
                <button @click="toggleTenant(t)" :class="t.isActive ? 'text-red-600' : 'text-green-600'" class="hover:underline text-xs">
                  {{ t.isActive ? 'Desactiver' : 'Reactiver' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="tenants.length === 0" class="text-center text-gray-400 py-8">Aucune ecole</p>
      </div>

      <!-- Create/Edit Modal -->
      <div v-if="showCreateModal || editingTenant" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
          <h2 class="text-lg font-bold mb-4">{{ editingTenant ? 'Modifier l\'Ecole' : 'Nouvelle Ecole' }}</h2>
          <form @submit.prevent="saveTenant" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input v-model="tenantForm.name" required class="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input v-model="tenantForm.code" required :disabled="!!editingTenant" class="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input v-model="tenantForm.address" class="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email Contact</label>
              <input v-model="tenantForm.contactEmail" type="email" class="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div v-if="formError" class="p-2 bg-red-50 text-red-600 rounded text-sm">{{ formError }}</div>
            <div class="flex justify-end gap-3">
              <button type="button" @click="closeModal" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button type="submit" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                {{ editingTenant ? 'Mettre a jour' : 'Creer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const { apiFetch } = useApi()

const tenants = ref<any[]>([])
const showCreateModal = ref(false)
const editingTenant = ref<any>(null)
const formError = ref('')

const tenantForm = reactive({
  name: '',
  code: '',
  address: '',
  contactEmail: '',
})

async function loadTenants() {
  try {
    const res = await apiFetch('/tenants')
    tenants.value = (res.data as any).tenants || []
  } catch (e) {
    console.error('Load tenants error', e)
  }
}

function editTenant(t: any) {
  editingTenant.value = t
  tenantForm.name = t.name
  tenantForm.code = t.code
  tenantForm.address = t.address || ''
  tenantForm.contactEmail = t.contactEmail || ''
}

function closeModal() {
  showCreateModal.value = false
  editingTenant.value = null
  formError.value = ''
  tenantForm.name = ''
  tenantForm.code = ''
  tenantForm.address = ''
  tenantForm.contactEmail = ''
}

async function saveTenant() {
  formError.value = ''
  try {
    if (editingTenant.value) {
      await apiFetch(`/tenants/${editingTenant.value._id}`, {
        method: 'PUT',
        body: JSON.stringify(tenantForm),
      })
    } else {
      await apiFetch('/tenants', {
        method: 'POST',
        body: JSON.stringify(tenantForm),
      })
    }
    closeModal()
    await loadTenants()
  } catch (e: any) {
    formError.value = e.data?.error || 'Erreur'
  }
}

async function toggleTenant(t: any) {
  try {
    if (t.isActive) {
      await apiFetch(`/tenants/${t._id}`, { method: 'DELETE' })
    } else {
      await apiFetch(`/tenants/${t._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: true }),
      })
    }
    await loadTenants()
  } catch (e) {
    console.error('Toggle error', e)
  }
}

onMounted(() => loadTenants())
</script>
