import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Calculator를 직접 정의
const calculatorTool = tool(
  async ({ expression }) => {
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return String(result);
    } catch (e) {
      return `계산 오류: ${e.message}`;
    }
  },
  {
    name: "calculator",
    description: "수학 계산을 수행합니다. 사칙연산, 제곱근(Math.sqrt) 등 JS 수식을 입력하세요.",
    schema: z.object({
      expression: z.string().describe("계산할 수식 (예: 257 * 384, Math.sqrt(98688))")
    })
  }
);

async function main() {
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0
  });

  const tools = [calculatorTool];

  const agent = createReactAgent({
    llm,
    tools,
  });

  const result = await agent.invoke(
    {
      messages: [
        { role: "user", content: "257 곱하기 384는 얼마야? 그리고 제곱근도 알려줘." }
      ],
    },
    {
      recursionLimit: 10  // 안전장치로 명시적 설정
    }
  );

  const lastMessage = result.messages.at(-1);
  console.log("최종 답변:", lastMessage.content);
}

main().catch(console.error);
