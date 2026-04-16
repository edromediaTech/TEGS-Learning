<template>
  <div class="min-h-screen bg-gray-50">
    <slot />
    <!-- TEGS Copilot on public pages too -->
    <GuideSmartCopilot />

    <!-- Assistant TEGS -->
    <AgentBubble />
    <AgentChatPanel />
  </div>
</template>
