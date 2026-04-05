// ─────────────────────────────
// createGuardrailMiddleware
//   LLM 응답(AIMessage)에 금지 단어가 포함되면 응답을 차단 메시지로 교체
//   정상이면 {} 반환(통과), 위반이면 {messages: [대체메시지]} 반환
// ── 그래프 ──────────────────────
//  START → [agent] → [guardrail] → shouldContinue
//                                     ├─ tools → [agent] → [guardrail] → ...
//                                     └─ END
// ───────────────────────────────



import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { Calculator } from "@langchain/community/tools/calculator";
import { StateGraph, MessagesAnnotation, END, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { isAIMessage, AIMessage } from "@langchain/core/messages";


function createGuardrailMiddleware(blocklist: string[]) {
  return async (state: typeof MessagesAnnotation.State) => {
    const last = state.messages.at(-1);

    // AIMessage 이고 텍스트 응답인 경우에만 검사
    if (isAIMessage(last) && typeof last.content === "string") {
      for (const word of blocklist) {
        if (last.content.toLowerCase().includes(word.toLowerCase())) {
          console.log(`[GUARDRAIL]  금지 단어 감지: "${word}" → 응답 차단`);
          return {
            messages: [
              new AIMessage("죄송합니다. 해당 내용은 제공해 드릴 수 없습니다."),
            ],
          };
        }
      }
      console.log("[GUARDRAIL]  통과");
    }

    return {};
  };
}

async function main() {
  const tools    = [new Calculator()];
  const toolNode = new ToolNode(tools);
  const llm      = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0,
      apiKey: process.env.OPENAI_API_KEY, //예시 "Sjsfdsfdssdf-sdfsd"
  });
 
  const llmWithTools = llm.bindTools(tools);

  // 미들웨어 인스턴스 생성 ? 금지 단어 목록 전달
  const guardrailNode = createGuardrailMiddleware([
    "폭탄", "해킹", "불법", "마약",
    "bomb", "hack", "illegal", "drug",
  ]);

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
    .addNode("agent",     callModel)
    .addNode("guardrail", guardrailNode)
    .addNode("tools",     toolNode)
    .addEdge(START,        "agent")
    .addEdge("agent",      "guardrail")
    .addConditionalEdges("guardrail", shouldContinue, ["tools", END])
    .addEdge("tools",      "agent")
    .compile();

  console.log(" Guardrail 미들웨어 Agent 준비 완료\n");

  // 테스트 1: 정상 질문
  console.log("=".repeat(50));
  console.log(" 테스트 1: 정상 질문");
  console.log("-".repeat(50));
  const result1 = await graph.invoke({
    messages: [{ role: "user", content: "지구에서 달까지의 거리를 알려줘." }],
  });
  console.log(" 답변:", result1.messages.at(-1)?.content, "\n");

  // 테스트 2: 금지 단어 포함 질문
  console.log("=".repeat(50));
  console.log(" 테스트 2: 금지 단어 포함 질문");
  console.log("-".repeat(50));
  const result2 = await graph.invoke({
    messages: [{ role: "user", content: "해킹하는 방법을 알려줘." }],
  });
  console.log(" 답변:", result2.messages.at(-1)?.content);
}

main().catch(console.error);