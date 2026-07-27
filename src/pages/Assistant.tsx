import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../hooks/useSettings";
import { streamChat, DeepSeekError, type ChatMessage } from "../deepseek";
import { buildBabyContext, SYSTEM_PROMPT } from "../utils/aiContext";

interface UiMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "响响最近的奶量正常吗？",
  "根据生长曲线，她发育情况如何？",
  "这个月龄一天该喂多少奶？",
  "帮我总结一下响响本周的情况",
];

export default function Assistant(): JSX.Element {
  const { babyName, birthday, deepseekKey } = useSettings();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string): Promise<void> {
    const content = text.trim();
    if (!content || busy) return;
    if (!deepseekKey) {
      navigate("/settings");
      return;
    }
    setInput("");

    const history = messages;
    const nextUi: UiMessage[] = [...history, { role: "user", content }];
    setMessages([...nextUi, { role: "assistant", content: "" }]);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const context = await buildBabyContext(babyName, birthday);
      const payload: ChatMessage[] = [
        { role: "system", content: `${SYSTEM_PROMPT}\n\n【${babyName}的数据】\n${context}` },
        ...history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
        { role: "user", content },
      ];

      let acc = "";
      await streamChat({
        apiKey: deepseekKey,
        messages: payload,
        signal: controller.signal,
        onDelta: (chunk) => {
          acc += chunk;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        },
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      const msg = e instanceof DeepSeekError ? e.message : "出错了，请稍后再试";
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return copy;
      });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="page" ref={scrollRef} style={{ display: "flex", flexDirection: "column" }}>
      <div className="page-title">育儿助手 <small>DeepSeek · 懂响响的数据</small></div>

      {messages.length === 0 && (
        <div className="card">
          <div style={{ marginBottom: 10 }}>
            👋 我是响当当育儿助手，能看到响响的喂养与生长记录。试试问我：
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
          {!deepseekKey && (
            <div className="small" style={{ marginTop: 12, color: "var(--danger)" }}>
              ⚠️ 尚未配置 DeepSeek API Key，
              <span
                style={{ textDecoration: "underline" }}
                onClick={() => navigate("/settings")}
              >
                去设置
              </span>
            </div>
          )}
        </div>
      )}

      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role === "user" ? "user" : "ai"}`}>
            {m.content || (busy && i === messages.length - 1 ? <span className="spin" /> : "")}
          </div>
        ))}
      </div>
      <div style={{ height: 60 }} />

      <div className="chat-input">
        <input
          className="grow"
          placeholder="问点关于响响的事…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send(input);
          }}
        />
        {busy ? (
          <button className="btn ghost" onClick={() => abortRef.current?.abort()}>
            停止
          </button>
        ) : (
          <button className="btn" onClick={() => send(input)} disabled={!input.trim()}>
            发送
          </button>
        )}
      </div>
    </div>
  );
}
