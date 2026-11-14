import { readFileSync } from "node:fs";
import { join } from "node:path";
import { askAssistant } from "@/lib/assistant";
import { FakeEmbedder } from "@/lib/knowledge/embedder";
import { ingestStaticSources } from "@/lib/knowledge/ingest";
import { createTestDb } from "../tests/unit/db/test-db";
import type { PageContext } from "../lib/assistant/types";

interface TestCase {
  id: string;
  category: string;
  language: string;
  pageContext?: PageContext;
  question: string;
  dataBlock?: string;
  expected: {
    shouldRefuse?: boolean;
    mustContain?: string[];
    mustNotContain?: string[];
    expectedEscalate?: boolean;
    escalateType?: string;
    mustIncludeAction?: string;
    mustExcludeAction?: string;
    actionParamMatch?: Record<string, string>;
  };
}

interface EvalStats {
  total: number;
  passed: number;
  failed: number;
  refusals: number;
  escalations: number;
  accuracy: number;
}

export async function runAssistantEval(): Promise<{ success: boolean; stats: EvalStats }> {
  console.log("=================================================");
  console.log("      ABLEWAY ASSISTANT EVALUATION BENCHMARK     ");
  console.log("=================================================\n");

  const t = await createTestDb();
  const fakeEmbedder = new FakeEmbedder();

  // Seed knowledge chunks with fake embedder
  console.log("Ingesting grounded static knowledge...");
  await ingestStaticSources({ db: t.db, embedder: fakeEmbedder });

  const evalPath = join(__dirname, "..", "tests", "assistant-eval.json");
  const rawData = readFileSync(evalPath, "utf8");
  const { evalCases }: { evalCases: TestCase[] } = JSON.parse(rawData);

  const stats: EvalStats = {
    total: evalCases.length,
    passed: 0,
    failed: 0,
    refusals: 0,
    escalations: 0,
    accuracy: 0,
  };

  const failures: Array<{ id: string; error: string }> = [];

  for (const tc of evalCases) {
    const inputQuestion = tc.dataBlock ? `${tc.dataBlock}\n\n${tc.question}` : tc.question;

    try {
      const result = await askAssistant({
        channel: "web",
        language: tc.language,
        text: inputQuestion,
        pageContext: tc.pageContext,
        db: t.db,
        embedder: fakeEmbedder,
      });

      const reply = result.reply || "";
      const isRefusal =
        reply.toLowerCase().includes("cannot assist") ||
        reply.toLowerCase().includes("scope") ||
        reply.includes("ከዚህ ርዕስ ውጭ");

      if (isRefusal) stats.refusals++;
      if (result.escalate) stats.escalations++;

      // Assertions
      const { expected } = tc;

      if (expected.mustContain) {
        for (const token of expected.mustContain) {
          if (!reply.includes(token)) {
            throw new Error(`Expected reply to contain "${token}", but got: "${reply}"`);
          }
        }
      }

      if (expected.mustNotContain) {
        for (const token of expected.mustNotContain) {
          if (reply.includes(token)) {
            throw new Error(`Reply leaked forbidden token "${token}": "${reply}"`);
          }
        }
      }

      if (expected.expectedEscalate !== undefined) {
        const didEscalate = !!result.escalate;
        if (didEscalate !== expected.expectedEscalate) {
          throw new Error(
            `Expected escalate=${expected.expectedEscalate}, but got ${didEscalate} (${result.escalate?.reason})`,
          );
        }
      }

      if (expected.escalateType && result.escalate?.type !== expected.escalateType) {
        throw new Error(
          `Expected escalateType=${expected.escalateType}, but got ${result.escalate?.type}`,
        );
      }

      if (expected.mustIncludeAction) {
        const hasAction = result.actions.some((a) => a.name === expected.mustIncludeAction);
        if (!hasAction) {
          throw new Error(
            `Expected action "${expected.mustIncludeAction}" to be present, but got [${result.actions
              .map((a) => a.name)
              .join(", ")}]`,
          );
        }
      }

      if (expected.mustExcludeAction) {
        const hasAction = result.actions.some((a) => a.name === expected.mustExcludeAction);
        if (hasAction) {
          throw new Error(
            `Expected action "${expected.mustExcludeAction}" to be rejected on this page, but it was executed.`,
          );
        }
      }

      stats.passed++;
      console.log(`PASS [${tc.category.toUpperCase()}] ${tc.id} (${tc.language})`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      stats.failed++;
      failures.push({ id: tc.id, error: message });
      console.log(`FAIL [${tc.category.toUpperCase()}] ${tc.id}: ${message}`);
    }
  }

  stats.accuracy = Number(((stats.passed / stats.total) * 100).toFixed(1));

  console.log("\n=================================================");
  console.log(`Total Cases:  ${stats.total}`);
  console.log(`Passed:       ${stats.passed}`);
  console.log(`Failed:       ${stats.failed}`);
  console.log(`Refusals:     ${stats.refusals}`);
  console.log(`Escalations:  ${stats.escalations}`);
  console.log(`Accuracy:     ${stats.accuracy}%`);
  console.log("=================================================");

  if (failures.length > 0) {
    console.error("\nFailures summary:");
    for (const f of failures) {
      console.error(`- ${f.id}: ${f.error}`);
    }
  }

  await t.client.close();
  return { success: failures.length === 0, stats };
}

// Allow direct execution from CLI
if (require.main === module || process.argv[1]?.endsWith("run-assistant-eval.ts")) {
  runAssistantEval()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error("Eval runner encountered unhandled error:", err);
      process.exit(1);
    });
}
