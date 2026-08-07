// GDD §A.7 —— 记忆摘要：把对话窗口压缩为情节记忆（≤60字第三人称 + importance + tags）。
// 真 LLM 时调用轻量模型；Mock 模式（无 key）走规则兜底，保证管线可用。
import type { NpcId } from "@nexus/shared";
import { pickProvider, type ChatMessage } from "../router/modelRouter";

export interface EpisodicEntry {
  summary: string; // ≤60 字第三人称
  importance: 1 | 2 | 3 | 4 | 5; // ≥3 才入库（§A.7）
  tags: string[];
}

const NPC_LABEL: Record<NpcId, string> = {
  echo: "Echo",
  babs: "老扳手",
  vera: "薇拉",
  jicha: "叽喳",
};

const PROMPT = `把以下对话压缩为一条"情节记忆"，要求：
- 第三人称，≤60字，只保留：玩家做了什么、NPC 承诺/委托了什么、产生了什么后果或约定。
- 无实质内容的寒暄输出 "SKIP"。
- 输出单行 JSON：{"summary":"...","importance":1-5,"tags":["..."]}，importance≥3 才入库。
不要输出 JSON 以外的任何文字。`;

/** 摘要一轮对话窗口；返回 null 表示 SKIP（寒暄无实质内容） */
export async function summarizeWindow(
  npcId: NpcId,
  messages: ChatMessage[]
): Promise<EpisodicEntry | null> {
  const window = messages.filter((m) => m.role === "user" || m.role === "assistant");
  if (window.length === 0) return null;

  const provider = pickProvider();
  if (provider.name === "mock" || provider.name.startsWith("fallback")) {
    return ruleBasedSummary(npcId, window);
  }

  const transcript = window
    .map((m) => `${m.role === "user" ? "玩家" : NPC_LABEL[npcId]}：${m.content}`)
    .join("\n");

  let raw = "";
  await provider.chatStream(
    [
      { role: "system", content: PROMPT },
      { role: "user", content: `对话：\n${transcript}` },
    ],
    (c) => {
      if (c.delta) raw += c.delta;
    }
  );

  return parseSummary(raw);
}

function parseSummary(raw: string): EpisodicEntry | null {
  const trimmed = raw.trim();
  if (trimmed.includes("SKIP")) return null;
  // 提取首个 JSON 对象
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(trimmed.slice(start, end + 1)) as Partial<EpisodicEntry>;
    const importance = clampInt(obj.importance, 1, 5) as EpisodicEntry["importance"];
    const summary = String(obj.summary ?? "").slice(0, 60);
    if (!summary) return null;
    const tags = Array.isArray(obj.tags) ? obj.tags.filter((t) => typeof t === "string").slice(0, 5) : [];
    return { summary, importance, tags };
  } catch {
    return null;
  }
}

function clampInt(v: unknown, lo: number, hi: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/** Mock/无 key 时的规则兜底：抽取最后一条实质玩家消息 */
function ruleBasedSummary(npcId: NpcId, window: ChatMessage[]): EpisodicEntry | null {
  const users = window.filter((m) => m.role === "user").map((m) => m.content);
  if (users.length === 0) return null;
  const last = users[users.length - 1].trim();
  // 寒暄/过短 → SKIP
  if (last.length < 6) return null;
  const summary = `玩家向${NPC_LABEL[npcId]}提及：${last.slice(0, 40)}`.slice(0, 60);
  return { summary, importance: 3, tags: [] };
}
