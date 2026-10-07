import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { CameraPreset, OrderConfiguration, PointConfiguration, ProductGroup, ProductSpec } from "../types/product";

export const productGroups: ProductGroup[] = [
  {
    id: "color",
    name: "机身颜色",
    summary: "外壳阳极氧化与喷砂配色",
    options: [
      { id: "graphite", name: "石墨灰", description: "耐脏、适合办公环境", price: 0, swatch: "#343941" },
      { id: "ivory", name: "雾光白", description: "柔和明亮，适合居住空间", price: 0, swatch: "#e9e5dc" },
      { id: "sage", name: "鼠尾草绿", description: "低饱和限定配色", price: 180, swatch: "#758f7d" },
      { id: "ocean", name: "深海蓝", description: "限定批次，库存较少", price: 240, swatch: "#385a78" },
    ],
  },
  {
    id: "material",
    name: "外壳材质",
    summary: "影响触感、耐用度和净化结构",
    options: [
      { id: "matte", name: "哑光复合材质", description: "轻量且抗指纹", price: 0 },
      { id: "metal", name: "拉丝铝合金", description: "更高结构强度与金属质感", price: 680 },
      { id: "wood", name: "天然胡桃木", description: "手工饰面，不支持医疗滤芯", price: 980 },
    ],
  },
  {
    id: "filter",
    name: "滤芯系统",
    summary: "根据房间面积和敏感人群选择",
    options: [
      { id: "standard", name: "标准复合滤芯", description: "适合 25-45㎡ 空间", price: 0, coverageMax: 45 },
      { id: "hepa", name: "H13 医疗级滤芯", description: "高效过滤细颗粒物", price: 860, coverageMax: 65 },
      { id: "formaldehyde", name: "除醛增强滤芯", description: "新装修空间推荐", price: 720, coverageMax: 55 },
    ],
  },
  {
    id: "battery",
    name: "续航模块",
    summary: "选择移动使用方式与续航时间",
    options: [
      { id: "none", name: "纯电源供电", description: "标准桌面使用", price: 0 },
      { id: "standard", name: "标准电池", description: "约 5 小时续航", price: 520 },
      { id: "extended", name: "长续航双电池", description: "约 11 小时，仅金属机身可选", price: 980 },
    ],
  },
  {
    id: "stand",
    name: "支架形态",
    summary: "落地支架依赖铝合金材质",
    options: [
      { id: "desktop", name: "桌面橡胶底座", description: "重心稳定，占地面积小", price: 0 },
      { id: "floor", name: "立式铝合金支架", description: "升高 92cm，仅金属机身可选", price: 760 },
    ],
  },
  {
    id: "trim",
    name: "控制环",
    summary: "顶部触控环的视觉与触感",
    options: [
      { id: "subtle", name: "同色控制环", description: "一体化外观", price: 0 },
      { id: "copper", name: "暖铜控制环", description: "拉丝金属点缀", price: 260, swatch: "#b5744d" },
      { id: "graphite-ring", name: "深色镀铬环", description: "高对比控制区域", price: 220, swatch: "#20242a" },
    ],
  },
];

/** 整单统一的选项组（颜色、材质、续航、控制环） */
export type OrderGroupId = "color" | "material" | "battery" | "trim";
/** 按点位各选的选项组（滤芯、支架） */
export type PointGroupId = "filter" | "stand";

export const orderGroups = productGroups.filter(
  (group) => group.id !== "filter" && group.id !== "stand",
) as Array<ProductGroup & { id: OrderGroupId }>;
export const pointGroups = productGroups.filter(
  (group) => group.id === "filter" || group.id === "stand",
) as Array<ProductGroup & { id: PointGroupId }>;

const basePrice = 3299;

/** 各滤芯单台最大覆盖面积（㎡） */
const filterCoverage: Record<string, number> = {
  standard: 45,
  hepa: 65,
  formaldehyde: 55,
};

const batteryCopy: Record<string, string> = {
  none: "电源供电",
  standard: "5 小时",
  extended: "11 小时",
};

const coverageCopy: Record<string, string> = {
  standard: "25-45㎡",
  hepa: "35-65㎡",
  formaldehyde: "30-55㎡",
};

function findOption(groupId: ProductGroup["id"], optionId: string) {
  return productGroups.find((group) => group.id === groupId)?.options.find((option) => option.id === optionId);
}

function isValidOption(groupId: ProductGroup["id"], id: unknown): id is string {
  return typeof id === "string" && !!findOption(groupId, id);
}

let pointSeq = 0;
function defaultPoint(index: number): PointConfiguration {
  pointSeq += 1;
  return {
    id: `p-${Date.now().toString(36)}-${pointSeq}`,
    name: `点位 ${index + 1}`,
    area: 30,
    units: 1,
    filter: "standard",
    stand: "desktop",
  };
}

