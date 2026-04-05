import { PromptTemplate } from "@langchain/core/prompts";

//현재 계절 구하는 함수
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 0~11 이므로 +1

  if (month >= 3 && month <= 5) return "봄";
  else if (month >= 6 && month <= 8) return "여름";
  else if (month >= 9 && month <= 11) return "가을";
  else return "겨울";
}

async function run() {
  // PromptTemplate 생성
  const prompt = PromptTemplate.fromTemplate(
    "{season}에 일어나는 대표적인 지구과학 현상은 {phenomenon}입니다."
  );

  // partial 적용 (동적 함수 실행)
  const partialPrompt = await prompt.partial({
    season: getCurrentSeason(), // 함수 실행 결과를 바인딩
  });

  //phenomenon만 입력
  const result = await partialPrompt.invoke({
    phenomenon: "꽃가루 증가",
  });

  console.log(result);
}

run();