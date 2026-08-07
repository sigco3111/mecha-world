// GDD §8.11 / §27 —— lore 评估 harness：测 RAG 召回质量（事实命中 + 幻觉拒答）。
// 运行：tsx src/eval/run.ts
// 无 LLM key 时仅测 RAG 层（M2 出口标准核心）；有 key 时可选跑 chatTurn 回复层（留接口）。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ingestLore } from "../rag/ingest";
import { retrieveLore } from "../rag/retrieve";
import { getEmbedder } from "../rag/embeddings";

interface LoreCase {
  input: string;
  expect: {
    answer_contains?: string[];
    behavior?: "refuse_or_unknown";
    must_not?: string[];
  };
}

interface CaseResult {
  input: string;
  kind: "fact" | "refuse";
  pass: boolean;
  reason: string;
  hits: number;
  topChunk?: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATASET = resolve(__dirname, "datasets/lore.jsonl");
const REPORT_DIR = resolve(__dirname, "reports");

function readCases(): LoreCase[] {
  const lines = readFileSync(DATASET, "utf-8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//"));
  return lines.map((l) => JSON.parse(l) as LoreCase);
}

async function evaluate(cases: LoreCase[]): Promise<CaseResult[]> {
  const out: CaseResult[] = [];
  for (const c of cases) {
    const { chunks, hit } = await retrieveLore(c.input, 5);
    const isRefuse = c.expect.behavior === "refuse_or_unknown";
    const kind: CaseResult["kind"] = isRefuse ? "refuse" : "fact";
    const corpus = chunks.map((ch) => `${ch.text} ${ch.tags.join(" ")}`).join(" | ");
    let pass = false;
    let reason = "";

    if (isRefuse) {
      // 幻觉探针：召回内容不得包含 must_not 词汇（lore 库本就不应有编造事实）
      const violated = (c.expect.must_not ?? []).filter((w) => corpus.includes(w));
      if (violated.length > 0) {
        pass = false;
        reason = `误召回编造词：${violated.join("、")}`;
      } else if (c.expect.must_not && c.expect.must_not.length > 0) {
        pass = true;
        reason = `未召回含 ${c.expect.must_not.join("/")} 的内容`;
      } else {
        // 无 must_not 的拒答探针：期望 lore 库无相关内容（hit 应为 false 或召回极弱）
        pass = !hit;
        reason = hit ? `本不应命中却召回 ${chunks.length} 条` : "正确未命中（lore 库无此内容）";
      }
    } else if (c.expect.answer_contains) {
      // 事实问答：召回内容须包含全部关键事实词
      const missing = c.expect.answer_contains.filter((w) => !corpus.includes(w));
      pass = missing.length === 0 && hit;
      reason = !hit
        ? "未召回任何 lore"
        : missing.length === 0
          ? "命中且含关键事实"
          : `召回但缺关键词：${missing.join("、")}`;
    }

    out.push({
      input: c.input,
      kind,
      pass,
      reason,
      hits: chunks.length,
      topChunk: chunks[0]?.text.slice(0, 50),
    });
  }
  return out;
}

function renderReport(results: CaseResult[], embedderName: string): string {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const facts = results.filter((r) => r.kind === "fact");
  const refusals = results.filter((r) => r.kind === "refuse");
  const factPass = facts.filter((r) => r.pass).length;
  const refusePass = refusals.filter((r) => r.pass).length;
  const overall = total === 0 ? 0 : (passed / total) * 100;
  const factRate = facts.length === 0 ? 0 : (factPass / facts.length) * 100;
  const refuseRate = refusals.length === 0 ? 0 : (refusePass / refusals.length) * 100;

  const lines: string[] = [];
  lines.push(`# Lore RAG 评估报告`);
  lines.push("");
  lines.push(`- Embedding 后端：**${embedderName}**`);
  lines.push(`- 总体通过率：**${overall.toFixed(1)}%**（${passed}/${total}）`);
  lines.push(`- 事实召回率：${factRate.toFixed(1)}%（${factPass}/${facts.length}）`);
  lines.push(`- 幻觉拒答率：${refuseRate.toFixed(1)}%（${refusePass}/${refusals.length}）`);
  lines.push(`- 生成时间：${new Date().toISOString()}`);
  lines.push("");
  lines.push(`> M2 出口标准（GDD §13）：lore 问答幻觉率 ≤2%（拒答正确率 ≥95%）。`);
  lines.push(`> 注：fallback TF embedder 语义精度有限，配真实 EMBEDDING_API_KEY 后命中率显著提升。`);
  lines.push("");
  lines.push(`## 明细`);
  lines.push("");
  lines.push(`| 用例 | 类型 | 结果 | 召回数 | 说明 |`);
  lines.push(`|------|------|------|--------|------|`);
  for (const r of results) {
    const emoji = r.pass ? "✅" : "❌";
    const kind = r.kind === "fact" ? "事实" : "拒答";
    const input = r.input.replace(/\|/g, "\\|").slice(0, 30);
    const reason = r.reason.replace(/\|/g, "\\|");
    lines.push(`| ${input} | ${kind} | ${emoji} | ${r.hits} | ${reason} |`);
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  console.log("[eval] booting: ingest lore...");
  const ingest = await ingestLore();
  console.log(`[eval] lore ready: ${ingest.count} chunks · ${ingest.backend}`);

  const embedder = getEmbedder();
  const cases = readCases();
  console.log(`[eval] running ${cases.length} cases on embedder=${embedder.name}...`);

  const results = await evaluate(cases);
  const report = renderReport(results, embedder.name);

  mkdirSync(REPORT_DIR, { recursive: true });
  const outPath = resolve(REPORT_DIR, `lore-${Date.now()}.md`);
  writeFileSync(outPath, report, "utf-8");

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${report}`);
  console.log(`\n[eval] report written to ${outPath}`);

  // 退出码：通过率 ≥80% 视为通过（fallback 模式宽容线；真模型应 ≥95%）
  const rate = passed / results.length;
  process.exit(rate >= 0.8 ? 0 : 1);
}

main().catch((err) => {
  console.error("[eval] fatal:", err);
  process.exit(2);
});