function createDefaultOrder(): OrderConfiguration {
  return {
    color: "graphite",
    material: "matte",
    battery: "standard",
    trim: "subtle",
    points: [defaultPoint(0)],
  };
}

function sanitizePoint(input: Partial<PointConfiguration>, index: number): PointConfiguration {
  const fallback = defaultPoint(index);
  return {
    id: typeof input.id === "string" && input.id ? input.id : fallback.id,
    name: typeof input.name === "string" && input.name.trim() ? input.name.trim() : fallback.name,
    area: typeof input.area === "number" && input.area > 0 ? Math.round(input.area) : fallback.area,
    units: typeof input.units === "number" && input.units > 0 ? Math.round(input.units) : fallback.units,
    filter: isValidOption("filter", input.filter) ? input.filter : fallback.filter,
    stand: isValidOption("stand", input.stand) ? input.stand : fallback.stand,
  };
}

function sanitizeOrder(input: Partial<OrderConfiguration>): OrderConfiguration {
  const fallback = createDefaultOrder();
  const order: OrderConfiguration = {
    color: isValidOption("color", input.color) ? input.color : fallback.color,
    material: isValidOption("material", input.material) ? input.material : fallback.material,
    battery: isValidOption("battery", input.battery) ? input.battery : fallback.battery,
    trim: isValidOption("trim", input.trim) ? input.trim : fallback.trim,
    points:
      Array.isArray(input.points) && input.points.length > 0
        ? input.points.map((point, index) => sanitizePoint(point, index))
        : fallback.points.map((point, index) => sanitizePoint(point, index)),
  };
  // 兼容性修正：材质决定结构，连带修正续航、支架与滤芯
  if (order.material !== "metal" && order.battery === "extended") order.battery = "standard";
  for (const point of order.points) {
    if (order.material !== "metal" && point.stand === "floor") point.stand = "desktop";
    if (order.material === "wood" && point.filter === "hepa") point.filter = "standard";
  }
  return order;
}

