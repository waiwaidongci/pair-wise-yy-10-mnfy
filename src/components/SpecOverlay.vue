<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useConfiguratorStore } from "../stores/configurator";
import type { CameraPreset } from "../types/product";

const store = useConfiguratorStore();
const { cameraPreset, activePoint, computedPoints } = storeToRefs(store);
const presets: Array<{ id: CameraPreset; label: string }> = [
  { id: "hero", label: "主视角" },
  { id: "front", label: "正视图" },
  { id: "top", label: "俯视图" },
  { id: "detail", label: "顶部细节" },
];

const pointSpecs = computed(() => activePoint.value?.specs ?? []);
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="mr-1 text-[10px] font-black uppercase tracking-wider text-slate-400">相机预设</span>
        <button
          v-for="preset in presets"
          :key="preset.id"
          class="rounded-lg px-3 py-2 text-xs font-bold transition"
          :class="cameraPreset === preset.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="cameraPreset = preset.id"
        >
          {{ preset.label }}
        </button>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">点位</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="item in computedPoints"
            :key="item.point.id"
            class="rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition"
            :class="activePoint?.point.id === item.point.id
              ? 'bg-blue-600 text-white'
              : item.hasCapacity
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-red-100 text-red-700 hover:bg-red-200'"
            @click="store.selectActivePoint(item.point.id)"
          >
            {{ item.point.name }}
            <span v-if="!item.hasCapacity" class="ml-0.5">!</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="activePoint" class="mt-3 border-t border-slate-100 pt-3">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs font-black text-slate-800">
          {{ activePoint.point.name }}
          <span class="ml-1 font-normal text-slate-400">{{ activePoint.point.area }}㎡ · {{ activePoint.point.quantity }} 台</span>
        </p>
        <p
          v-if="activePoint.hasCapacity"
          class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
        >
          风量容量充足
        </p>
        <p v-else class="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
          容量不足，需 {{ activePoint.requiredQuantity }} 台（差 {{ activePoint.shortfall }} 台）
        </p>
      </div>
      <div class="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 xl:grid-cols-6">
        <div v-for="spec in pointSpecs" :key="spec.label" class="min-w-[100px]">
          <p class="text-[9px] uppercase tracking-wider text-slate-400">{{ spec.label }}</p>
          <p class="mt-0.5 text-xs font-black text-slate-800">{{ spec.value }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
