// GDD §34.4 —— tool_call 前端执行器：zod 二회校验 → store action → 回执 {ok, detail}。
// 不信任后端之外的任何输入；所有写回走现有 gameStore / rpgStore。
import { ToolSchemas, type ToolName, type DynamicQuest } from "@nexus/shared";
import { useGameStore } from "../stores/gameStore";
import { useRPGStore, type ItemData, type QuestData } from "../rpg/rpgStore";

// §19.1/§19.2/§19.3 —— 白名单物品 → ItemData 模板（count 由调用方覆盖）
const ITEM_MAP: Record<string, ItemData> = {
  mat_iron: { id: "mat_iron", name: "철광석", type: "material", rarity: "common", icon: "⛏️", count: 1, description: "평원에서 채집한 강화용 철광석." },
  mat_parts: { id: "mat_parts", name: "범용 부품", type: "material", rarity: "common", icon: "🔩", count: 1, description: "수리·퀘스트용 범용 기계 부품." },
  mat_crystal: { id: "mat_crystal", name: "수정 군집", type: "material", rarity: "rare", icon: "💎", count: 1, description: "수정 평원에서 채집한 돌파·뽑기 재료." },
  con_repair: { id: "con_repair", name: "수리 키트", type: "consumable", rarity: "common", icon: "🧰", count: 1, stats: { maxHp: 0 }, description: "야외에서 HP 30% 회복.", effect: { type: "heal", value: 300 } } as ItemData,
  con_energy: { id: "con_energy", name: "에너지 음료", type: "consumable", rarity: "common", icon: "⚡", count: 1, stats: { maxHp: 0 }, description: "궁극기 에너지 +30.", effect: { type: "energy", value: 50 } } as ItemData,
  con_bait: { id: "con_bait", name: "벌레 유인제", type: "consumable", rarity: "common", icon: "🪤", count: 1, stats: { maxHp: 0 }, description: "20m 안의 적 유인.", effect: { type: "taunt" } } as ItemData,
  con_shield: { id: "con_shield", name: "비상 방패", type: "consumable", rarity: "rare", icon: "💊", count: 1, stats: { maxHp: 0 }, description: "즉시 방패 충전.", effect: { type: "shield", value: 999 } } as ItemData,
  eq_w_std: { id: "eq_w_std", name: "제식 소총검", type: "weapon", rarity: "common", icon: "⚔️", count: 1, stats: { attack: 18 }, description: "공격과 방어가 균형 잡힌 제식 무기." },
  eq_w_blade: { id: "eq_w_blade", name: "근접 칼날", type: "weapon", rarity: "common", icon: "🗡️", count: 1, stats: { attack: 22 }, description: "근접 강화 무기." },
  eq_w_rail: { id: "eq_w_rail", name: "원거리 레일건", type: "weapon", rarity: "common", icon: "🔫", count: 1, stats: { attack: 20 }, description: "원거리 강화 무기." },
  eq_a_std: { id: "eq_a_std", name: "제식 장갑", type: "armor", rarity: "common", icon: "🛡️", count: 1, stats: { defense: 10, maxHp: 180 }, description: "제식 장갑." },
  eq_c_std: { id: "eq_c_std", name: "제식 코어", type: "core", rarity: "common", icon: "🔋", count: 1, stats: { maxEnergy: 15 }, description: "제식 에너지 코어." },
};

function toQuestData(q: DynamicQuest): QuestData {
  return {
    id: q.id,
    title: q.title,
    description: q.dialogue.offer,
    type: q.type,
    target: q.objective.targetId,
    required: q.objective.count,
    current: 0,
    reward: {
      gold: q.rewards.gold,
      exp: q.rewards.exp,
      items: q.rewards.items?.map((i) => i.itemId),
    },
    status: "active",
  };
}

/** 执行 tool_call；回执供后端拼入 messages 让模型生成自然语言反馈 */
export async function executeTool(
  tool: ToolName,
  args: unknown
): Promise<{ ok: boolean; detail: string }> {
  // §34.4 前端二회 zod 校验
  const schema = ToolSchemas[tool];
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    return { ok: false, detail: `입력 확인 실패：${parsed.error.issues[0]?.message ?? "?"}` };
  }
  const a = parsed.data as Record<string, unknown> & { quest?: DynamicQuest };

  switch (tool) {
    case "set_weather": {
      useGameStore.getState().setWeather(String(a.weather));
      return { ok: true, detail: `날씨 변경: ${String(a.weather)}` };
    }
    case "give_currency": {
      const rpg = useRPGStore.getState();
      const gold = Number(a.gold ?? 0);
      const crystal = Number(a.crystal ?? 0);
      if (gold) rpg.addGold(gold);
      if (crystal) rpg.addGems(crystal);
      return { ok: true, detail: `지급: ${gold} 골드、${crystal} 수정` };
    }
    case "give_item": {
      const tpl = ITEM_MAP[String(a.itemId)];
      if (!tpl) return { ok: false, detail: `알 수 없는 아이템 ${String(a.itemId)}` };
      useRPGStore.getState().addItem({ ...tpl, count: Number(a.count) });
      return { ok: true, detail: `획득: ${tpl.name} ×${Number(a.count)}` };
    }
    case "repair_mecha": {
      const g = useGameStore.getState();
      const heal = g.player.maxHp - g.player.hp;
      if (heal <= 0) return { ok: true, detail: "메카가 멀쩡해요. 수리가 필요 없어요" };
      g.healPlayer(heal);
      const fee = Math.floor(heal * 0.4);
      useRPGStore.getState().addGold(-fee);
      return { ok: true, detail: `수리 완료: 회복 ${heal} HP，비용 ${fee} 골드` };
    }
    case "give_quest": {
      if (!a.quest) return { ok: false, detail: "퀘스트 정보 없음" };
      useRPGStore.setState((s) => ({ quests: [...s.quests, toQuestData(a.quest as DynamicQuest)] }));
      return { ok: true, detail: `의뢰 수락「${a.quest.title}」` };
    }
    case "spawn_enemy": {
      // P5/P6 接入 EnemySystem 实际生成；현재回执确认（NPC 可叙述"已发出信号"）
      return { ok: true, detail: `위치 표시: ${Number(a.count)}×${String(a.enemyId)} 등장 위치` };
    }
    case "unlock_map_marker": {
      return { ok: true, detail: `지도 표시 추가: ${String(a.poiId)}` };
    }
    case "trade": {
      // P5/P6 完整购物车结算（好感折扣）；현재回执确认
      const cartLen = Array.isArray(a.cart) ? a.cart.length : 0;
      return { ok: true, detail: `거래 완료（${cartLen} 개 상품）` };
    }
    default:
      return { ok: false, detail: `알 수 없는 도구 ${String(tool)}` };
  }
}
