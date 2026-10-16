<script setup lang="ts">
const props = defineProps<{
  saving: boolean
  waiting?: boolean
  error?: string
}>()
const emit = defineEmits<{
  submit: [payload: { metodo: string, valor: number, email?: string, telemovel?: string }]
  done: []
  refresh: []
}>()

const { t } = useAppI18n()
const method = ref('mbway')
const amount = ref<number | undefined>(10)
const email = ref('')
const phone = ref('')
const localError = ref('')
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
const formError = computed(() => props.error || localError.value)

function send() {
  localError.value = ''
  if (isMbway.value) {
    const digits = phone.value.replace(/\D/g, '')
    if (!amount.value || amount.value <= 0) {
      localError.value = t('topup.needAmount')
      return
    }
    if (digits.length < 9) {
      localError.value = t('topup.needPhone')
      return
    }
    emit('submit', { metodo: 'mbway', valor: Number(amount.value), telemovel: digits })
    return
  }
  if (!email.value.trim()) {
    localError.value = t('topup.needEmail')
    return
  }
  emit('submit', {
    metodo: methodKey.value,
    valor: amount.value && amount.value > 0 ? Number(amount.value) : 1,
    email: email.value.trim()
  })
}
</script>

<template>
  <div v-if="waiting" class="space-y-4 py-2 text-center">
    <div class="mx-auto flex size-12 items-center justify-center rounded-full bg-[rgb(28_28_28_/_0.06)]">
      <UIcon name="i-lucide-smartphone" class="size-6 text-ink" />
    </div>
    <div class="space-y-2">
      <p class="font-display text-xl tracking-[-0.02em]">{{ t('topup.waitingTitle') }}</p>
      <p class="text-sm leading-relaxed ink-soft">{{ t('topup.waitingBody') }}</p>
    </div>
    <div class="flex items-center justify-center gap-2 text-sm ink-soft">
      <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
      <span>{{ t('topup.waitingHint') }}</span>
    </div>
    <div class="grid gap-2 sm:grid-cols-2">
      <UButton
        type="button"
        size="lg"
        variant="soft"
        :label="t('topup.checkBalance')"
        :loading="saving"
        @click="emit('refresh')"
      />
      <UButton type="button" size="lg" :label="t('topup.waitingDone')" @click="emit('done')" />
    </div>
  </div>

  <form v-else class="space-y-4" @submit.prevent="send">
    <p class="text-sm ink-soft">{{ t('topup.hint') }}</p>
    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField :label="t('topup.method')" name="metodo">
        <USelect v-model="method" :items="methods" class="w-full" :disabled="saving" />
      </UFormField>
      <UFormField v-if="isMbway" :label="t('topup.amount')" name="valor">
        <UInput v-model.number="amount" type="number" min="0.01" step="0.01" class="w-full" :disabled="saving" />
      </UFormField>
      <UFormField v-if="isMbway" :label="t('topup.phone')" name="telemovel" class="sm:col-span-2">
        <UInput
          v-model="phone"
          type="tel"
          inputmode="numeric"
          maxlength="15"
          placeholder="9xxxxxxxx"
          class="w-full"
          required
          :disabled="saving"
        />
      </UFormField>
      <UFormField v-else :label="t('topup.email')" name="email" class="sm:col-span-2">
        <UInput v-model="email" type="email" class="w-full" required :disabled="saving" />
      </UFormField>
    </div>
    <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
    <UButton class="mt-2" type="submit" size="lg" block :label="t('topup.submit')" :loading="saving" />
  </form>
</template>
