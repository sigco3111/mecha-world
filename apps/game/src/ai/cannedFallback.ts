// GDD §11.2/§8.12 —— 罐头降级对话：后端不可用时前端本地生成 NPC 回复（保证断网可对话）。
import type { NpcId } from "@nexus/shared";

interface CannedPool {
  default: string[];
  quest?: string[];
  repair?: string[];
  trade?: string[];
}

const POOLS: Record<NpcId, CannedPool> = {
  echo: {
    default: [
      "本核在呢……吧？信号有点飘，但本核没走。",
      "喂——你还在吗？本核听不太清自己了，但记得你。",
      "线不太稳，本核先凑合着陪你。别担心。",
      "（灵核信号噪声）……本核刚才说什么来着？算了，你还在就好。",
    ],
  },
  babs: {
    default: [
      "小子，灵核信号断了，回头再聊。修东西的事不跑。",
      "我这儿收音机都雪花屏了，晚点来找我。",
      "信号不好，但我老扳手还在。机甲有事就放着。",
      "想当年信号好的时候……算了，不讲了，回头说。",
    ],
    repair: ["机甲先放着，信号回来我给你看。老规矩。"],
    quest: ["委托的事我记下了，回头细说。"],
  },
  vera: {
    default: [
      "……信号不稳。我的王牌，回头再谈。",
      "情报暂时收不到，你先小心野外的虫群。",
      "特价还作数，但现在我说不了话。回头来。",
      "（沉默片刻）……线路有杂音。保重。",
    ],
    quest: ["悬赏的事，信号好了我给你留一单。特价。"],
    trade: ["交易回头办，先保命要紧。"],
  },
  jicha: {
    default: [
      "哐当！信号断了！本机先收摊！",
      "叮——本机听不见！回头再聊！哐当！",
      "本机精密零件怕这破信号！晚点来！",
      "（静电噪音）……本机刚才在唱歌你听见没？没有？那算了哐当！",
    ],
    trade: ["买卖回头办哐当！本机先躲雷雨去！"],
  },
};

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0] ?? "...";
}

/** 罐头回复：根据玩家文本关键词路由（任务/修理/交易/闲聊） */
export function cannedReply(npcId: NpcId, text: string): string {
  const pool = POOLS[npcId];
  if (/任务|委托|活儿|赏金|差事/.test(text) && pool.quest) return pick(pool.quest);
  if (/修|坏|装|改/.test(text) && pool.repair) return pick(pool.repair);
  if (/买|卖|价|交易|货|多少钱/.test(text) && pool.trade) return pick(pool.trade);
  return pick(pool.default);
}
