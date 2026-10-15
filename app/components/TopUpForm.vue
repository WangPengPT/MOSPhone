<script setup lang="ts">
const props = defineProps<{ saving: boolean }>()
const emit = defineEmits<{
  submit: [payload: { metodo: string, valor: number, email?: string, telemovel?: string }]
}>()

const { t } = useAppI18n()
const method = ref('mbway')
const amount = ref<number | undefined>(10)
const email = ref('')
const phone = ref('')
const methods = [
  { label: 'MB WAY', value: 'mbway' },
  { label: 'Multibanco', value: 'multibanco' },
  { label: 'Payshop', value: 'payshop' }
]

const methodKey = computed(() => {
  const current = method.value as string | { value?: string }
  return typeof current === 'string' ? current : String(current?.value || 'mbway')
})
const isMbway = computed(() => methodKey.value === 'mbway')

function send() {
  if (isMbway.value) {
    const digits = phone.value.replace(/\D/g, '')
    if (!amount.value || amount.value <= 0 || digits.length < 9) return
    emit('submit', { metodo: 'mbway', valor: amount.value, telemovel: digits })
    return
  }
  if (!email.value.trim()) return
  emit('submit', {
    metodo: methodKey.value,
    valor: amount.value && amount.value > 0 ? amount.value : 1,
    email: email.value.trim()
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="send">
    <p class="text-sm ink-soft">{{ t('topup.hint') }}</p>
    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField :label="t('topup.method')" name="metodo">
        <USelect v-model="method" :items="methods" class="w-full" />
      </UFormField>
      <UFormField v-if="isMbway" :label="t('topup.amount')" name="valor">
        <UInput v-model.number="amount" type="number" min="0.01" step="0.01" class="w-full" />
      </UFormField>
      <UFormField v-if="isMbway" :label="t('topup.phone')" name="telemovel" class="sm:col-span-2">
        <UInput v-model="phone" type="tel" inputmode="numeric" maxlength="15" placeholder="9xxxxxxxx" class="w-full" required />
      </UFormField>
      <UFormField v-else :label="t('topup.email')" name="email" class="sm:col-span-2">
        <UInput v-model="email" type="email" class="w-full" required />
      </UFormField>
    </div>
    <UButton class="mt-2" type="submit" size="lg" block :label="t('topup.submit')" :loading="props.saving" />
  </form>
</template>
