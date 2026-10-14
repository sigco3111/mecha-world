// GDD §32.7 dialogueStore —— 对话状态管理（含 P3 工具执行 + P4 퀘스트确认）
import { create } from "zustand";
import type { NpcId, DynamicQuest } from "@nexus/shared";
import { type AiClient, type ServerMsg } from "../ai/aiClient";
import { executeTool } from "../ai/toolExecutor";
import { cannedReply } from "../ai/cannedFallback";
import { useWorldEventStore } from "./worldEventStore";

export type DialogueStatus = "idle" | "connecting" | "online" | "streaming" | "fallback";

export interface ChatMessage {
  role: "player" | "npc" | "system";
  text: string;
  ts: number;
}

interface DialogueStore {
  status: DialogueStatus;
  activeNpc: NpcId | null;
  sessionId: string | null;
  messages: ChatMessage[];
  streamingText: string;
  lastUsage: { tokensIn: number; tokensOut: number; costCny: number } | null;
  offeredQuest: DynamicQuest | null; // P4：현재待确认的动态퀘스트预览
  client: AiClient | null;

  open: (npc: NpcId) => void;
  close: () => void;
  send: (text: string) => void;
  acceptQuest: () => void;
  rejectQuest: () => void;
  _handle: (msg: ServerMsg) => void;
}

let currentCallId: string | null = null;

export const useDialogueStore = create<DialogueStore>((set, get) => ({
  status: "idle",
  activeNpc: null,
  sessionId: null,
  messages: [],
  streamingText: "",
  lastUsage: null,
  offeredQuest: null,
  client: null,

  open: (npc) => {
    const old = get().client;
    old?.close();
    set({
      activeNpc: npc,
      status: "connecting",
      messages: [],
      streamingText: "",
      lastUsage: null,
      offeredQuest: null,
    });
    set({ status: "fallback", client: null, sessionId: null });
  },

  close: () => {
    get().client?.close();
    set({ status: "idle", activeNpc: null, client: null, streamingText: "", offeredQuest: null });
  },

  send: (text) => {
    const { client, activeNpc, sessionId, status } = get();
    const clean = text.trim().slice(0, 300);
    if (!clean || !activeNpc) return;
    // §8.12 罐头降级：后端不可用时本地生成回复（断网可对话）
    if (status === "fallback" || !client || !sessionId) {
      const reply = cannedReply(activeNpc, clean);
      set((s) => ({
        messages: [
          ...s.messages,
          { role: "player", text: clean, ts: Date.now() },
          { role: "npc", text: reply, ts: Date.now() },
        ],
      }));
      return;
    }
    set((s) => ({
      messages: [...s.messages, { role: "player", text: clean, ts: Date.now() }],
      status: "streaming",
      streamingText: "",
      offeredQuest: null,
    }));
    client.send({ type: "chat", sessionId, npcId: activeNpc, text: clean });
  },

  acceptQuest: () => {
    const { offeredQuest, client, sessionId, activeNpc } = get();
    if (!offeredQuest || !client || !sessionId || !activeNpc) return;
    const q = offeredQuest;
    // 写入퀘스트面板（复用 toolExecutor give_quest 逻辑）+ 发 intent 确认给后端
    executeTool("give_quest", { quest: q }).then((res) => {
      client.send({ type: "intent", sessionId, npcId: activeNpc, intent: "quest" });
      set((s) => ({
        offeredQuest: null,
        messages: [
          ...s.messages,
          { role: "system", text: `📋 의뢰 수락「${q.title}」 — ${res.detail}`, ts: Date.now() },
        ],
      }));
    });
  },

  rejectQuest: () => {
    const { client, sessionId, activeNpc } = get();
    if (client && sessionId && activeNpc) {
      client.send({ type: "intent", sessionId, npcId: activeNpc, intent: "leave" });
    }
    set((s) => ({
      offeredQuest: null,
      messages: [...s.messages, { role: "system", text: "의뢰를 거절했어요.", ts: Date.now() }],
    }));
  },

  _handle: (msg) => {
    switch (msg.type) {
      case "session":
        set({ sessionId: msg.sessionId });
        break;
      case "token":
        if (currentCallId !== msg.callId) {
          currentCallId = msg.callId;
          set({ streamingText: "" });
        }
        set((s) => ({ streamingText: s.streamingText + msg.delta }));
        break;
      case "done":
        set((s) => ({
          status: "online",
          messages: s.streamingText
            ? [...s.messages, { role: "npc", text: s.streamingText, ts: Date.now() }]
            : s.messages,
          streamingText: "",
          lastUsage: msg.usage,
        }));
        break;
      case "fallback":
        set({ status: "fallback" });
        break;
      case "error":
        if (msg.message === "__ping__") break;
        set((s) => ({
          status: "online",
          messages: [...s.messages, { role: "system", text: `[${msg.code}] ${msg.message}`, ts: Date.now() }],
        }));
        break;
      case "tool_call": {
        const { callId, tool, args } = msg;
        executeTool(tool, args as Record<string, unknown>).then((res) => {
          get().client?.send({ type: "tool_result", callId, ok: res.ok, detail: res.detail });
          set((s) => ({
            messages: [
              ...s.messages,
              { role: "system", text: `🔧 ${tool}：${res.detail}`, ts: Date.now() },
            ],
          }));
        });
        break;
      }
      case "quest_offered":
        set({ offeredQuest: msg.quest });
        break;
      case "world_event":
        useWorldEventStore.getState().begin(msg.event);
        break;
      default:
        break; // affinity：P6 接管
    }
  },
}));
