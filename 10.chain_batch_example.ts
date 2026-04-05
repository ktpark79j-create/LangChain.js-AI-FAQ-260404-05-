import "dotenv/config";

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const model = new ChatOpenAI({ model: "gpt-4o-mini" });
const prompt = ChatPromptTemplate.fromTemplate("한국어로 번역해줘: {text}");
const chain = prompt.pipe(model).pipe(new StringOutputParser());
 
// batch / abatch
const results = await chain.batch([
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself." },
  { text: "In the end, it's not the years in your life that count. It's the life in your years." },
]);
console.log(results);   
 