# M4（P4）阶段完成报告 —— 动态任务生成

> 对应 GDD §13 里程碑 M4。完成日期：2026-08-02。
> 前置：M0-M3 ✅。

## 出口标准达成（GDD §13）

| 标准 | 状态 | 证据 |
|------|------|------|
| 五级校验（§35.6） | ✅ | `quest/validate.ts`（schema/completable/reward/text/dedup）|
| 生成管线 + refine + 兜底 | ✅ | `quest/generate.ts`（§A.5 prompt + JSON 模式 + ≤3 refine + 模板兜底）|
| 任务链（§8.7 25%） | ✅ | `shouldChain()` + chain.seq/total 传递 |
| 校验通过率 ≥90% | ✅ | `eval/quest-eval.ts` **24/24**；多等级模板 100% 通过 |
| 3 环链可游玩 | ⚠️ 单环验证完成 | chain 字段贯通；多环触发留 P5（与导演事件结合）|

## 交付物

### 后端 quest/
- `validate.ts` —— 五级校验：v1 schema(zod) / v2 completable(zone+target+kill count ∈ [lv-2,lv+2]) / v3 reward(gold ∈ [120×lv×0.8×coef, ×1.3×coef], crystal 仅第3环) / v4 text(占位符+敏感词) / v5 dedup(Jaccard ≥0.7 拒)
- `generate.ts` —— §A.5 prompt + 真 LLM JSON 模式 + generate-and-refine（≤3，失败原因回灌）+ 模板兜底；`templateQuest()` 保证过校验；`shouldChain()` 25% 触发后续环

### 后端集成（升级）
- `chatTurn.ts` —— quest 意图检测（`QUEST_INTENT_RE` + NPC give_quest 权限）→ 步骤12 done 后 `generateQuest` → `io.onQuestOffered` 推送 → 玩家确认 → `recordQuestEvent`
- `wsGateway.ts` —— `onQuestOffered` 发 `{type:"quest_offered"}` + 等 `intent`（60s 超时）；intent 路由（quest=接受/其他=拒绝）；断线清理

### 前端
- `stores/dialogueStore.ts` —— `offeredQuest` state + `acceptQuest`（复用 toolExecutor give_quest 写入 rpgStore + 发 intent）/ `rejectQuest` + quest_offered 处理
- `ai/DialoguePanel.tsx` —— 任务确认卡 UI（标题/难度/目标/奖励/对白 + 接受/婉拒按钮）

### 评估
- `eval/quest-eval.ts` —— 8 组 24 用例（合法/各 v2-v5 边界/mock 生成/多等级模板/任务链概率）
- `eval/ws-quest-smoke.ts` —— 端到端冒烟（vera → 任务请求 → quest_offered → 接受）

## 验证

| 检查 | 结果 |
|------|------|
| ai-server / game tsc | ✅ 零错误 |
| functional（M2 回归） | ✅ 31/31 |
| tools-eval（M3 回归） | ✅ 33/33 |
| quest-eval（P4） | ✅ 24/24 |
| quest 端到端冒烟 | ✅ 「废料场清剿」生成 → 接受确认 |

## 关键决策

1. **quest 走独立路径而非 give_quest 工具**：后端 generate+五级校验保证质量（§8.7），避免模型直接 give_quest 生成不合法 quest。模型仍可在对话中主动调 give_quest（P3 路径保留，zod 兜底）。
2. **io.onQuestOffered 回调解耦**：chatTurn 通过 Promise 等玩家确认，wsGateway 实现 WS 推送+intent 等待，与传输层解耦。
3. **模板兜底保证可用**：mock / 生成失败 / refine 全败 时用 templateQuest（基于等级+区域，保证过校验），玩家始终能接到任务（§38.4）。
4. **done 后推送 quest**：模型先正常对话回复，done 后推送 quest 卡，时序清晰且不阻塞对话。
5. **修了 templateQuest 高等级 count bug**：原 min(8,lv) 致 Lv15 kill 范围[13,17]不满足 → 改 min(20,lv) 用等级本身（始终在 [lv-2,lv+2]）。

## 已知局限

- **意图检测为关键词**：P5 用 LangGraph classifyIntent 替换（更准）。
- **recentTitles dedup 暂空**：P5/P6 补 quest 历史存储。
- **3 环链多环触发**：chain 字段贯通，但交付时连续触发需 P5 导演事件或多次 quest 意图。

## 下一阶段 P5（M5 AI 导演 + 成本看板）

- `agents/director.ts`（§35.7）：每 20-40min 唤醒，A.6 prompt 选 1 事件
- 5 类世界事件（caravan_attack/crystal_surge/swarm_tide/bounty_target/none）
- `router/budget.ts`：日预算熔断 + 成本累积
- `/metrics` 增强 + 前端开发者成本看板
- world_event 推送 + 前端 toast
