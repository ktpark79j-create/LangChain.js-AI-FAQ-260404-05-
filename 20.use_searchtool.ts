import "dotenv/config";

import { ChatOpenAI } from "@langchain/openai";
import { TavilySearch } from "@langchain/tavily";

async function main() {

  console.log("\nLangChain Tavily Search + LLM\n");

  // LLM
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.3
  });

  // Tavily Search Tool
  const tavily = new TavilySearch({
    maxResults: 5
  });

  const question = "2026년 2분기 테슬라의 주가 전망";

  console.log("검색 질문:", question);

  // Tavily 검색
  const searchResult = await tavily.invoke({
    query: question
  });

  console.log("\n검색 결과\n");
  console.log(searchResult);

  // LLM 분석
  const prompt = `
다음 웹 검색 결과를 기반으로 질문에 답하세요.

검색 결과:
${JSON.stringify(searchResult, null, 2)}

질문:
${question}

요구사항
- 핵심 요약
- 긍정 요인
- 위험 요인
- 투자 관점

답변:
`;

  const response = await model.invoke(prompt);

  console.log("\n최종 답변\n");
  console.log(response.content);
}

main();


//npm install @langchain/tavily 
