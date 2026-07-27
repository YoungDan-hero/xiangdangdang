import {
  WHO_GIRLS,
  type GrowthMetricKey,
  type GrowthPercentilePoint,
} from "../data/whoGrowth";

/** 在百分位曲线上按月龄线性插值 */
function interp(points: GrowthPercentilePoint[], month: number): GrowthPercentilePoint {
  const clamped = Math.max(0, Math.min(24, month));
  const lo = Math.floor(clamped);
  const hi = Math.ceil(clamped);
  if (lo === hi) return points[lo];
  const t = clamped - lo;
  const a = points[lo];
  const b = points[hi];
  const mix = (x: number, y: number): number => Number((x + (y - x) * t).toFixed(2));
  return {
    month: clamped,
    p3: mix(a.p3, b.p3),
    p15: mix(a.p15, b.p15),
    p50: mix(a.p50, b.p50),
    p85: mix(a.p85, b.p85),
    p97: mix(a.p97, b.p97),
  };
}

/** 按任意月龄取 WHO 百分位（线性插值），供图表加密采样 */
export function whoAt(metric: GrowthMetricKey, month: number): GrowthPercentilePoint {
  return interp(WHO_GIRLS[metric], month);
}

/**
 * 估算某测量值在同龄女童中的百分位区间描述。
 * 返回人类可读的评估文案，用于看板与 AI 上下文。
 *
 * 按 WHO 标准给出价值中立的评估：
 * P3~P97（约 ±2SD）为正常范围，超出上下限都属异常信号，
 * 「偏上」不代表更好——体重高于正常范围意味着超重风险。
 */
export function assessPercentile(
  metric: GrowthMetricKey,
  month: number,
  value: number
): string {
  const p = interp(WHO_GIRLS[metric], month);
  if (value < p.p3) return "低于正常范围";
  if (value < p.p15) return "正常偏下";
  if (value < p.p85) return "正常";
  if (value < p.p97) return "正常偏上";
  return "高于正常范围";
}

export type { GrowthMetricKey };
