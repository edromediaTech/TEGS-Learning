<template>
  <DocsLayout role="admin">
    <h1 class="text-3xl font-black text-gray-900 mb-2">Gerer les utilisateurs et organisations</h1>
    <p class="text-gray-500 mb-8">Creer des organisations, ajouter des administrateurs et gerer les roles.</p>

    <h2 class="text-xl font-bold text-gray-900 mt-6 mb-4">Hierarchie des roles</h2>
    <div class="space-y-3 mb-8">
      <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center space-x-4">
        <div class="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700 font-bold text-sm">SA</div>
        <div><div class="font-bold text-purple-800">SuperAdmin</div><div class="text-sm text-purple-600">Acces total. Cree des organisations, des admins, et gere tout cross-tenant.</div></div>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center space-x-4">
        <div class="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center text-blue-700 font-bold text-sm">AD</div>
        <div><div class="font-bold text-blue-800">Admin DDENE</div><div class="text-sm text-blue-600">Gere son organisation : tournois, modules, enseignants, eleves.</div></div>
      </div>
      <div class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-4">
        <div class="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center text-green-700 font-bold text-sm">EN</div>
        <div><div class="font-bold text-green-800">Enseignant</div><div class="text-sm text-green-600">Cree des modules, gere les tournois de son organisation.</div></div>
      </div>
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center space-x-4">
        <div class="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 font-bold text-sm">EL</div>
        <div><div class="font-bold text-gray-800">Eleve</div><div class="text-sm text-gray-600">Acces aux modules et quiz assignes.</div></div>
      </div>
    </div>

    <Callout type="info" title="Isolation multi-tenant">
      Chaque organisation est isolee. Un admin ne peut voir que les donnees de son organisation. Seul le superadmin a une vue globale.
    </Callout>
  </DocsLayout>
</template>

<script setup lang="ts">
import DocsLayout from '~/components/docs/DocsLayout.vue';
import Callout from '~/components/docs/Callout.vue';
useHead({ title: 'Gerer les utilisateurs | Guide Admin | TEGS-Arena' });
</script>
