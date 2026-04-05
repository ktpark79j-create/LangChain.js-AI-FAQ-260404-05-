import "dotenv/config";

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// stream / astream
async function main() {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
  });

  const prompt = ChatPromptTemplate.fromTemplate(
    "한국어로 번역해줘: {text}"
  );

  const chain = prompt.pipe(model);

  const stream = await chain.stream({
    text: "Your time is limited, so don't waste it living someone else's life.",
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.content as string);
  }
}

main();