import { useLiveQuery } from "dexie-react-hooks";
import { db, SETTING_KEYS } from "../db";

interface BabySettings {
  babyName: string;
  birthday: string; // yyyy-MM-dd
  deepseekKey: string;
  loaded: boolean;
}

/** 响应式读取设置项，任意页面写入后自动同步 */
export function useSettings(): BabySettings {
  const rows = useLiveQuery(() => db.settings.toArray(), []);
  const map = new Map((rows ?? []).map((r) => [r.key, r.value]));
  return {
    babyName: map.get(SETTING_KEYS.babyName) ?? "响响",
    birthday: map.get(SETTING_KEYS.birthday) ?? "",
    deepseekKey: map.get(SETTING_KEYS.deepseekKey) ?? "",
    loaded: rows !== undefined,
  };
}
