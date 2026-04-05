//agent_usetool.ts
//Tool 정의 → LLM 바인딩 → Agent 실행
//1. add_numbers 
//2. multiply_numbers
//3. web_search  
//4. get_current_time
//*   npm install @langchain/openai @langchain/core @langchain/langgraph   @langchain/tavily zod dotenv
//*/



import "dotenv/config";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearch } from "@langchain/tavily";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

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
    console.log(`   [multiply_numbers] ${a} × ${b} = ${result}`);
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

//TavilySearch 도구 초기화
const searchTool = new TavilySearch({
  maxResults: 5,
  searchDepth: "advanced",
  // name / description은 TavilySearch 클래스가 자동으로 설정
});

// TavilySearch를 로깅 래퍼로 감싸서 콘솔에 쿼리 출력
const webSearch = tool(
  async ({ query }) => {
    console.log(`   [web_search] 검색 중: "${query}"`);
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
    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    });
    console.log(`   [get_current_time] ${now}`);
    return `현재 한국 시간: ${now}`;
  },
  {
    name: "get_current_time",
    description: "현재 날짜와 시간을 반환합니다.",
    schema: z.object({}),
  }
);

 const tools = [calculator, multiplier, webSearch, getCurrentTime];
 

// 2. LLM 초기화  
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,  // Tool 선택의 일관성을 위해 0 권장
});

// 4. ReAct Agent 생성 (LangGraph prebuilt)
//    → LLM이 Thought → Tool 선택 → Observation → 반복 → Answer
const agent = createReactAgent({
  llm,
  tools,
  prompt:
    `당신은 유능한 AI 어시스턴트입니다. ` +
    `사용 가능한 도구를 적절히 선택하여 사용자 요청을 처리하고 ` +
    `한국어로 명확하게 답변하세요.`,
});

// 5. Agent 실행 헬퍼
async function runAgent(question: string): Promise<void> {
  console.log("\n" + "?".repeat(62));
  console.log(` 질문: ${question}`);
  console.log("─".repeat(62));

  const result = await agent.invoke({
    messages: [new HumanMessage(question)],
  });

  // 마지막 메시지가 최종 답변
  const messages = result.messages;
  const finalMsg = messages[messages.length - 1];
  const answer =
    typeof finalMsg.content === "string"
      ? finalMsg.content
      : JSON.stringify(finalMsg.content, null, 2);

  console.log("─".repeat(62));
  console.log(` 최종 답변:\n${answer}`);
}


// 6. 다양한 테스트 질문 실행

async function main() {
  console.log("?".repeat(62));
  console.log("  LangChain.js 1.x  ×  ReAct Agent  ×  Multi-Tool");
  console.log("?".repeat(62));
  console.log("\n 등록된 도구:");
  tools.forEach((t) => console.log(`   ? ${t.name}: ${t.description}`));

  // 계산 도구 테스트
  await runAgent("357과 643을 더하면 얼마인가요?");

  // 복합 계산 테스트 (여러 Tool 연속 사용)
  await runAgent("12와 8을 더한 뒤, 그 결과에 5를 곱하면 얼마인가요?");

  // 검색 도구 테스트
  await runAgent("2026년 1분기 테슬라의 주가 전망을 분석해주세요.");

  // 시간 + 검색 복합 테스트
  await runAgent("지금 몇 시인지 알려주고, 오늘 날짜 기준으로 최근 AI 관련 뉴스를 검색해줘.");
}

main().catch((err: Error) => {
  console.error(" 오류:", err.message);
  process.exit(1);
});
