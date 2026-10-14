// GDD §32.9 worldEventStore —— AI 导演월드 이벤트（toast + 历史）
import { create } from "zustand";
import type { WorldEvent } from "@nexus/shared";

interface WorldEventStore {
  current: WorldEvent | null;
  history: WorldEvent[];
  begin: (e: WorldEvent) => void;
  dismiss: () => void;
}

export const useWorldEventStore = create<WorldEventStore>((set) => ({
  current: null,
  history: [],
  begin: (e) => set((s) => ({ current: e, history: [e, ...s.history].slice(0, 20) })),
  dismiss: () => set({ current: null }),
}));
