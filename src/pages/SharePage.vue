<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useConfiguratorStore } from "../stores/configurator";
import { decodeOrder, formatPrice } from "../utils/share";
import ProductScene from "../components/ProductScene.vue";

const route = useRoute();
const router = useRouter();
const store = useConfiguratorStore();
const { order, overCapacityPoints } = storeToRefs(store);
const valid = ref(true);

onMounted(() => {
  const next = decodeOrder(String(route.params.payload ?? ""));
  if (!next || !next.points || !next.points.length) {
    valid.value = false;
    return;
  }
  store.applyOrderConfiguration(next);
});
</script>

<template>
  <div class="min-h-screen bg-[#eef1f4] p-5">
    <div v-if="valid" class="mx-auto max-w-6xl">
      <header class="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Shared Configuration</p>
          <h1 class="mt-1 text-3xl font-black text-slate-900">您的 AeroStation S4 整单方案</h1>
          <p class="mt-1 text-sm text-slate-500">已还原 {{ order.points.length }} 个点位、面积台数与全部兼容性修正</p>
        </div>
        <button class="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white" @click="router.push('/')">继续调整配置</button>
      </header>
      <div class="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div class="h-[620px]"><ProductScene /></div>
        <aside class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">整单统一</p>
          <div class="mt-4 space-y-3">
            <div v-for="group in [
              { label: '机身颜色', value: store.orderOptions.color.name },
              { label: '外壳材质', value: store.orderOptions.material.name },
              { label: '续航模块', value: store.orderOptions.battery.name },
              { label: '控制环', value: store.orderOptions.trim.name },
            ]" :key="group.label" class="flex justify-between border-b border-slate-100 pb-2 text-sm">
              <span class="text-slate-500">{{ group.label }}</span>
              <span class="font-bold text-slate-900">{{ group.value }}</span>
            </div>
          </div>

          <p class="mt-5 text-xs font-black uppercase tracking-wider text-slate-400">房间点位</p>
          <div class="mt-3 space-y-3">
            <div
              v-for="point in order.points"
              :key="point.id"
              class="rounded-xl border border-slate-200 p-3"
              :class="store.isPointOverCapacity(point) ? 'border-red-200 bg-red-50/50' : ''"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-slate-800">{{ point.name }}</span>
                <span v-if="store.isPointOverCapacity(point)" class="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700">风量超限</span>
              </div>
              <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span>面积：<b class="text-slate-800">{{ point.area }}㎡</b></span>
                <span>台数：<b class="text-slate-800">{{ point.units }}</b></span>
                <span>滤芯：<b class="text-slate-800">{{ point.filter === 'hepa' ? 'H13 医疗级' : point.filter === 'formaldehyde' ? '除醛增强' : '标准复合' }}</b></span>
                <span>支架：<b class="text-slate-800">{{ point.stand === 'floor' ? '立式铝合金' : '桌面橡胶底座' }}</b></span>
              </div>
              <div class="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                <span class="text-[10px] text-slate-400">点位报价</span>
                <span class="text-sm font-black text-slate-900">{{ formatPrice(store.pointPrice(point)) }}</span>
              </div>
            </div>
          </div>

          <div v-if="overCapacityPoints.length" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
            {{ overCapacityPoints.length }} 个点位风量超出覆盖能力，请调整面积或台数。
          </div>

          <div class="mt-5 rounded-xl bg-blue-50 p-4">
            <p class="text-xs text-blue-600">整单总价</p>
            <p class="mt-1 text-2xl font-black text-blue-800">{{ formatPrice(store.totalPrice) }}</p>
          </div>
        </aside>
      </div>
    </div>
    <div v-else class="mx-auto mt-32 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 class="text-xl font-black text-slate-900">分享链接无效</h1>
      <p class="mt-2 text-sm text-slate-500">链接参数已损坏或来自不兼容版本。</p>
      <button class="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white" @click="router.push('/')">创建新配置</button>
    </div>
  </div>
</template>
