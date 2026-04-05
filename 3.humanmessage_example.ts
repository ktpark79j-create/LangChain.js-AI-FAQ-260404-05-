import "dotenv/config";
import fs from "fs";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";

async function main() {
  // 1. 이미지 Base64 인코딩
  const imageBuffer = fs.readFileSync("./로봇.png");
  const base64Image = imageBuffer.toString("base64");

  // 2. 모델 생성
  const model = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
  });

  // 3. 멀티모달 메시지 구성
 const message = new HumanMessage({
  content: [
    
    { type: "text", text: "이 이미지에 무엇이 있나요?" },
    {
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${base64Image}`,
      },
    },
  ],
});

const response = await model.invoke([message]);

console.log(response.content);
}

main();