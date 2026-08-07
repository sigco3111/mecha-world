// GDD §8.4 第3层 + §B.3 —— 档案记忆：结构化玩家画像（全局，按 playerId）。
// key: profile:{playerId}；存完整 PlayerProfile JSON，每 NPC 读取时取自己的 affinity 切片。
import { getKv } from "./backend";
import { createDefaultProfile, type NpcId, type PlayerProfile } from "@nexus/shared";

const PREFIX = "profile";
const key = (playerId: string) => `${PREFIX}:${playerId}`;

export async function getProfile(playerId: string): Promise<PlayerProfile> {
  const raw = await getKv().get(key(playerId));
  if (!raw) return createDefaultProfile(playerId);
  try {
    const obj = JSON.parse(raw) as Partial<PlayerProfile>;
    // 防御性合并：补齐缺失字段（schema 演进容错）
    const base = createDefaultProfile(playerId);
    return {
      ...base,
      ...obj,
      playerId, // 永远以路径 playerId 为准
      style: { ...base.style, ...(obj.style ?? {}) },
      reputation: { ...base.reputation, ...(obj.reputation ?? {}) },
      affinity: { ...base.affinity, ...(obj.affinity ?? {}) },
      questStats: { ...base.questStats, ...(obj.questStats ?? {}) },
      unlockedZones: obj.unlockedZones ?? base.unlockedZones,
    };
  } catch {
    return createDefaultProfile(playerId);
  }
}

export async function saveProfile(profile: PlayerProfile): Promise<void> {
  profile.lastSeen = Date.now();
  await getKv().set(key(profile.playerId), JSON.stringify(profile));
}

export async function getAffinity(playerId: string, npcId: NpcId): Promise<number> {
  return (await getProfile(playerId)).affinity[npcId] ?? 0;
}

/** 好感度变更，clamp 到 [0,5]（§8.4 好感度规则） */
export async function addAffinity(
  playerId: string,
  npcId: NpcId,
  delta: number
): Promise<number> {
  const profile = await getProfile(playerId);
  const current = profile.affinity[npcId] ?? 0;
  const next = Math.max(0, Math.min(5, current + delta));
  profile.affinity[npcId] = next;
  await saveProfile(profile);
  return next;
}

/** 记录一次任务事件到画像 questStats（P4 动态任务结算会调用） */
export async function recordQuestEvent(
  playerId: string,
  kind: "accepted" | "completed" | "abandoned"
): Promise<void> {
  const profile = await getProfile(playerId);
  profile.questStats[kind] += 1;
  await saveProfile(profile);
}
