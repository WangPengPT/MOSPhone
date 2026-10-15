<script setup lang="ts">
import type { Student } from '#shared/siga'

type PanelItem = {
  id: string
  title: string
  subtitle?: string
  meta?: string
  amount?: number | string | null
  tone?: 'success' | 'warning' | 'error' | null
}

type WalletSection = 'cards' | 'units' | 'movements'

type HomeBooking = {
  studentId: string
  studentName: string | null
  month: string
  subUnitName: string | null
  bookedCount: number
  openCount: number
  canEdit: boolean
}

type HomeAlert = {
  id: string
  title: string
  meta?: string | null
}

type Panel =
  | {
      kind: 'home'
      greeting: string | null
      email: string | null
      schoolYear: string | null
      balance: number | string | null
      students: Student[]
      focusStudent: Student | null
      booking: HomeBooking | null
      alerts: HomeAlert[]
      shortcuts?: Array<{ key: string, to: string }>
    }
  | {
      kind: 'wallet'
      studentName?: string | null
      studentYear?: string | null
      balance: number | string | null
      available?: number | string | null
      reserved?: number | string | null
      credit?: number | string | null
      hasWallet?: boolean | null
      canCreateWallet?: boolean | null
      accountBlocked?: boolean | null
      createDraft?: {
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
        documentTypeList?: Array<{ value: number | string, label: string }>
      } | null
      echelonOptions?: Array<{ value: number | string, label: string }>
      cards?: Array<{
        id: string
        name?: string | null
        number?: string | null
        nif?: string | null
        balance?: number | string | null
        meta?: string | null
      }>
      units?: PanelItem[]
      movements?: PanelItem[]
      loaded?: Partial<Record<'summary' | WalletSection, boolean>>
    }
  | {
      kind: 'profile'
      fields: Array<{ key: string, label: string, value: string }>
    }
  | {
      kind: 'list'
      titleKey?: string
      items: PanelItem[]
    }

const props = defineProps<{
  panel: Panel
  canTopUp?: boolean
  loadingSections?: Partial<Record<WalletSection, boolean>>
}>()

const emit = defineEmits<{
  topup: []
  'create-wallet': []
  'load-section': [section: WalletSection]
}>()

const { t } = useAppI18n()

function toneClass(tone?: string | null) {
  if (tone === 'success') return 'text-ink'
  if (tone === 'error') return 'text-red-600'
  if (tone === 'warning') return 'text-amber-700'
  return 'ink-soft'
}

function sectionLoaded(section: WalletSection) {
  if (props.panel.kind !== 'wallet') return false
  return Boolean(props.panel.loaded?.[section])
}

function studentMeta(student: Student | null | undefined) {
  if (!student) return ''
  const parts = [
    student.year || null,
    student.description || null,
    student.cardNumber ? `${t('panel.cardNumber')} ${student.cardNumber}` : null,
    student.nif ? `${t('module.nif')} ${student.nif}` : null
  ].filter(Boolean)
  return parts.join(' · ')
}
</script>

