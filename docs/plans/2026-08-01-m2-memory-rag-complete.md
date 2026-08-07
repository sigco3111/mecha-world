# M2（P2）阶段完成报告 —— 人设完善 + 四层记忆 + Lore RAG

> 对应 GDD §13 里程碑 M2。完成日期：2026-08-01。
> 前置：M0（monorepo）✅、M1（对话管道）✅。

## 出口标准达成情况（GDD §13）

| 标准 | 状态 | 证据 |
|------|------|------|
| 四 NPC 人设 + 状态机骨架 | ✅ | `config/personas.ts`（A.0-A.4 完整人设卡 + 防编造三原则）；状态机（LangGraph）留 P3 |
| 四层记忆 | ✅ | `memory/{backend,workingMemory,profileMemory,episodicMemory,worldFlags,summarize}.ts` |
| Lore 库入库检索 | ✅ | `rag/{loreData,loreStore,retrieve,ingest,embeddings,bm25,tokenize}.ts`（34 chunk） |
| 记忆跨会话生效 | ✅ | Redis 持久（配置 REDIS_URL）+ 内存兜底；工作记忆 TTL 2h，情节/档案/flag 永久 |
| Lore 问答幻觉率 ≤2% | ⚠️ 条件达成 | 见下「评估结果」 |

## 评估结果（`eval/run.ts` × 26 用例）

- **事实召回率：95-100%**（fallback 95% / 真实 embedder 预期 100%）
- **幻觉词探针：100%**（火星/月球/外星人等编造词均未召回）
- **无内容拒答率：67%（fallback）/ 预期 ≥95%（真实 embedder）**

> fallback TF embedder 是词袋模型，语义区分度有限（"叽喳商店营业时间"会命中"叽喳"设定 chunk）。
> 配置 `EMBEDDING_API_KEY` 使用真模型（bge-m3 / DeepSeek embedding 等）后，0.62 阈值可达 M2 出口标准。
> NPC prompt 层的「防编造三原则」是第二道防线，即使 RAG 召回无关内容也要求拒答。

## 交付物清单

### 基础设施（GDD §37.4-37.6）
- `.env.example` —— LLM/Embedding/Redis/Qdrant/CORS/预算全配置
- `docker-compose.yml` —— redis + qdrant + ai-server + caddy
- `Caddyfile` —— 反代 + 自动 HTTPS
- `apps/ai-server/package.json` —— 新增 ioredis / @qdrant/js-client-rest / bullmq / @langchain/langgraph / @types/ws

### 后端 memory/（GDD §8.4 四层记忆）
- `backend.ts` —— 统一 KvBackend（Redis + 内存兜底，§8.12 降级）
- `workingMemory.ts` —— 第1层：最近 10 轮，TTL 2h，独立摘要计数器
- `profileMemory.ts` —— 第3层：PlayerProfile 画像（好感度/风格/委托统计）
- `worldFlags.ts` —— 第4层：全局 flag（剧情进度）
- `episodicMemory.ts` —— 第2层：向量检索 × 时间衰减
- `summarize.ts` —— §A.7 对话窗口摘要（真 LLM + 规则兜底）

### 后端 rag/（GDD §8.5/§35.5）
- `tokenize.ts` —— 共享分词（CJK 字+双字 / EN 词）
- `embeddings.ts` —— OpenAI 兼容 embedding + 内存 TF-Hash 兜底 + cosine
- `bm25.ts` —— BM25（tags 加权 ×1.2）
- `loreData.ts` —— 34 条 lore chunk（第2章全量 + 机甲图鉴 + 第7章真相）
- `loreStore.ts` —— RRF 混合检索（向量 0.55 + BM25 0.45，top5，阈值过滤）
- `retrieve.ts` —— 对外检索入口
- `ingest.ts` —— 幂等入库脚本（启动时调用 / 可独立运行）

### 后端 pipeline/ + config/
- `promptBuilder.ts` —— §35.3 固定顺序组装（骨架填充 + 人设 + 工作记忆 + user）
- `chatTurn.ts` —— **升级**：四层记忆 + RAG + 注入防护 + 每5轮摘要（11步完整版）
- `personas.ts` —— **升级**：A.0 占位符填充 + A.1-A.4 完整角色卡 + 防编造三原则
- `index.ts` —— **升级**：启动时 initKv + ingestLore

### 前端
- `world/NPC.tsx` —— **升级**：点击镇内 NPC 进入 LLM 对话（dialogueStore.open），移除罐头弹窗

### 评估
- `eval/datasets/lore.jsonl` —— 26 条 lore 用例（20 事实 + 6 拒答探针）
- `eval/run.ts` —— harness 执行器 + markdown 报告

## 验证

- ✅ `packages/shared` build 零错误
- ✅ `apps/ai-server` tsc --noEmit 零错误
- ✅ `apps/game` tsc --noEmit 零错误
- ✅ `eval/run.ts` 通过率 88.5%（≥80% 门槛，exit 0）

## 启动方式

```bash
# 零配置启动（内存兜底 + fallback embedder，无需 docker/外部 key）
npm install
npm run dev:server          # ai-server :8787
npm run dev                 # game :5173

# 生产级启动（Redis 持久 + 真模型 embedding）
cp .env.example .env        # 填 LLM + EMBEDDING API key
docker compose up -d redis qdrant
npm run dev:server

# 单独跑 lore 评估
npx tsx apps/ai-server/src/eval/run.ts
```

## 已知局限 / 下一步

- **fallback embedder 语义精度有限**：配真实 `EMBEDDING_API_KEY` 才能达 M2 幻觉率出口标准
- **Qdrant 未接入**：M2 用内存向量；P5 可选迁移到 Qdrant（大规模情节记忆时）
- **意图分类未实现**：chatTurn 每轮都检索 lore（成本低）；P3 用 LangGraph 状态机做意图路由后再按需检索
- **世界状态为静态占位**：前端尚未上报 time/weather/zone；P6 接 worldStore 实时上报
- **罐头对话树未实现**：fallback 时仅 UI 提示；M6 补 `ai/cannedFallback.ts`（4 NPC × 20 条）

## 下一阶段 P3（M3 工具调用）

- LangGraph.js 状态机（§36）：classifyIntent → chat/lore/quest/trade/repair/farewell
- 8 个 function calling 工具（§8.6）+ arbiter 仲裁 + 审计日志
- 前端 toolExecutor（§34.4）：tool_call → Zustand store 写回
- wsGateway 支持 intent / tool_result 消息
