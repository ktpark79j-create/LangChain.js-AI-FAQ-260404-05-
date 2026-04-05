import "dotenv/config";

import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

// 1. 프롬프트
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "너는 친절한 한국어 선생님이야."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
]);

// 2. 모델
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const chain = prompt.pipe(model);

// 3. 세션별 메시지 저장소
const messageHistories = {};

const getHistory = async (sessionId) => {
  if (!messageHistories[sessionId]) {
    messageHistories[sessionId] = new ChatMessageHistory();
  }
  return messageHistories[sessionId];
};

// 4. Memory가 붙은 Chain
const chainWithMemory = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: getHistory,
  inputMessagesKey: "input",
  historyMessagesKey: "chat_history",
});

// 5. 실행 코드
async function main() {

  const response1 = await chainWithMemory.invoke(
    { input: "자음 탈락이 뭐야?" },
    { configurable: { sessionId: "user123" } }
  );

  console.log("AI:", response1.content);

  const response2 = await chainWithMemory.invoke(
    { input: "아까 말한 그거 예시 하나만 더 알려줘." },
    { configurable: { sessionId: "user123" } }
  );

  console.log("AI:", response2.content);
}

main();