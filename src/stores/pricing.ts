import type {
  Configuration,
  GlobalGroupId,
  OrderPlan,
  OrderPoint,
  PlanCorrection,
  PointComputed,
  PointGroupId,
  ProductOption,
  ProductSpec,
} from "../types/product";
import { productGroups } from "./catalog";

export const BASE_UNIT_PRICE = 3299;

/** 各滤芯单机覆盖的面积区间（㎡）。 */
export const filterCoverage: Record<string, { min: number; max: number; cadr: number }> = {
  standard: { min: 25, max: 45, cadr: 480 },
  hepa: { min: 35, max: 65, cadr: 620 },
  formaldehyde: { min: 30, max: 55, cadr: 480 },
};

export const globalGroupIds: GlobalGroupId[] = ["color", "material", "battery", "trim"];
export const pointGroupIds: PointGroupId[] = ["filter", "stand"];

export function optionOf(groupId: string, optionId: string): ProductOption {
  const group = productGroups.find((item) => item.id === groupId);
  return group?.options.find((option) => option.id === optionId) ?? group!.options[0];
}

/** 合并全局选项与点位选项，得到该点位单台主机的完整配置。 */
export function pointConfiguration(plan: OrderPlan, point: OrderPoint): Configuration {
  return {
    color: plan.color,
    material: plan.material,
    battery: plan.battery,
    trim: plan.trim,
    filter: point.filter,
    stand: point.stand,
  };
}

/** 单台主机价格（基础价 + 全局与点位选配之和）。 */
export function unitPriceOf(configuration: Configuration): number {
  let total = BASE_UNIT_PRICE;
  for (const group of productGroups) {
    total += optionOf(group.id, configuration[group.id]).price;
  }
  return total;
}

/** 某点位在给定面积下，按其滤芯单机覆盖上限所需的台数（向上取整）。 */
export function requiredQuantity(filterId: string, area: number): number {
  const { max } = filterCoverage[filterId] ?? filterCoverage.standard;
  return Math.max(1, Math.ceil(area / max));
}

/**
 * 依据依赖关系就地修正一份配置，并返回产生的修正说明。
 * - 长续航双电池 / 立式支架仅金属机身可选
 * - 医疗级滤芯不支持天然胡桃木饰面
 */
export function reconcileConfiguration(
  configuration: Configuration,
  pointName?: string,
): PlanCorrection[] {
  const corrections: PlanCorrection[] = [];
  const push = (message: string) => corrections.push({ pointName, message });

  if (configuration.material !== "metal" && configuration.battery === "extended") {
    configuration.battery = "standard";
    push("长续航双电池仅金属机身可选，已改回标准电池。");
  }
  if (configuration.material !== "metal" && configuration.stand === "floor") {
    configuration.stand = "desktop";
    push("立式铝合金支架仅金属机身可选，已改为桌面橡胶底座。");
  }
  if (configuration.material === "wood" && configuration.filter === "hepa") {
    configuration.filter = "standard";
    push("天然胡桃木饰面不支持医疗级滤芯，已改为标准复合滤芯。");
  }
  return corrections;
}

/** 规格/重量/噪声等派生值。 */
function specsOf(configuration: Configuration, required: number, totalCadr: number): ProductSpec[] {
  const batteryCopy: Record<string, string> = {
    none: "电源供电",
    standard: "5 小时",
    extended: "11 小时",
  };
  const coverage = filterCoverage[configuration.filter] ?? filterCoverage.standard;
  return [
    { label: "建议面积", value: `${coverage.min * required}-${coverage.max * required}㎡` },
    { label: "颗粒物 CADR", value: `${totalCadr}m³/h` },
    { label: "运行噪声", value: configuration.material === "metal" ? "20-48 dB" : "22-51 dB" },
    { label: "续航", value: batteryCopy[configuration.battery] ?? "5 小时" },
    { label: "单机重量", value: configuration.material === "metal" ? "8.6kg" : "6.9kg" },
    {
      label: "控制方式",
      value: configuration.trim === "subtle" ? "触控 + App" : "旋钮 + App",
    },
  ];
}

/** 计算单个点位的容量、报价与规格。 */
export function computePoint(plan: OrderPlan, point: OrderPoint): PointComputed {
  const configuration = pointConfiguration(plan, point);
  const maxCoverage = (filterCoverage[configuration.filter] ?? filterCoverage.standard).max;
  const cadr = (filterCoverage[configuration.filter] ?? filterCoverage.standard).cadr;
  const requiredQuantityValue = requiredQuantity(configuration.filter, point.area);
  const hasCapacity = point.quantity >= requiredQuantityValue;
  const unitPrice = unitPriceOf(configuration);

  return {
    point,
    configuration,
    requiredQuantity: requiredQuantityValue,
    hasCapacity,
    shortfall: Math.max(0, requiredQuantityValue - point.quantity),
    unitPrice,
    pointPrice: unitPrice * point.quantity,
    coverageLabel: `${filterCoverage[configuration.filter].min}-${maxCoverage}㎡`,
    maxCoverage,
    cadr: cadr * point.quantity,
    specs: specsOf(configuration, requiredQuantityValue, cadr * point.quantity),
  };
}

let pointSeq = 0;
export function createPoint(partial: Partial<OrderPoint> = {}): OrderPoint {
  pointSeq += 1;
  return {
    id: `pt_${Date.now().toString(36)}_${pointSeq}`,
    name: partial.name?.trim() || `点位 ${pointSeq}`,
    area: partial.area ?? 30,
    quantity: partial.quantity ?? 1,
    filter: partial.filter ?? "standard",
    stand: partial.stand ?? "desktop",
  };
}
