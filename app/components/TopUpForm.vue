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

function send() {
  if (!amount.value || amount.value <= 0) return
  emit('submit', {
    metodo: method.value,
    valor: amount.value,
    email: method.value === 'mbway' ? undefined : email.value,
    telemovel: method.value === 'mbway' ? phone.value : undefined
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
      <UFormField :label="t('topup.amount')" name="valor">
        <UInput v-model.number="amount" type="number" min="1" step="0.01" class="w-full" />
      </UFormField>
      <UFormField v-if="method === 'mbway'" :label="t('topup.phone')" name="telemovel" class="sm:col-span-2">
        <UInput v-model="phone" type="tel" placeholder="9xxxxxxxx" class="w-full" />
      </UFormField>
      <UFormField v-else :label="t('topup.email')" name="email" class="sm:col-span-2">
        <UInput v-model="email" type="email" class="w-full" />
      </UFormField>
    </div>
    <UButton class="mt-2" type="submit" size="lg" block :label="t('topup.submit')" :loading="props.saving" />
  </form>
</template>
