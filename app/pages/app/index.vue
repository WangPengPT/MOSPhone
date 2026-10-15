<script setup lang="ts">
const { t } = useAppI18n()
useHead({ title: computed(() => `${t('modules.inicio.label')} · Siga`) })
</script>

<template>
  <ModuleScreen module="inicio" />
</template>
