import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type FeedingRecord, type FeedingType } from "../db";
import { fromLocalInput, hhmm, monthDay, toLocalInput } from "../utils/time";
import { FEED_META, FeedTypeSegment, Empty, Toast, useToast } from "../components/ui";

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
        喂养记录 <small>点击卡片可编辑</small>
      </div>

      <button
        className="fab"
        aria-label="新增记录"
        onClick={() => setDraft(emptyDraft())}
      >
        ＋
      </button>

      {all && all.length === 0 && <Empty emoji="🍼" text="还没有喂养记录" />}

      {groups.map(([day, list]) => (
        <div className="card" key={day}>
          <div className="muted small" style={{ marginBottom: 6 }}>
            {day}（{list.length} 次
            {list.some((f) => f.amountMl) &&
              `，${list.reduce((s, f) => s + (f.amountMl ?? 0), 0)}ml`}
            ）
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
                <div style={{ fontWeight: 600 }}>{FEED_META[f.type].label}</div>
                <div className="muted small">
                  {hhmm(f.time)}
                  {f.note ? ` · ${f.note}` : ""}
                </div>
              </div>
              <div style={{ fontWeight: 700, color: "var(--pink-deep)" }}>
                {f.amountMl ? `${f.amountMl}ml` : f.durationMin ? `${f.durationMin}分` : ""}
              </div>
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
        <div className="row between" style={{ marginBottom: 14 }}>
          <strong style={{ fontSize: 17 }}>{draft.id != null ? "编辑记录" : "新增记录"}</strong>
          <button className="btn ghost mini" onClick={onClose}>
            关闭
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <FeedTypeSegment
            value={draft.type}
            onChange={(t) => onChange({ ...draft, type: t })}
          />
        </div>

        <label className="field">
          <span>时间</span>
          <input
            type="datetime-local"
            value={toLocalInput(draft.time)}
            onChange={(e) => onChange({ ...draft, time: fromLocalInput(e.target.value) })}
          />
        </label>

        {draft.type === "breast" ? (
          <label className="field">
            <span>亲喂时长（分钟）</span>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="grow"
                type="number"
                inputMode="numeric"
                step="any"
                value={draft.duration}
                onChange={(e) => onChange({ ...draft, duration: e.target.value })}
              />
              {!timing ? (
                <button className="btn ghost" onClick={() => setTiming(true)}>
                  ▶ 计时
                </button>
              ) : (
                <button className="btn" onClick={stopTimer}>
                  ⏹ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
                </button>
              )}
            </div>
          </label>
        ) : (
          <label className="field">
            <span>奶量（ml）</span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={draft.amount}
              onChange={(e) => onChange({ ...draft, amount: e.target.value })}
            />
          </label>
        )}

        <label className="field">
          <span>备注（可选）</span>
          <input
            value={draft.note}
            placeholder="如：吐奶、胃口好…"
            onChange={(e) => onChange({ ...draft, note: e.target.value })}
          />
        </label>

        <div className="row" style={{ gap: 10, marginTop: 6 }}>
          {onDelete && (
            <button
              className="btn ghost"
              style={{ color: "var(--danger)" }}
              onClick={onDelete}
            >
              删除
            </button>
          )}
          <button className="btn grow" onClick={onSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
