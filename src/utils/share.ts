import type { LegacyConfiguration, OrderConfiguration, PointConfiguration } from "../types/product";

function toBase64Url(value: string): string {
  return btoa(unescape(encodeURIComponent(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeURIComponent(escape(atob(padded)));
}

/** 新方案整体编码进链接（v2 整单） */
export function encodeOrder(order: OrderConfiguration): string {
  return toBase64Url(JSON.stringify({ v: 2, ...order }));
}

function isLegacyConfiguration(value: unknown): value is LegacyConfiguration {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["color", "material", "filter", "battery", "stand", "trim"].every((key) => typeof record[key] === "string");
}

/** 旧版单点位链接自动补成单点位方案 */
function upgradeLegacy(legacy: LegacyConfiguration): OrderConfiguration {
  const point: PointConfiguration = {
    id: "p-legacy-0",
    name: "点位 1",
    area: 30,
    units: 1,
    filter: legacy.filter,
    stand: legacy.stand,
  };
  return {
    color: legacy.color,
    material: legacy.material,
    battery: legacy.battery,
    trim: legacy.trim,
    points: [point],
  };
}

/**
 * 解码分享链接。
 * - v2 整单：返回完整 OrderConfiguration
 * - v1 旧版单点位：自动升级为单点位 OrderConfiguration
 * - 损坏：返回 {}
 */
export function decodeOrder(payload: string): Partial<OrderConfiguration> {
  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as Record<string, unknown>;
    if (parsed.v === 2 && Array.isArray(parsed.points)) {
      return {
        color: parsed.color as string | undefined,
        material: parsed.material as string | undefined,
        battery: parsed.battery as string | undefined,
        trim: parsed.trim as string | undefined,
        points: parsed.points as PointConfiguration[],
      };
    }
    if (isLegacyConfiguration(parsed)) {
      return upgradeLegacy(parsed);
    }
    return {};
  } catch {
    return {};
  }
}

export function createShareUrl(order: OrderConfiguration): string {
  return `${window.location.origin}${window.location.pathname}#/share/${encodeOrder(order)}`;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(price);
}
