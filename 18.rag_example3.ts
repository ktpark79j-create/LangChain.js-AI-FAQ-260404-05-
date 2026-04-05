import "dotenv/config";

import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";


// 1. 문서 로딩 (CSV)
const loader = new CSVLoader("policy.csv");  // ← CSV 파일 경로

const docs = await loader.load();


// 2. 청킹
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 300,
  chunkOverlap: 50,
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


// 4. 검색
const retriever = vectorStore.asRetriever({
  k: 3,
});


// 5. 질문
//const question = "이 CSV 데이터의 주요 내용은 무엇인가요?";
const question = "복지,식대 지원은 얼마인가요?";


// 6. context 생성
const retrievedDocs = await retriever.invoke(question);

const context = retrievedDocs
  .map(doc => doc.pageContent)
  .join("\n\n");


// 7. LLM 호출
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `다음 CSV 데이터를 기반으로 답변하세요.
모르면 "모르겠습니다"라고 답하세요.

컨텍스트:
{context}`,
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

//npm install d3-dsv@3