import "dotenv/config";

import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { ChatPromptTemplate } from "@langchain/core/prompts";


// 1. 문서 로딩 (웹페이지)
//const loader = new CheerioWebBaseLoader(
 // "https://ko.wikipedia.org/wiki/%EC%9C%A4%EB%8F%99%EC%A3%BC"   // ← 분석할 웹페이지 URL
//);
const loader = new CheerioWebBaseLoader(
  "https://www.notion.so/MCP-32b6d6eff49880c8a335daf521fda27f"   // ← 분석할 웹페이지 URL
);


const docs = await loader.load();


// 2. 청킹
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 100,
});

const chunks = await splitter.splitDocuments(docs);


// 3. 벡터 저장
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

const vectorStore = await FaissStore.fromDocuments(
  chunks,
  embeddings
);


// 4. 검색 (Retriever)
const retriever = vectorStore.asRetriever({
  k: 3,
});


// 5. 질문
//const question = "이 웹페이지에서 윤동주의 시집은 무엇인가요?";
const question = "MCP란?";


// 6. context 생성
const docsRetrieved = await retriever.invoke(question);

const context = docsRetrieved
  .map(doc => doc.pageContent)
  .join("\n\n");


// 7. LLM 호출
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `다음 내용을 분석해서 답변해.
모르면 "모르겠어요"라고 말해.

컨텍스트:
{context}`
  ],
  ["human", "{input}"],
]);

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
});

const finalPrompt = await prompt.invoke({
  context,
  input: question,
});

const response = await model.invoke(finalPrompt);

console.log(response.content);