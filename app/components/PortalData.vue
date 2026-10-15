<script setup lang="ts">
const props = defineProps<{ data: unknown }>()
const expanded = ref(false)
const { t } = useAppI18n()

const view = computed(() => buildView(props.data))

function buildView(data: unknown) {
  if (Array.isArray(data)) return { scalars: [] as Cell[], groups: [{ title: '', rows: data }] }
  if (data && typeof data === 'object') {
    const scalars: Cell[] = []
    const groups: { title: string, rows: unknown[] }[] = []
    for (const [key, value] of Object.entries(data)) {
      if (isHiddenKey(key)) continue
      if (Array.isArray(value)) groups.push({ title: labelOf(key), rows: value })
      else if (value && typeof value === 'object') groups.push({ title: labelOf(key), rows: [value] })
      else scalars.push(cell(key, value))
    }
    return { scalars, groups }
  }
  return { scalars: [], groups: [], text: data == null ? '' : String(data) }
}

interface Cell {
  key: string
  label: string
  text: string
  tone: string | null
}

function cell(key: string, value: unknown): Cell {
  return { key, label: labelOf(key), text: textOf(key, value), tone: toneOf(value) }
}

function rowsOf(rows: unknown[]) {
  return rows
    .filter(row => row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => {
      const cells = Object.entries(row as Record<string, unknown>)
        .filter(([key, value]) => !isHiddenKey(key) && (value == null || typeof value !== 'object'))
        .slice(0, 8)
        .map(([key, value]) => cell(key, value))
      return { cells }
    })
}

const visibleGroups = computed(() => view.value.groups.map(group => ({
  title: group.title,
  rows: rowsOf(expanded.value ? group.rows : group.rows.slice(0, 12)),
  hidden: Math.max(0, group.rows.length - 12)
})))
</script>

<template>
  <div class="space-y-6">
    <p v-if="view.text" class="rounded-2xl bg-white px-4 py-3 text-stone-700">{{ view.text }}</p>

    <dl v-if="view.scalars.length" class="grid gap-3 sm:grid-cols-2">
      <div v-for="item in view.scalars" :key="item.key" class="rounded-2xl bg-white px-4 py-3">
        <dt class="text-xs tracking-wide text-stone-500 uppercase">{{ item.label }}</dt>
        <dd class="mt-1 text-base font-medium">{{ item.text }}</dd>
      </div>
    </dl>

    <section v-for="(group, index) in visibleGroups" :key="`${group.title}-${index}`" class="space-y-3">
      <h3 v-if="group.title" class="font-display text-2xl">{{ group.title }}</h3>
      <div v-if="group.rows.length" class="grid gap-3 lg:hidden">
        <article v-for="(row, rowIndex) in group.rows" :key="rowIndex" class="rounded-3xl border border-stone-200 bg-white p-4">
          <dl class="space-y-2">
            <div v-for="item in row.cells" :key="item.key" class="flex items-start justify-between gap-4">
              <dt class="text-sm text-stone-500">{{ item.label }}</dt>
              <dd class="text-right text-sm font-medium">
                <span v-if="item.tone === 'success'" class="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{{ item.text }}</span>
                <span v-else-if="item.tone === 'error'" class="rounded-full bg-red-50 px-2 py-0.5 text-red-700">{{ item.text }}</span>
                <span v-else-if="item.tone === 'warning'" class="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">{{ item.text }}</span>
                <span v-else>{{ item.text }}</span>
              </dd>
            </div>
          </dl>
        </article>
      </div>
      <div v-if="group.rows.length" class="hidden overflow-hidden rounded-3xl border border-stone-200 bg-white lg:block">
        <table class="w-full text-left text-sm">
          <thead class="bg-stone-50 text-stone-500">
            <tr>
              <th v-for="item in group.rows[0].cells" :key="item.key" class="px-4 py-3 font-medium">{{ item.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in group.rows" :key="rowIndex" class="border-t border-stone-100">
              <td v-for="item in row.cells" :key="item.key" class="px-4 py-3">{{ item.text }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button v-if="group.hidden && !expanded" type="button" class="text-sm underline decoration-[rgb(28_28_28_/_0.25)] underline-offset-4" @click="expanded = true">
        {{ t('data.more', { count: group.hidden }) }}
      </button>
    </section>
  </div>
</template>
