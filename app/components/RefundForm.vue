<script setup lang="ts">
type Deposit = {
  idWalletMovement: number
  idWalletUser: number
  amount: number
  amountCanBeRefund: number
  canBeRefund: boolean
  date: string | null
  description: string | null
  idRefundStatus: number
}

type RefundFile = { fileName: string, file: string }

const props = defineProps<{
  saving: boolean
  studentId?: string | null
  error?: string
}>()

const emit = defineEmits<{
  submit: [payload: Record<string, unknown>]
}>()

const { t } = useAppI18n()
const loading = ref(false)
const localError = ref('')
const deposits = ref<Deposit[]>([])
const fileThreshold = ref<number | null>(null)
const selectedId = ref<number | null>(null)
const amount = ref<number | undefined>()
const iban = ref('')
const iban2 = ref('')
const observations = ref('')
const acceptedTerms = ref(false)
const ibanFileName = ref('')
const ccFileName = ref('')
const ibanFile = ref<RefundFile | null>(null)
const ccFile = ref<RefundFile | null>(null)
const feeText = ref('')
const feeLoading = ref(false)
const helpOpen = ref(false)
const helpKind = ref<'iban' | 'cc' | 'reason' | null>(null)

const helpTitle = computed(() => {
  if (helpKind.value === 'iban') return t('refund.ibanFileHelpTitle')
  if (helpKind.value === 'cc') return t('refund.ccFileHelpTitle')
  if (helpKind.value === 'reason') return t('refund.reasonHelpTitle')
  return ''
})

function openHelp(kind: 'iban' | 'cc' | 'reason') {
  helpKind.value = kind
  helpOpen.value = true
}

const formError = computed(() => props.error || localError.value)
const selected = computed(() => {
  const id = Number(selectedId.value)
  if (!Number.isFinite(id) || id <= 0) return null
  return deposits.value.find(item => item.idWalletMovement === id) || null
})
const refundable = computed(() => deposits.value.filter(item => item.canBeRefund && item.amountCanBeRefund > 0))
// Official: files required when threshold unknown OR amount >= threshold.
const filesRequired = computed(() => {
  const value = Number(amount.value)
  if (!Number.isFinite(value)) return fileThreshold.value == null
  if (fileThreshold.value == null) return true
  return value >= fileThreshold.value
})

watch(selected, (deposit) => {
  if (!deposit) {
    amount.value = undefined
    feeText.value = ''
    return
  }
  amount.value = deposit.amountCanBeRefund
  void loadFees()
})

onMounted(() => {
  void loadDeposits()
})

async function loadDeposits() {
  loading.value = true
  localError.value = ''
  try {
    const result = await $fetch<{
      ok: boolean
      message?: string
      needRelogin?: boolean
      payload?: { deposits?: Deposit[], fileThreshold?: number | null } | null
    }>('/api/portal/action', {
      method: 'POST',
      body: {
        module: 'cartao',
        payload: {
          action: 'listRefundDeposits',
          studentId: props.studentId || undefined
        }
      }
    })
    if (result.needRelogin) {
      localError.value = result.message || t('panel.reloginBody')
      deposits.value = []
      return
    }
    if (!result.ok) {
      localError.value = result.message || t('refund.loadFailed')
      deposits.value = []
      return
    }
    deposits.value = result.payload?.deposits || []
    fileThreshold.value = result.payload?.fileThreshold ?? null
    const first = refundable.value[0]
    selectedId.value = first?.idWalletMovement ?? null
    if (!first) localError.value = t('refund.empty')
  }
  catch (reason) {
    localError.value = errorText(reason)
    deposits.value = []
  }
  finally {
    loading.value = false
  }
}

async function loadFees() {
  const value = Number(amount.value)
  const max = selected.value?.amountCanBeRefund || 0
  feeText.value = ''
  if (!Number.isFinite(value) || value < 0.1 || value > max + 0.009) return
  feeLoading.value = true
  try {
    const result = await $fetch<{
      ok: boolean
      payload?: { amountTransfer?: number, feeTransfer?: number } | null
    }>('/api/portal/action', {
      method: 'POST',
      body: {
        module: 'cartao',
        payload: {
          action: 'refundCosts',
          studentId: props.studentId || undefined,
          amount: value
        }
      }
    })
    if (result.ok && result.payload) {
      const fee = Number(result.payload.feeTransfer) || 0
      const net = Number(result.payload.amountTransfer) || value
      feeText.value = fee > 0
        ? t('refund.feeLine', { fee: formatMoney(fee), net: formatMoney(net) })
        : t('refund.feeNone', { net: formatMoney(net) })
    }
  }
  catch {
    feeText.value = ''
  }
  finally {
    feeLoading.value = false
  }
}

async function onIbanFile(event: Event) {
  ibanFile.value = await readRefundFile(event)
  ibanFileName.value = ibanFile.value?.fileName || ''
}

async function onCcFile(event: Event) {
  ccFile.value = await readRefundFile(event)
  ccFileName.value = ccFile.value?.fileName || ''
}