<template>
  <div v-if="panel.kind === 'home'" class="space-y-7">
    <section class="space-y-2">
      <p class="text-sm tracking-[0.08em] text-muted uppercase">{{ t('brand.role') }}</p>
      <h2 class="font-display text-[2.5rem] leading-[1.05] tracking-[-0.03em]">
        {{ panel.greeting ? t('home.hello', { name: panel.greeting }) : t('modules.inicio.label') }}
      </h2>
      <p v-if="panel.schoolYear" class="text-sm ink-soft">{{ panel.schoolYear }}</p>
    </section>

    <section v-if="panel.focusStudent" class="surface rounded-2xl px-5 py-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-xs tracking-[0.08em] text-muted uppercase">{{ t('home.focusStudent') }}</p>
            <span
              v-if="panel.focusStudent.unread"
              class="rounded-full bg-ink px-1.5 py-0.5 text-[0.65rem] font-semibold text-paper"
            >{{ panel.focusStudent.unread }}</span>
          </div>
          <p class="mt-2 font-display text-2xl tracking-[-0.02em]">{{ panel.focusStudent.name }}</p>
          <p v-if="studentMeta(panel.focusStudent)" class="mt-1 text-sm ink-soft">
            {{ studentMeta(panel.focusStudent) }}
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <UButton
            to="/app/cartao"
            color="neutral"
            variant="ghost"
            size="md"
            :label="t('home.openCard')"
          />
          <UButton
            v-if="canTopUp"
            color="primary"
            size="md"
            :label="t('topup.action')"
            @click="emit('topup')"
          />
        </div>
      </div>
      <div class="mt-4">
        <p class="text-xs ink-soft">{{ t('panel.balance') }}</p>
        <p class="mt-1 font-display text-3xl leading-none tracking-[-0.03em]">
          {{ hasMeaningfulMoney(panel.balance) || panel.balance === 0 ? formatMoney(panel.balance) : '—' }}
        </p>
      </div>
    </section>
  </div>

  <div v-else-if="panel.kind === 'wallet'" class="space-y-8">
    <section v-if="panel.studentName" class="space-y-1">
      <p class="text-sm tracking-[0.08em] text-muted uppercase">{{ t('shell.student') }}</p>
      <h2 class="font-display text-[2.25rem] leading-[1.05] tracking-[-0.03em]">{{ panel.studentName }}</h2>
      <p v-if="panel.studentYear" class="text-sm ink-soft">{{ panel.studentYear }}</p>
    </section>

    <section class="surface rounded-2xl px-5 py-6">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-sm ink-soft">{{ t('panel.balance') }}</p>
          <p class="mt-2 font-display text-5xl leading-none tracking-[-0.03em]">
            {{ panel.available != null || panel.balance != null ? formatMoney(panel.available ?? panel.balance) : '—' }}
          </p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-2">
          <UButton
            v-if="canTopUp && panel.hasWallet !== false"
            color="primary"
            size="md"
            :label="t('topup.action')"
            @click="emit('topup')"
          />
          <UButton
            v-else-if="panel.canCreateWallet"
            color="primary"
            size="md"
            :label="t('walletCreate.action')"
            @click="emit('create-wallet')"
          />
        </div>
      </div>
      <p v-if="panel.accountBlocked" class="mt-4 text-sm text-amber-800">{{ t('walletCreate.blocked') }}</p>
      <p v-else-if="panel.hasWallet === false && panel.canCreateWallet" class="mt-4 text-sm ink-soft">{{ t('walletCreate.needed') }}</p>
      <p v-else-if="panel.hasWallet === false && panel.canCreateWallet === false" class="mt-4 text-sm ink-soft">{{ t('walletCreate.unavailable') }}</p>
      <div v-if="panel.reserved != null || panel.credit != null" class="mt-5 grid grid-cols-2 gap-4">
        <div v-if="panel.reserved != null">
          <p class="text-xs ink-soft">{{ t('panel.reserved') }}</p>
          <p class="mt-1 text-lg">{{ formatMoney(panel.reserved) }}</p>
        </div>
        <div v-if="panel.credit != null">
          <p class="text-xs ink-soft">{{ t('panel.credit') }}</p>
          <p class="mt-1 text-lg">{{ formatMoney(panel.credit) }}</p>
        </div>
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-display text-2xl tracking-[-0.02em]">{{ t('panel.cards') }}</h3>
        <UButton
          v-if="!sectionLoaded('cards')"
          color="neutral"
          variant="soft"
          size="sm"
          :loading="loadingSections?.cards"
          :label="t('panel.load')"
          @click="emit('load-section', 'cards')"
        />
      </div>
      <ul v-if="sectionLoaded('cards') && panel.cards?.length" class="space-y-2">
        <li v-for="card in panel.cards" :key="card.id" class="surface rounded-xl px-4 py-4">
          <p class="font-medium">{{ card.name || t('panel.card') }}</p>
          <p v-if="card.number" class="mt-1 text-sm">{{ t('panel.cardNumber') }} · {{ card.number }}</p>
          <p v-if="card.nif" class="mt-1 text-sm ink-soft">{{ t('fields.nif') }} · {{ card.nif }}</p>
          <p v-if="card.meta" class="mt-1 text-xs ink-soft">{{ card.meta }}</p>
          <p v-if="card.balance != null" class="mt-2 text-sm">{{ formatMoney(card.balance) }}</p>
        </li>
      </ul>
      <p v-else-if="sectionLoaded('cards')" class="text-sm ink-soft">{{ t('panel.sectionEmpty') }}</p>
    </section>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-display text-2xl tracking-[-0.02em]">{{ t('panel.units') }}</h3>
          <p class="mt-1 text-sm ink-soft">{{ t('panel.unitsHint') }}</p>
        </div>
        <UButton
          v-if="!sectionLoaded('units')"
          color="neutral"
          variant="soft"
          size="sm"
          :loading="loadingSections?.units"
          :label="t('panel.load')"
          @click="emit('load-section', 'units')"
        />
      </div>
      <ul v-if="sectionLoaded('units') && panel.units?.length" class="surface divide-y divide-[var(--color-line)] rounded-2xl px-5">
        <li v-for="item in panel.units" :key="item.id" class="flex items-start justify-between gap-4 py-4">
          <div class="min-w-0">
            <p>{{ formatWalletUnit(item.title) }}</p>
            <p v-if="item.subtitle" class="mt-1 text-sm ink-soft">{{ formatWalletUnit(item.subtitle) }}</p>
            <p v-if="item.meta" class="mt-1 text-xs" :class="toneClass(item.tone)">{{ item.meta }}</p>
          </div>
          <p v-if="item.amount != null" class="shrink-0 font-semibold">{{ formatMoney(item.amount) }}</p>
        </li>
      </ul>
      <p v-else-if="sectionLoaded('units')" class="text-sm ink-soft">{{ t('panel.sectionEmpty') }}</p>
    </section>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-display text-2xl tracking-[-0.02em]">{{ t('panel.movements') }}</h3>
        <UButton
          v-if="!sectionLoaded('movements')"
          color="neutral"
          variant="soft"
          size="sm"
          :loading="loadingSections?.movements"
          :label="t('panel.load')"
          @click="emit('load-section', 'movements')"
        />
      </div>
      <ul v-if="sectionLoaded('movements') && panel.movements?.length" class="divide-y divide-[var(--color-line)]">
        <li v-for="item in panel.movements" :key="item.id" class="flex items-start justify-between gap-4 py-4">
          <div class="min-w-0">
            <p>{{ item.title }}</p>
            <p v-if="item.subtitle" class="mt-1 text-sm ink-soft">{{ item.subtitle }}</p>
            <p v-if="item.meta" class="mt-1 text-xs" :class="toneClass(item.tone)">{{ item.meta }}</p>
          </div>
          <p v-if="item.amount != null" class="shrink-0 font-semibold">{{ formatMoney(item.amount) }}</p>
        </li>
      </ul>
      <p v-else-if="sectionLoaded('movements')" class="text-sm ink-soft">{{ t('panel.sectionEmpty') }}</p>
    </section>
  </div>

  <div v-else-if="panel.kind === 'profile'" class="space-y-6">
    <dl class="surface divide-y divide-[var(--color-line)] rounded-2xl px-5">
      <div v-for="field in panel.fields" :key="field.key" class="py-4">
        <dt class="text-sm ink-soft">{{ t(`fields.${field.label}`) }}</dt>
        <dd class="mt-1 text-lg">{{ field.value }}</dd>
      </div>
    </dl>
  </div>

  <div v-else-if="panel.kind === 'list'" class="space-y-2">
    <ul v-if="panel.items.length" class="surface divide-y divide-[var(--color-line)] rounded-2xl px-5">
      <li v-for="item in panel.items" :key="item.id" class="flex items-start justify-between gap-4 py-4">
        <div class="min-w-0">
          <p>{{ item.title }}</p>
          <p v-if="item.subtitle" class="mt-1 text-sm ink-soft">{{ item.subtitle }}</p>
          <p v-if="item.meta" class="mt-1 text-xs" :class="toneClass(item.tone)">{{ item.meta }}</p>
        </div>
        <p v-if="item.amount != null" class="shrink-0 font-semibold">{{ formatMoney(item.amount) }}</p>
      </li>
    </ul>
  </div>
</template>
