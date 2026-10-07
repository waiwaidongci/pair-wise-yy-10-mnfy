import type {
  Configuration,
  DecodedPlan,
  OrderPlan,
  OrderPoint,
  PlanCorrection,
} from "../types/product";
import { productGroups } from "../stores/catalog";
import { createPoint, filterCoverage, reconcileConfiguration, requiredQuantity } from "../stores/pricing";

function toBase64Url(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeURIComponent(escape(atob(padded)));
}

function validOption(groupId: string, optionId: unknown, fallback: string): string {
  const group = productGroups.find((item) => item.id === groupId);
  return group?.options.some((option) => option.id === optionId) ? (optionId as string) : fallback;
}

const FALLBACK = {
  color: "graphite",
  material: "matte",
  filter: "standard",
  battery: "standard",
  stand: "desktop",
  trim: "subtle",
};

interface EnvelopeV2 {
  v: 2;
  color: string;
  material: string;
  battery: string;
  trim: string;
  points: Array<{ id?: string; name?: string; area: number; quantity: number; filter: string; stand: string }>;
}

interface EnvelopeV1 extends Partial<Configuration> {
  v?: number;
}

/* --------------------------------- 编码 v2 --------------------------------- */

export function encodePlan(plan: OrderPlan): string {
  const envelope: EnvelopeV2 = {
    v: 2,
    color: plan.color,
    material: plan.material,
    battery: plan.battery,
    trim: plan.trim,
    points: plan.points.map((point) => ({
      id: point.id,
      name: point.name,
      area: point.area,
      quantity: point.quantity,
      filter: point.filter,
      stand: point.stand,
    })),
  };
  return toBase64Url(JSON.stringify(envelope));
}

/* --------------------------------- 解码 --------------------------------- */

/**
 * 解码分享链接：
 * - v2：还原整单多点位方案，顺带做依赖归一化与修正；
 * - v1：旧的单点位配置自动升级（迁移）为单点位整单方案。
 */
export function decodePlan(payload: string): DecodedPlan | null {
  let parsed: EnvelopeV1 | EnvelopeV2;
  try {
    parsed = JSON.parse(fromBase64Url(payload));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  if ((parsed as EnvelopeV2).v === 2 && Array.isArray((parsed as EnvelopeV2).points)) {
    return decodeV2(parsed as EnvelopeV2);
  }
  return decodeV1(parsed as EnvelopeV1);
}

function decodeV2(envelope: EnvelopeV2): DecodedPlan | null {
  const plan: OrderPlan = {
    color: validOption("color", envelope.color, FALLBACK.color),
    material: validOption("material", envelope.material, FALLBACK.material),
    battery: validOption("battery", envelope.battery, FALLBACK.battery),
    trim: validOption("trim", envelope.trim, FALLBACK.trim),
    points: [],
  };
  const corrections: PlanCorrection[] = [];

  for (const raw of envelope.points) {
    if (!raw || typeof raw !== "object") continue;
    const area = Number.isFinite(raw.area) ? Math.max(0, Math.round(raw.area)) : 30;
    const quantity = Number.isFinite(raw.quantity)
      ? Math.max(1, Math.round(raw.quantity))
      : requiredQuantity(validOption("filter", raw.filter, FALLBACK.filter), area);
    const seed: OrderPoint = createPoint({
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name : undefined,
      area,
      quantity,
      filter: validOption("filter", raw.filter, FALLBACK.filter),
      stand: validOption("stand", raw.stand, FALLBACK.stand),
    });
    if (typeof raw.id === "string" && raw.id.startsWith("pt_")) seed.id = raw.id;

    // 依据整单材质对该点位做依赖归一化，记录打开链接后看到的修正。
    const candidate = {
      color: plan.color,
      material: plan.material,
      battery: plan.battery,
      trim: plan.trim,
      filter: seed.filter,
      stand: seed.stand,
    };
    const found = reconcileConfiguration(candidate, seed.name);
    seed.filter = candidate.filter;
    seed.stand = candidate.stand;
    if (candidate.battery !== plan.battery) plan.battery = candidate.battery;
    corrections.push(...found);

    plan.points.push(seed);
  }

  if (plan.points.length === 0) return null;
  return { plan, corrections, migrated: false };
}

function decodeV1(envelope: EnvelopeV1): DecodedPlan | null {
  // 旧链接缺字段即视为无效；其余按旧版全集校验。
  const keys: Array<keyof Configuration> = ["color", "material", "filter", "battery", "stand", "trim"];
  if (!keys.every((key) => typeof envelope[key] === "string")) return null;

  const configuration: Configuration = {
    color: validOption("color", envelope.color, FALLBACK.color),
    material: validOption("material", envelope.material, FALLBACK.material),
    filter: validOption("filter", envelope.filter, FALLBACK.filter),
    battery: validOption("battery", envelope.battery, FALLBACK.battery),
    stand: validOption("stand", envelope.stand, FALLBACK.stand),
    trim: validOption("trim", envelope.trim, FALLBACK.trim),
  };

  const corrections = reconcileConfiguration(configuration);

  // 旧链接不含面积：按（修正后的）滤芯单机覆盖上限补一个面积，保证单台满足容量。
  const area = filterCoverage[configuration.filter]?.max ?? 45;
  const point = createPoint({
    name: "办公区",
    area,
    quantity: 1,
    filter: configuration.filter,
    stand: configuration.stand,
  });

  corrections.unshift({
    message: "检测到旧版单点位分享链接，已自动升级为整层整单方案（单点位）。",
  });

  return {
    plan: {
      color: configuration.color,
      material: configuration.material,
      battery: configuration.battery,
      trim: configuration.trim,
      points: [point],
    },
    corrections,
    migrated: true,
  };
}

export function createShareUrl(plan: OrderPlan): string {
  return `${window.location.origin}${window.location.pathname}#/share/${encodePlan(plan)}`;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(price);
}
