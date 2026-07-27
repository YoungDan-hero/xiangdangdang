import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type FeedingType } from "../db";
import { useSettings } from "../hooks/useSettings";
import { ageInMonths, dayRange, fromDateInput, hhmm, timeAgoShort } from "../utils/time";
import { FEED_META, FeedTypeSegment, Empty, Toast, useToast } from "../components/ui";
import { IconChevronRight } from "../components/icons";

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
    const m = ageInMonths(fromDateInput(birthday), Date.now());
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
          <div className="hero-avatar">
            👶
            <span className="bow">🎀</span>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="label">今日喂养</div>
            <div className="num">{stats.count}</div>
          </div>
          <div className="hero-stat">
            <div className="label">奶量 (ml)</div>
            <div className="num">{stats.totalMl || "—"}</div>
          </div>
          <div className="hero-stat">
            <div className="label">距上次喂养</div>
            <div className="num" style={{ fontSize: 19 }}>
              {stats.last ? timeAgoShort(stats.last.time) : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: 14 }}>
          <div className="card-title">快捷记录</div>
          <div className="card-sub">又到开饭时间啦，记一下吧</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <FeedTypeSegment value={type} onChange={setType} />
        </div>
        <div className={`input-wrap ${lastAmount == null ? "icon-only" : ""}`} style={{ marginBottom: 12 }}>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="奶量 ml（母乳可留空）"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {lastAmount != null && (
            <button className="inset-btn" onClick={() => setAmount(String(lastAmount))}>
              上次 {lastAmount}ml
            </button>
          )}
        </div>
        <button className="btn block" onClick={quickSave}>
          记一笔
        </button>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 6 }}>
          <span className="card-title">今日记录</span>
          <NavLink to="/feeding" className="link">
            查看全部 <IconChevronRight />
          </NavLink>
        </div>
        {todays && todays.length === 0 && (
          <Empty emoji="🌤️" text="今天还没有记录，喂养后点上面记一笔吧" />
        )}
        {(todays ?? []).map((f) => (
          <div key={f.id} className="list-item">
            <div className="badge">{FEED_META[f.type].emoji}</div>
            <div className="grow">
              <div className="item-name">{FEED_META[f.type].label}</div>
              <div className="item-sub">{hhmm(f.time)}</div>
            </div>
            {f.amountMl ? (
              <div className="item-val">
                {f.amountMl}
                <small>ml</small>
              </div>
            ) : f.durationMin ? (
              <div className="item-val blue">
                {f.durationMin}
                <small>min</small>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <Toast text={toast} />
    </div>
  );
}
