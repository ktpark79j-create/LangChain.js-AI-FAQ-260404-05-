import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
// 1. LLM 모델 설정
const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
// 2. 프롬프트 템플릿: 챗봇 역할을 정의
const prompt = ChatPromptTemplate.fromMessages([
["system", "You are a helpful AI chatbot assistant."],
["human", "{input}"], // 사용자 입력 플레이스홀더
]);
// 3. Runnable 체인 구성
const chain = RunnableSequence.from([
prompt, // 입력 → 프롬프트
llm, // 프롬프트 → LLM 호출
new StringOutputParser(), // LLM 출력 → 문자열 파싱
]);
// 4. 체인 호출 (챗봇 응답 생성)
const response = await chain.invoke({ input: "안녕? 오늘한국날씨 어때? 100자 아내로 응답해줘"});
console.log(response); // 출력: 챗봇의 응답 문자열