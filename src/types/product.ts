export interface ProductOption {
  id: string;
  name: string;
  description: string;
  price: number;
  swatch?: string;
  value?: string | number | boolean;
  /** 单台最大覆盖面积（㎡），用于滤芯风量容量校验 */
  coverageMax?: number;
}

export interface ProductGroup {
  id: "color" | "material" | "filter" | "battery" | "stand" | "trim";
  name: string;
  summary: string;
  options: ProductOption[];
}

export type CameraPreset = "hero" | "front" | "top" | "detail";

/** 单个房间点位：面积、台数、滤芯、支架按点位各选 */
export interface PointConfiguration {
  id: string;
  name: string;
  area: number;
  units: number;
  filter: string;
  stand: string;
}

/** 整单方案：颜色与材质整单统一，点位各自独立 */
export interface OrderConfiguration {
  color: string;
  material: string;
  battery: string;
  trim: string;
  points: PointConfiguration[];
}

/** v1 旧版单点位配置，用于分享链接自动升级 */
export interface LegacyConfiguration {
  color: string;
  material: string;
  filter: string;
  battery: string;
  stand: string;
  trim: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}
