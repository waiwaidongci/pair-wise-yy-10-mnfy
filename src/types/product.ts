export interface ProductOption {
  id: string;
  name: string;
  description: string;
  price: number;
  swatch?: string;
  value?: string | number | boolean;
}

export type GroupId = "color" | "material" | "filter" | "battery" | "stand" | "trim";

export interface ProductGroup {
  id: GroupId;
  name: string;
  summary: string;
  options: ProductOption[];
}

export type CameraPreset = "hero" | "front" | "top" | "detail";

/** 单台主机的选择；颜色/材质/电池/控制环由整单统一，滤芯/支架按点位各选。 */
export interface Configuration {
  color: string;
  material: string;
  filter: string;
  battery: string;
  stand: string;
  trim: string;
}

/** 整单统一的全局选项。 */
export type GlobalGroupId = "color" | "material" | "battery" | "trim";

/** 按点位各自选择的选项。 */
export type PointGroupId = "filter" | "stand";

/** 整单中的一个房间点位。 */
export interface OrderPoint {
  id: string;
  name: string;
  area: number;
  quantity: number;
  filter: string;
  stand: string;
}

/** 整张整层订单：全局统一选项 + 多个房间点位。 */
export interface OrderPlan {
  color: string;
  material: string;
  battery: string;
  trim: string;
  points: OrderPoint[];
}

/** 归一化或迁移过程中产生的自动修正，用于在界面上向用户说明。 */
export interface PlanCorrection {
  pointName?: string;
  message: string;
}

export interface DecodedPlan {
  plan: OrderPlan;
  corrections: PlanCorrection[];
  migrated: boolean;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface PointComputed {
  point: OrderPoint;
  /** 单台主机的完整配置（全局 + 点位合并）。 */
  configuration: Configuration;
  requiredQuantity: number;
  hasCapacity: boolean;
  shortfall: number;
  unitPrice: number;
  pointPrice: number;
  coverageLabel: string;
  maxCoverage: number;
  cadr: number;
  specs: ProductSpec[];
}
