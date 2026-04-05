import "dotenv/config";
import { PromptTemplate, FewShotPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.3,
});

// 포맷 템플릿
const examplePrompt = PromptTemplate.fromTemplate(
  "질문: {question}\n{answer}"
);

// 예제 데이터
const examples = [
  {
    question: "지구의 대기 중 가장 많은 비율을 차지하는 기체는 무엇인가요?",
    answer: "지구 대기의 약 78%를 차지하는 질소입니다.",
  },
  {
    question: "광합성에 필요한 주요 요소들은 무엇인가요?",
    answer: "광합성에 필요한 주요 요소는 빛, 이산화탄소, 물입니다.",
  },
  {
    question: "피타고라스 정리를 설명해주세요.",
    answer:
      "피타고라스 정리는 직각삼각형에서 빗변의 제곱이 다른 두 변의 제곱의 합과 같다는 것입니다.",
  },
  {
    question: "지구의 자전 주기는 얼마인가요?",
    answer:
      "지구의 자전 주기는 약 24시간(정확히는 23시간 56분 4초)입니다.",
  },
  {
    question: "DNA의 기본 구조를 간단히 설명해주세요.",
    answer:
      "DNA는 두 개의 폴리뉴클레오티드 사슬이 이중 나선 구조를 이루고 있습니다.",
  },
  {
    question: "원주율(π)의 정의는 무엇인가요?",
    answer: "원주율(π)은 원의 지름에 대한 원의 둘레의 비율입니다.",
  },
];

//  FewShotPromptTemplate 생성
const prompt = new FewShotPromptTemplate({
  examples: examples,
  examplePrompt: examplePrompt,
  suffix: "질문: {input}",
  inputVariables: ["input"],
});

// 실행
async function run() {
  const formattedPrompt = await prompt.invoke({
    input: "화성의 표면이 붉은 이유는 무엇인가요?",
  });

  console.log("=== 생성된  Few-shot Prompt ===\n");
  console.log(formattedPrompt.toString());


const chain = prompt.pipe(llm);

const response = await chain.invoke({
  input: "화성의 표면이 붉은 이유는 무엇인가요?",
});

console.log(response.content);
}
run();

