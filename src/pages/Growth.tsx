import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, setSetting, type GrowthRecord } from "../db";
import { useSettings } from "../hooks/useSettings";
import { ageInMonths, fromDateInput, monthDay, toDateInput } from "../utils/time";
import { assessPercentile, whoAt, type GrowthMetricKey } from "../utils/growth";
import {
  ASSESSMENT_KEY,
  assessmentFingerprint,
  generateGrowthAssessment,
  type GrowthAssessment,
} from "../utils/assessment";
import { Empty, Segment, Toast, useToast } from "../components/ui";
import {
  IconCalendar,
  IconPlus,
  IconRuler,
  IconScale,
  IconSpark,
  IconTrash,
} from "../components/icons";

interface MetricMeta {
  key: GrowthMetricKey;
  label: string;
  unit: string;
  field: keyof GrowthRecord;
  /** 存储值 → 展示值 的倍率（体重内部存 kg，展示用 g） */
  scale: number;
}

const METRICS: MetricMeta[] = [
  { key: "weight", label: "体重", unit: "g", field: "weightKg", scale: 1000 },
  { key: "length", label: "身长", unit: "cm", field: "heightCm", scale: 1 },
];

/** 展示值统一收敛浮点误差 */
const toDisplay = (stored: number, scale: number): number =>
  Number((stored * scale).toFixed(scale === 1 ? 1 : 0));

/** WHO 区间文案 → 状态胶囊色调 */
const pillTone = (text: string): "ok" | "warn" | "bad" =>
  text === "正常" ? "ok" : text.includes("范围") ? "bad" : "warn";

const BANDS: {
  key: "p3" | "p15" | "p50" | "p85" | "p97";
  name: string;
  color: string;
  labelColor: string;
}[] = [
  { key: "p97", name: "P97", color: "#f2b8c6", labelColor: "#e0849e" },
  { key: "p85", name: "P85", color: "#f7cdd8", labelColor: "#e0849e" },
  { key: "p50", name: "P50", color: "#9aa7b4", labelColor: "#76858f" },
  { key: "p15", name: "P15", color: "#f7cdd8", labelColor: "#e0849e" },
  { key: "p3", name: "P3", color: "#f2b8c6", labelColor: "#e0849e" },
];

interface Draft {
  id?: number;
  time: number;
  height: string;
  weight: string;
}

const emptyDraft = (): Draft => ({ time: Date.now(), height: "", weight: "" });

type ChartMode = "trend" | "who";

