<template>
  <div>
    <NuxtLayout name="admin">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Abonnement & Facturation</h1>
          <p class="text-gray-500 mt-1">Gerez votre plan et vos licences</p>
        </div>
      </div>

      <!-- Current Plan Banner -->
      <div v-if="current" class="mb-8 bg-gradient-to-r from-primary-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm opacity-80">Plan actuel</div>
            <h2 class="text-3xl font-extrabold">{{ current.planName }}</h2>
            <p class="text-sm opacity-80 mt-1">{{ current.planDescription }}</p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-extrabold">
              {{ current.pricing.totalMonthly > 0 ? `$${current.pricing.totalMonthly.toFixed(2)}` : 'Gratuit' }}
              <span v-if="current.pricing.totalMonthly > 0" class="text-sm font-normal opacity-80">/mois</span>
            </div>
            <div class="text-sm opacity-80 mt-1">
              {{ current.seats }} siege(s) | {{ current.seatsUsed }} utilise(s)
            </div>
            <div v-if="current.isExpired" class="mt-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold inline-block">
              EXPIRE
            </div>
          </div>
        </div>

        <!-- Usage bars -->
        <div v-if="usage" class="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div class="flex justify-between text-xs mb-1 opacity-80">
              <span>Modules</span>
              <span>{{ usage.modules.unlimited ? 'Illimite' : `${usage.modules.current}/${usage.modules.limit}` }}</span>
            </div>
            <div class="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full bg-white rounded-full" :style="{ width: usage.modules.unlimited ? '10%' : `${Math.min(100, usage.modules.percent)}%` }"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1 opacity-80">
              <span>Sieges</span>
              <span>{{ usage.seats.current }}/{{ usage.seats.limit }}</span>
            </div>
            <div class="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full bg-white rounded-full" :style="{ width: `${Math.min(100, usage.seats.percent)}%` }"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1 opacity-80">
              <span>Salles</span>
              <span>{{ usage.rooms.unlimited ? 'Illimite' : usage.rooms.limit }}</span>
            </div>
            <div class="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full bg-white rounded-full" style="width: 10%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1 opacity-80">
              <span>Eleves/activite</span>
              <span>{{ usage.studentsPerActivity.unlimited ? 'Illimite' : usage.studentsPerActivity.limit }}</span>
            </div>
            <div class="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full bg-white rounded-full" style="width: 10%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Billing Toggle + Seat Selector -->
      <div class="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <!-- Annual/Monthly Toggle -->
        <div class="flex items-center bg-gray-100 rounded-full p-1">
          <button
            @click="cycle = 'monthly'"
            class="px-5 py-2 rounded-full text-sm font-bold transition"
            :class="cycle === 'monthly' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'"
          >
            Mensuel
          </button>
          <button
            @click="cycle = 'annual'"
            class="px-5 py-2 rounded-full text-sm font-bold transition flex items-center gap-2"
            :class="cycle === 'annual' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'"
          >
            Annuel
            <span class="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">-20%</span>
          </button>
        </div>

        <!-- Seat Selector -->
        <div class="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2">
          <span class="text-sm text-gray-500 font-medium">Sieges :</span>
          <button
            @click="seats = Math.max(1, seats - 1)"
            class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition flex items-center justify-center"
          >
            -
          </button>
          <input
            v-model.number="seats"
            type="number"
            min="1"
            max="500"
            class="w-16 text-center font-bold text-lg border-0 focus:ring-0 p-0"
          />
          <button
            @click="seats = Math.min(500, seats + 1)"
            class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      <!-- Plans Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="bg-white rounded-2xl border-2 overflow-hidden transition-all hover:shadow-lg"
          :class="plan.isCurrent
            ? 'border-primary-500 ring-2 ring-primary-200 shadow-md'
            : plan.id === 'establishment'
              ? 'border-blue-400 shadow-md'
              : 'border-gray-200'"
        >
          <!-- Popular badge -->
          <div
            v-if="plan.id === 'establishment'"
            class="bg-blue-500 text-white text-center py-1 text-xs font-bold"
          >
            LE PLUS POPULAIRE
          </div>
          <div
            v-else-if="plan.isCurrent"
            class="bg-primary-600 text-white text-center py-1 text-xs font-bold"
          >
            PLAN ACTUEL
          </div>
          <div v-else class="h-0"></div>

          <div class="p-6">
            <!-- Plan name -->
            <h3 class="text-lg font-extrabold text-gray-900">{{ plan.name }}</h3>
            <p class="text-xs text-gray-500 mt-1 h-8">{{ plan.description }}</p>

            <!-- Price -->
            <div class="mt-4 mb-5">
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-extrabold text-gray-900">
                  ${{ plan.pricing.pricePerSeat.toFixed(2) }}
                </span>
                <span v-if="plan.pricing.pricePerSeat > 0" class="text-sm text-gray-500">
                  /{{ plan.pricing.isPerSeat ? 'siege' : 'mois' }}
                </span>
                <span v-else class="text-sm text-gray-500">pour toujours</span>
              </div>
              <div v-if="plan.pricing.isPerSeat && plan.pricing.pricePerSeat > 0" class="text-sm text-gray-500 mt-1">
                Total: <strong class="text-gray-900">${{ plan.pricing.totalMonthly.toFixed(2) }}</strong>/mois
                pour {{ seats }} siege(s)
              </div>
              <div v-if="cycle === 'annual' && plan.pricing.savingsPercent > 0" class="mt-1">
                <span class="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                  Economie {{ plan.pricing.savingsPercent }}%
                </span>
              </div>
            </div>

            <!-- CTA Button -->
            <button
              v-if="plan.isCurrent"
              disabled
              class="w-full py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-400 cursor-default"
            >
              Plan actuel
            </button>
            <button
              v-else
              @click="changePlan(plan.id)"
              :disabled="changing"
              class="w-full py-2.5 rounded-xl text-sm font-bold transition"
              :class="plan.id === 'establishment'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-primary-600 text-white hover:bg-primary-700'"
            >
              {{ changing ? 'Changement...' : plan.price.monthly === 0 ? 'Passer au Gratuit' : 'Choisir ce plan' }}
            </button>

            <!-- Limits -->
            <div class="mt-5 space-y-2 text-sm">
              <div class="flex items-center gap-2 text-gray-700">
                <span class="text-green-500">&#10003;</span>
                <span>{{ plan.limits.modules === -1 ? 'Modules illimites' : `${plan.limits.modules} modules max` }}</span>
              </div>
              <div class="flex items-center gap-2 text-gray-700">
                <span class="text-green-500">&#10003;</span>
                <span>{{ plan.limits.rooms === -1 ? 'Salles illimitees' : `${plan.limits.rooms} salle(s)` }}</span>
              </div>
              <div class="flex items-center gap-2 text-gray-700">
                <span class="text-green-500">&#10003;</span>
                <span>{{ plan.limits.studentsPerActivity === -1 ? 'Eleves illimites' : `${plan.limits.studentsPerActivity} eleves/activite` }}</span>
              </div>
              <div class="flex items-center gap-2 text-gray-700">
                <span class="text-green-500">&#10003;</span>
                <span>{{ plan.limits.storageGB === -1 ? 'Stockage illimite' : `${plan.limits.storageGB} Go stockage` }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Feature Comparison Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 class="font-bold text-gray-900">Comparaison des fonctionnalites</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left p-3 pl-6 font-medium text-gray-500 w-1/3">Fonctionnalite</th>
                <th v-for="plan in plans" :key="plan.id" class="text-center p-3 font-bold" :class="plan.isCurrent ? 'text-primary-700 bg-primary-50' : 'text-gray-700'">
                  {{ plan.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(label, key) in featureLabels" :key="key" class="border-b border-gray-50 hover:bg-gray-50">
                <td class="p-3 pl-6 text-gray-700">{{ label }}</td>
                <td
                  v-for="plan in plans"
                  :key="`${plan.id}-${key}`"
                  class="text-center p-3"
                  :class="plan.isCurrent ? 'bg-primary-50/50' : ''"
                >
                  <template v-if="typeof plan.features[key] === 'boolean'">
                    <span v-if="plan.features[key]" class="text-green-500 text-base">&#10003;</span>
                    <span v-else class="text-gray-300">&mdash;</span>
                  </template>
                  <template v-else-if="plan.features[key] === 'basic'">
                    <span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">Basique</span>
                  </template>
                  <template v-else-if="plan.features[key] === 'full'">
                    <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Complet</span>
                  </template>
                  <template v-else>
                    <span class="text-gray-300">&mdash;</span>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Success/Error messages -->
      <div v-if="successMsg" class="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-bold z-50">
        {{ successMsg }}
      </div>
      <div v-if="errorMsg" class="fixed bottom-6 right-6 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-bold z-50">
        {{ errorMsg }}
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { apiFetch } = useApi()

const current = ref<any>(null)
const plans = ref<any[]>([])
const featureLabels = ref<Record<string, string>>({})
const usage = ref<any>(null)
const cycle = ref<'monthly' | 'annual'>('monthly')
const seats = ref(1)
const changing = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

async function loadData() {
  try {
    const [currentRes, plansRes, usageRes] = await Promise.all([
      apiFetch('/subscription/current'),
      apiFetch(`/subscription/plans?seats=${seats.value}&cycle=${cycle.value}`),
      apiFetch('/subscription/usage'),
    ])
    current.value = currentRes.data
    const pd = plansRes.data as any
    plans.value = pd.plans || []
    featureLabels.value = pd.featureLabels || {}
    cycle.value = pd.cycle || 'monthly'
    seats.value = (currentRes.data as any).seats || 1
    usage.value = (usageRes.data as any).usage || null
  } catch (e) {
    console.error('Billing load error', e)
  }
}

async function loadPlans() {
  try {
    const res = await apiFetch(`/subscription/plans?seats=${seats.value}&cycle=${cycle.value}`)
    const pd = res.data as any
    plans.value = pd.plans || []
  } catch {}
}

async function changePlan(planId: string) {
  if (!confirm(`Changer vers le plan "${planId}" ?`)) return
  changing.value = true
  errorMsg.value = ''
  try {
    const res = await apiFetch('/subscription/change', {
      method: 'PUT',
      body: JSON.stringify({ plan: planId, seats: seats.value, billingCycle: cycle.value }),
    })
    successMsg.value = (res.data as any).message || 'Plan mis a jour'
    setTimeout(() => { successMsg.value = '' }, 4000)
    await loadData()
  } catch (e: any) {
    errorMsg.value = e?.data?.error || 'Erreur lors du changement de plan'
    setTimeout(() => { errorMsg.value = '' }, 4000)
  } finally {
    changing.value = false
  }
}

// Reload plans when seats or cycle change
watch([seats, cycle], () => loadPlans(), { flush: 'post' })

onMounted(() => loadData())
</script>
