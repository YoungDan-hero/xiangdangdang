import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type FeedingRecord, type FeedingType } from "../db";
import { fromLocalInput, hhmm, monthDay, toLocalInput } from "../utils/time";
import { FEED_META, FeedTypeSegment, Empty, Toast, useToast } from "../components/ui";
import {
  IconClock,
  IconDrop,
  IconNote,
  IconPlus,
  IconTimer,
  IconTrash,
} from "../components/icons";

interface Draft {
  id?: number;
  time: number;
  type: FeedingType;
  amount: string;
  duration: string;
  note: string;
}

const emptyDraft = (): Draft => ({
  time: Date.now(),
  type: "formula",
  amount: "",
  duration: "",
  note: "",
});

export default function Feeding(): JSX.Element {
  const [toast, showToast] = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);

  const all = useLiveQuery(() => db.feedings.orderBy("time").reverse().toArray(), []);

  const groups = useMemo(() => {
    const map = new Map<string, FeedingRecord[]>();
    for (const f of all ?? []) {
      const key = monthDay(f.time);
      (map.get(key) ?? map.set(key, []).get(key)!).push(f);
    }
    return [...map.entries()];
  }, [all]);

  async function save(): Promise<void> {
    if (!draft) return;
    const amountMl = draft.amount ? Number(draft.amount) : undefined;
    const durationMin = draft.duration ? Number(draft.duration) : undefined;
    if (amountMl != null && (!Number.isFinite(amountMl) || amountMl <= 0)) {
      showToast("奶量无效");
      return;
    }
    const payload = {
      time: draft.time,
      type: draft.type,
      amountMl,
      durationMin,
      note: draft.note || undefined,
    };
    if (draft.id != null) await db.feedings.update(draft.id, payload);
    else await db.feedings.add(payload);
    setDraft(null);
    showToast("已保存 ✓");
  }

  async function remove(id: number): Promise<void> {
    await db.feedings.delete(id);
    setDraft(null);
    showToast("已删除");
  }

  return (
    <div className="page">
      <div className="page-title">
        <h1>喂养记录</h1>
        <p>点击卡片可编辑</p>
      </div>

      <button className="fab" aria-label="新增记录" onClick={() => setDraft(emptyDraft())}>
        <IconPlus />
      </button>

      {all && all.length === 0 && <Empty emoji="🍼" text="还没有喂养记录" />}

      {groups.map(([day, list]) => (
        <div className="card" key={day}>
          <div className="day-head">
            <span className="date">{day}</span>
            <span className="stat">
              {list.length} 次
              {list.some((f) => f.amountMl) &&
                `，${list.reduce((s, f) => s + (f.amountMl ?? 0), 0)}ml`}
            </span>
          </div>
          {list.map((f) => (
            <div
              key={f.id}
              className="list-item"
              onClick={() =>
                setDraft({
                  id: f.id,
                  time: f.time,
                  type: f.type,
                  amount: f.amountMl != null ? String(f.amountMl) : "",
                  duration: f.durationMin != null ? String(f.durationMin) : "",
                  note: f.note ?? "",
                })
              }
            >
              <div className="badge">{FEED_META[f.type].emoji}</div>
              <div className="grow">
                <div className="item-name">{FEED_META[f.type].label}</div>
                <div className="item-sub">
                  {hhmm(f.time)}
                  {f.note ? ` · ${f.note}` : ""}
                </div>
              </div>
              {f.amountMl ? (
                <div className="item-val">
                  {f.amountMl}
                  <small>ml</small>
                </div>
              ) : f.durationMin ? (
                <div className="item-val">
                  {f.durationMin}
                  <small>分钟</small>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ))}

      {draft && (
        <FeedingEditor
          draft={draft}
          onChange={setDraft}
          onSave={save}
          onClose={() => setDraft(null)}
          onDelete={draft.id != null ? () => remove(draft.id!) : undefined}
        />
      )}

      <Toast text={toast} />
    </div>
  );
}

interface EditorProps {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: () => void;
  onClose: () => void;
  onDelete?: () => void;
}

function FeedingEditor({
  draft,
  onChange,
  onSave,
  onClose,
  onDelete,
}: EditorProps): JSX.Element {
  const [timing, setTiming] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timing) {
      timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (timer.current) {
      window.clearInterval(timer.current);
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [timing]);

  function stopTimer(): void {
    setTiming(false);
    const mins = Math.max(1, Math.round(seconds / 60));
    onChange({ ...draft, duration: String(mins) });
    setSeconds(0);
  }

  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 className="sheet-title">{draft.id != null ? "编辑记录" : "新增记录"}</h2>

        <div style={{ marginBottom: 16 }}>
          <FeedTypeSegment
            value={draft.type}
            onChange={(t) => onChange({ ...draft, type: t })}
          />
        </div>

        <div className="ifield">
          <span className="ficon">
            <IconClock />
          </span>
          <input
            type="datetime-local"
            value={toLocalInput(draft.time)}
            onChange={(e) => onChange({ ...draft, time: fromLocalInput(e.target.value) })}
          />
        </div>

        {draft.type === "breast" ? (
          <div className="row" style={{ gap: 8, marginBottom: 14 }}>
            <div className="ifield grow" style={{ marginBottom: 0 }}>
              <span className="ficon">
                <IconClock />
              </span>
              <input
                type="number"
                inputMode="numeric"
                step="any"
                placeholder="亲喂时长"
                value={draft.duration}
                onChange={(e) => onChange({ ...draft, duration: e.target.value })}
              />
              <span className="funit">分钟</span>
            </div>
            {!timing ? (
              <button className="icon-btn" aria-label="开始计时" onClick={() => setTiming(true)}>
                <IconTimer />
              </button>
            ) : (
              <button
                className="icon-btn"
                style={{ background: "var(--grad-cta)", color: "#fff", width: "auto", padding: "0 14px" }}
                onClick={stopTimer}
              >
                ⏹ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
              </button>
            )}
          </div>
        ) : (
          <div className="ifield">
            <span className="ficon">
              <IconDrop />
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="喂养量"
              value={draft.amount}
              onChange={(e) => onChange({ ...draft, amount: e.target.value })}
            />
            <span className="funit">ml</span>
          </div>
        )}

        <div className="ifield top">
          <span className="ficon">
            <IconNote />
          </span>
          <textarea
            value={draft.note}
            placeholder="添加备注（如：吐奶、胃口好…）"
            onChange={(e) => onChange({ ...draft, note: e.target.value })}
          />
        </div>

        <div className="row" style={{ gap: 12, marginTop: 8 }}>
          {onDelete && (
            <button className="btn danger-square" aria-label="删除" onClick={onDelete}>
              <IconTrash />
            </button>
          )}
          <button className="btn grow" style={{ height: 56 }} onClick={onSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
