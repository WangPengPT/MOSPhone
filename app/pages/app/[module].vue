<script setup lang="ts">
import { portalModules } from '#shared/siga'

const route = useRoute()
const key = computed(() => String(route.params.module || ''))
const known = computed(() => portalModules.find(item => item.key === key.value && item.key !== 'inicio'))

if (key.value === 'inicio') await navigateTo('/app')
if (!known.value && key.value !== 'inicio') {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

const { t } = useAppI18n()
useHead({ title: computed(() => known.value ? `${t(`modules.${known.value.key}.label`)} · Siga` : 'Siga') })
</script>

<template>
  <ModuleScreen v-if="known" :module="known.key" />
</template>