export const useConfiguratorStore = defineStore("configurator", () => {
  const order = ref<OrderConfiguration>(createDefaultOrder());
  const activePointId = ref<string>(order.value.points[0].id);
  const cameraPreset = ref<CameraPreset>("hero");
  const modelRotation = ref(-0.35);
  const shareNotice = ref("");

  const activePoint = computed(
    () => order.value.points.find((point) => point.id === activePointId.value) ?? order.value.points[0],
  );

  /** 整单统一选项的当前选项对象 */
  const orderOptions = computed(() =>
    Object.fromEntries(
      orderGroups.map((group) => [group.id, findOption(group.id, order.value[group.id as keyof OrderConfiguration] as string)!]),
    ) as Record<(typeof orderGroups)[number]["id"], ProductGroup["options"][number]>,
  );

  /** 风量超出覆盖能力的点位（面积 > 台数 × 单台覆盖） */
  const overCapacityPoints = computed(() =>
    order.value.points.filter((point) => point.area > point.units * (filterCoverage[point.filter] ?? 45)),
  );

  const isAtCapacity = computed(() => overCapacityPoints.value.length > 0);

  const dependencyMessage = computed(() => {
    if (order.value.battery === "extended" && order.value.material !== "metal") {
      return "长续航双电池需要搭配拉丝铝合金机身。";
    }
    if (order.value.points.some((point) => point.stand === "floor") && order.value.material !== "metal") {
      return "立式支架需要铝合金机身提供结构强度。";
    }
    if (order.value.points.some((point) => point.filter === "hepa") && order.value.material === "wood") {
      return "医疗级滤芯不支持天然胡桃木饰面。";
    }
    return "";
  });

  function isOptionDisabled(groupId: ProductGroup["id"], optionId: string) {
    if (groupId === "battery" && optionId === "extended" && order.value.material !== "metal") return true;
    if (groupId === "stand" && optionId === "floor" && order.value.material !== "metal") return true;
    if (groupId === "filter" && optionId === "hepa" && order.value.material === "wood") return true;
    return false;
  }

  /** 单台价格：基础主机 + 整单选项 + 该点位选项 */
  function unitPriceOf(point: PointConfiguration): number {
    const optionIds = [order.value.color, order.value.material, order.value.battery, order.value.trim, point.filter, point.stand];
    let surcharge = 0;
    for (const group of productGroups) {
      for (const option of group.options) {
        if (optionIds.includes(option.id)) surcharge += option.price;
      }
    }
    return basePrice + surcharge;
  }

  /** 点位报价：台数 × 单台价格 */
  function pointPrice(point: PointConfiguration): number {
    return point.units * unitPriceOf(point);
  }

  /** 点位总覆盖面积：台数 × 单台覆盖 */
  function pointCoverage(point: PointConfiguration): number {
    return point.units * (filterCoverage[point.filter] ?? 45);
  }

  function isPointOverCapacity(point: PointConfiguration): boolean {
    return point.area > pointCoverage(point);
  }

  /** 点位规格（随整单材质/续航/控制环与点位滤芯重算） */
  function pointSpecs(point: PointConfiguration): ProductSpec[] {
    return [
      { label: "建议面积", value: `${coverageCopy[point.filter] ?? "25-45㎡"}/台` },
      { label: "颗粒物 CADR", value: point.filter === "hepa" ? "620m³/h" : "480m³/h" },
      { label: "运行噪声", value: order.value.material === "metal" ? "20-48 dB" : "22-51 dB" },
      { label: "续航", value: batteryCopy[order.value.battery] ?? "5 小时" },
      { label: "机身重量", value: order.value.material === "metal" ? "8.6kg" : "6.9kg" },
      { label: "控制方式", value: order.value.trim === "subtle" ? "触控 + App" : "旋钮 + App" },
    ];
  }

  const activeSpecs = computed(() => pointSpecs(activePoint.value));

  const totalPrice = computed(() => order.value.points.reduce((sum, point) => sum + pointPrice(point), 0));

  function selectOrderOption(groupId: "color" | "material" | "battery" | "trim", optionId: string) {
    if (isOptionDisabled(groupId, optionId)) {
      shareNotice.value = dependencyMessage.value || "当前组合不支持该选项。";
      return;
    }
    order.value[groupId] = optionId;
    if (groupId === "material") {
      if (optionId !== "metal") {
        if (order.value.battery === "extended") order.value.battery = "standard";
        for (const point of order.value.points) {
          if (point.stand === "floor") point.stand = "desktop";
        }
      }
      if (optionId === "wood") {
        for (const point of order.value.points) {
          if (point.filter === "hepa") point.filter = "standard";
        }
      }
    }
    shareNotice.value = "";
  }

  function selectPointOption(pointId: string, groupId: "filter" | "stand", optionId: string) {
    if (isOptionDisabled(groupId, optionId)) {
      shareNotice.value = dependencyMessage.value || "当前组合不支持该选项。";
      return;
    }
    const point = order.value.points.find((item) => item.id === pointId);
    if (!point) return;
    point[groupId] = optionId;
    shareNotice.value = "";
  }

  function updatePoint(pointId: string, patch: Partial<Pick<PointConfiguration, "name" | "area" | "units">>) {
    const point = order.value.points.find((item) => item.id === pointId);
    if (!point) return;
    if (patch.name !== undefined) point.name = patch.name;
    if (patch.area !== undefined) point.area = Math.max(1, Math.round(Number(patch.area) || 1));
    if (patch.units !== undefined) point.units = Math.max(1, Math.round(Number(patch.units) || 1));
  }

  /** 新增点位：整单风量容量不足时拒绝，并列出超限点位 */
  function addPoint(): boolean {
    if (isAtCapacity.value) {
      const names = overCapacityPoints.value.map((point) => point.name).join("、");
      shareNotice.value = `整单风量容量不足，无法新增点位：${names} 超出覆盖能力，请先调整面积或台数。`;
      return false;
    }
    const point = defaultPoint(order.value.points.length);
    order.value.points.push(point);
    activePointId.value = point.id;
    shareNotice.value = "";
    return true;
  }

  function removePoint(pointId: string) {
    if (order.value.points.length <= 1) return;
    const index = order.value.points.findIndex((point) => point.id === pointId);
    if (index < 0) return;
    order.value.points.splice(index, 1);
    if (activePointId.value === pointId) {
      activePointId.value = order.value.points[Math.max(0, index - 1)].id;
    }
  }

  function activatePoint(pointId: string) {
    if (order.value.points.some((point) => point.id === pointId)) {
      activePointId.value = pointId;
    }
  }

  function applyOrderConfiguration(input: Partial<OrderConfiguration>) {
    order.value = sanitizeOrder(input);
    activePointId.value = order.value.points[0].id;
    shareNotice.value = "";
  }

  function reset() {
    order.value = createDefaultOrder();
    activePointId.value = order.value.points[0].id;
    cameraPreset.value = "hero";
    shareNotice.value = "";
  }

  return {
    order,
    activePointId,
    activePoint,
    cameraPreset,
    modelRotation,
    shareNotice,
    orderOptions,
    overCapacityPoints,
    isAtCapacity,
    activeSpecs,
    totalPrice,
    dependencyMessage,
    isOptionDisabled,
    unitPriceOf,
    pointPrice,
    pointCoverage,
    isPointOverCapacity,
    pointSpecs,
    selectOrderOption,
    selectPointOption,
    updatePoint,
    addPoint,
    removePoint,
    activatePoint,
    applyOrderConfiguration,
    reset,
  };
});
