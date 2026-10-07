<script setup lang="ts">
import OptionGroup from "./OptionGroup.vue";
import { productGroups } from "../stores/catalog";
import { useConfiguratorStore } from "../stores/configurator";
import { formatPrice } from "../utils/share";
import type { PointComputed, PointGroupId } from "../types/product";

const props = defineProps<{ computed: PointComputed; active: boolean }>();
const store = useConfiguratorStore();

const filterGroup = productGroups.find((group) => group.id === "filter")!;
const standGroup = productGroups.find((group) => group.id === "stand")!;

function onName(event: Event) {
  store.renamePoint(props.computed.point.id, (event.target as HTMLInputElement).value);
}
function onArea(event: Event) {
  store.updatePointArea(props.computed.point.id, Number((event.target as HTMLInputElement).value));
}
function step(delta: number) {
  store.setPointQuantity(props.computed.point.id, props.computed.point.quantity + delta);
}
function pick(groupId: PointGroupId, optionId: string) {
  store.selectPointOption(props.computed.point.id, groupId, optionId);
}
</script>

<template>
  <div
    class="rounded-xl border p-3 transition"
    :class="active ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-200' : 'border-slate-200 bg-white'"
  >
    <div class="flex items-start gap-2">
      <button
        type="button"
        class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
        :class="active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent'"
        :title="active ? '当前预览点位' : '在三维视图中预览该点位'"
        @click="store.selectActivePoint(computed.point.id)"
      >
        <span class="text-[8px]">●</span>
      </button>

      <div class="min-w-0 flex-1 space-y-2">
        <div class="flex items-center gap-2">
          <input
            :value="computed.point.name"
            class="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-xs font-black text-slate-800 outline-none hover:border-slate-200 focus:border-blue-400 focus:bg-white"
            @input="onName"
          />
          <button
            type="button"
            class="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-400 hover:bg-red-50 hover:text-red-600"
            @click="store.removePoint(computed.point.id)"
          >
            删除
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <label class="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5">
            <span class="text-[10px] font-bold text-slate-400">面积</span>
            <input
              type="number"
              min="0"
              :value="computed.point.area"
              class="w-14 bg-transparent text-xs font-black text-slate-800 outline-none"
              @input="onArea"
            />
            <span class="text-[10px] text-slate-400">㎡</span>
          </label>

          <div class="flex items-center rounded-lg bg-slate-100">
            <button type="button" class="px-2 py-1.5 text-sm font-black text-slate-500 hover:text-slate-900" @click="step(-1)">−</button>
            <span class="min-w-[2.2rem] text-center text-xs font-black text-slate-800">{{ computed.point.quantity }} 台</span>
            <button type="button" class="px-2 py-1.5 text-sm font-black text-slate-500 hover:text-slate-900" @click="step(1)">+</button>
          </div>

          <div class="ml-auto text-right">
            <p class="text-[10px] text-slate-400">点位小计</p>
            <p class="text-sm font-black text-slate-900">{{ formatPrice(computed.pointPrice) }}</p>
          </div>
        </div>

        <p
          class="rounded-lg px-2 py-1 text-[10px] font-bold"
          :class="computed.hasCapacity
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-red-50 text-red-700'"
        >
          <template v-if="computed.hasCapacity">
            单机覆盖 {{ computed.coverageLabel }}，{{ computed.point.quantity }} 台满足 {{ computed.point.area }}㎡（需 {{ computed.requiredQuantity }} 台）
          </template>
          <template v-else>
            ⚠ 风量容量不足：{{ computed.point.name }} 需 {{ computed.requiredQuantity }} 台，当前 {{ computed.point.quantity }} 台，差 {{ computed.shortfall }} 台
          </template>
        </p>

        <div class="rounded-lg bg-slate-50/70 px-2">
          <OptionGroup
            :group="filterGroup"
            :selected="computed.point.filter"
            :disabled="(optionId) => store.isPointOptionDisabled(computed.point, 'filter', optionId)"
            @select="(optionId) => pick('filter', optionId)"
          />
          <OptionGroup
            :group="standGroup"
            :selected="computed.point.stand"
            :disabled="(optionId) => store.isPointOptionDisabled(computed.point, 'stand', optionId)"
            @select="(optionId) => pick('stand', optionId)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
