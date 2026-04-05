import "dotenv/config";
import {
  ChatOpenAI,
} from "@langchain/openai";

import {
  AIMessage,
  HumanMessage,
  SystemMessage,
 ToolMessage, 
} from "@langchain/core/messages";

import { z } from "zod";

async function main() {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
  });


  // ────────────────────────────────────────
  // 1단계: 모델이 도구를 호출하도록 유도
  // ────────────────────────────────────────
const modelWithTools = model.bindTools([
  {
    name: "multiply",
    description: "두 숫자를 곱합니다.",
    schema: z.object({
      a: z.number(),
      b: z.number(),
    }),
  },
]);

const initialMessages = [
    new HumanMessage("17 곱하기 42는 얼마야?"),
  ];

  const aiResponse = await modelWithTools.invoke(initialMessages);

  console.log("모델의 첫 응답 (tool call 포함):");
  console.log("  tool_calls:", aiResponse.tool_calls);
  console.log("─".repeat(60));

  // ────────────────────────────────────────
  // 2단계: 도구 실행 시뮬레이션 (실제로는 tool executor가 처리)
  // ────────────────────────────────────────
if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
    const toolCall = aiResponse.tool_calls[0];
    const { name, args, id } = toolCall;

    let toolResult: string;

    if (name === "multiply") {
      const { a, b } = args as { a: number; b: number };
      toolResult = (a * b).toString();
    } else {
      toolResult = "알 수 없는 도구";
    }
  // ────────────────────────────────────────
  // 3단계: ToolMessage 생성
  // ────────────────────────────────────────
 const toolMsg = new ToolMessage({
      content: toolResult,
      tool_call_id: id!,           // 반드시 AIMessage의 tool_calls[].id 와 일치해야 함
      name: name,                   // (선택) 도구 이름
    });

    console.log("생성된 ToolMessage:");
    console.log("  content:", toolMsg.content);
    console.log("  tool_call_id:", toolMsg.tool_call_id);
    console.log("  name:", toolMsg.name);
    console.log("─".repeat(60));

  // ────────────────────────────────────────
  // 4단계: ToolMessage를 추가해서 다시 모델 호출 → 최종 답변 받기
  // ────────────────────────────────────────
const finalMessages = [
      ...initialMessages,
      aiResponse,
      toolMsg,
    ];

    const finalResponse = await model.invoke(finalMessages);

    console.log("최종 답변 (ToolMessage 반영 후):");
    console.log(finalResponse.content);
  }
}

main().catch(console.error);