// GDD §35.3 —— Prompt 组装（固定顺序，禁止调换）。
// messages = [system(骨架填充+人设), ...workingMemory, user]
// 约束：lore ≤5 段、episodic ≤3 条、档案摘要 ≤150 token（§8.4 注入预算 ≤1200 token）。
import type { NpcId, PlayerProfile, LoreChunk } from "@nexus/shared";
import type { ChatMessage } from "../router/modelRouter";
import { buildSystemPrompt } from "../config/personas";
import type { EpisodicRecord } from "../memory/episodicMemory";

const MAX_LORE = 5;
const MAX_EPISODIC = 3;
const MAX_PROFILE_CHARS = 300; // ~150 token（中文约 2 字/token）

export interface WorldStateSnapshot {
  timeLabel: string; // "白天" / "夜晚" 等
  weather: string; // 晴/雨/雷暴…
  zone: string; // 扳手镇/平原…
  flags: Record<string, boolean>;
}

export interface PromptContext {
  world: WorldStateSnapshot;
  profile: PlayerProfile;
  episodic: EpisodicRecord[];
  lore: LoreChunk[];
  hitLore: boolean;
}

export function buildMessages(
  npcId: NpcId,
  text: string,
  ctx: PromptContext,
  workingMemory: ChatMessage[]
): ChatMessage[] {
  const loreText = ctx.hitLore ? formatLore(ctx.lore.slice(0, MAX_LORE)) : "";
  const system = buildSystemPrompt(npcId, {
    worldState: formatWorld(ctx.world),
    playerProfile: formatProfile(ctx.profile, npcId),
    episodicMemories: formatEpisodic(ctx.episodic.slice(0, MAX_EPISODIC)),
    loreChunks: loreText,
  });
  return [
    { role: "system", content: system },
    ...workingMemory,
    { role: "user", content: text },
  ];
}

function formatWorld(w: WorldStateSnapshot): string {
  const flagKeys = Object.entries(w.flags)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const flagText = flagKeys.length > 0 ? `；已发生：${flagKeys.join("、")}` : "";
  return `时间${w.timeLabel} / 天气${w.weather} / 区域${w.zone}${flagText}`;
}

function styleLabel(style: PlayerProfile["style"]): string {
  if (style.melee > 0.66) return "近战偏好";
  if (style.ranged > 0.66) return "远程偏好";
  return "远近均衡";
}

function formatProfile(p: PlayerProfile, npcId: NpcId): string {
  const affinity = p.affinity[npcId] ?? 0;
  const parts = [
    `Lv${p.level}`,
    `机甲${p.mecha}`,
    styleLabel(p.style),
    `好感度${affinity}`,
    `委托完成${p.questStats.completed}放弃${p.questStats.abandoned}`,
    `已解锁${p.unlockedZones.join("/")}`,
  ];
  const line = `玩家：${parts.join(" / ")}`;
  return line.length > MAX_PROFILE_CHARS ? line.slice(0, MAX_PROFILE_CHARS) : line;
}

function formatEpisodic(records: EpisodicRecord[]): string {
  if (records.length === 0) return "";
  const now = Date.now();
  return records
    .map((r) => {
      const days = Math.floor((now - r.ts) / 86_400_000);
      const when = days <= 0 ? "今天" : days === 1 ? "昨天" : `${days}天前`;
      return `· [${when}] ${r.entry.summary}`;
    })
    .join("\n");
}

function formatLore(chunks: LoreChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks.map((c, i) => `【设定${i + 1}】${c.text}`).join("\n");
}
