import "dotenv/config";
import fs   from "fs";
import path from "path";

import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
  mapStoredMessagesToChatMessages,
  StoredMessage,
} from "@langchain/core/messages";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

// 1. JSON 파일 기반 커스텀 ChatMessageHistory
//    BaseListChatMessageHistory 를 상속 → addMessages / getMessages 구현

const HISTORY_DIR = "./chat_history";

class JsonFileChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ["custom", "JsonFileChatMessageHistory"];

  private filePath: string;

  constructor(sessionId: string) {
    super();
    // 저장 디렉토리 없으면 생성
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
    this.filePath = path.join(HISTORY_DIR, `${sessionId}.json`);
  }

  // ── JSON 파일에서 메시지 읽기 ──────────────────────────────
  async getMessages(): Promise<BaseMessage[]> {
    if (!fs.existsSync(this.filePath)) return [];

    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const stored: StoredMessage[] = JSON.parse(raw);
      // StoredMessage → BaseMessage 변환 (LangChain 공식 헬퍼 사용)
      return mapStoredMessagesToChatMessages(stored);
    } catch {
      console.warn(` 히스토리 파일 읽기 오류 (초기화): ${this.filePath}`);
      return [];
    }
  }

  // ── JSON 파일에 메시지 추가 저장 ──────────────────────────
  async addMessages(messages: BaseMessage[]): Promise<void> {
    // 기존 내용 읽기
    let stored: StoredMessage[] = [];
    if (fs.existsSync(this.filePath)) {
      try {
        stored = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      } catch {
        stored = [];
      }
    }

    // 새 메시지를 StoredMessage 포맷으로 변환하여 추가
    const newStored: StoredMessage[] = messages.map((msg) => ({
      type: msg._getType(),           // "human" | "ai" | "system" 등
      data: {
        content:  msg.content,
        type:     msg._getType(),
        role:     (msg as any).role,  // SystemMessage 등을 위한 role
      },
    }));

    stored.push(...newStored);

    // JSON 파일에 쓰기 (2칸 들여쓰기로 가독성 확보)
    fs.writeFileSync(this.filePath, JSON.stringify(stored, null, 2), "utf-8");
    console.log(`   [저장] ${this.filePath} (총 ${stored.length}개 메시지)`);
  }


// ── 히스토리 전체 삭제 ────────── 
  async clear(): Promise<void> {
    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
      console.log(`   [삭제] ${this.filePath}`);
    }
  }

  // ── 저장된 내용 콘솔 출력 (디버깅용) ─────── 
  async printHistory(): Promise<void> {
    const msgs = await this.getMessages();
    if (msgs.length === 0) {
      console.log("   (히스토리 없음)");
      return;
    }
    msgs.forEach((m, i) => {
      const role = m._getType().toUpperCase().padEnd(6);
      console.log(`   [${i + 1}] ${role} | ${String(m.content).slice(0, 80)}`);
    });
  }
}

// 2. 세션 → JsonFileChatMessageHistory 캐시
//    (동일 세션은 파일을 여러 번 생성하지 않도록 캐싱)
const historyCache: Record<string, JsonFileChatMessageHistory> = {};

function getHistory(sessionId: string): JsonFileChatMessageHistory {
  if (!historyCache[sessionId]) {
    historyCache[sessionId] = new JsonFileChatMessageHistory(sessionId);
  }
  return historyCache[sessionId];
}

// 3. LangChain LCEL Chain 구성
//    prompt → ChatOpenAI → StringOutputParser

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "너는 친절한 한국어 선생님이야. 설명은 쉽고 예시를 들어서 답변해."],
  new MessagesPlaceholder("chat_history"),    // ← 대화 히스토리 주입 위치
  ["human", "{input}"],
]);

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.7 });

const chain = prompt.pipe(model).pipe(new StringOutputParser());

// 4. Memory 붙인 chain (RunnableWithMessageHistory)
const chainWithMemory = new RunnableWithMessageHistory({
  runnable:           chain,
  getMessageHistory:  getHistory,          // sessionId → JsonFileChatMessageHistory
  inputMessagesKey:   "input",
  historyMessagesKey: "chat_history",
});

// 5. 편의 함수: 질문하고 답변 출력
async function chat(sessionId: string, input: string): Promise<void> {
  console.log("\n" + "─".repeat(60));
  console.log(`User :  [${sessionId}] ${input}`);

  const answer = await chainWithMemory.invoke(
    { input },
    { configurable: { sessionId } }
  );

  console.log(`ChatBot : ${answer}`);
}

// 6. 실행 ? 다중 세션 테스트
async function main() {
  console.log("?".repeat(60));
  console.log("  LangChain.js 1.x  ×  JSON File Chat History");
  console.log(`  저장 위치: ${path.resolve(HISTORY_DIR)}`);
  console.log("?".repeat(60));

  // ── 세션 A: 한국어 문법 학습 ────────────────────────────
  const SESSION_A = "user_korean_grammar";

  await chat(SESSION_A, "자음 탈락이 뭐야?");
  await chat(SESSION_A, "아까 말한 그거 예시 하나만 더 알려줘.");
  await chat(SESSION_A, "그럼 모음 조화도 설명해줄 수 있어?");

  // ── 세션 B: 다른 사용자 (독립적인 히스토리) ─────────────
  const SESSION_B = "user_pronunciation";

  await chat(SESSION_B, "받침 발음 규칙 알려줘.");
  await chat(SESSION_B, "방금 말한 것 중 예외가 있어?");

  // ── 저장된 히스토리 확인 ──────────────────────────────────
  console.log("\n" + "?".repeat(60));
  console.log(" 저장된 대화 히스토리 확인\n");

  console.log(`[세션 A: ${SESSION_A}]`);
  await getHistory(SESSION_A).printHistory();

  console.log(`\n[세션 B: ${SESSION_B}]`);
  await getHistory(SESSION_B).printHistory();

  console.log("\n" + "?".repeat(60));
  console.log(` JSON 파일 위치: ${path.resolve(HISTORY_DIR)}/`);
  console.log("   프로그램을 재실행해도 대화 내용이 유지됩니다.\n");
}

main().catch((err: Error) => {
  console.error(" 오류:", err.message);
  process.exit(1);
});