<template>
  <CrnsTpPlayer manifest-url="/components/disjoncteur_c16_1pn/component.json" />
</template>

<script setup lang="ts">
// Demonstrateur du jalon C1 (cdc_extention.md), projete sur le TNI le 6/11 : le TP entier est
// decrit par le manifeste du composant (component.json) et joue par CrnsTpPlayer, reutilisable
// tel quel dans un module TEGS ou le cockpit de revue QA. Page isolee, sans trace enregistree.
definePageMeta({ layout: false });
useHead({ title: 'Démonstrateur 3D · Le disjoncteur' });
</script>
