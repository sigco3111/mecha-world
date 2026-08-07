// GDD §8.4 第1层 —— 工作记忆：最近 10 轮原文，TTL 2h，跨会话生效（Redis 持久）。
import { getKv } from "./backend";
import type { ChatMessage } from "../router/modelRouter";

const PREFIX = "chat";
const TTL_SEC = 7200; // §8.4 会话结束或 2h
const MAX_TURNS = 10; // §8.4 最近 10 轮（每轮 = user + assistant 共 2 条）
const SUMMARIZE_WINDOW = 5; // §8.4 每 5 轮触发摘要

const key = (playerId: string, npcId: string) => `${PREFIX}:${playerId}:${npcId}`;
const sumKey = (playerId: string, npcId: string) => `sumcnt:${playerId}:${npcId}`;

export async function getWorkingMemory(playerId: string, npcId: string): Promise<ChatMessage[]> {
  const raw = await getKv().get(key(playerId, npcId));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (m): m is ChatMessage =>
        typeof m === "object" && m !== null &&
        (m.role === "user" || m.role === "assistant" || m.role === "system") &&
        typeof m.content === "string"
    );
  } catch {
    return [];
  }
}

/** 追加一轮（user + assistant），自动裁剪到最近 MAX_TURNS 轮；返回是否到达摘要窗口 */
export async function appendTurn(
  playerId: string,
  npcId: string,
  userText: string,
  assistantReply: string
): Promise<{ messages: ChatMessage[]; turnNumber: number; shouldSummarize: boolean }> {
  const prev = await getWorkingMemory(playerId, npcId);
  const next: ChatMessage[] = [
    ...prev,
    { role: "user", content: userText },
    { role: "assistant", content: assistantReply },
  ];
  const trimmed = next.slice(-MAX_TURNS * 2);
  await getKv().set(key(playerId, npcId), JSON.stringify(trimmed), TTL_SEC);

  // 独立摘要计数器（不受工作记忆裁剪影响，保证「每 5 轮」精确触发一次）
  const since = await getKv().incr(sumKey(playerId, npcId), TTL_SEC);
  let shouldSummarize = false;
  if (since >= SUMMARIZE_WINDOW) {
    shouldSummarize = true;
    await getKv().set(sumKey(playerId, npcId), "0", TTL_SEC);
  }

  const turnNumber = trimmed.filter((m) => m.role === "user").length;
  return { messages: trimmed, turnNumber, shouldSummarize };
}

/** 告别节点清空当前工作记忆（GDD §8.3 FAREWELL → IDLE） */
export async function clearWorkingMemory(playerId: string, npcId: string): Promise<void> {
  await getKv().del(key(playerId, npcId));
}
