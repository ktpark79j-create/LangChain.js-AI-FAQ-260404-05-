import "dotenv/config";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";

import { ChatPromptTemplate } from "@langchain/core/prompts";

// 1. Load
const loader = new PDFLoader("company_policy.pdf"); //필요자료 가져오기(해당폴더)
const docs = await loader.load();

// 2. Split
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const chunks = await splitter.splitDocuments(docs);

// 3. Embedding
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

const vectorStore = await FaissStore.fromDocuments(
  chunks,
  embeddings
);
// 4. Retriever
const retriever = vectorStore.asRetriever({ k: 5 });

// 5. Prompt
const prompt = ChatPromptTemplate.fromMessages([
  ["system", `다음 컨텍스트만 사용해서 답변해. 모르면 "모르겠어요"라고 말해.
{context}`],
  ["human", "{input}"],
]);

// 6. Model
const model = new ChatOpenAI({ model: "gpt-4o-mini" });

// 7. 실행 (직접 구성 ? 핵심)
const question = "연차 휴가 규정은 어떻게 되나요?";

// retriever 실행
const docsRetrieved = await retriever.invoke(question);

// context 문자열로 변환
const context = docsRetrieved.map(d => d.pageContent).join("\n\n");

// prompt 생성
const finalPrompt = await prompt.invoke({
  context,
  input: question,
});

// LLM 호출
const response = await model.invoke(finalPrompt);

console.log(response.content); 

//설치필요 (순차적으로-pdf 링크)
//npm install faiss-node
//npm uninstall pdf-parse
 //npm install pdf-parse@1 --legacy-peer-deps
 //npm list pdf-parse


//RAG 사용시 위 구조순서를 유지하여 pdf 내용만 변경,추가,업데이트 / 1~15번 없이 16번 파일로만 가능한가?