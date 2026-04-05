/* agent-chatbot.js */
import "dotenv/config";

import { createAgent, tool, initChatModel } from "langchain";
import { z } from "zod"


// -----------------------------------------------------------------------------
// 1. 도구 정의 (Python의 @tool 데코레이터 → JS에서는 tool 함수 사용)
// -----------------------------------------------------------------------------
const searchWeb = tool({
  name: "search_web",
  description: "웹에서 정보를 검색합니다.",
  schema: z.object({
    query: z.string().describe("검색할 키워드나 질문"),
  }),
  func: async ({ query }) => {
    // 실제로는 TavilySearchResults, DuckDuckGo 등 사용 권장
    // 여기서는 모의 응답으로 대체
    return JSON.stringify({
      answer: `'${query}'에 대한 검색 결과 (모의)`,
      sources: ["https://example.com", "https://mock.data"],
    });
  },
});

const calculate = tool({
  name: "calculate",
  description: "수학 계산을 수행합니다. (예: 123 * 456 + 789)",
  schema: z.object({
    expression: z.string().describe("계산하고 싶은 수식"),
  }),
  func: async ({ expression }) => {
    try {
      // eval은 절대 프로덕션에서 사용 금지!
      // 실제로는 mathjs, safe-eval, expr-eval 등을 사용하세요.
      const result = eval(expression); // eslint-disable-line no-eval
      return String(result);
    } catch (err) {
      return `계산 오류: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
});

// -----------------------------------------------------------------------------
// 2. 에이전트 생성
// -----------------------------------------------------------------------------
const agent = createAgent({
  model: initChatModel("openai:gpt-4o-mini", {
    temperature: 0.7,
    // apiKey: process.env.OPENAI_API_KEY,  ← 환경변수에서 자동으로 읽음
  }),

  tools: [searchWeb, calculate],

  // system prompt
  prompt:
    "당신은 웹 검색과 수학 계산을 도와주는 똑똑한 AI 어시스턴트입니다.\n" +
    "필요하면 도구를 사용하고, 최종 답변은 명확하고 간결하게 한국어로 작성하세요.",

  // (선택) 최대 반복 횟수 제한
  maxIterations: 12,
});

//-----------------------------------------------------------------------------
// 3. 실행 예제
// -----------------------------------------------------------------------------
async function run() {
  try {
    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: "2024년 한국 GDP는 얼마야?",
        },
      ],
    });

    // 최종 AI 메시지 출력
    const lastMessage = result.messages[result.messages.length - 1];

    console.log("?".repeat(60));
    console.log("최종 답변:");
    console.log(lastMessage.content);
    console.log("?".repeat(60));

    // 전체 trace 보고 싶을 때
    // console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("에이전트 실행 중 오류:", err);
  }
}

run();