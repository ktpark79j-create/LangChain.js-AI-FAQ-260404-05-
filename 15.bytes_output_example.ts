import "dotenv/config";

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BytesOutputParser } from "@langchain/core/output_parsers";
import fs from "fs";

// 모델 초기화
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
  maxCompletionTokens: 200,
});

// 프롬프트 정의
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "당신은 간단한 설명을 작성하는 AI입니다."],
  ["human", "{topic}에 대해 한 문장으로 설명하세요."]
]);

// 체인 구성
const chain = prompt
  .pipe(llm)
  .pipe(new BytesOutputParser());

// 실행
const result = await chain.invoke({
  topic: "인공지능"
});

// 결과 확인
console.log("반환 타입:", result.constructor.name); // Uint8Array
console.log("바이트 길이:", result.length);

// 문자열로 다시 변환
const decoded = new TextDecoder().decode(result);
console.log("디코딩 결과:");
console.log(decoded);

// 파일로 저장 
fs.writeFileSync("output.txt", result);
console.log("output.txt 파일 저장 완료");
