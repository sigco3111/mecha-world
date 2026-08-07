// GDD §8.10/§8.12 —— 模型路由：OpenAI 兼容 Provider（主）+ MockProvider（无 key 兜底）。
// P3 新增：function calling（tools 参数 + 流式 tool_calls 解析）。
import { request } from "undici";
import type { NpcId } from "@nexus/shared";
import type { OpenAITool } from "../tools/registry";

export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown; // 已 JSON.parse
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  // assistant 携带工具调用
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  // role="tool" 时的回执关联
  tool_call_id?: string;
}

export interface StreamChunk {
  delta?: string;
  done: boolean;
  tokensIn?: number;
  tokensOut?: number;
  toolCalls?: ToolCall[]; // done 时若有工具调用
}

export interface ChatOptions {
  tools?: OpenAITool[];
}

export interface ModelProvider {
  name: string;
  chatStream(
    messages: ChatMessage[],
    onChunk: (c: StreamChunk) => void,
    opts?: ChatOptions
  ): Promise<void>;
}

/** OpenAI 兼容流式 Provider（DeepSeek/Gemini-OpenAI 兼容端点通用） */
export class OpenAICompatProvider implements ModelProvider {
  constructor(
    public name: string,
    private baseUrl: string,
    private apiKey: string,
    private model: string
  ) {}

  async chatStream(
    messages: ChatMessage[],
    onChunk: (c: StreamChunk) => void,
    opts?: ChatOptions
  ): Promise<void> {
    const body: Record<string, unknown> = { model: this.model, messages, stream: true };
    if (opts?.tools && opts.tools.length > 0) {
      body.tools = opts.tools;
      body.tool_choice = "auto";
    }
    const res = await request(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (res.statusCode !== 200) {
      throw new Error(`LLM ${this.name} HTTP ${res.statusCode}`);
    }
    let tokensIn = 0;
    let tokensOut = 0;
    let buffer = "";
    // tool_calls 按 index 累积（OpenAI 流式分片）
    const toolAcc = new Map<number, { id: string; name: string; args: string }>();

    for await (const chunk of res.body) {
      buffer += chunk.toString("utf-8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") {
          onChunk({ done: true, tokensIn, tokensOut, toolCalls: buildToolCalls(toolAcc) });
          return;
        }
        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string; tool_calls?: ToolCallDelta[] } }[];
            usage?: { prompt_tokens?: number };
          };
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            tokensOut += 1;
            onChunk({ delta: delta.content, done: false });
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) mergeToolCall(toolAcc, tc);
          }
          if (json.usage?.prompt_tokens) tokensIn = json.usage.prompt_tokens;
        } catch {
          /* 半行 JSON 忽略 */
        }
      }
    }
    onChunk({ done: true, tokensIn, tokensOut, toolCalls: buildToolCalls(toolAcc) });
  }
}

interface ToolCallDelta {
  index: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

function mergeToolCall(acc: Map<number, { id: string; name: string; args: string }>, tc: ToolCallDelta): void {
  const cur = acc.get(tc.index) ?? { id: "", name: "", args: "" };
  if (tc.id) cur.id = tc.id;
  if (tc.function?.name) cur.name += tc.function.name;
  if (tc.function?.arguments) cur.args += tc.function.arguments;
  acc.set(tc.index, cur);
}

function buildToolCalls(acc: Map<number, { id: string; name: string; args: string }>): ToolCall[] | undefined {
  if (acc.size === 0) return undefined;
  const out: ToolCall[] = [];
  for (const v of acc.values()) {
    let parsed: unknown = {};
    try {
      parsed = v.args ? JSON.parse(v.args) : {};
    } catch {
      parsed = {}; // 模型输出非法 JSON → 空对象，arbiter/zod 会拒
    }
    out.push({ id: v.id, name: v.name, arguments: parsed });
  }
  return out;
}

/** Mock Provider：无 API key 时跑通全管线（流式逐字输出，不产生 tool_calls） */
export class MockProvider implements ModelProvider {
  name = "mock";
  private npcStyle: Record<NpcId, { prefix: string; suffix: string }> = {
    echo: { prefix: "本核听到了", suffix: "……吧？" },
    babs: { prefix: "小子，", suffix: "。就这么定了" },
    vera: { prefix: "对你来说特价——", suffix: "，我的王牌" },
    jicha: { prefix: "叮——！", suffix: "哐当！" },
  };

  async chatStream(messages: ChatMessage[], onChunk: (c: StreamChunk) => void): Promise<void> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const sys = messages.find((m) => m.role === "system")?.content ?? "";
    const npc: NpcId = sys.includes("Echo")
      ? "echo"
      : sys.includes("老扳手")
        ? "babs"
        : sys.includes("薇拉")
          ? "vera"
          : "jicha";
    const style = this.npcStyle[npc];
    const echoOf = lastUser.length > 24 ? lastUser.slice(0, 24) + "…" : lastUser;
    const reply =
      `${style.prefix}「${echoOf}」。` +
      `（Mock 模型在线：管线通畅。配置真实 LLM_API_KEY 后我会拥有真正的灵魂${style.suffix}）`;
    for (const ch of reply) {
      onChunk({ delta: ch, done: false });
      await new Promise((r) => setTimeout(r, 30));
    }
    onChunk({ done: true, tokensIn: 120, tokensOut: reply.length });
  }
}

/** 路由：有 key 用真实模型，否则 Mock（§8.12 主备容灾：主挂切备，双挂切 Mock） */
export function pickProvider(): ModelProvider {
  const primaryKey = process.env.LLM_PRIMARY_API_KEY;
  if (primaryKey) {
    return new OpenAICompatProvider(
      "primary",
      process.env.LLM_PRIMARY_BASE_URL ?? "https://api.deepseek.com",
      primaryKey,
      process.env.LLM_PRIMARY_CHAT ?? "deepseek-v4-flash"
    );
  }
  const backupKey = process.env.LLM_BACKUP_API_KEY;
  if (backupKey) {
    return new OpenAICompatProvider(
      "backup",
      process.env.LLM_BACKUP_BASE_URL ?? "https://api.deepseek.com",
      backupKey,
      process.env.LLM_BACKUP_CHAT ?? "deepseek-v4-flash"
    );
  }
  return new MockProvider();
}
