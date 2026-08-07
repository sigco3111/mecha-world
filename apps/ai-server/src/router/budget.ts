// GDD §8.10/§8.12 —— 日预算熔断 + 成本累积（KV 持久，按 UTC 日重置）。
import { getKv } from "../memory/backend";

const DAY_MS = 86_400_000;
const DAY_TTL_SEC = Math.floor(DAY_MS / 1000);
const DEFAULT_DAILY_BUDGET = 30;

function dayKey(ts = Date.now()): string {
  const d = new Date(ts);
  return `budget:${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

async function addFloat(key: string, delta: number, ttlSec?: number): Promise<number> {
  const kv = getKv();
  const cur = Number((await kv.get(key)) ?? 0);
  const next = cur + delta;
  await kv.set(key, String(next), ttlSec);
  return next;
}

export function getDailyBudget(): number {
  return Number(process.env.DAILY_BUDGET_CNY ?? DEFAULT_DAILY_BUDGET);
}

/** 入账一次对话成本（chatTurn done 后调用） */
export async function charge(costCny: number, tokensIn: number, tokensOut: number): Promise<void> {
  if (costCny <= 0) return; // mock/fallback 不计费
  const key = dayKey();
  await addFloat(`${key}:cost`, costCny, DAY_TTL_SEC);
  await addFloat(`${key}:tokens`, tokensIn + tokensOut, DAY_TTL_SEC);
}

/** §8.12 预算检查：超限则降级（chatTurn 步骤2 调用） */
export async function isBudgetExceeded(): Promise<boolean> {
  const cost = Number((await getKv().get(`${dayKey()}:cost`)) ?? 0);
  return cost >= getDailyBudget();
}

export interface BudgetMetrics {
  todayCostCny: number;
  dailyBudgetCny: number;
  remainingCny: number;
  tokensToday: number;
  exceeded: boolean;
  utilization: number; // 0-1
}

export async function getBudgetMetrics(): Promise<BudgetMetrics> {
  const key = dayKey();
  const cost = Number((await getKv().get(`${key}:cost`)) ?? 0);
  const tokens = Number((await getKv().get(`${key}:tokens`)) ?? 0);
  const budget = getDailyBudget();
  return {
    todayCostCny: cost,
    dailyBudgetCny: budget,
    remainingCny: Math.max(0, budget - cost),
    tokensToday: tokens,
    exceeded: cost >= budget,
    utilization: budget > 0 ? Math.min(1, cost / budget) : 0,
  };
}
