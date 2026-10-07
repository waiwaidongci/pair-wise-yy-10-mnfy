<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import OptionGroup from "./OptionGroup.vue";
import PointCard from "./PointCard.vue";
import { orderGroups, useConfiguratorStore } from "../stores/configurator";
import { createShareUrl, formatPrice } from "../utils/share";

const store = useConfiguratorStore();
const { order, shareNotice, overCapacityPoints, isAtCapacity } = storeToRefs(store);
const copied = ref(false);

async function copyShareLink() {
  const url = createShareUrl(order.value);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    window.prompt("复制分享链接", url);
  }
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1800);
}

function addPoint() {
  store.addPoint();
}
</script>

<template>
  <aside class="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:w-[460px]">
    <div class="border-b border-slate-200 p-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">AeroStation Configurator</p>
          <h1 class="mt-2 text-2xl font-black tracking-tight text-slate-900">整单净化方案 S4</h1>
          <p class="mt-1 text-xs text-slate-400">多房间点位 · 颜色材质整单统一 · 滤芯支架按点位</p>
        </div>
        <button class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50" @click="store.reset">重置</button>
      </div>

      <div class="mt-5 rounded-xl bg-slate-900 p-4 text-white">
        <div class="flex items-end justify-between">
          <div>
            <p class="text-[10px] uppercase tracking-wider text-slate-400">整单价格</p>
            <p class="mt-1 text-2xl font-black">{{ formatPrice(store.totalPrice) }}</p>
          </div>
          <p class="text-right text-[10px] text-slate-400">{{ order.points.length }} 个点位 · {{ order.points.reduce((sum, p) => sum + p.units, 0) }} 台主机</p>
        </div>
      </div>

      <p v-if="shareNotice || store.dependencyMessage" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {{ shareNotice || store.dependencyMessage }}
      </p>
    </div>

    <div class="scroll-area min-h-0 flex-1 overflow-y-auto px-5">
      <div class="py-2">
        <p class="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">整单统一</p>
        <OptionGroup
          v-for="group in orderGroups"
          :key="group.id"
          :group="group"
          :selected="order[group.id]"
          :disabled="(optionId) => store.isOptionDisabled(group.id, optionId)"
          @select="(optionId) => store.selectOrderOption(group.id, optionId)"
        />
      </div>

      <div class="border-t border-slate-100 py-3">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">房间点位</p>
          <span v-if="isAtCapacity" class="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700">
            {{ overCapacityPoints.length }} 个点位超限
          </span>
        </div>
        <div class="space-y-3">
          <PointCard
            v-for="point in order.points"
            :key="point.id"
            :point="point"
            :active="point.id === store.activePointId"
            @activate="store.activatePoint(point.id)"
          />
        </div>
        <button
          class="mt-3 w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
          @click="addPoint"
        >
          + 新增房间点位
        </button>
      </div>
    </div>

    <div class="border-t border-slate-200 p-4">
      <button
        class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        @click="copyShareLink"
      >
        {{ copied ? "链接已复制" : "生成并复制整单分享链接" }}
      </button>
      <p class="mt-2 text-center text-[10px] text-slate-400">打开分享链接还原全部点位、面积台数与兼容性修正</p>
    </div>
  </aside>
</template>
