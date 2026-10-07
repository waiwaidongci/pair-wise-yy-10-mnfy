<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import OptionGroup from "./OptionGroup.vue";
import PointEditor from "./PointEditor.vue";
import { productGroups } from "../stores/catalog";
import { globalGroupIds } from "../stores/pricing";
import { useConfiguratorStore } from "../stores/configurator";
import { createShareUrl, formatPrice } from "../utils/share";

const store = useConfiguratorStore();
const { plan, computedPoints, capacityViolations, totalPrice, totalQuantity, shareNotice, corrections, migrated } =
  storeToRefs(store);

const globalGroups = computed(() =>
  productGroups.filter((group) => (globalGroupIds as string[]).includes(group.id)) as Array<
    (typeof productGroups)[number] & { id: "color" | "material" | "battery" | "trim" }
  >,
);
const filterGroup = productGroups.find((group) => group.id === "filter")!;

const copied = ref(false);

/* ------------------------------- 新增点位表单 ------------------------------- */
const draftName = ref("");
const draftArea = ref(30);
const draftQuantity = ref(1);
const draftFilter = ref("standard");
const formError = ref("");

function submitNewPoint() {
  formError.value = "";
  const ok = store.addPoint({
    name: draftName.value,
    area: Math.max(0, Math.round(draftArea.value) || 0),
    quantity: Math.max(1, Math.round(draftQuantity.value) || 1),
    filter: draftFilter.value,
    stand: "desktop",
  });
  if (ok) {
    draftName.value = "";
    draftArea.value = 30;
    draftQuantity.value = 1;
    draftFilter.value = "standard";
  } else {
    formError.value = store.shareNotice;
  }
}

async function copyShareLink() {
  const url = createShareUrl(plan.value);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    window.prompt("复制分享链接", url);
  }
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1800);
}
</script>

<template>
  <aside class="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:w-[460px]">
    <div class="border-b border-slate-200 p-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">AeroStation 整层方案</p>
          <h1 class="mt-2 text-2xl font-black tracking-tight text-slate-900">办公区净化整单配置</h1>
          <p class="mt-1 text-xs text-slate-400">一张单含多个房间点位 · 颜色材质整单统一 · 滤芯支架按点位各选</p>
        </div>
        <button class="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50" @click="store.reset">重置</button>
      </div>

      <div class="mt-4 rounded-xl bg-slate-900 p-4 text-white">
        <div class="flex items-end justify-between">
          <div>
            <p class="text-[10px] uppercase tracking-wider text-slate-400">整单总价</p>
            <p class="mt-1 text-2xl font-black">{{ formatPrice(totalPrice) }}</p>
          </div>
          <div class="text-right">
            <p class="text-[10px] text-slate-400">{{ computedPoints.length }} 个点位 · 共 {{ totalQuantity }} 台</p>
            <p
              class="mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
              :class="capacityViolations.length ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'"
            >
              {{ capacityViolations.length ? `${capacityViolations.length} 个点位容量不足` : "全部点位容量充足" }}
            </p>
          </div>
        </div>
      </div>

      <p v-if="migrated" class="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">
        该方案由旧版单点位链接自动升级而来。
      </p>
      <p v-if="shareNotice" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {{ shareNotice }}
      </p>
      <ul v-if="corrections.length" class="mt-3 space-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <li v-for="(item, index) in corrections" :key="index" class="text-[11px] font-medium text-slate-600">
          <span class="text-slate-400">已修正{{ item.pointName ? `·${item.pointName}` : "" }}：</span>{{ item.message }}
        </li>
      </ul>
    </div>

    <div class="scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <!-- 整单统一选项 -->
      <p class="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">整单统一</p>
      <div class="mb-5 rounded-xl border border-slate-200 px-3">
        <OptionGroup
          v-for="group in globalGroups"
          :key="group.id"
          :group="group"
          :selected="plan[group.id]"
          :disabled="(optionId) => store.isGlobalOptionDisabled(group.id, optionId)"
          @select="(optionId) => store.selectGlobalOption(group.id, optionId)"
        />
      </div>

      <!-- 点位列表 -->
      <div class="mb-2 flex items-center justify-between">
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">房间点位（{{ computedPoints.length }}）</p>
      </div>
      <div class="space-y-2">
        <PointEditor
          v-for="item in computedPoints"
          :key="item.point.id"
          :computed="item"
          :active="store.activePointId === item.point.id"
        />
      </div>

      <!-- 新增点位 -->
      <div class="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
        <p class="text-xs font-black text-slate-700">新增房间点位</p>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <label class="col-span-2 flex items-center gap-1 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200">
            <span class="text-[10px] font-bold text-slate-400">名称</span>
            <input v-model="draftName" placeholder="如：会议室 A" class="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-800 outline-none" />
          </label>
          <label class="flex items-center gap-1 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200">
            <span class="text-[10px] font-bold text-slate-400">面积</span>
            <input v-model.number="draftArea" type="number" min="0" class="w-14 bg-transparent text-xs font-black text-slate-800 outline-none" />
            <span class="text-[10px] text-slate-400">㎡</span>
          </label>
          <label class="flex items-center gap-1 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200">
            <span class="text-[10px] font-bold text-slate-400">台数</span>
            <input v-model.number="draftQuantity" type="number" min="1" class="w-12 bg-transparent text-xs font-black text-slate-800 outline-none" />
            <span class="text-[10px] text-slate-400">台</span>
          </label>
          <label class="col-span-2 flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200">
            <span class="shrink-0 text-[10px] font-bold text-slate-400">滤芯</span>
            <select v-model="draftFilter" class="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-800 outline-none">
              <option v-for="option in filterGroup.options" :key="option.id" :value="option.id">{{ option.name }}</option>
            </select>
          </label>
        </div>
        <p v-if="formError" class="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-bold text-red-700">{{ formError }}</p>
        <button
          type="button"
          class="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-700"
          @click="submitNewPoint"
        >
          校验容量并加入整单
        </button>
      </div>
    </div>

    <div class="border-t border-slate-200 p-4">
      <button
        class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!plan.points.length"
        @click="copyShareLink"
      >
        {{ copied ? "链接已复制" : "生成并复制整单分享链接" }}
      </button>
      <p class="mt-2 text-center text-[10px] text-slate-400">链接整体编码全部点位；打开后还原同样的点位、报价与修正</p>
    </div>
  </aside>
</template>
