<script setup lang="ts">
type Option = { value: number | string, label: string }

type Draft = {
  studentName?: string | null
  studentBirthDate?: string | null
  studentNif?: string | null
  studentEchelon?: number | null
  eeName?: string | null
  eeDocumentType?: number | null
  eeDocNumber?: string | null
  eeNif?: string | null
  eeAddress?: string | null
  eePostalCode?: string | null
  eePostalExt?: string | null
  eeCity?: string | null
  eeExpiryDate?: string | null
  eeEmail?: string | null
  documentTypeList?: Option[]
}

const props = defineProps<{
  saving: boolean
  draft: Draft | null
  echelonOptions?: Option[]
}>()

const emit = defineEmits<{
  submit: [payload: Record<string, unknown>]
}>()

const { t } = useAppI18n()
const acceptedTerms = ref(false)
const form = reactive({
  eeName: '',
  eeDocumentType: 2 as number | string,
  eeDocNumber: '',
  eeExpiryDate: '',
  eeNif: '',
  eeAddress: '',
  eePostalCode: '',
  eePostalExt: '',
  eeCity: '',
  eeEmail: '',
  studentName: '',
  studentBirthDate: '',
  studentNif: '999999990',
  studentEchelon: 0 as number | string
})

watch(() => props.draft, (draft) => {
  if (!draft) return
  form.eeName = draft.eeName || ''
  form.eeDocumentType = draft.eeDocumentType || draft.documentTypeList?.[0]?.value || 2
  form.eeDocNumber = draft.eeDocNumber || ''
  form.eeExpiryDate = draft.eeExpiryDate || ''
  form.eeNif = draft.eeNif || ''
  form.eeAddress = draft.eeAddress || ''
  form.eePostalCode = draft.eePostalCode || ''
  form.eePostalExt = draft.eePostalExt || ''
  form.eeCity = draft.eeCity || ''
  form.eeEmail = draft.eeEmail || ''
  form.studentName = draft.studentName || ''
  form.studentBirthDate = draft.studentBirthDate || ''
  form.studentNif = draft.studentNif || '999999990'
  form.studentEchelon = draft.studentEchelon || props.echelonOptions?.[0]?.value || 0
}, { immediate: true })

const documentItems = computed(() =>
  (props.draft?.documentTypeList?.length
    ? props.draft.documentTypeList
    : [
        { value: 1, label: 'BI' },
        { value: 2, label: 'Cartão de Cidadão' },
        { value: 3, label: 'Passaporte' },
        { value: 5, label: 'AR' },
        { value: 6, label: 'Outro' }
      ]).map(item => ({ label: item.label, value: item.value }))
)

const echelonItems = computed(() =>
  (props.echelonOptions || []).map(item => ({ label: item.label, value: item.value }))
)

function send() {
  if (!acceptedTerms.value) return
  emit('submit', {
    action: 'createWallet',
    acceptedTerms: true,
    ...form
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="send">
    <p class="text-sm ink-soft">{{ t('walletCreate.needed') }}</p>
    <UCheckbox v-model="acceptedTerms" :label="t('walletCreate.terms')" />

    <div class="grid gap-3 sm:grid-cols-2">
      <UFormField :label="t('walletCreate.eeName')" class="sm:col-span-2">
        <UInput v-model="form.eeName" class="w-full" required />
      </UFormField>
      <UFormField :label="t('walletCreate.eeDocType')">
        <USelect v-model="form.eeDocumentType" :items="documentItems" class="w-full" />
      </UFormField>
      <UFormField :label="t('walletCreate.eeDocNumber')">
        <UInput v-model="form.eeDocNumber" class="w-full" required />
      </UFormField>
      <UFormField :label="t('walletCreate.eeExpiry')" :hint="t('walletCreate.dateHint')">
        <UInput v-model="form.eeExpiryDate" placeholder="31-12-2030" class="w-full" required />
      </UFormField>
      <UFormField :label="t('walletCreate.eeNif')">
        <UInput v-model="form.eeNif" class="w-full" required />
      </UFormField>
      <UFormField :label="t('walletCreate.eeAddress')" class="sm:col-span-2">
        <UInput v-model="form.eeAddress" class="w-full" required />
      </UFormField>
      <UFormField :label="t('walletCreate.eePostal')">
        <UInput v-model="form.eePostalCode" maxlength="4" class="w-full" required />
      </UFormField>
      <UFormField :label="t('walletCreate.eePostalExt')">
        <UInput v-model="form.eePostalExt" maxlength="3" class="w-full" required />
      </UFormField>
      <UFormField :label="t('walletCreate.eeCity')">
        <UInput v-model="form.eeCity" class="w-full" required />
      </UFormField>
      <UFormField :label="t('walletCreate.eeEmail')">
        <UInput v-model="form.eeEmail" type="email" class="w-full" required />
      </UFormField>
      <UFormField :label="t('walletCreate.studentName')" class="sm:col-span-2">
        <UInput v-model="form.studentName" class="w-full" required />
      </UFormField>
      <UFormField :label="t('walletCreate.studentBirth')" :hint="t('walletCreate.dateHint')">
        <UInput v-model="form.studentBirthDate" placeholder="01-01-2015" class="w-full" required />
      </UFormField>
      <UFormField :label="t('walletCreate.studentNif')">
        <UInput v-model="form.studentNif" class="w-full" />
      </UFormField>
      <UFormField v-if="echelonItems.length" :label="t('walletCreate.studentEchelon')" class="sm:col-span-2">
        <USelect v-model="form.studentEchelon" :items="echelonItems" class="w-full" />
      </UFormField>
    </div>

    <UButton
      type="submit"
      size="lg"
      block
      :disabled="!acceptedTerms"
      :loading="saving"
      :label="t('walletCreate.submit')"
    />
  </form>
</template>
