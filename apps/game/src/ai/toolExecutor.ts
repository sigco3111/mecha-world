// GDD §34.4 —— tool_call 前端执行器：zod 二次校验 → store action → 回执 {ok, detail}。
// 不信任后端之外的任何输入；所有写回走现有 gameStore / rpgStore。
import { ToolSchemas, type ToolName, type DynamicQuest } from "@nexus/shared";
import { useGameStore } from "../stores/gameStore";
import { useRPGStore, type ItemData, type QuestData } from "../rpg/rpgStore";

// §19.1/§19.2/§19.3 —— 白名单物品 → ItemData 模板（count 由调用方覆盖）
const ITEM_MAP: Record<string, ItemData> = {
  mat_iron: { id: "mat_iron", name: "铁矿", type: "material", rarity: "common", icon: "⛏️", count: 1, description: "平原采集的铁矿，用于强化。" },
  mat_parts: { id: "mat_parts", name: "通用零件", type: "material", rarity: "common", icon: "🔩", count: 1, description: "通用机械零件，修理/任务用。" },
  mat_crystal: { id: "mat_crystal", name: "晶簇", type: "material", rarity: "rare", icon: "💎", count: 1, description: "晶簇原野采集，突破/抽卡材料。" },
  con_repair: { id: "con_repair", name: "修理包", type: "consumable", rarity: "common", icon: "🧰", count: 1, stats: { maxHp: 0 }, description: "野外恢复 30% HP。", effect: { type: "heal", value: 300 } } as ItemData,
  con_energy: { id: "con_energy", name: "能量饮料", type: "consumable", rarity: "common", icon: "⚡", count: 1, stats: { maxHp: 0 }, description: "大招能量 +30。", effect: { type: "energy", value: 50 } } as ItemData,
  con_bait: { id: "con_bait", name: "虫群诱饵", type: "consumable", rarity: "common", icon: "🪤", count: 1, stats: { maxHp: 0 }, description: "吸引 20m 内敌人。", effect: { type: "taunt" } } as ItemData,
  con_shield: { id: "con_shield", name: "应急护盾", type: "consumable", rarity: "rare", icon: "💊", count: 1, stats: { maxHp: 0 }, description: "立即回充护盾。", effect: { type: "shield", value: 999 } } as ItemData,
  eq_w_std: { id: "eq_w_std", name: "制式步枪刃", type: "weapon", rarity: "common", icon: "⚔️", count: 1, stats: { attack: 18 }, description: "制式武器，攻守均衡。" },
  eq_w_blade: { id: "eq_w_blade", name: "近战偏重型刃", type: "weapon", rarity: "common", icon: "🗡️", count: 1, stats: { attack: 22 }, description: "近战强化武器。" },
  eq_w_rail: { id: "eq_w_rail", name: "远程偏轨枪", type: "weapon", rarity: "common", icon: "🔫", count: 1, stats: { attack: 20 }, description: "远程强化武器。" },
  eq_a_std: { id: "eq_a_std", name: "制式装甲", type: "armor", rarity: "common", icon: "🛡️", count: 1, stats: { defense: 10, maxHp: 180 }, description: "制式装甲。" },
  eq_c_std: { id: "eq_c_std", name: "制式核心", type: "core", rarity: "common", icon: "🔋", count: 1, stats: { maxEnergy: 15 }, description: "制式能量核心。" },
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
  // §34.4 前端二次 zod 校验
  const schema = ToolSchemas[tool];
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    return { ok: false, detail: `参数校验失败：${parsed.error.issues[0]?.message ?? "?"}` };
  }
  const a = parsed.data as Record<string, unknown> & { quest?: DynamicQuest };

  switch (tool) {
    case "set_weather": {
      useGameStore.getState().setWeather(String(a.weather));
      return { ok: true, detail: `天气已切换为 ${String(a.weather)}` };
    }
    case "give_currency": {
      const rpg = useRPGStore.getState();
      const gold = Number(a.gold ?? 0);
      const crystal = Number(a.crystal ?? 0);
      if (gold) rpg.addGold(gold);
      if (crystal) rpg.addGems(crystal);
      return { ok: true, detail: `发放 ${gold} 金币、${crystal} 晶钻` };
    }
    case "give_item": {
      const tpl = ITEM_MAP[String(a.itemId)];
      if (!tpl) return { ok: false, detail: `未知物品 ${String(a.itemId)}` };
      useRPGStore.getState().addItem({ ...tpl, count: Number(a.count) });
      return { ok: true, detail: `获得 ${tpl.name} ×${Number(a.count)}` };
    }
    case "repair_mecha": {
      const g = useGameStore.getState();
      const heal = g.player.maxHp - g.player.hp;
      if (heal <= 0) return { ok: true, detail: "机甲完好，无需修理" };
      g.healPlayer(heal);
      const fee = Math.floor(heal * 0.4);
      useRPGStore.getState().addGold(-fee);
      return { ok: true, detail: `修理完成：恢复 ${heal} HP，费用 ${fee} 金币` };
    }
    case "give_quest": {
      if (!a.quest) return { ok: false, detail: "任务对象缺失" };
      useRPGStore.setState((s) => ({ quests: [...s.quests, toQuestData(a.quest as DynamicQuest)] }));
      return { ok: true, detail: `已接取委托「${a.quest.title}」` };
    }
    case "spawn_enemy": {
      // P5/P6 接入 EnemySystem 实际生成；当前回执确认（NPC 可叙述"已发出信号"）
      return { ok: true, detail: `已标记 ${Number(a.count)}×${String(a.enemyId)} 出现位置` };
    }
    case "unlock_map_marker": {
      return { ok: true, detail: `已点亮地图标记 ${String(a.poiId)}` };
    }
    case "trade": {
      // P5/P6 完整购物车结算（好感折扣）；当前回执确认
      const cartLen = Array.isArray(a.cart) ? a.cart.length : 0;
      return { ok: true, detail: `交易完成（${cartLen} 项商品）` };
    }
    default:
      return { ok: false, detail: `未知工具 ${String(tool)}` };
  }
}