export default function Growth(): JSX.Element {
  const { babyName, birthday, deepseekKey } = useSettings();
  const [toast, showToast] = useToast();
  const [metric, setMetric] = useState<GrowthMetricKey>("weight");
  const [mode, setMode] = useState<ChartMode>("trend");
  const [draft, setDraft] = useState<Draft | null>(null);

  const records = useLiveQuery(() => db.growth.orderBy("time").toArray(), []);
  const meta = METRICS.find((m) => m.key === metric)!;
  const hasBirthday = Boolean(birthday);
  // 生日必须按本地时区解析：new Date("YYYY-MM-DD") 是 UTC 零点，
  // 与本地零点录入的测量记录相差 8 小时，会把出生当天的月龄算成负数，
  // 导致 WHO 图（横轴 min:0）裁掉第一个点。
  const birthdayTs = hasBirthday ? fromDateInput(birthday) : NaN;

  // ---------- AI 发育评估 ----------
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  /** 记录本次会话已尝试过的指纹，失败后不无限自动重试 */
  const triedFp = useRef("");

  // undefined = 缓存尚在加载；null = 确认无缓存。
  // 必须区分两者：否则每次进入页面都会在缓存加载完成前误判为无缓存而重新生成。
  const cachedRow = useLiveQuery(
    async () => (await db.settings.get(ASSESSMENT_KEY)) ?? null,
    []
  );
  const cacheLoading = cachedRow === undefined;
  const assessment = useMemo<GrowthAssessment | null>(() => {
    if (!cachedRow?.value) return null;
    try {
      return JSON.parse(cachedRow.value) as GrowthAssessment;
    } catch {
      return null;
    }
  }, [cachedRow]);

  const fingerprint = useMemo(
    () =>
      records?.length && hasBirthday ? assessmentFingerprint(birthday, records) : "",
    [records, birthday, hasBirthday]
  );

  const runAssessment = useCallback(async () => {
    if (!records?.length || !hasBirthday || !deepseekKey || aiLoading) return;
    triedFp.current = fingerprint;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await generateGrowthAssessment({
        apiKey: deepseekKey,
        babyName,
        birthday,
        records,
      });
      await setSetting(ASSESSMENT_KEY, JSON.stringify(result));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "评估生成失败，请重试");
    } finally {
      setAiLoading(false);
    }
  }, [records, hasBirthday, deepseekKey, aiLoading, fingerprint, babyName, birthday]);

  useEffect(() => {
    if (cacheLoading) return;
    if (!fingerprint || !deepseekKey || aiLoading) return;
    if (assessment?.fingerprint === fingerprint) return;
    if (triedFp.current === fingerprint) return;
    void runAssessment();
  }, [cacheLoading, fingerprint, deepseekKey, assessment, aiLoading, runAssessment]);

  const babyPoints = useMemo(() => {
    if (!hasBirthday) return [];
    return (records ?? [])
      .map((r) => {
        const v = r[meta.field] as number | undefined;
        if (v == null) return null;
        return [
          Number(ageInMonths(birthdayTs, r.time).toFixed(2)),
          toDisplay(v, meta.scale),
        ] as [number, number];
      })
      .filter((p): p is [number, number] => p !== null);
  }, [records, meta.field, birthdayTs, hasBirthday]);

  /** 记录趋势：横轴为日期，不依赖生日，短期密集记录也能看清变化 */
  const trendPoints = useMemo(() => {
    return (records ?? [])
      .map((r) => {
        const v = r[meta.field] as number | undefined;
        if (v == null) return null;
        return [r.time, toDisplay(v, meta.scale)] as [number, number];
      })
      .filter((p): p is [number, number] => p !== null);
  }, [records, meta.field, meta.scale]);

  const trendOption = useMemo(() => {
    return {
      grid: { left: 48, right: 16, top: 20, bottom: 60 },
      tooltip: {
        trigger: "axis",
        valueFormatter: (v: unknown) => `${v} ${meta.unit}`,
      },
      xAxis: {
        type: "time",
        axisLabel: {
          fontSize: 10,
          formatter: "{M}月{d}日",
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { color: "#f4e5e7" } },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0 },
        { type: "slider", xAxisIndex: 0, height: 18, bottom: 10 },
      ],
      series: [
        {
          name: meta.label,
          type: "line",
          data: trendPoints,
          smooth: true,
          symbol: "circle",
          symbolSize: 8,
          itemStyle: { color: "#944460", borderColor: "#fff", borderWidth: 2 },
          lineStyle: { color: "#944460", width: 2.5 },
          areaStyle: { color: "rgba(148, 68, 96, 0.06)" },
        },
      ],
    };
  }, [trendPoints, meta.label, meta.unit]);

  const whoOption = useMemo(() => {
    // 0.25 月步长加密采样：保证任意缩放窗口内都有足够的点连线，纵轴也能自适应
    const denseMonths = Array.from({ length: 97 }, (_, i) => i * 0.25);
    const dense = denseMonths.map((m) => whoAt(metric, m));
    const bandSeries = BANDS.map((b) => ({
      name: b.name,
      type: "line" as const,
      data: dense.map((p) => [p.month, toDisplay(p[b.key], meta.scale)]),
      showSymbol: false,
      smooth: true,
      itemStyle: { color: b.color },
      lineStyle: {
        color: b.color,
        width: b.key === "p50" ? 2 : 1,
        type: b.key === "p50" ? "solid" : "dashed",
      },
      // 标签直接标在线尾（纸质生长曲线图的画法），取代拥挤的图例
      endLabel: {
        show: true,
        formatter: b.name,
        fontSize: 9,
        fontWeight: 700 as const,
        color: b.labelColor,
        distance: 4,
      },
      z: 1,
    }));

    // 默认缩放到宝宝数据所在的月龄段（前后各留 1 个月），没有数据则显示全程
    const months = babyPoints.map((p) => p[0]);
    const zoomRange = months.length
      ? {
          startValue: Math.max(0, Math.floor(Math.min(...months)) - 1),
          endValue: Math.min(24, Math.ceil(Math.max(...months)) + 1),
        }
      : { startValue: 0, endValue: 24 };

    return {
      // 右侧留白给线尾的 P97~P3 标签
      grid: { left: 42, right: 42, top: 20, bottom: 60 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0, ...zoomRange },
        { type: "slider", xAxisIndex: 0, height: 18, bottom: 10, ...zoomRange },
      ],
      xAxis: {
        type: "value",
        name: "月龄",
        min: 0,
        max: 24,
        nameTextStyle: { fontSize: 11 },
        axisLabel: {
          fontSize: 10,
          formatter: (v: number) => `${Math.round(v * 10) / 10}`,
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { color: "#f4e5e7" } },
      },
      series: [
        ...bandSeries,
        {
          name: "响响",
          type: "line",
          data: babyPoints,
          smooth: false,
          symbol: "circle",
          symbolSize: 8,
          itemStyle: { color: "#944460", borderColor: "#fff", borderWidth: 2 },
          lineStyle: { color: "#944460", width: 2.5 },
          endLabel: {
            show: true,
            formatter: "响响",
            fontSize: 10,
            fontWeight: 700 as const,
            color: "#944460",
            distance: 4,
          },
          z: 5,
        },
      ],
    };
  }, [metric, babyPoints, meta.unit]);

  /** 当前指标下有值的记录（倒序），列表随指标切换 */
  const metricRecords = useMemo(
    () => [...(records ?? [])].filter((r) => r[meta.field] != null).reverse(),
    [records, meta.field]
  );

  const latestAssess = useMemo(() => {
    if (!hasBirthday || !records?.length) return null;
    const withVal = records.filter((r) => r[meta.field] != null);
    const last = withVal[withVal.length - 1];
    if (!last) return null;
    const m = ageInMonths(birthdayTs, last.time);
    const v = last[meta.field] as number;
    return {
      text: assessPercentile(metric, m, v),
      value: toDisplay(v, meta.scale),
      when: monthDay(last.time),
    };
  }, [records, meta.field, metric, birthdayTs, hasBirthday]);

  async function save(): Promise<void> {
    if (!draft) return;
    const payload: Omit<GrowthRecord, "id"> = {
      time: draft.time,
      heightCm: draft.height ? Number(draft.height) : undefined,
      // 输入框单位是 g，内部统一以 kg 存储（与 WHO 数据一致）
      weightKg: draft.weight ? Number(draft.weight) / 1000 : undefined,
    };
    if (
      (payload.heightCm != null && payload.heightCm <= 0) ||
      (payload.weightKg != null && payload.weightKg <= 0)
    ) {
      showToast("数值需大于 0");
      return;
    }
    if (payload.heightCm == null && payload.weightKg == null) {
      showToast("请至少填写一项");
      return;
    }
    if (draft.id != null) await db.growth.update(draft.id, payload);
    else await db.growth.add(payload);
    setDraft(null);
    showToast("已保存 ✓");
  }

  async function remove(id: number): Promise<void> {
    await db.growth.delete(id);
    setDraft(null);
    showToast("已删除");
  }

  return (
    <div className="page">
      <div className="page-title">
        <h1>生长曲线</h1>
        <p>对照 WHO 女童标准</p>
      </div>

      {!hasBirthday && (
        <div className="card" style={{ background: "var(--surface-low)" }}>
          <div className="small">
            📌 请先到「设置」填写响响的出生日期，曲线才能按月龄对照百分位。
          </div>
        </div>
      )}

      {hasBirthday && (records?.length ?? 0) > 0 && !cacheLoading && (
        <div className="ai-card">
          {aiLoading ? (
            <div className="row" style={{ gap: 10 }}>
              <span className="spin spin-light" />
              <span className="small">AI 正在评估{babyName}的发育情况…</span>
            </div>
          ) : aiError ? (
            <div className="row between">
              <span className="small">⚠️ {aiError}</span>
              <button className="btn mini ai-btn" onClick={runAssessment}>
                重试
              </button>
            </div>
          ) : assessment ? (
            <>
              <div className="row between">
                <span className="ai-chip">AI 发育评估</span>
                <span style={{ opacity: 0.7, display: "grid", placeItems: "center" }}>
                  <IconSpark width={20} height={20} />
                </span>
              </div>
              <div className="ai-level">{assessment.level}</div>
              <div className="ai-score">
                {assessment.score}
                <span className="ai-score-unit">分</span>
              </div>
              <div className="ai-summary">{assessment.summary}</div>
              {assessment.tips && (
                <div className="ai-tips">
                  <span>💡</span>
                  <span>{assessment.tips}</span>
                </div>
              )}
              <div className="row between" style={{ marginTop: 14 }}>
                <span className="ai-meta">
                  {monthDay(assessment.generatedAt)}生成 · 仅供参考，不替代医生诊断
                </span>
                <button className="btn mini ai-btn" onClick={runAssessment}>
                  重新评估
                </button>
              </div>
            </>
          ) : !deepseekKey ? (
            <div className="small">
              🔑 在「设置」中配置 DeepSeek API Key 后，这里会自动生成 AI
              发育总结与评分。
            </div>
          ) : null}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <Segment
          ariaLabel="生长指标"
          value={metric}
          onChange={setMetric}
          options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
        />
      </div>

      {latestAssess && (
        <div className="card">
          <div className="row between">
            <div>
              <div className="item-sub" style={{ marginBottom: 4 }}>
                最新{meta.label}（{latestAssess.when}）
              </div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>
                {latestAssess.value}
                <span
                  className="muted"
                  style={{ fontSize: 15, fontWeight: 400, marginLeft: 4 }}
                >
                  {meta.unit}
                </span>
              </div>
            </div>
            <span className={`pill ${pillTone(latestAssess.text)}`}>
              <span className="dot" />
              {latestAssess.text}
            </span>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            {meta.label}曲线（{meta.unit}）
          </span>
          <Segment
            mini
            ariaLabel="曲线视图"
            value={mode}
            onChange={setMode}
            options={[
              { value: "trend", label: "记录趋势" },
              { value: "who", label: "WHO 对照" },
            ]}
          />
        </div>
        {mode === "trend" && trendPoints.length === 0 ? (
          <Empty emoji="📉" text={`还没有${meta.label}数据，记录后这里会画出趋势`} />
        ) : (
          <ReactECharts
            option={mode === "trend" ? trendOption : whoOption}
            style={{ height: 320 }}
            notMerge
          />
        )}
        {mode === "who" && (
          <div className="muted small" style={{ marginTop: 6 }}>
            横轴为月龄，虚线为 WHO 女童百分位；可捏合/拖动下方滑块缩放。
          </div>
        )}
      </div>

      <button className="fab" aria-label="记录测量" onClick={() => setDraft(emptyDraft())}>
        <IconPlus />
      </button>

      <div className="card">
        <span style={{ fontSize: 15, fontWeight: 700 }}>{meta.label}记录</span>
        <div style={{ marginTop: 4 }}>
          {metricRecords.length === 0 && (
            <Empty emoji="📏" text={`还没有${meta.label}记录`} />
          )}
          {metricRecords.map((r) => (
            <div
              key={r.id}
              className="list-item"
              onClick={() =>
                setDraft({
                  id: r.id,
                  time: r.time,
                  height: r.heightCm != null ? String(r.heightCm) : "",
                  weight:
                    r.weightKg != null ? String(Math.round(r.weightKg * 1000)) : "",
                })
              }
            >
              <div className="grow muted" style={{ fontSize: 15 }}>
                {monthDay(r.time)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {toDisplay(r[meta.field] as number, meta.scale)} {meta.unit}
              </div>
            </div>
          ))}
        </div>
      </div>

      {draft && (
        <div className="sheet-mask" onClick={() => setDraft(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 className="sheet-title">
              {draft.id != null ? "编辑测量" : "记录生长数据"}
            </h2>

            <div className="input-tile">
              <span className="ticon">
                <IconCalendar />
              </span>
              <div className="tbody">
                <label>测量日期</label>
                <input
                  type="date"
                  value={toDateInput(draft.time)}
                  onChange={(e) =>
                    setDraft({ ...draft, time: fromDateInput(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="input-tile">
              <span className="ticon">
                <IconScale />
              </span>
              <div className="tbody">
                <label>体重 (g)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="输入体重..."
                  value={draft.weight}
                  onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
                />
              </div>
            </div>

            <div className="input-tile">
              <span className="ticon blue">
                <IconRuler />
              </span>
              <div className="tbody">
                <label>身长 (cm)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="选填..."
                  value={draft.height}
                  onChange={(e) => setDraft({ ...draft, height: e.target.value })}
                />
              </div>
            </div>

            <div className="row" style={{ gap: 12, marginTop: 8 }}>
              {draft.id != null && (
                <button
                  className="btn danger-square"
                  aria-label="删除"
                  onClick={() => remove(draft.id!)}
                >
                  <IconTrash />
                </button>
              )}
              <button
                className="btn ghost"
                style={{ flex: 1, height: 56 }}
                onClick={() => setDraft(null)}
              >
                取消
              </button>
              <button className="btn" style={{ flex: 2, height: 56 }} onClick={save}>
                保存记录
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast text={toast} />
    </div>
  );
}
