import type { GrowthRecord } from "../db";
import { DeepSeekError, chatOnce } from "../deepseek";
import { assessPercentile } from "./growth";
import { ageInMonths, fromDateInput, monthDay } from "./time";

export interface GrowthAssessment {
  /** 0-100 */
  score: number;
  /** 如：优秀 / 良好 / 正常 / 需关注 */
  level: string;
  summary: string;
  tips: string;
  generatedAt: number;
  /** 生成时的数据指纹，数据变化后自动失效 */
  fingerprint: string;
}

export const ASSESSMENT_KEY = "growthAssessment";

/** 评分规则版本：规则调整后旧缓存自动失效 */
const RUBRIC_VERSION = "v3-who-newborn";

/** 数据指纹：生日、任一测量或评分规则变化都会触发重新评估 */
export function assessmentFingerprint(
  birthday: string,
  records: GrowthRecord[]
): string {
  const last = records[records.length - 1];
  return [
    RUBRIC_VERSION,
    birthday,
    records.length,
    last?.time ?? 0,
    last?.weightKg ?? "",
    last?.heightCm ?? "",
  ].join("|");
}

const SYSTEM = `你是资深儿保科医生助理，严格依据 WHO 女童生长标准评估宝宝发育情况。

WHO 评估原则（必须遵守）：
1. 「正常范围」指同龄参考区间内（约 ±2SD）。体重绝不是越重越好：高于正常范围提示超重风险，与低于正常范围同样需要关注、同样扣分。
2. 健康的生长 = 处于正常范围内 + 增长轨迹与参考曲线大致平行。短期内快速上穿或下穿多个区间（如从「正常」变为「正常偏上」再到「高于正常范围」），即使仍在范围内也是预警信号。
3. 若同时提供了体重和身长，应结合两者判断匀称度：身长和体重同步处于相近区间为匀称；体重区间显著高于身长区间提示体重相对超前。
4. 新生儿生理性体重下降（重要，不可误判）：出生后 3-5 天内体重下降不超过出生体重的 10% 属于正常生理现象，通常 7-14 天恢复至出生体重。评估月龄 0-0.5 个月内的体重下降或缓慢增长时，不应视为异常、不应扣分；只有下降超过 10%，或超过 2 周仍未恢复到出生体重，才需要提示关注并建议就医。

评分规则：
- 90-100（优秀）：各指标在正常范围内，趋势与参考曲线平行，匀称度良好
- 80-89（良好）：在正常范围内，趋势轻微波动
- 70-79（正常）：处于正常范围边缘（正常偏下/正常偏上），或趋势有轻度偏移，需继续观察
- 60-69（需关注）：接近或刚超出正常范围上下限，或趋势明显偏移
- 60 以下（需关注）：超出正常范围（无论偏高或偏低），或增长停滞/骤增

其他要求：
- 语言通俗温暖，不使用 P97/z-score 等术语
- 你不是医生，发现异常务必在 summary 或 tips 中建议线下就医确认
- 严格输出 JSON 对象，不要输出其他内容：
{"score": <0-100整数>, "level": "<优秀|良好|正常|需关注>", "summary": "<80字内的发育总结>", "tips": "<40字内的一条建议>"}`;

interface GenerateOptions {
  apiKey: string;
  babyName: string;
  birthday: string;
  records: GrowthRecord[];
}

export async function generateGrowthAssessment({
  apiKey,
  babyName,
  birthday,
  records,
}: GenerateOptions): Promise<GrowthAssessment> {
  // 按本地时区解析生日，避免与本地零点录入的记录相差 8 小时产生负月龄
  const birthdayTs = fromDateInput(birthday);
  const now = Date.now();

  const lines = records.slice(-20).map((r) => {
    const m = ageInMonths(birthdayTs, r.time);
    const seg: string[] = [`${monthDay(r.time)}（月龄 ${m.toFixed(1)}）`];
    if (r.weightKg != null) {
      seg.push(
        `体重 ${Math.round(r.weightKg * 1000)}g（同龄中${assessPercentile("weight", m, r.weightKg)}）`
      );
    }
    if (r.heightCm != null) {
      seg.push(
        `身长 ${r.heightCm}cm（同龄中${assessPercentile("length", m, r.heightCm)}）`
      );
    }
    return seg.join("，");
  });

  const user = [
    `宝宝：${babyName}（女），出生日期 ${birthday}，当前月龄 ${ageInMonths(birthdayTs, now).toFixed(1)}。`,
    `生长测量记录（近 ${lines.length} 条，按时间正序）：`,
    ...lines,
    "请评估她的发育情况并按要求输出 JSON。",
  ].join("\n");

  const content = await chatOnce({
    apiKey,
    json: true,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new DeepSeekError("AI 返回内容无法解析，请重试");
  }

  const score = Number(parsed.score);
  if (
    !Number.isFinite(score) ||
    typeof parsed.level !== "string" ||
    typeof parsed.summary !== "string"
  ) {
    throw new DeepSeekError("AI 返回内容不完整，请重试");
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    level: parsed.level,
    summary: parsed.summary,
    tips: typeof parsed.tips === "string" ? parsed.tips : "",
    generatedAt: now,
    fingerprint: assessmentFingerprint(birthday, records),
  };
}
