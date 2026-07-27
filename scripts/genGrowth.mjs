import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const csv = readFileSync("/tmp/WHO2006.csv", "utf8");
const lines = csv.split(/\r?\n/);

// 列索引（girls）：见 CSV 第4行表头
// 0:Week/Month 1:Years  girls-Length L,M,S=5,6,7  girls-Weight=11,12,13  girls-HeadCirc=23,24,25
const COL = {
  length: [5, 6, 7],
  weight: [11, 12, 13],
  head: [23, 24, 25],
};

// 目标：0-24 月，每月一条
const MONTHS = Array.from({ length: 25 }, (_, i) => i);

// 百分位对应 z 值
const PCTS = [
  { key: "p3", z: -1.881 },
  { key: "p15", z: -1.036 },
  { key: "p50", z: 0 },
  { key: "p85", z: 1.036 },
  { key: "p97", z: 1.881 },
];

const lms = (L, M, S, z) =>
  L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);

const rows = [];
for (const line of lines) {
  const c = line.split(",");
  const years = parseFloat(c[1]);
  if (!Number.isFinite(years)) continue;
  rows.push({ years, c });
}

function build(indexTriple) {
  return MONTHS.map((m) => {
    const targetYears = m / 12;
    let best = null;
    let bestDiff = Infinity;
    for (const r of rows) {
      const diff = Math.abs(r.years - targetYears);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = r;
      }
    }
    const [li, mi, si] = indexTriple;
    const L = parseFloat(best.c[li]);
    const M = parseFloat(best.c[mi]);
    const S = parseFloat(best.c[si]);
    const point = { month: m };
    for (const { key, z } of PCTS) {
      point[key] = Number(lms(L, M, S, z).toFixed(2));
    }
    return point;
  });
}

const out = {
  length: build(COL.length),
  weight: build(COL.weight),
  head: build(COL.head),
};

const header = `// 本文件由 scripts/genGrowth.mjs 自动生成，请勿手动修改
// 数据来源：WHO Child Growth Standards 2006（女童 0-24 月，LMS 参数换算）
// 百分位：P3 / P15 / P50 / P85 / P97

export interface GrowthPercentilePoint {
  month: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export type GrowthMetricKey = "length" | "weight" | "head";

export const WHO_GIRLS: Record<GrowthMetricKey, GrowthPercentilePoint[]> = ${JSON.stringify(
  out,
  null,
  2
)};
`;

mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/whoGrowth.ts", header);
console.log("生成完成：", {
  length: out.length.length,
  weight: out.weight.length,
  head: out.head.length,
  sample_weight_12m: out.weight[12],
});
