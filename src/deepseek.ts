export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const ENDPOINT = "https://api.deepseek.com/chat/completions";

export class DeepSeekError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "DeepSeekError";
  }
}

async function request(
  apiKey: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Response> {
  if (!apiKey) throw new DeepSeekError("尚未配置 DeepSeek API Key，请前往「设置」填写");
  let resp: Response;
  try {
    resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: "deepseek-chat", ...body }),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new DeepSeekError("网络请求失败，请检查网络连接后重试");
  }
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    const hint =
      resp.status === 401
        ? "API Key 无效或已过期"
        : resp.status === 402
        ? "账户余额不足"
        : resp.status === 429
        ? "请求过于频繁，请稍后再试"
        : detail.slice(0, 120) || "服务异常";
    throw new DeepSeekError(`DeepSeek 调用失败：${hint}`, resp.status);
  }
  return resp;
}

interface OnceOptions {
  apiKey: string;
  messages: ChatMessage[];
  /** 要求模型输出 JSON 对象 */
  json?: boolean;
  signal?: AbortSignal;
}

/** 非流式调用，一次性返回完整回复（用于结构化输出场景） */
export async function chatOnce({
  apiKey,
  messages,
  json = false,
  signal,
}: OnceOptions): Promise<string> {
  const resp = await request(
    apiKey,
    {
      messages,
      stream: false,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    },
    signal
  );
  const data: unknown = await resp.json();
  const content = (data as { choices?: { message?: { content?: unknown } }[] })
    .choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new DeepSeekError("AI 响应格式异常，请重试");
  return content;
}

interface StreamOptions {
  apiKey: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onDelta: (chunk: string) => void;
}

/**
 * 以流式方式调用 DeepSeek Chat Completions。
 * 逐段回调 onDelta，调用方负责拼接与渲染。
 */
export async function streamChat({
  apiKey,
  messages,
  signal,
  onDelta,
}: StreamOptions): Promise<void> {
  const resp = await request(apiKey, { messages, stream: true }, signal);

  const reader = resp.body?.getReader();
  if (!reader) throw new DeepSeekError("无法读取响应流");
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta: string | undefined = json.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
      } catch {
        // 忽略保持连接的空行 / 不完整分片
      }
    }
  }
}
