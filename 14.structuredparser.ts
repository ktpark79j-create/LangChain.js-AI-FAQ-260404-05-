import "dotenv/config";

import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";

// Zod 스키마 정의
const PersonSchema = z.object({
  name: z.string().describe("이름"),
  age: z.number().describe("나이"),
  job: z.string().describe("직업"),
  hobbies: z.array(z.string()).describe("취미 목록"),
});

// StructuredOutputParser 생성
const parser = StructuredOutputParser.fromZodSchema(PersonSchema);

// 모델 초기화
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
  maxCompletionTokens: 300,
});

// 프롬프트 정의
const prompt = PromptTemplate.fromTemplate(`
다음 인물 정보를 JSON 형식으로 작성하세요.

{format_instructions}

인물: 48세의 개발자 박경태. 취미는 개발, 사업아이디어 창출, 구현 실증.
`);

// 체인 구성
const chain = prompt
  .pipe(llm)
  .pipe(parser);

// 실행
const result = await chain.invoke({
  format_instructions: parser.getFormatInstructions(),
});

// 결과 출력
console.log("구조화된 결과:");
console.log(result);
console.log("타입:", typeof result);