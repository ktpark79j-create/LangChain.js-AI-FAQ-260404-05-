import "dotenv/config";

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnableParallel,
  RunnablePassthrough,
  RunnableLambda,
} from "@langchain/core/runnables";

//모델 정의
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.7,
});

//프롬프트 정의
const prompt = ChatPromptTemplate.fromTemplate("{input}");

//체인
const jokeChain = prompt.pipe(model).pipe(new StringOutputParser());

//길이 계산 체임
const lengthChain = new RunnableLambda({
  func: async (text: string) => `답변 길이: ${text.length}자`
});

//병렬 실행
const overall = jokeChain.pipe(
  RunnableParallel.from({
    joke: new RunnablePassthrough(),
    length: lengthChain,
    original: new RunnablePassthrough(),   // 입력 그대로 전달
  })
);
 

async function main() {
  const result = await overall.invoke({
    input: "웃긴 농담 하나 해줘",
  });

  console.log(result);
}

main();
 