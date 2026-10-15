<template>
  <PortalShell>
    <NuxtPage
      :keepalive="{ max: 8 }"
      :page-key="route => route.fullPath"
    />
  </PortalShell>
</template>