async function readRefundFile(event: Event): Promise<RefundFile | null> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return null
  if (file.size > 1048576) {
    localError.value = t('refund.fileTooLarge')
    input.value = ''
    return null
  }
  if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) {
    localError.value = t('refund.fileType')
    input.value = ''
    return null
  }
  localError.value = ''
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const raw = String(reader.result || '')
      resolve(raw.includes(',') ? raw.split(',')[1] || '' : raw)
    }
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
  return { fileName: file.name, file: base64 }
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function send() {
  localError.value = ''
  const deposit = selected.value
  if (!deposit) {
    localError.value = t('refund.needDeposit')
    return
  }
  const value = Number(amount.value)
  if (!Number.isFinite(value) || value < 0.1 || value > deposit.amountCanBeRefund + 0.009) {
    localError.value = t('refund.needAmount')
    return
  }
  const a = digitsOnly(iban.value)
  const b = digitsOnly(iban2.value)
  if (a.length < 21 || a !== b) {
    localError.value = t('refund.needIban')
    return
  }
  if (!observations.value.trim()) {
    localError.value = t('refund.needReason')
    return
  }
  if (filesRequired.value && (!ibanFile.value || !ccFile.value)) {
    localError.value = t('refund.needFiles')
    return
  }
  if (!acceptedTerms.value) {
    localError.value = t('refund.needTerms')
    return
  }
  emit('submit', {
    action: 'requestRefund',
    studentId: props.studentId || undefined,
    idWalletMovement: deposit.idWalletMovement,
    idWalletUser: deposit.idWalletUser,
    amount: value,
    iban: a,
    iban2: b,
    observations: observations.value.trim(),
    acceptedTerms: true,
    ibanFile: ibanFile.value || undefined,
    ccFile: ccFile.value || undefined
  })
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm ink-soft">{{ t('refund.hint') }}</p>

    <div v-if="loading" class="flex items-center justify-center gap-2 py-8 text-sm ink-soft">
      <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
      <span>{{ t('refund.loading') }}</span>
    </div>

    <template v-else>
      <div v-if="refundable.length" class="space-y-2">
        <p class="text-sm font-medium">{{ t('refund.deposits') }}</p>
        <label
          v-for="item in refundable"
          :key="item.idWalletMovement"
          class="surface flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3"
        >
          <input
            v-model="selectedId"
            type="radio"
            class="mt-1"
            :value="item.idWalletMovement"
            :disabled="saving"
          >
          <span class="min-w-0 flex-1">
            <span class="block font-medium">{{ formatMoney(item.amountCanBeRefund) }}</span>
            <span class="mt-0.5 block text-xs ink-soft">
              {{ item.date || '—' }}
              <template v-if="item.description"> · {{ item.description }}</template>
            </span>
          </span>
        </label>
      </div>

      <form v-if="selected" class="space-y-4" @submit.prevent="send">
        <UFormField :label="t('refund.amount')" name="amount">
          <UInput
            v-model.number="amount"
            type="number"
            min="0.1"
            step="0.01"
            :max="selected.amountCanBeRefund"
            class="w-full"
            :disabled="saving"
            @change="loadFees"
          />
          <p class="mt-1 text-xs ink-soft">{{ t('refund.maxAmount', { max: formatMoney(selected.amountCanBeRefund) }) }}</p>
          <p v-if="feeLoading" class="mt-1 text-xs ink-soft">{{ t('refund.feeLoading') }}</p>
          <p v-else-if="feeText" class="mt-1 text-xs ink-soft">{{ feeText }}</p>
        </UFormField>

        <UFormField :label="t('refund.iban')" name="iban">
          <div class="flex items-center gap-2">
            <span class="shrink-0 rounded-md bg-[rgb(28_28_28_/_0.06)] px-2 py-2 text-sm font-medium">PT50</span>
            <UInput
              v-model="iban"
              inputmode="numeric"
              maxlength="32"
              class="w-full"
              :placeholder="t('refund.ibanPlaceholder')"
              :disabled="saving"
            />
          </div>
        </UFormField>

        <UFormField :label="t('refund.iban2')" name="iban2">
          <div class="flex items-center gap-2">
            <span class="shrink-0 rounded-md bg-[rgb(28_28_28_/_0.06)] px-2 py-2 text-sm font-medium">PT50</span>
            <UInput
              v-model="iban2"
              inputmode="numeric"
              maxlength="32"
              class="w-full"
              :placeholder="t('refund.ibanPlaceholder')"
              :disabled="saving"
            />
          </div>
        </UFormField>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium">{{ t('refund.reason') }}</p>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :aria-label="t('refund.reasonHelpAria')"
              @click="openHelp('reason')"
            >
              <UIcon name="i-lucide-circle-help" class="size-4" />
            </UButton>
          </div>
          <textarea
            v-model="observations"
            rows="3"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm"
            :placeholder="t('refund.reasonPlaceholder')"
            :disabled="saving"
          />
        </div>

        <p v-if="!filesRequired" class="text-xs ink-soft">{{ t('refund.filesOptional') }}</p>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium">{{ t('refund.ibanFile') }}</p>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :aria-label="t('refund.fileHelpAria')"
              @click="openHelp('iban')"
            >
              <UIcon name="i-lucide-circle-help" class="size-4" />
            </UButton>
          </div>
          <input
            type="file"
            accept=".pdf,.png,.jpeg,.jpg,application/pdf,image/*"
            class="block w-full text-sm"
            :disabled="saving"
            @change="onIbanFile"
          >
          <p class="text-xs ink-soft">{{ ibanFileName || (filesRequired ? t('refund.fileHint') : t('refund.fileOptionalHint')) }}</p>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium">{{ t('refund.ccFile') }}</p>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :aria-label="t('refund.fileHelpAria')"
              @click="openHelp('cc')"
            >
              <UIcon name="i-lucide-circle-help" class="size-4" />
            </UButton>
          </div>
          <input
            type="file"
            accept=".pdf,.png,.jpeg,.jpg,application/pdf,image/*"
            class="block w-full text-sm"
            :disabled="saving"
            @change="onCcFile"
          >
          <p class="text-xs ink-soft">{{ ccFileName || (filesRequired ? t('refund.fileHint') : t('refund.fileOptionalHint')) }}</p>
        </div>

        <UCheckbox v-model="acceptedTerms" :label="t('refund.terms')" :disabled="saving" />

        <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
        <UButton class="mt-2" type="submit" size="lg" block :label="t('refund.submit')" :loading="saving" />
      </form>

      <p v-else-if="formError" class="text-sm text-red-600">{{ formError }}</p>
    </template>

    <UModal v-model:open="helpOpen" :title="helpTitle">
      <template #body>
        <div v-if="helpKind === 'iban'" class="space-y-3 text-sm leading-relaxed">
          <p>{{ t('refund.ibanFileHelpWhat') }}</p>
          <div>
            <p class="font-medium">{{ t('refund.fileHelpNeed') }}</p>
            <ul class="mt-1 list-disc space-y-1 pl-5 ink-soft">
              <li>{{ t('refund.ibanFileHelpNeed1') }}</li>
              <li>{{ t('refund.ibanFileHelpNeed2') }}</li>
            </ul>
          </div>
          <div>
            <p class="font-medium">{{ t('refund.fileHelpWhere') }}</p>
            <ul class="mt-1 list-disc space-y-1 pl-5 ink-soft">
              <li>{{ t('refund.ibanFileHelpWhere1') }}</li>
              <li>{{ t('refund.ibanFileHelpWhere2') }}</li>
              <li>{{ t('refund.ibanFileHelpWhere3') }}</li>
            </ul>
          </div>
          <p class="text-xs ink-soft">{{ t('refund.fileHelpFormat') }}</p>
        </div>
        <div v-else-if="helpKind === 'cc'" class="space-y-3 text-sm leading-relaxed">
          <p>{{ t('refund.ccFileHelpWhat') }}</p>
          <div>
            <p class="font-medium">{{ t('refund.fileHelpNeed') }}</p>
            <ul class="mt-1 list-disc space-y-1 pl-5 ink-soft">
              <li>{{ t('refund.ccFileHelpNeed1') }}</li>
              <li>{{ t('refund.ccFileHelpNeed2') }}</li>
            </ul>
          </div>
          <div>
            <p class="font-medium">{{ t('refund.fileHelpWhere') }}</p>
            <ul class="mt-1 list-disc space-y-1 pl-5 ink-soft">
              <li>{{ t('refund.ccFileHelpWhere1') }}</li>
              <li>{{ t('refund.ccFileHelpWhere2') }}</li>
              <li>{{ t('refund.ccFileHelpWhere3') }}</li>
            </ul>
          </div>
          <p class="text-xs ink-soft">{{ t('refund.fileHelpFormat') }}</p>
        </div>
        <div v-else-if="helpKind === 'reason'" class="space-y-3 text-sm leading-relaxed">
          <p>{{ t('refund.reasonHelpWhat') }}</p>
          <div>
            <p class="font-medium">{{ t('refund.reasonHelpHow') }}</p>
            <ul class="mt-1 list-disc space-y-1 pl-5 ink-soft">
              <li>{{ t('refund.reasonHelpHow1') }}</li>
              <li>{{ t('refund.reasonHelpHow2') }}</li>
              <li>{{ t('refund.reasonHelpHow3') }}</li>
            </ul>
          </div>
          <div>
            <p class="font-medium">{{ t('refund.reasonHelpExamples') }}</p>
            <ul class="mt-1 list-disc space-y-1 pl-5 ink-soft">
              <li>{{ t('refund.reasonHelpEx1') }}</li>
              <li>{{ t('refund.reasonHelpEx2') }}</li>
              <li>{{ t('refund.reasonHelpEx3') }}</li>
            </ul>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
