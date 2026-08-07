# M3（P3）阶段完成报告 —— 工具调用（Function Calling）

> 对应 GDD §13 里程碑 M3。完成日期：2026-08-02。
> 前置：M0/M1/M2 ✅。

## 出口标准达成（GDD §13）

| 标准 | 状态 | 证据 |
|------|------|------|
| 8 个工具全实现 | ✅ | `tools/registry.ts`（OpenAI function spec）+ shared `ToolSchemas`（zod）|
| 仲裁 | ✅ | `tools/arbiter.ts`（权限/冷却/限额/等级/连续驳回禁用，§8.6 全规则）|
| 前端执行器 | ✅ | `ai/toolExecutor.ts`（zod 二次校验 → gameStore/rpgStore 写回）|
| 审计日志 | ✅ | `tools/auditLog.ts`（append-only，§40.2 不记对话原文）|
| 工具正确率 ≥95% | ✅ | `eval/tools-eval.ts`：**33/33** |
| 越权 100% 拦截 | ✅ | arbiter 越权测试 + 连续驳回禁用测试全绿 |

## 交付物清单

### 后端 tools/
- `registry.ts` —— 8 工具 OpenAI function spec + `specFor(npcId)` 按 NPC_TOOL_PERMISSIONS 过滤
- `arbiter.ts` —— §8.6 仲裁器：权限/冷却(set_weather 30min, spawn_enemy 10min)/会话限额(give_quest 日3, give_item 会话2, give_currency 会话3)/等级(spawn_enemy >玩家+3 拒)/连续驳回2次禁用
- `auditLog.ts` —— append-only 审计（KV 持久，上限 1000 条）

### 后端 config/
- `enemies.ts` —— §37.2 敌人配置 + `isEnemyTooStrong()` 等级校验

### 后端 router/pipeline/gateway（升级）
- `modelRouter.ts` —— **升级**：`ChatMessage` 扩展 tool role（tool_calls/tool_call_id）；`StreamChunk` 加 toolCalls；`OpenAICompatProvider.chatStream` 加 `opts.tools` + 流式 tool_calls 累积解析（按 index 合并 name/arguments）
- `toolLoop.ts` —— **新增** §35.4：模型输出 tool_call → zod 校验 → arbiter 仲裁 → 审计 → `io.onToolCall` 下发前端 → 回执拼入 messages（role:"tool"）→ 模型生成反馈；≤3 轮
- `chatTurn.ts` —— **升级**：`ChatTurnIO` 加 `onToolCall`；步骤 8-10 改用 `runModelWithTools`
- `wsGateway.ts` —— **升级**：`onToolCall` 发 `{type:"tool_call"}` + 等 `tool_result`（30s 超时 → E2003）；`tool_result` 路由到 pending resolver；断线清理未决工具调用

### 前端
- `ai/toolExecutor.ts` —— **新增**：zod 二次校验 → 8 工具对接现有 store（set_weather→gameStore, give_currency/give_item/give_quest/repair_mecha/trade→rpgStore）+ 物品模板表（§19 白名单→ItemData）
- `stores/dialogueStore.ts` —— **升级**：`_handle` 加 tool_call 分支（执行→回执→对话内 system 消息显示结果）

### 评估
- `eval/tools-eval.ts` —— 9 组 33 用例（注册表/越权/冷却/限额/等级/zod/审计/连续驳回）
- `eval/functional.ts` —— **升级**：io 加 onToolCall（M2 回归 31/31）

## 验证

| 检查 | 结果 |
|------|------|
| `apps/ai-server` tsc --noEmit | ✅ 零错误 |
| `apps/game` tsc --noEmit | ✅ 零错误 |
| 功能测试（M2 回归） | ✅ 31/31 |
| 工具评估（P3） | ✅ 33/33 |
| WS 端到端冒烟 | ✅ session→token→done（P3 改造零回归）|

## 关键设计决策

1. **tool_call 抽象通过 io 回调解耦**：chatTurn 的 `onToolCall(callId,tool,args) → Promise<{ok,detail}>` 让工具下发/等待与传输层解耦；wsGateway 实现为 WS 发送+pending resolver+超时，纯逻辑可单测。
2. **双重 zod 校验**：后端 toolLoop 用 `ToolSchemas` 校验模型输出（不信任 LLM）；前端 toolExecutor 再校验一次（§34.4 不信任后端之外的任何输入）。
3. **mock 模式行为兼容**：MockProvider 不输出 toolCalls → toolLoop 第一轮纯文本收尾；M2 对话功能不受 P3 影响（回归 31/31 证明）。
4. **ChatMessage 扩展 tool role**：支持 OpenAI 标准的 assistant(tool_calls) + tool(tool_call_id) 消息流，toolLoop 多轮上下文完整。
5. **连续驳回禁用**：arbiter 记录 rejectStreak，连续 2 次驳回该工具本会话禁用（§8.6 反复越权保护）。

## 已知局限 / 下一步

- **工具端到端需真 LLM 触发**：Mock 不产生 toolCalls；配 `LLM_PRIMARY_API_KEY`（DeepSeek/OpenAI 兼容）后可在浏览器实际体验"老扳手切天气→下雨→远程减速"。
- **spawn_enemy / trade 前端为占位回执**：3D EnemySystem 实际生成 + 购物车结算留 P5/P6。
- **intent 消息未路由**：`classifyIntent` + LangGraph 状态机留 P4（动态任务）/P5（导演）配套实现。
- **Echo 战斗播报**（§24）与 **AI 导演**（§8.8）留 P5。

## 启动方式（不变）

```bash
npm run dev:server   # 后端 :8787（mock 模式无需 key）
npm run dev          # 前端 :5173
npx tsx apps/ai-server/src/eval/tools-eval.ts   # 工具评估
npx tsx apps/ai-server/src/eval/functional.ts   # 功能测试
```

## 下一阶段 P4（M4 动态任务）

- `quest/generate.ts`（§A.5 生成 prompt）+ `quest/validate.ts`（§35.6 五级校验）
- 任务链（25% 触发后续环，最多 3 环）
- wsGateway 支持 `quest_offered` + 玩家确认 → `give_quest`
- 前端任务面板对接 DynamicQuest
