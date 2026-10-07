<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useConfiguratorStore } from "../stores/configurator";
import { decodePlan, formatPrice } from "../utils/share";
import ProductScene from "../components/ProductScene.vue";
import { optionOf } from "../stores/pricing";

const route = useRoute();
const router = useRouter();
const store = useConfiguratorStore();
const { computedPoints, totalPrice, totalQuantity, corrections, migrated, capacityViolations } = storeToRefs(store);
const valid = ref(true);

onMounted(() => {
  const decoded = decodePlan(String(route.params.payload ?? ""));
  if (!decoded) {
    valid.value = false;
    return;
  }
  store.applyPlan(decoded);
});

const globalSummary = [
  { label: "机身颜色", key: "color" as const },
  { label: "外壳材质", key: "material" as const },
  { label: "续航模块", key: "battery" as const },
  { label: "控制环", key: "trim" as const },
];
</script>

<template>
  <div class="min-h-screen bg-[#eef1f4] p-5">
    <div v-if="valid" class="mx-auto max-w-6xl">
      <header class="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Shared Floor Plan</p>
          <h1 class="mt-1 text-3xl font-black text-slate-900">您的 AeroStation 整层净化方案</h1>
          <p class="mt-1 text-sm text-slate-500">{{ computedPoints.length }} 个房间点位 · 共 {{ totalQuantity }} 台 · 整单颜色与材质统一。</p>
        </div>
        <button class="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white" @click="router.push('/')">继续调整方案</button>
      </header>

      <div v-if="migrated || corrections.length" class="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p class="text-sm font-black text-blue-800">{{ migrated ? "旧链接已自动升级" : "已应用兼容性修正" }}</p>
        <ul class="mt-2 space-y-1">
          <li v-for="(item, index) in corrections" :key="index" class="text-xs text-blue-700">
            <span v-if="item.pointName" class="font-bold">「{{ item.pointName }}」</span>{{ item.message }}
          </li>
        </ul>
      </div>

      <div class="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div class="space-y-4">
          <div class="h-[520px]"><ProductScene /></div>

          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-black uppercase tracking-wider text-slate-400">点位清单</p>
            <div class="mt-3 space-y-3">
              <div
                v-for="item in computedPoints"
                :key="item.point.id"
                class="rounded-xl border p-3"
                :class="item.hasCapacity ? 'border-slate-200' : 'border-red-300 bg-red-50/50'"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p class="text-sm font-black text-slate-900">{{ item.point.name }}</p>
                    <p class="mt-0.5 text-[11px] text-slate-400">{{ item.point.area }}㎡ · {{ item.point.quantity }} 台</p>
                  </div>
                  <div class="text-right">
                    <p class="text-[10px] text-slate-400">单价 {{ formatPrice(item.unitPrice) }}</p>
                    <p class="text-sm font-black text-slate-900">{{ formatPrice(item.pointPrice) }}</p>
                  </div>
                </div>
                <div class="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{{ optionOf('filter', item.point.filter).name }}</span>
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{{ optionOf('stand', item.point.stand).name }}</span>
                  <span
                    class="rounded-full px-2 py-0.5"
                    :class="item.hasCapacity ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                  >
                    {{ item.hasCapacity ? `容量充足（需 ${item.requiredQuantity} 台）` : `容量不足：需 ${item.requiredQuantity} 台，差 ${item.shortfall} 台` }}
                  </span>
                </div>
                <div class="mt-2 grid grid-cols-3 gap-2">
                  <div v-for="spec in item.specs.slice(0, 3)" :key="spec.label" class="rounded-lg bg-slate-50 px-2 py-1.5">
                    <p class="text-[9px] text-slate-400">{{ spec.label }}</p>
                    <p class="text-[11px] font-bold text-slate-800">{{ spec.value }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside class="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-5">
          <p class="text-xs font-black uppercase tracking-wider text-slate-400">整单统一配置</p>
          <div class="mt-4 space-y-3">
            <div v-for="group in globalSummary" :key="group.label" class="flex justify-between border-b border-slate-100 pb-3 text-sm">
              <span class="text-slate-500">{{ group.label }}</span>
              <span class="font-bold text-slate-900">{{ optionOf(group.key, store.plan[group.key]).name }}</span>
            </div>
          </div>
          <div class="mt-5 rounded-xl bg-blue-50 p-4">
            <p class="text-xs text-blue-600">整单总价（{{ totalQuantity }} 台）</p>
            <p class="mt-1 text-2xl font-black text-blue-800">{{ formatPrice(totalPrice) }}</p>
          </div>
          <p
            v-if="store.capacityViolations.length"
            class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700"
          >
            以下点位风量容量不足：{{ capacityViolations.map((violation) => violation.point.name).join("、") }}
          </p>
        </aside>
      </div>
    </div>

    <div v-else class="mx-auto mt-32 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 class="text-xl font-black text-slate-900">分享链接无效</h1>
      <p class="mt-2 text-sm text-slate-500">链接参数已损坏或来自不兼容版本。</p>
      <button class="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white" @click="router.push('/')">创建新方案</button>
    </div>
  </div>
</template>
