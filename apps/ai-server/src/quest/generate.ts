// GDD §A.5/§35.6 —— 动态任务生成：§A.5 prompt + JSON 模式 + generate-and-refine（≤3）+ 模板兜底。
// 任务链（§8.7）：交付时 25% 概率生成后续环，此处提供 tryChain 帮助。
import { randomUUID } from "node:crypto";
import { pickProvider, type ChatMessage } from "../router/modelRouter";
import type { DynamicQuest, NpcId, ZoneId } from "@nexus/shared";
import { validateQuest, type ValidationContext, type ValidationResult } from "./validate";

const MAX_REFINE = 3;
const CHAIN_PROB = 0.25; // §8.7 任务链触发概率
const DAY_MS = 86_400_000;

export interface GenerateInput {
  npcId: NpcId;
  playerLevel: number;
  mecha: string;
  style: { melee: number; ranged: number };
  completed: number;
  rate: number; // 0-1
  zones: readonly ZoneId[];
  worldState: string;
  recentTitles: readonly string[];
  rewardBase: number; // 120 × level（§12.3）
  /** 任务链：若 seq<3 则生成后续环 */
  chain?: { seq: number; total: number };
}

export interface GenerateResult {
  quest: DynamicQuest | null;
  validation: ValidationResult | null;
  source: "llm" | "template" | "failed";
}

const NPC_LABEL: Record<NpcId, string> = { echo: "Echo", babs: "老扳手", vera: "薇拉", jicha: "叽喳" };

function styleLabel(s: { melee: number; ranged: number }): string {
  if (s.melee > 0.66) return "近战偏好";
  if (s.ranged > 0.66) return "远程偏好";
  return "远近均衡";
}

export async function generateQuest(input: GenerateInput): Promise<GenerateResult> {
  const ctx: ValidationContext = {
    playerLevel: input.playerLevel,
    unlockedZones: input.zones,
    recentTitles: input.recentTitles,
  };

  const provider = pickProvider();
  if (provider.name === "mock" || provider.name.startsWith("fallback")) {
    return finalizeTemplate(input, ctx);
  }

  // 真 LLM：refine 循环
  let lastReason = "";
  for (let attempt = 0; attempt < MAX_REFINE; attempt++) {
    const raw = await callJson(provider, input, lastReason);
    if (raw === null) {
      lastReason = "模型未输出合法 JSON";
      continue;
    }
    const v = validateQuest(raw, ctx);
    if (v.ok && v.quest) {
      return { quest: v.quest, validation: v, source: "llm" };
    }
    lastReason = v.reason ?? "未知";
  }

  // 全败 → 模板兜底（§38.4）
  return finalizeTemplate(input, ctx);
}

async function finalizeTemplate(input: GenerateInput, ctx: ValidationContext): Promise<GenerateResult> {
  const t = templateQuest(input);
  const v = validateQuest(t, ctx);
  return { quest: v.ok ? t : null, validation: v, source: v.ok ? "template" : "failed" };
}

async function callJson(
  provider: ReturnType<typeof pickProvider>,
  input: GenerateInput,
  lastReason: string
): Promise<unknown> {
  const messages: ChatMessage[] = [
    { role: "system", content: "你是游戏任务设计师。只输出一个合法 JSON 对象，不要输出任何其他文字或 Markdown 代码块。" },
    { role: "user", content: buildPrompt(input, lastReason) },
  ];
  let raw = "";
  await provider.chatStream(messages, (c) => {
    if (c.delta) raw += c.delta;
  });
  // 去除可能的 ```json 包裹
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildPrompt(input: GenerateInput, lastReason: string): string {
  const npc = NPC_LABEL[input.npcId];
  const seq = input.chain?.seq ?? 1;
  const total = input.chain?.total ?? 1;
  return `你是游戏任务设计师。根据玩家画像生成一个支线委托，输出严格 JSON。

【委托人】${npc}
【玩家画像】等级 ${input.playerLevel}，机甲 ${input.mecha}，${styleLabel(input.style)}，已完成 ${input.completed} 个委托，完成率 ${Math.round(input.rate * 100)}%。
【已解锁区域】${input.zones.join("、")}
【当前世界状态】${input.worldState}
【禁止重复主题】${input.recentTitles.join("、") || "（暂无历史）"}
【任务链】第 ${seq} 环 / 共 ${total} 环

【硬性规则】
1. type 只能是 kill/collect/talk/explore；objective.targetId 必须在所选 zone 的白名单内。
2. 击杀类 count ∈ [玩家等级-2, 玩家等级+2]（clamp 1-20）；采集类 count ≤ 10。
3. rewards.gold = ${input.rewardBase} × 难度系数（easy 0.8 / normal 1.0 / hard 1.3）；crystal 必须为 0（仅第 3 环可 1-8）。
4. title ≤ 14 字；dialogue 三段（offer/progress/complete）每段 ≤ 40 字，符合「${npc}」口吻。
5. 输出 JSON 字段：id(uuid)/source("${input.npcId}")/chain({seq:${seq},total:${total}})/title/type/zone/objective{targetId,count}/rewards{gold,crystal,exp,items:[]}/dialogue{offer,progress,complete}/difficulty/expiresAt(epoch ms)。${lastReason ? `\n【上次校验失败】${lastReason}，请修正后重新输出。` : ""}`;
}

/** 模板任务：保证通过校验（mock/兜底用） */
export function templateQuest(input: GenerateInput): DynamicQuest {
  const zone = (input.zones[input.zones.length - 1] ?? "plains") as ZoneId;
  const diff: DynamicQuest["difficulty"] =
    input.playerLevel < 5 ? "easy" : input.playerLevel < 12 ? "normal" : "hard";
  const targetByZone: Record<ZoneId, string> = {
    plains: "crawler",
    crystal: "cbeast",
    lava: "heavy",
    abyss: "silent",
  };
  const target = targetByZone[zone];
  const count = Math.max(1, Math.min(20, input.playerLevel)); // §35.6 v2：kill count ∈ [lv-2,lv+2]
  const coef = diff === "easy" ? 0.8 : diff === "hard" ? 1.3 : 1.0;
  const gold = Math.floor(120 * input.playerLevel * coef);
  const seq = input.chain?.seq ?? 1;
  const crystal = seq === 3 ? 5 : 0;
  const source = (input.npcId === "echo" ? "vera" : input.npcId) as DynamicQuest["source"];
  const npc = NPC_LABEL[input.npcId];
  const zoneName = { plains: "废料场", crystal: "晶簇原野", lava: "熔岩带", abyss: "深渊" }[zone];

  return {
    id: randomUUID(),
    source,
    chain: { seq, total: input.chain?.total ?? 1 },
    title: `${zoneName}清剿`,
    type: "kill",
    zone,
    objective: { targetId: target, count },
    rewards: { gold, crystal, exp: gold, items: [] },
    dialogue: {
      offer: `${npc}：去${zoneName}处理 ${count} 个${target}，赏金 ${gold}。`,
      progress: `${npc}：还差几个，别偷懒。`,
      complete: `${npc}：干得漂亮，赏金结清。`,
    },
    difficulty: diff,
    expiresAt: Date.now() + DAY_MS,
  };
}

/** §8.7 任务链：交付时 25% 概率生成下一环（仅当当前环 seq<3） */
export function shouldChain(currSeq: number, rng: () => number = Math.random): boolean {
  return currSeq < 3 && rng() < CHAIN_PROB;
}
