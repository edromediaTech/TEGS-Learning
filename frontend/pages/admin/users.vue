<template>
  <div>
    <NuxtLayout name="admin">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p class="text-gray-500 mt-1">Creer et gerer les comptes</p>
        </div>
        <button @click="showCreateModal = true" class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">
          + Nouvel Utilisateur
        </button>
      </div>

      <!-- Filters -->
      <div class="flex gap-3 mb-6">
        <select v-if="auth.isSuperAdmin" v-model="filterTenant" @change="loadUsers" class="border rounded-lg px-3 py-2 text-sm">
          <option value="">Toutes les ecoles</option>
          <option v-for="t in tenantsList" :key="t._id" :value="t._id">{{ t.name }} ({{ t.code }})</option>
        </select>
        <select v-model="filterRole" @change="loadUsers" class="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tous les roles</option>
          <option value="admin_ddene">Admin DDENE</option>
          <option value="teacher">Enseignant</option>
          <option value="student">Eleve</option>
        </select>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left p-4">Nom</th>
              <th class="text-left p-4">Email</th>
              <th class="text-left p-4">Role</th>
              <th v-if="auth.isSuperAdmin" class="text-left p-4">Ecole</th>
              <th class="text-center p-4">Statut</th>
              <th class="text-right p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u._id" class="border-t hover:bg-gray-50">
              <td class="p-4 font-medium">{{ u.firstName }} {{ u.lastName }}</td>
              <td class="p-4 text-gray-500">{{ u.email }}</td>
              <td class="p-4">
                <span :class="roleClass(u.role)" class="px-2 py-1 rounded-full text-xs">{{ roleLabel(u.role) }}</span>
              </td>
              <td v-if="auth.isSuperAdmin" class="p-4 text-gray-500 text-xs">
                {{ u.tenant_id?.name || u.tenant_id?.code || '-' }}
              </td>
              <td class="p-4 text-center">
                <span :class="u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'" class="px-2 py-1 rounded-full text-xs">
                  {{ u.isActive ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td class="p-4 text-right space-x-2">
                <button @click="editUser(u)" class="text-blue-600 hover:underline text-xs">Modifier</button>
                <button @click="toggleUser(u)" :class="u.isActive ? 'text-red-600' : 'text-green-600'" class="hover:underline text-xs">
                  {{ u.isActive ? 'Desactiver' : 'Reactiver' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="users.length === 0" class="text-center text-gray-400 py-8">Aucun utilisateur</p>
      </div>

      <!-- Create/Edit Modal -->
      <div v-if="showCreateModal || editingUser" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
          <h2 class="text-lg font-bold mb-4">{{ editingUser ? 'Modifier l\'Utilisateur' : 'Nouvel Utilisateur' }}</h2>
          <form @submit.prevent="saveUser" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
                <input v-model="userForm.firstName" required class="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input v-model="userForm.lastName" required class="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input v-model="userForm.email" type="email" required :disabled="!!editingUser" class="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100" />
            </div>
            <div v-if="!editingUser">
              <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input v-model="userForm.password" type="password" required minlength="6" class="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select v-model="userForm.role" required class="w-full px-3 py-2 border rounded-lg">
                <option v-if="auth.isSuperAdmin" value="superadmin">SuperAdmin</option>
                <option value="admin_ddene">Admin DDENE</option>
                <option value="teacher">Enseignant</option>
                <option value="student">Eleve</option>
              </select>
            </div>
            <div v-if="auth.isSuperAdmin && userForm.role !== 'superadmin'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Ecole</label>
              <select v-model="userForm.tenant_id" required class="w-full px-3 py-2 border rounded-lg">
                <option value="" disabled>Choisir une ecole</option>
                <option v-for="t in tenantsList" :key="t._id" :value="t._id">{{ t.name }} ({{ t.code }})</option>
              </select>
            </div>
            <div v-if="auth.isSuperAdmin && editingUser">
              <label class="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe (optionnel)</label>
              <input v-model="userForm.password" type="password" minlength="6" class="w-full px-3 py-2 border rounded-lg" placeholder="Laisser vide pour ne pas changer" />
            </div>
            <div v-if="formError" class="p-2 bg-red-50 text-red-600 rounded text-sm">{{ formError }}</div>
            <div class="flex justify-end gap-3">
              <button type="button" @click="closeModal" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button type="submit" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                {{ editingUser ? 'Mettre a jour' : 'Creer' }}
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

const users = ref<any[]>([])
const tenantsList = ref<any[]>([])
const showCreateModal = ref(false)
const editingUser = ref<any>(null)
const formError = ref('')
const filterTenant = ref('')
const filterRole = ref('')

const userForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'student',
  tenant_id: '',
})

const roleLabels: Record<string, string> = {
  superadmin: 'SuperAdmin',
  admin_ddene: 'Admin DDENE',
  teacher: 'Enseignant',
  student: 'Eleve',
}

const roleClasses: Record<string, string> = {
  superadmin: 'bg-purple-100 text-purple-700',
  admin_ddene: 'bg-blue-100 text-blue-700',
  teacher: 'bg-green-100 text-green-700',
  student: 'bg-gray-100 text-gray-700',
}

function roleLabel(role: string) { return roleLabels[role] || role }
function roleClass(role: string) { return roleClasses[role] || 'bg-gray-100 text-gray-700' }

async function loadTenants() {
  if (!auth.isSuperAdmin) return
  try {
    const res = await apiFetch('/tenants')
    tenantsList.value = (res.data as any).tenants || []
  } catch {}
}

async function loadUsers() {
  try {
    let url = '/users?'
    if (filterRole.value) url += `role=${filterRole.value}&`
    if (filterTenant.value) url += `tenant_id=${filterTenant.value}&`
    const res = await apiFetch(url)
    users.value = (res.data as any).users || []
  } catch (e) {
    console.error('Load users error', e)
  }
}

function editUser(u: any) {
  editingUser.value = u
  userForm.firstName = u.firstName
  userForm.lastName = u.lastName
  userForm.email = u.email
  userForm.role = u.role
  userForm.password = ''
  userForm.tenant_id = typeof u.tenant_id === 'object' ? u.tenant_id._id : u.tenant_id
}

function closeModal() {
  showCreateModal.value = false
  editingUser.value = null
  formError.value = ''
  userForm.firstName = ''
  userForm.lastName = ''
  userForm.email = ''
  userForm.password = ''
  userForm.role = 'student'
  userForm.tenant_id = ''
}

async function saveUser() {
  formError.value = ''
  try {
    if (editingUser.value) {
      const updateBody: any = {
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        role: userForm.role,
      }
      if (auth.isSuperAdmin && userForm.tenant_id) {
        updateBody.tenant_id = userForm.tenant_id
      }
      if (auth.isSuperAdmin && userForm.password) {
        updateBody.password = userForm.password
      }
      await apiFetch(`/users/${editingUser.value._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateBody),
      })
    } else {
      const body: any = {
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
      }
      if (auth.isSuperAdmin) {
        body.tenant_id = userForm.tenant_id
      }
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    }
    closeModal()
    await loadUsers()
  } catch (e: any) {
    formError.value = e.data?.error || 'Erreur'
  }
}

async function toggleUser(u: any) {
  try {
    if (u.isActive) {
      await apiFetch(`/users/${u._id}`, { method: 'DELETE' })
    } else {
      await apiFetch(`/users/${u._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: true }),
      })
    }
    await loadUsers()
  } catch (e) {
    console.error('Toggle error', e)
  }
}

onMounted(async () => {
  await loadTenants()
  await loadUsers()
})
</script>
