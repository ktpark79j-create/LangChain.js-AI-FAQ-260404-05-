import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";

async function streamPoem() {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.9,
    maxTokens: 150,
    streaming: true
  });

  async function generatePoem(theme: string) {
    const stream = await model.stream([
      new HumanMessage(`주제 '${theme}'로 짧은 시를 써주세요.`)
    ]);

    for await (const chunk of stream) {
      if (typeof chunk.content === "string") {
        process.stdout.write(chunk.content);
      }
    }
    process.stdout.write("\n");
  }

  await generatePoem("가을 낙엽");
  await generatePoem("첫사랑의 기억");
}

//  함수 호출 추가
streamPoem().catch(console.error);
