// GDD §35.1/§35.4/§38.4 —— WS 网关：连接/心跳/限流 + 工具调用回执 + 动态任务确认路由。
import type { WebSocket } from "ws";
import { randomUUID, createHash } from "node:crypto";
import type { ClientMsg, ServerMsg, NpcId } from "@nexus/shared";
import { handleChatTurn } from "../pipeline/chatTurn";
import type { DirectorSession } from "../agents/director";

// 在线会话表（director 广播 world_event 用）
const sessions = new Map<string, { playerId: string; send: (msg: ServerMsg) => void }>();

/** director 用：当前在线会话（对话连接建立时注册） */
export async function getDirectorSessions(): Promise<DirectorSession[]> {
  return [...sessions.values()].map((s) => ({ playerId: s.playerId, send: s.send }));
}

interface ToolResolver {
  resolve: (r: { ok: boolean; detail: string }) => void;
  timer: ReturnType<typeof setTimeout>;
}
interface QuestResolver {
  resolve: (accepted: boolean) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ConnState {
  playerId: string;
  sessionId: string;
  lastPong: number;
  msgTimestamps: number[];
  pendingTools: Map<string, ToolResolver>;
  pendingQuest: QuestResolver | null;
}

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const TOOL_RESULT_TIMEOUT_MS = 30_000;
const QUEST_CONFIRM_TIMEOUT_MS = 60_000;

export function handleConnection(socket: WebSocket, playerFp: string) {
  const state: ConnState = {
    playerId: createHash("sha256").update(playerFp).digest("hex").slice(0, 16),
    sessionId: randomUUID(),
    lastPong: Date.now(),
    msgTimestamps: [],
    pendingTools: new Map(),
    pendingQuest: null,
  };
  const send = (msg: ServerMsg) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
  };
  send({ type: "session", sessionId: state.sessionId });
  sessions.set(state.playerId, { playerId: state.playerId, send });

  const heartbeat = setInterval(() => {
    if (Date.now() - state.lastPong > 30_000) {
      clearInterval(heartbeat);
      socket.terminate();
      return;
    }
    send({ type: "error", code: "E1003_BAD_MSG", message: "__ping__" });
  }, 15_000);

  socket.on("message", async (raw: Buffer) => {
    state.lastPong = Date.now();
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw.toString("utf-8")) as ClientMsg;
    } catch {
      send({ type: "error", code: "E1003_BAD_MSG", message: "invalid json" });
      return;
    }
    if (msg.type === "ping") return;

    // tool_result：路由到等待中的 resolver
    if (msg.type === "tool_result") {
      const pending = state.pendingTools.get(msg.callId);
      if (pending) {
        clearTimeout(pending.timer);
        state.pendingTools.delete(msg.callId);
        pending.resolve({ ok: msg.ok, detail: msg.detail });
      } else {
        send({ type: "error", code: "E2003_TOOL_TIMEOUT", message: "unknown tool_result" });
      }
      return;
    }

    // intent：P4 quest 确认路由（quest=接受，其他=拒绝）
    if (msg.type === "intent") {
      if (state.pendingQuest) {
        clearTimeout(state.pendingQuest.timer);
        const accepted = msg.intent === "quest";
        state.pendingQuest.resolve(accepted);
        state.pendingQuest = null;
      }
      return;
    }

    if (msg.type === "chat") {
      // 限流
      const now = Date.now();
      state.msgTimestamps = state.msgTimestamps.filter((t) => now - t < RATE_WINDOW_MS);
      if (state.msgTimestamps.length >= RATE_LIMIT) {
        send({ type: "error", code: "E1002_RATE_LIMIT", message: "slow down" });
        return;
      }
      state.msgTimestamps.push(now);

      const callId = randomUUID();
      await handleChatTurn(state.playerId, msg.npcId as NpcId, msg.text, {
        onToken: (delta) => send({ type: "token", callId, delta }),
        onDone: (usage) => send({ type: "done", callId, usage }),
        onError: (code, message) => send({ type: "error", code: code as never, message }),
        onToolCall: (toolCallId, tool, args) =>
          new Promise<{ ok: boolean; detail: string }>((resolve) => {
            const timer = setTimeout(() => {
              if (state.pendingTools.has(toolCallId)) {
                state.pendingTools.delete(toolCallId);
                resolve({ ok: false, detail: "TOOL_TIMEOUT" });
              }
            }, TOOL_RESULT_TIMEOUT_MS);
            state.pendingTools.set(toolCallId, { resolve, timer });
            send({ type: "tool_call", callId: toolCallId, tool, args });
          }),
        onQuestOffered: (quest) =>
          new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => {
              if (state.pendingQuest) {
                state.pendingQuest = null;
                resolve(false);
              }
            }, QUEST_CONFIRM_TIMEOUT_MS);
            state.pendingQuest = { resolve, timer };
            send({ type: "quest_offered", callId: randomUUID(), quest });
          }),
      });
      return;
    }
  });

  socket.on("close", () => {
    clearInterval(heartbeat);
    sessions.delete(state.playerId);
    for (const [, p] of state.pendingTools) {
      clearTimeout(p.timer);
      p.resolve({ ok: false, detail: "CONNECTION_CLOSED" });
    }
    state.pendingTools.clear();
    if (state.pendingQuest) {
      clearTimeout(state.pendingQuest.timer);
      state.pendingQuest.resolve(false);
      state.pendingQuest = null;
    }
  });
}
