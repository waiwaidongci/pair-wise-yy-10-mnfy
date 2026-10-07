import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type {
  CameraPreset,
  Configuration,
  DecodedPlan,
  GlobalGroupId,
  OrderPlan,
  OrderPoint,
  PlanCorrection,
  PointComputed,
  PointGroupId,
} from "../types/product";
import { createDefaultPlan, defaultConfiguration } from "./catalog";
import {
  computePoint,
  createPoint,
  pointConfiguration,
  reconcileConfiguration,
  requiredQuantity,
} from "./pricing";

export const useConfiguratorStore = defineStore("configurator", () => {
  const plan = ref<OrderPlan>(createDefaultPlan());
  const activePointId = ref<string>("");
  const cameraPreset = ref<CameraPreset>("hero");
  const modelRotation = ref(-0.35);
  /** 操作反馈（新增被拒绝、依赖拦截等即时提示）。 */
  const shareNotice = ref("");
  /** 最近一次材质联动或链接迁移产生的自动修正。 */
  const corrections = ref<PlanCorrection[]>([]);
  /** 当前方案是否由旧版单点位链接迁移而来。 */
  const migrated = ref(false);

  /* ---------------------------------- 点位 ---------------------------------- */

  const computedPoints = computed<PointComputed[]>(() =>
    plan.value.points.map((point) => computePoint(plan.value, point)),
  );

  const activePoint = computed<PointComputed | undefined>(() =>
    computedPoints.value.find((item) => item.point.id === activePointId.value) ?? computedPoints.value[0],
  );

  /** 供三维场景等单机位视图使用的当前点位完整配置。 */
  const viewConfiguration = computed<Configuration>(() =>
    activePoint.value ? activePoint.value.configuration : { ...defaultConfiguration },
  );

  const totalQuantity = computed(() =>
    plan.value.points.reduce((sum, item) => sum + item.quantity, 0),
  );

  const totalPrice = computed(() =>
    computedPoints.value.reduce((sum, item) => sum + item.pointPrice, 0),
  );

  /** 容量不足的点位（风量覆盖不够）。 */
  const capacityViolations = computed(() =>
    computedPoints.value.filter((item) => !item.hasCapacity),
  );

  const planReady = computed(() => plan.value.points.length > 0);

  /* -------------------------------- 可用性规则 -------------------------------- */

  function isGlobalOptionDisabled(groupId: GlobalGroupId, optionId: string): boolean {
    if (groupId === "battery" && optionId === "extended" && plan.value.material !== "metal") return true;
    return false;
  }

  function isPointOptionDisabled(point: OrderPoint, groupId: PointGroupId, optionId: string): boolean {
    if (groupId === "stand" && optionId === "floor" && plan.value.material !== "metal") return true;
    if (groupId === "filter" && optionId === "hepa" && plan.value.material === "wood") return true;
    return false;
  }

  /* --------------------------------- 全局选项 --------------------------------- */

  function selectGlobalOption(groupId: GlobalGroupId, optionId: string) {
    if (isGlobalOptionDisabled(groupId, optionId)) {
      shareNotice.value =
        groupId === "battery" && optionId === "extended"
          ? "长续航双电池需要搭配拉丝铝合金机身。"
          : "当前材质下该选项不可用。";
      return;
    }
    plan.value[groupId] = optionId;

    // 材质改动后，各点位的滤芯/支架与全局电池要按依赖一起重算，并记录修正。
    if (groupId === "material") {
      const next: PlanCorrection[] = [];
      for (const point of plan.value.points) {
        const candidate = pointConfiguration(plan.value, point);
        const before = { filter: candidate.filter, stand: candidate.stand, battery: candidate.battery };
        const found = reconcileConfiguration(candidate, point.name);
        if (candidate.filter !== before.filter) point.filter = candidate.filter;
        if (candidate.stand !== before.stand) point.stand = candidate.stand;
        if (candidate.battery !== before.battery) plan.value.battery = candidate.battery;
        next.push(...found);
      }
      corrections.value = next;
      shareNotice.value = next.length
        ? `材质已切换，并对 ${next.length} 处不兼容选择做了自动修正。`
        : "材质已切换，各点位报价与规格已重算。";
    } else {
      shareNotice.value = "";
    }
  }

  /* --------------------------------- 点位选项 --------------------------------- */

  function selectPointOption(pointId: string, groupId: PointGroupId, optionId: string) {
    const point = plan.value.points.find((item) => item.id === pointId);
    if (!point) return;
    if (isPointOptionDisabled(point, groupId, optionId)) {
      shareNotice.value =
        groupId === "filter"
          ? "天然胡桃木饰面不支持医疗级滤芯。"
          : "立式支架需要铝合金机身提供结构强度。";
      return;
    }
    point[groupId] = optionId;
    shareNotice.value = "";
  }

  function updatePointArea(pointId: string, area: number) {
    const point = plan.value.points.find((item) => item.id === pointId);
    if (point) point.area = Math.max(0, Math.round(area) || 0);
  }

  function setPointQuantity(pointId: string, quantity: number) {
    const point = plan.value.points.find((item) => item.id === pointId);
    if (point) point.quantity = Math.max(1, Math.round(quantity) || 1);
  }

  function renamePoint(pointId: string, name: string) {
    const point = plan.value.points.find((item) => item.id === pointId);
    if (point) point.name = name;
  }

  function selectActivePoint(pointId: string) {
    activePointId.value = pointId;
  }

  /**
   * 新增点位：整单风量容量校验。
   * 拟新增台数低于该面积/滤芯所需台数时拒绝加入，并点名是哪个点位容量不足。
   */
  function addPoint(input: { name?: string; area: number; quantity: number; filter?: string; stand?: string }): boolean {
    const candidate = createPoint(input);
    const required = requiredQuantity(candidate.filter, candidate.area);
    if (candidate.quantity < required) {
      shareNotice.value = `已拒绝新增点位「${candidate.name}」：${candidate.area}㎡ 搭配当前滤芯需 ${required} 台，拟配置 ${candidate.quantity} 台，整单风量容量不足。`;
      return false;
    }
    plan.value.points.push(candidate);
    activePointId.value = candidate.id;
    corrections.value = [];
    shareNotice.value = "";
    return true;
  }

  function removePoint(pointId: string) {
    const index = plan.value.points.findIndex((item) => item.id === pointId);
    if (index === -1) return;
    plan.value.points.splice(index, 1);
    if (activePointId.value === pointId) {
      activePointId.value = plan.value.points[0]?.id ?? "";
    }
    shareNotice.value = "";
  }

  /* -------------------------------- 方案导入/重置 ------------------------------- */

  function applyPlan(decoded: DecodedPlan) {
    plan.value = decoded.plan;
    corrections.value = decoded.corrections;
    migrated.value = decoded.migrated;
    activePointId.value = decoded.plan.points[0]?.id ?? "";
    shareNotice.value = decoded.corrections.length
      ? `已还原方案，并自动修正 ${decoded.corrections.length} 处不兼容选择。`
      : "";
  }

  function reset() {
    plan.value = createDefaultPlan();
    activePointId.value = "";
    cameraPreset.value = "hero";
    corrections.value = [];
    migrated.value = false;
    shareNotice.value = "";
    // 重置后预置一个开放区点位，便于直接开始配置。
    const first = createPoint({ name: "开放办公区", area: 40, quantity: 1, filter: "standard", stand: "desktop" });
    plan.value.points.push(first);
    activePointId.value = first.id;
  }

  // 初始化默认点位。
  const initial = createPoint({ name: "开放办公区", area: 40, quantity: 1, filter: "standard", stand: "desktop" });
  plan.value.points.push(initial);
  activePointId.value = initial.id;

  return {
    plan,
    activePointId,
    cameraPreset,
    modelRotation,
    shareNotice,
    corrections,
    migrated,
    computedPoints,
    activePoint,
    viewConfiguration,
    totalQuantity,
    totalPrice,
    capacityViolations,
    planReady,
    isGlobalOptionDisabled,
    isPointOptionDisabled,
    selectGlobalOption,
    selectPointOption,
    updatePointArea,
    setPointQuantity,
    renamePoint,
    selectActivePoint,
    addPoint,
    removePoint,
    applyPlan,
    reset,
  };
});
