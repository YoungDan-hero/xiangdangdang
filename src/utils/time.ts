const pad = (n: number): string => n.toString().padStart(2, "0");

/** 转为 <input type="datetime-local"> 需要的本地字符串 */
export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** datetime-local 字符串转时间戳 */
export function fromLocalInput(value: string): number {
  return new Date(value).getTime();
}

/** 转为 <input type="date"> 需要的 yyyy-MM-dd */
export function toDateInput(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * yyyy-MM-dd 转当天本地零点时间戳。
 * 不直接 new Date("yyyy-MM-dd")：那会按 UTC 解析，负时区下会偏移一天。
 */
export function fromDateInput(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** 紧凑相对时间，用于窄卡片，如「4时18分」 */
export function timeAgoShort(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return min % 60 ? `${hour}时${min % 60}分` : `${hour}时`;
  return `${Math.floor(hour / 24)}天`;
}

/** HH:mm */
export function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** M月D日 */
export function monthDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 某天的 [起, 止) 时间戳 */
export function dayRange(ts: number): [number, number] {
  const d = new Date(ts);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return [start, start + 86400000];
}

/** 根据生日与测量时间，计算月龄（可为小数） */
export function ageInMonths(birthdayTs: number, atTs: number): number {
  const days = (atTs - birthdayTs) / 86400000;
  return days / 30.4375;
}
