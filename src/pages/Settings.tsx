import { useEffect, useState } from "react";
import { db, setSetting, SETTING_KEYS } from "../db";
import { useSettings } from "../hooks/useSettings";
import { Toast, useToast } from "../components/ui";
import {
  IconArchive,
  IconCheckCircle,
  IconDownload,
  IconExternal,
  IconEye,
  IconEyeOff,
  IconShield,
} from "../components/icons";

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
      <div className="section-title">宝宝信息</div>
      <div className="card">
        <label className="field">
          <span>昵称</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="响响" />
        </label>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>出生日期（用于计算月龄与生长百分位）</span>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
        </label>
      </div>

      <div className="section-title">AI 助手</div>
      <div className="card">
        <div className="info-row">
          <span className="iicon blue">
            <IconShield />
          </span>
          <p>您的 API Key 仅保存在本地设备中，不会上传至任何服务器，确保您的数据绝对安全。</p>
        </div>
        <label className="field" style={{ marginBottom: 0 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            DeepSeek API Key
            <a
              className="link"
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13 }}
            >
              获取密钥 <IconExternal />
            </a>
          </span>
          <div className="input-wrap icon-only">
            <input
              type={showKey ? "text" : "password"}
              value={key}
              placeholder="sk-..."
              onChange={(e) => setKey(e.target.value)}
            />
            <button
              type="button"
              className="inset-icon"
              aria-label={showKey ? "隐藏密钥" : "显示密钥"}
              onClick={() => setShowKey((v) => !v)}
            >
              {showKey ? <IconEye /> : <IconEyeOff />}
            </button>
          </div>
        </label>
      </div>

      <div className="section-title">数据管理</div>
      <div className="card">
        <div className="info-row">
          <span className="iicon green">
            <IconArchive />
          </span>
          <p>所有记录数据均保存在本地。建议定期导出备份，以防数据丢失。</p>
        </div>
        <button className="btn soft block" onClick={exportData}>
          <IconDownload />
          导出数据备份（JSON）
        </button>
      </div>

      <button className="btn pill-soft block" onClick={save} style={{ marginTop: 8 }}>
        <IconCheckCircle />
        保存设置
      </button>

      <div className="footer-note">响当当 · 为响响记录每一天 🎀</div>

      <Toast text={toast} />
    </div>
  );
}
