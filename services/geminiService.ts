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

export interface PostcardGenResult {
  cn: string;
  en: string;
  mood: string;
}

export const generatePostcardSummary = async (history: Message[]): Promise<PostcardGenResult> => {
  try {
    const transcript = history.map(m => m.text).join('\n');
    const prompt = `
    Based on the following conversation, generate a JSON object containing a poetic summary for a postcard.
    
    Requirements:
    1. 'cn': A very short, poetic summary in Chinese (max 15 chars).
    2. 'en': A poetic translation of that summary in English.
    3. 'mood': A single word describing the mood (e.g., Nostalgic, Serene, Joyful) in English.
    
    Conversation:
    ${transcript}

    Output JSON only.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    return JSON.parse(text) as PostcardGenResult;
  } catch (error) {
    return {
      cn: "时光静好，记忆永存。",
      en: "Time stands still, memories remain.",
      mood: "Peaceful"
    };
  }
};