import { useEffect, useState } from "react";
import { db, setSetting, SETTING_KEYS } from "../db";
import { useSettings } from "../hooks/useSettings";
import { Toast, useToast } from "../components/ui";

export default function Settings(): JSX.Element {
  const settings = useSettings();
  const [toast, showToast] = useToast();
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (settings.loaded) {
      setName(settings.babyName);
      setBirthday(settings.birthday);
      setKey(settings.deepseekKey);
    }
  }, [settings.loaded, settings.babyName, settings.birthday, settings.deepseekKey]);

  async function save(): Promise<void> {
    await Promise.all([
      setSetting(SETTING_KEYS.babyName, name.trim() || "响响"),
      setSetting(SETTING_KEYS.birthday, birthday),
      setSetting(SETTING_KEYS.deepseekKey, key.trim()),
    ]);
    showToast("已保存 ✓");
  }

  async function exportData(): Promise<void> {
    const [feedings, growth] = await Promise.all([
      db.feedings.toArray(),
      db.growth.toArray(),
    ]);
    const blob = new Blob(
      [JSON.stringify({ exportedAt: Date.now(), feedings, growth }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `响当当备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("已导出备份");
  }

  return (
    <div className="page">
      <div className="page-title">设置</div>

      <div className="card">
        <span className="card-title">宝宝信息</span>
        <div style={{ marginTop: 12 }}>
          <label className="field">
            <span>昵称</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="响响" />
          </label>
          <label className="field">
            <span>出生日期（用于计算月龄与生长百分位）</span>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <span className="card-title">AI 助手</span>
        <div className="muted small" style={{ margin: "6px 0 12px" }}>
          填写 DeepSeek API Key 后即可使用育儿助手。Key 仅保存在本机，不会上传。
        </div>
        <label className="field">
          <span>DeepSeek API Key</span>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="grow"
              type={showKey ? "text" : "password"}
              value={key}
              placeholder="sk-..."
              onChange={(e) => setKey(e.target.value)}
            />
            <button className="btn ghost mini" onClick={() => setShowKey((v) => !v)}>
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
        </label>
        <a
          className="small"
          href="https://platform.deepseek.com/api_keys"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--pink-deep)" }}
        >
          → 前往 DeepSeek 获取 API Key
        </a>
      </div>

      <button className="btn block" onClick={save} style={{ marginBottom: 14 }}>
        保存设置
      </button>

      <div className="card">
        <span className="card-title">数据管理</span>
        <div className="muted small" style={{ margin: "6px 0 12px" }}>
          所有记录都保存在手机本地。建议定期导出备份。
        </div>
        <button className="btn ghost block" onClick={exportData}>
          导出数据备份（JSON）
        </button>
      </div>

      <div className="empty small">响当当 · 为响响记录每一天 🎀</div>

      <Toast text={toast} />
    </div>
  );
}
