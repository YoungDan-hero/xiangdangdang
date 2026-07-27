import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type FeedingType } from "../db";
import { useSettings } from "../hooks/useSettings";
import { ageInMonths, dayRange, hhmm, timeAgoShort } from "../utils/time";
import { FEED_META, FeedTypeSegment, Empty, Toast, useToast } from "../components/ui";

export default function Dashboard(): JSX.Element {
  const { babyName, birthday } = useSettings();
  const [toast, showToast] = useToast();
  const [type, setType] = useState<FeedingType>("formula");
  const [amount, setAmount] = useState("");

  const [start, end] = dayRange(Date.now());
  const todays = useLiveQuery(
    () => db.feedings.where("time").between(start, end).reverse().sortBy("time"),
    [start, end]
  );
  const lastAmount = useLiveQuery(async () => {
    const rows = await db.feedings.orderBy("time").reverse().limit(20).toArray();
    return rows.find((r) => r.amountMl != null)?.amountMl;
  }, []);

  const stats = useMemo(() => {
    const list = todays ?? [];
    const count = list.length;
    const totalMl = list.reduce((s, f) => s + (f.amountMl ?? 0), 0);
    const last = list[0];
    return { count, totalMl, last };
  }, [todays]);

  const ageText = useMemo(() => {
    if (!birthday) return "设置生日后显示月龄";
    const m = ageInMonths(new Date(birthday).getTime(), Date.now());
    const months = Math.floor(m);
    const days = Math.floor((m - months) * 30.4375);
    return `${months} 个月 ${days} 天`;
  }, [birthday]);

  async function quickSave(): Promise<void> {
    const ml = amount ? Number(amount) : undefined;
    if (amount && (!Number.isFinite(ml) || ml! <= 0)) {
      showToast("请输入有效奶量");
      return;
    }
    await db.feedings.add({ time: Date.now(), type, amountMl: ml });
    setAmount("");
    showToast("已记录 ✓");
  }

  return (
    <div className="page">
      <div className="hero">
        <div className="hero-top">
          <div>
            <div className="hero-name">你好，{babyName}</div>
            <div className="hero-age">{ageText}</div>
          </div>
          <div className="hero-avatar">🎀</div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="num">{stats.count}</div>
            <div className="label">今日喂养</div>
          </div>
          <div className="hero-stat">
            <div className="num">{stats.totalMl || "—"}</div>
            <div className="label">奶量 (ml)</div>
          </div>
          <div className="hero-stat">
            <div className="num" style={{ fontSize: 17, whiteSpace: "nowrap" }}>
              {stats.last ? timeAgoShort(stats.last.time) : "—"}
            </div>
            <div className="label">距上次喂养</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <span className="card-title">快捷记录</span>
          {lastAmount != null && (
            <button
              className="btn ghost mini"
              onClick={() => setAmount(String(lastAmount))}
            >
              上次 {lastAmount}ml
            </button>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <FeedTypeSegment value={type} onChange={setType} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="grow"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="奶量 ml（母乳可留空）"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button className="btn" onClick={quickSave}>
            记一笔
          </button>
        </div>
      </div>

      <div className="card">
        <span className="card-title">今日记录</span>
        <div style={{ marginTop: 8 }}>
          {todays && todays.length === 0 && (
            <Empty emoji="🌤️" text="今天还没有记录，喂养后点上面记一笔吧" />
          )}
          {(todays ?? []).map((f) => (
            <div key={f.id} className="list-item">
              <div className="badge">{FEED_META[f.type].emoji}</div>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{FEED_META[f.type].label}</div>
                <div className="muted small">{hhmm(f.time)}</div>
              </div>
              <div style={{ fontWeight: 700, color: "var(--pink-deep)" }}>
                {f.amountMl ? `${f.amountMl}ml` : f.durationMin ? `${f.durationMin}分钟` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Toast text={toast} />
    </div>
  );
}
