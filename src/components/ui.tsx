import { useCallback, useState } from "react";
import type { FeedingType } from "../db";

export const FEED_META: Record<
  FeedingType,
  { label: string; short: string; emoji: string }
> = {
  breast: { label: "母乳亲喂", short: "母乳", emoji: "🤱" },
  formula: { label: "配方奶", short: "配方奶", emoji: "🍼" },
  mixed: { label: "混合喂养", short: "混合", emoji: "🥛" },
  solid: { label: "辅食", short: "辅食", emoji: "🥣" },
};

const FEED_ORDER: FeedingType[] = ["formula", "breast", "mixed", "solid"];

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  emoji?: string;
}

interface SegmentProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** 迷你款：行内宽度，适合放在卡片标题行 */
  mini?: boolean;
  ariaLabel?: string;
}

/** 通用分段选择器（iOS segmented control 风格） */
export function Segment<T extends string>({
  options,
  value,
  onChange,
  mini = false,
  ariaLabel,
}: SegmentProps<T>): JSX.Element {
  return (
    <div className={`seg ${mini ? "mini" : ""}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={`seg-item ${value === o.value ? "active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.emoji && <span className="seg-emoji">{o.emoji}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface FeedSegmentProps {
  value: FeedingType;
  onChange: (t: FeedingType) => void;
}

export function FeedTypeSegment({ value, onChange }: FeedSegmentProps): JSX.Element {
  return (
    <Segment
      ariaLabel="喂养类型"
      value={value}
      onChange={onChange}
      options={FEED_ORDER.map((t) => ({
        value: t,
        label: FEED_META[t].short,
        emoji: FEED_META[t].emoji,
      }))}
    />
  );
}

export function useToast(): [string | null, (msg: string) => void] {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);
  return [toast, show];
}

export function Toast({ text }: { text: string | null }): JSX.Element | null {
  if (!text) return null;
  return <div className="toast">{text}</div>;
}

export function Empty({ emoji, text }: { emoji: string; text: string }): JSX.Element {
  return (
    <div className="empty">
      <span className="emoji">{emoji}</span>
      {text}
    </div>
  );
}
