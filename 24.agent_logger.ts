// ────────────────────────────
// createLoggerMiddleware
//   매 스텝마다 메시지의 역할(role)과 내용(content)을 출력
//   state를 수정하지 않고 그대로 통과 → 항상 {} 반환
// ── 그래프 ─────────────── 
//  START → [logger] → [agent] → shouldContinue
//                                  ├─ tools → [logger] → [agent] → ...
//                                  └─ END────────────────


import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { Calculator } from "@langchain/community/tools/calculator";
import { StateGraph, MessagesAnnotation, END, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { isAIMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";


function createLoggerMiddleware(label = "LOG") {
  return async (state: typeof MessagesAnnotation.State) => {
    const last    = state.messages.at(-1) as BaseMessage;
    const role    = last?.constructor?.name ?? "Unknown";
    const step    = state.messages.length;
    const preview =
      typeof last?.content === "string"
        ? last.content.slice(0, 80)
        : JSON.stringify(last?.content).slice(0, 80);

    console.log(`[${label}] step=${step} | ${role} | "${preview}"`);
    return {};
  };
}

async function main() {
  const tools     = [new Calculator()];
  const toolNode  = new ToolNode(tools);
  const llm       = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 
  
  });
  const llmWithTools = llm.bindTools(tools);

  // 미들웨어 인스턴스 생성
  const loggerNode = createLoggerMiddleware("LOGGER");

  const callModel = async (state: typeof MessagesAnnotation.State) => {
    const response = await llmWithTools.invoke(state.messages);
    return { messages: [response] };
  };

  const shouldContinue = (state: typeof MessagesAnnotation.State) => {
    const last = state.messages.at(-1);
    if (isAIMessage(last) && last.tool_calls?.length) return "tools";
    return END;
  };


  const graph = new StateGraph(MessagesAnnotation)
    .addNode("logger", loggerNode)
    .addNode("agent",  callModel)
    .addNode("tools",  toolNode)
    .addEdge(START,     "logger")
    .addEdge("logger",  "agent")
    .addConditionalEdges("agent", shouldContinue, ["tools", END])
    .addEdge("tools",   "logger")   // tool 실행 후 → 다시 logger로
    .compile();

  console.log(" Logger 미들웨어 Agent 준비 완료\n");
  console.log("=".repeat(50));

  const result = await graph.invoke({
    messages: [{ role: "user", content: "257 곱하기 384는 얼마야?" }],
  });

  console.log("\n 최종 답변:", result.messages.at(-1)?.content);
}

main().catch(console.error);
