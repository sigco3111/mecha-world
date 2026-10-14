// GDD §11.2/§8.12 —— 罐头降级对话：后端不可用时前端本地生成 NPC 回复（保证断网可对话）。
import type { NpcId } from "@nexus/shared";

interface CannedPool {
  default: string[];
  quest?: string[];
  repair?: string[];
  trade?: string[];
}

const POOLS: Record<NpcId, CannedPool> = {
  echo: { default: ["나 여기 있어. 정적 배포에서는 로컬 대화만 할 수 있어.", "걱정하지 마. 함께 탐험해 보자.", "새로운 AI 답변은 없지만 준비된 대사로 이야기할 수 있어.", "오늘은 어느 쪽으로 갈까?"] },
  babs: { default: ["렌치 타운에 온 걸 환영해, 꼬마.", "정비소는 언제나 열려 있어. 메카를 잘 돌보라고.", "동쪽 폐기장의 적은 연습 상대로 좋아.", "든든한 장비가 목숨을 지켜주지."], repair: ["수리 키트는 가방에서 사용할 수 있어. 이 대화로 자동 수리되지는 않아."], quest: ["퀘스트 목록에서 의뢰를 확인해. 여기서는 새 AI 의뢰가 생성되지 않아."] },
  vera: { default: ["우리 에이스, 야외의 적을 조심해.", "적 메카 10대를 처치하면 보스가 나타나.", "준비된 퀘스트부터 확인해 봐.", "좋은 장비와 전략이 필요해."], quest: ["기본 퀘스트는 퀘스트 목록에서 받을 수 있어."], trade: ["아이템 거래는 상점 메뉴를 이용해."] },
  jicha: { default: ["딩! 귀한 손님! 오늘도 좋은 하루예요!", "골드가 모자라면 적 메카를 잡으세요! 쾅!", "좋은 장비가 생존의 열쇠랍니다!", "여기는 로컬 대화예요. 거래는 상점 메뉴로!"], trade: ["물건은 상점에서 보세요! 쾅!"] },
};

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0] ?? "...";
}

/** 罐头回复：根据玩家文本关键词路由（퀘스트/修理/交易/闲聊） */
export function cannedReply(npcId: NpcId, text: string): string {
  const pool = POOLS[npcId];
  if (/퀘스트|의뢰|임무|현상금/.test(text) && pool.quest) return pick(pool.quest);
  if (/수리|고장|정비/.test(text) && pool.repair) return pick(pool.repair);
  if (/구매|판매|가격|거래|물건|얼마/.test(text) && pool.trade) return pick(pool.trade);
  return pick(pool.default);
}
