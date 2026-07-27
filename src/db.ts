import Dexie, { type EntityTable } from "dexie";

export type FeedingType = "breast" | "formula" | "mixed" | "solid";

export interface FeedingRecord {
  id: number;
  /** 记录发生的时间戳（ms） */
  time: number;
  type: FeedingType;
  /** 奶量 ml（母乳亲喂可为空，用时长表示） */
  amountMl?: number;
  /** 母乳亲喂时长（分钟），左右合计 */
  durationMin?: number;
  note?: string;
}

export interface GrowthRecord {
  id: number;
  /** 测量时间戳（ms） */
  time: number;
  /** 身长 cm */
  heightCm?: number;
  /** 体重 kg */
  weightKg?: number;
  note?: string;
}

export interface SettingRecord {
  key: string;
  value: string;
}

const db = new Dexie("XiangDangDangDB") as Dexie & {
  feedings: EntityTable<FeedingRecord, "id">;
  growth: EntityTable<GrowthRecord, "id">;
  settings: EntityTable<SettingRecord, "key">;
};

db.version(1).stores({
  feedings: "++id, time, type",
  growth: "++id, time",
  settings: "key",
});

export { db };

/** 设置项读写（AI Key、宝宝生日、昵称等） */
export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db.settings.get(key);
  return row?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

export const SETTING_KEYS = {
  babyName: "babyName",
  birthday: "birthday",
  deepseekKey: "deepseekApiKey",
} as const;
