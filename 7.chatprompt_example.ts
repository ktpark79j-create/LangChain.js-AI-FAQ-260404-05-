import "dotenv/config";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// Prompt 정의
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "너는 세계 최고의 {job} 전문가야."],
  ["human", "다음 주제에 대해 알려줘: {topic}"],
  new MessagesPlaceholder("conversation"),   
]);

// 모델 생성
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.3,
  maxTokens: 200,
});

// 실행
async function run() {
  const response = await model.invoke(
    await prompt.invoke({
      job: "디지털트윈 개발자",
      topic: "디지털트윈 개발 프로세스",
      conversation: [
        new HumanMessage("간단하게 설명해줘"),
        new AIMessage("네, 간단하게 설명드리겠습니다."),
      ],
    })
  );

  console.log(response.content);
}

run();