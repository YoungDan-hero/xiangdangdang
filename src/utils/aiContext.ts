import { db } from "../db";
import { ageInMonths, fromDateInput, monthDay } from "./time";
import { assessPercentile } from "./growth";
import type { FeedingType } from "../db";

const FEED_LABEL: Record<FeedingType, string> = {
  breast: "母乳亲喂",
  formula: "配方奶",
  mixed: "混合喂养",
  solid: "辅食",
};

/**
 * 汇总响响近期数据，作为 DeepSeek 的 system 上下文。
 * 让 AI 基于真实记录回答，而非泛泛而谈。
 */
export async function buildBabyContext(
  babyName: string,
  birthday: string
): Promise<string> {
  const now = Date.now();
  const birthdayTs = birthday ? fromDateInput(birthday) : NaN;
  const parts: string[] = [];

  parts.push(`宝宝昵称：${babyName}（女宝）。`);
  if (Number.isFinite(birthdayTs)) {
    const m = ageInMonths(birthdayTs, now);
    parts.push(`出生日期：${birthday}，当前月龄约 ${m.toFixed(1)} 个月。`);
  } else {
    parts.push("（未设置出生日期，无法评估月龄与生长百分位）");
  }

  // 近 7 天喂养
  const weekAgo = now - 7 * 86400000;
  const feedings = await db.feedings.where("time").above(weekAgo).toArray();
  if (feedings.length) {
    const total = feedings.reduce((s, f) => s + (f.amountMl ?? 0), 0);
    const days = 7;
    const byDayMl = total / days;
    const avgCount = (feedings.length / days).toFixed(1);
    parts.push(
      `近 7 天喂养：共 ${feedings.length} 次，日均 ${avgCount} 次；有奶量记录的合计 ${total} ml，日均约 ${byDayMl.toFixed(
        0
      )} ml。`
    );
    const last = feedings.sort((a, b) => b.time - a.time)[0];
    parts.push(
      `最近一次：${monthDay(last.time)} ${FEED_LABEL[last.type]}${
        last.amountMl ? ` ${last.amountMl}ml` : ""
      }。`
    );
  } else {
    parts.push("近 7 天暂无喂养记录。");
  }

  // 最新生长
  const growth = await db.growth.orderBy("time").reverse().first();
  if (growth) {
    const seg: string[] = [];
    const m = Number.isFinite(birthdayTs) ? ageInMonths(birthdayTs, growth.time) : NaN;
    if (growth.weightKg != null) {
      const p = Number.isFinite(m)
        ? `（${assessPercentile("weight", m, growth.weightKg)}）`
        : "";
      seg.push(`体重 ${Math.round(growth.weightKg * 1000)}g${p}`);
    }
    if (growth.heightCm != null) {
      const p = Number.isFinite(m)
        ? `（${assessPercentile("length", m, growth.heightCm)}）`
        : "";
      seg.push(`身长 ${growth.heightCm}cm${p}`);
    }
    parts.push(`最新生长测量（${monthDay(growth.time)}）：${seg.join("，")}。`);
  } else {
    parts.push("暂无生长测量记录。");
  }

  return parts.join("\n");
}

export const SYSTEM_PROMPT = `你是「响当当」App 内的育儿助手，服务于一位新手爸爸/妈妈。
请遵循：
1. 依据下方提供的宝宝真实数据作答，数据不足时明确说明并给出一般性建议。
2. 语气亲切、专业、简洁，用中文回答，重点信息可用要点列出。
3. 你不是医生，涉及疾病、异常指标、用药时，务必提醒线下就医，不做诊断。
4. 回答控制在合理长度，避免长篇大论。`;
