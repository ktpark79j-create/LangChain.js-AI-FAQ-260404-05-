// langchain_dev (프로젝트 폴더)
//     |------server.ts     ←     Node의 Http서버 or Express 서버 + LangGraph기반의 Agent + tools
//     |------public/
//                 |-----client.html       ←  클라이언트에게 제공되는 UI
//     |------package.json
//     |------tsconfig.json
//     |------.env

// http://localhost:3000 GET 요청 
// /client.html 응답
// 질문 입력 & 기능 선택  요청 전송(Post Request)  url : /api/ask 

import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearch } from "@langchain/tavily";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import { fileURLToPath } from "url";

 
// 1. Tool 정의 
const calculator = tool(
  async ({ a, b }) => {
    const result = a + b;
    console.log(`  [add_numbers] ${a} + ${b} = ${result}`);
    return result.toString();
  },
  {
    name: "add_numbers",
    description: "두 숫자를 더합니다. a와 b는 숫자입니다.",
    schema: z.object({
      a: z.number().describe("첫 번째 숫자"),
      b: z.number().describe("두 번째 숫자"),
    }),
  }
);

const multiplier = tool(
  async ({ a, b }) => {
    const result = a * b;
    console.log(`  [multiply_numbers] ${a} × ${b} = ${result}`);
    return result.toString();
  },
  {
    name: "multiply_numbers",
    description: "두 숫자를 곱합니다.",
    schema: z.object({
      a: z.number().describe("첫 번째 숫자"),
      b: z.number().describe("두 번째 숫자"),
    }),
  }
);

const searchTool = new TavilySearch({
  maxResults: 5,
  searchDepth: "advanced",
});

const webSearch = tool(
  async ({ query }) => {
    console.log(`  [web_search] 검색 중: "${query}"`);
    const result = await searchTool.invoke({ query });
    return typeof result === "string" ? result : JSON.stringify(result);
  },
  {
    name: "web_search",
    description:
      "인터넷에서 최신 정보를 검색합니다. 뉴스, 주가, 시사 이슈 등 실시간 정보가 필요할 때 사용합니다.",
    schema: z.object({
      query: z.string().describe("검색 쿼리 (구체적일수록 좋습니다)"),
    }),
  }
);

const getCurrentTime = tool(
  async () => {
    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    console.log(`  [get_current_time] ${now}`);
    return `현재 한국 시간: ${now}`;
  },
  {
    name: "get_current_time",
    description: "현재 날짜와 시간을 반환합니다.",
    schema: z.object({}),
  }
);

const tools = [calculator, multiplier, webSearch, getCurrentTime];

// ──────────────────────────────────────────────
// 2. LLM & Agent 초기화
// ──────────────────────────────────────────────
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const agent = createReactAgent({
  llm,
  tools,
  prompt:
    `당신은 유능한 AI 어시스턴트입니다. ` +
    `사용 가능한 도구를 적절히 선택하여 사용자 요청을 처리하고 ` +
    `한국어로 명확하게 답변하세요.`,
});

// ──────────────────────────────────────────────
// 3. Agent 실행 헬퍼 (tool 로그 추적 포함)
// ──────────────────────────────────────────────
interface ToolLog {
  tool: string;
  input: Record<string, unknown>;
  output: string;
}

async function runAgent(question: string): Promise<{
  answer: string;
  toolLogs: ToolLog[];
}> {
  console.log(`\n${"?".repeat(60)}`);
  console.log(` 질문: ${question}`);
  console.log(`${"─".repeat(60)}`);

  const result = await agent.invoke({
    messages: [new HumanMessage(question)],
  });

  const messages = result.messages;
  const toolLogs: ToolLog[] = [];

  // 메시지에서 tool 호출 기록 추출
  for (const msg of messages) {
    // AIMessage with tool_calls
    if (
      msg._getType?.() === "ai" &&
      Array.isArray((msg as any).tool_calls) &&
      (msg as any).tool_calls.length > 0
    ) {
      for (const tc of (msg as any).tool_calls) {
        toolLogs.push({
          tool: tc.name,
          input: tc.args ?? {},
          output: "", // output은 ToolMessage에서 채움
        });
      }
    }

    // ToolMessage → 직전 toolLog에 output 채우기
    if (msg._getType?.() === "tool") {
      const toolMsg = msg as any;
      const pending = toolLogs.findLast((l) => l.output === "");
      if (pending) {
        pending.output =
          typeof toolMsg.content === "string"
            ? toolMsg.content
            : JSON.stringify(toolMsg.content);
      }
    }
  }

  const finalMsg = messages[messages.length - 1];
  const answer =
    typeof finalMsg.content === "string"
      ? finalMsg.content
      : JSON.stringify(finalMsg.content, null, 2);

  console.log(`${"─".repeat(60)}`);
  console.log(` 최종 답변:\n${answer}`);

  return { answer, toolLogs };
}

// ──────────────────────────────────────────────
// 4. Express 웹 서버
// ──────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// __filename, __dirname 대체 생성
const __filename = fileURLToPath(import.meta.url);
console.log(__filename);
const __dirname = path.dirname(__filename);

// 정적 파일 (client.html) 서빙
app.use(express.static(path.join(__dirname, "public")));

// 루트 → client.html
app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "public", "client.html"));
});

// ── POST /api/ask ──────────────────────────────
// Body: { question: string }
// Response: { answer, toolLogs }
app.post("/api/ask", async (req: Request, res: Response) => {
  const { question } = req.body as { question?: string };

  if (!question || question.trim() === "") {
    res.status(400).json({ error: "질문을 입력해 주세요." });
    return;
  }

  try {
    const { answer, toolLogs } = await runAgent(question.trim());
    res.json({ answer, toolLogs });
  } catch (err: any) {
    console.error("Agent 오류:", err);
    res.status(500).json({ error: err?.message ?? "서버 오류가 발생했습니다." });
  }
});

// ── GET /api/health ────────────────────────────
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ──────────────────────────────────────────────
// 5. 서버 시작
// ──────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`\n 서버 실행 중 → http://localhost:${PORT}`);
  console.log(`   API endpoint: POST http://localhost:${PORT}/api/ask`);
  console.log(`   클라이언트:   http://localhost:${PORT}/\n`);
});

