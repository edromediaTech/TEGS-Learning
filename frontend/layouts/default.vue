<template>
  <div class="min-h-screen bg-gray-50">
    <slot />
    <!-- TEGS Copilot on public pages too -->
    <GuideSmartCopilot />

    <!-- TEGS Agent IA -->
    <AgentBubble />
    <AgentChatPanel />
  </div>
</template>
