import "dotenv/config";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

// 기본 템플릿 정의
const introPrompt = new PromptTemplate({
  template: "당신은 {role} 입니다.\n",
  inputVariables: ["role"],
});

const questionPrompt = new PromptTemplate({
  template: "다음 질문에 답해주세요:\n{question}",
  inputVariables: ["question"],
});

// PromptTemplate 간 직접 결합 (문자열 추출 후 +)
const combinedTemplateString =
  introPrompt.template + questionPrompt.template;

// 새로운 PromptTemplate 생성
const combinedPrompt = new PromptTemplate({
  template: combinedTemplateString,
  inputVariables: ["role", "question"],
});

// 실행
async function run() {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
  maxTokens: 200, 
  });

  const formattedPrompt = await combinedPrompt.format({
    role: "데이터베이스 전문가",
    question: "MySQL8의 Redo Log 구조를 설명해주세요.",  
  });

  console.log("=== 최종 프롬프트 ===");
  console.log(formattedPrompt);

  const response = await model.invoke(formattedPrompt);

  console.log("\n===모델 응답 ===");
  console.log(response.content);
}

run();