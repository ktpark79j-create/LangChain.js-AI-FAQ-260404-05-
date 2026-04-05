import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "항목을 쉼표로 구분된 리스트로 작성하세요."],
  ["human", "{topic}에 대한 3가지 예시를 알려주세요."]
]);

const chain = prompt
  .pipe(llm)
  .pipe(new StringOutputParser());

const response = await chain.invoke({
  topic: "과일"
});

// 쉼표 기준으로 리스트 변환
const list = response.split(",").map(item => item.trim());

console.log(list);