<script setup lang="ts">
const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''
await navigateTo({ path: '/recuperar/nova', query: token ? { token } : undefined })
</script>

<template>
  <div />
</template>
