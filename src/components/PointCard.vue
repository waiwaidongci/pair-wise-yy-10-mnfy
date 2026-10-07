<script setup lang="ts">
import { computed } from "vue";
import OptionGroup from "./OptionGroup.vue";
import { pointGroups, useConfiguratorStore } from "../stores/configurator";
import { formatPrice } from "../utils/share";
import type { PointConfiguration } from "../types/product";

const props = defineProps<{ point: PointConfiguration; active: boolean }>();
const emit = defineEmits<{ activate: [] }>();

const store = useConfiguratorStore();

const over = computed(() => store.isPointOverCapacity(props.point));
const coverage = computed(() => store.pointCoverage(props.point));
const unitPrice = computed(() => store.unitPriceOf(props.point));
const price = computed(() => store.pointPrice(props.point));
const specs = computed(() => store.pointSpecs(props.point));
const perUnitCoverage = computed(() => {
  const group = pointGroups.find((item) => item.id === "filter");
  const option = group?.options.find((item) => item.id === props.point.filter);
  return option?.coverageMax ?? 45;
});

function updateArea(event: Event) {
  store.updatePoint(props.point.id, { area: Number((event.target as HTMLInputElement).value) });
}

function updateUnits(event: Event) {
  store.updatePoint(props.point.id, { units: Number((event.target as HTMLInputElement).value) });
}

function updateName(event: Event) {
  store.updatePoint(props.point.id, { name: (event.target as HTMLInputElement).value });
}
</script>

<template>
  <div
    class="rounded-xl border p-3 transition"
    :class="active ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-white'"
    @click="emit('activate')"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <input
          :value="point.name"
          class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-xs font-black text-slate-800 hover:border-slate-200 focus:border-blue-300 focus:bg-white focus:outline-none"
          @input="updateName"
          @click.stop
        />
        <span v-if="active" class="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white">三维展示</span>
      </div>
      <button
        class="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold text-slate-400 hover:bg-red-50 hover:text-red-600"
        @click.stop="store.removePoint(point.id)"
      >
        删除
      </button>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-2">
      <label class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
        <span class="block text-[9px] uppercase tracking-wider text-slate-400">面积 (㎡)</span>
        <input
          type="number"
          min="1"
          class="mt-0.5 w-full text-xs font-bold text-slate-800 outline-none"
          :value="point.area"
          @input="updateArea"
          @click.stop
        />
      </label>
      <label class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
        <span class="block text-[9px] uppercase tracking-wider text-slate-400">台数</span>
        <input
          type="number"
          min="1"
          class="mt-0.5 w-full text-xs font-bold text-slate-800 outline-none"
          :value="point.units"
          @input="updateUnits"
          @click.stop
        />
      </label>
    </div>

    <div class="mt-1">
      <OptionGroup
        v-for="group in pointGroups"
        :key="group.id"
        :group="group"
        :selected="point[group.id]"
        :disabled="(optionId) => store.isOptionDisabled(group.id, optionId)"
        @select="(optionId) => store.selectPointOption(point.id, group.id, optionId)"
      />
    </div>

    <div class="mt-2 flex items-end justify-between rounded-lg bg-slate-900 px-3 py-2 text-white">
      <div>
        <p class="text-[9px] uppercase tracking-wider text-slate-400">点位报价</p>
        <p class="text-base font-black">{{ formatPrice(price) }}</p>
      </div>
      <p class="text-right text-[10px] text-slate-400">{{ point.units }} 台 × {{ formatPrice(unitPrice) }}</p>
    </div>

    <div class="mt-2 grid grid-cols-3 gap-x-2 gap-y-1">
      <div v-for="spec in specs.slice(0, 3)" :key="spec.label" class="min-w-0">
        <p class="truncate text-[9px] text-slate-400">{{ spec.label }}</p>
        <p class="truncate text-[11px] font-bold text-slate-700">{{ spec.value }}</p>
      </div>
    </div>

    <p
      v-if="over"
      class="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-bold text-red-700"
    >
      风量不足：{{ point.area }}㎡ 需覆盖，{{ point.units }} 台仅覆盖 {{ coverage }}㎡（单台 {{ perUnitCoverage }}㎡）
    </p>
  </div>
</template>
