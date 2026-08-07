# 发布检查单（GDD §28.1 + §15 验收对照）

> AI 系统（M0-M6）发布就绪度评估。日期：2026-08-02。

## §28.1 每次上线检查

| # | 项 | 状态 | 证据 |
|---|---|------|------|
| 1 | 评估五套全绿（CI 门禁） | ✅ | functional 31 + tools 33 + quest 24 + director 13；lore 待真 embedder |
| 2 | 平衡仿真报告无红线 | ⏸ | `sim/economySim.ts` 待实现（§26.2 蒙特卡洛） |
| 3 | 成本熔断阈值当日已校验 | ✅ | `router/budget.ts` + director-eval 熔断测试 |
| 4 | 罐头降级手动验证 | ✅ | 拔后端 → dialogueStore fallback → cannedReply（断网可对话） |
| 5 | 前端包体 gzip ≤ 3MB + Lighthouse ≥ 75 | ⏸ | 需 `npm run build` + Lighthouse 真机跑 |
| 6 | CHANGELOG + GDD 版本号 | ✅ | CHANGELOG.md [0.3.0]；GDD v1.2 |

## §15 验收清单（Definition of Done）

| # | 验收项 | 状态 | 证据 |
|---|--------|------|------|
| 1 | 打开 URL 30s 内进入可操作画面 | ⏸ | 需部署 + 真机测（前端单机已达标） |
| 2 | 与 4 LLM NPC 各 ≥5 轮对话，人设无崩坏、记忆跨会话 | ✅ 代码 | 四人设卡 + 四层记忆 + 评估；真 LLM key 待端到端 |
| 3 | "最近有什么活儿吗" → 合法动态任务并结算 | ✅ | quest-eval 24/24 + ws-quest-smoke 端到端 |
| 4 | 触发工具调用改变世界 | ✅ | toolExecutor + ws-smoke；真 LLM 主动调工具待验 |
| 5 | 3 环动态任务链，终环连续叙事 | ⚠️ 部分 | chain 字段贯通 + shouldChain 25%；多环触发需多次 quest 意图 |
| 6 | 遭遇 AI 导演事件，可完成可忽略 | ✅ | ws-director-smoke 端到端 + toast 可 dismiss |
| 7 | 断网后可继续战斗/探索/抽卡 | ✅ | 单机游戏层独立 + cannedFallback AI 降级 |
| 8 | 注入攻击 10 条全拦截 + 越权工具驳回 | ✅ | functional 注入测试 + arbiter 越权 100% |
| 9 | 性能预算 §11.7 全项达标 | ⏸ | 首 token P50≤1.2s 等需真 LLM + Locust wss 压测 |
| 10 | 五套评估 harness 报告归档 | ✅ | `apps/ai-server/src/eval/` + 各阶段 docs/plans 报告 |

## 端到端验证记录（Mock 模式）

- ✅ ws-smoke：连接 → session → 流式 token → done（usage）
- ✅ ws-quest-smoke：vera 任务请求 → quest_offered → 接受确认
- ✅ ws-director-smoke：8 次 trigger → 2 世界事件 + 同类冷却生效
- ✅ /metrics：kv/lore/sessions/budget 完整数据

## 发布前必做（真环境）

1. 配置 `.env`：`LLM_PRIMARY_API_KEY`（DeepSeek/OpenAI 兼容）+ `EMBEDDING_API_KEY`（bge-m3/DeepSeek embedding）
2. `docker compose up -d redis qdrant`
3. `npm run build` 检查包体 + Lighthouse
4. 真浏览器走 §15 验收清单第 1-9 项
5. Locust wss 压测 50 并发（§11.7）
6. 录屏 + README 截图更新

## 评估 harness 运行

```bash
cd mecha-world
npx tsx apps/ai-server/src/eval/functional.ts      # 业务管线
npx tsx apps/ai-server/src/eval/tools-eval.ts      # 工具+仲裁
npx tsx apps/ai-server/src/eval/quest-eval.ts      # 动态任务
npx tsx apps/ai-server/src/eval/director-eval.ts   # 导演+预算
npx tsx apps/ai-server/src/eval/run.ts             # lore RAG
```
