import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message } from "../types";

// Note: API Key is expected to be in process.env.API_KEY by the runtime environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
你是一个富有诗意、温和、像老朋友一样的AI伴侣。
你的任务是根据用户上传的图片进行简短、治愈的对话。
1. 你的语言风格应该是：优雅、感性、简洁（每次回复不要超过50个字）、中文简体。
2. 引导用户聊关于图片的故事、心情或回忆。
3. 不要表现得像个机器人，要像个懂生活的朋友。
4. 如果用户结束对话，请温柔地告别。
`;

export const startChatWithImage = async (
  base64Image: string, 
  mimeType: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "请根据这幅图片，用一句富有诗意且简短的话开启我们的聊天。不要太长。",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "这幅画真美……";
  } catch (error) {
    console.error("Gemini Image Start Error:", error);
    return "我似乎看不清这幅画，但我们可以聊聊别的……";
  }
};

export const sendMessage = async (
  history: Message[], 
  newMessage: string
): Promise<string> => {
  try {
    // Construct simplified history for context
    // In a real production app, we would use multi-turn chat history properly
    // Here we concatenate the last few messages for context to save tokens/complexity in single-file strictness
    const context = history.slice(-5).map(m => `${m.role === 'user' ? '用户' : '我'}: ${m.text}`).join('\n');
    const prompt = `${context}\n用户: ${newMessage}\n(请简短回复，像朋友一样)`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "……";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "记忆似乎有些模糊……";
  }
};

export const generatePostcardSummary = async (history: Message[]): Promise<string> => {
  try {
    const transcript = history.map(m => m.text).join('\n');
    const prompt = `
    根据以下对话内容，生成一段非常简短、优美、像俳句或诗歌一样的明信片寄语。
    不要超过30个字。
    对话内容：
    ${transcript}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "时光静好，记忆永存。";
  } catch (error) {
    return "时光静好。";
  }
};
