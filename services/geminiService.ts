import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ParsedVocabItem, ConversationLine, GrammarInfo, TargetLanguage } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment.");
  }
  return new GoogleGenAI({ apiKey });
};

export const parseNotesWithGemini = async (rawText: string, language: TargetLanguage): Promise<ParsedVocabItem[]> => {
  const ai = getClient();
  
  const systemPrompt = `
    You are an expert ${language} language teacher. 
    Analyze the following raw notes provided by a student.
    Extract vocabulary words, their English meanings, and a suitable category (e.g., "Food", "Travel", "Grammar", "Daily Life").
    
    Rules:
    1. If the input contains ${language} words, extract them as 'term' and their meaning as 'definition'.
    2. If the input is primarily English (e.g. "Apple"), TRANSLATE the concept to ${language} for the 'term' (e.g. "사과" or "リンゴ") and keep English as 'definition'.
    3. If the input is a mix, format it cleanly.
    4. 'category' must be a short, capitalized string.
    5. Return ONLY a JSON array. If no valid vocabulary can be extracted or translated, return an empty array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: rawText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
              category: { type: Type.STRING },
            },
            required: ["term", "definition", "category"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as ParsedVocabItem[];

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateVocabExplanation = async (term: string, definition: string, language: TargetLanguage): Promise<string> => {
    const ai = getClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Explain the ${language} word "${term}" (meaning: ${definition}). Provide a very concise, beginner-friendly nuance or mnemonic. 1-2 short sentences max. Focus on how a beginner would use it.`,
        });
        return response.text || "No explanation available.";
    } catch (error) {
        console.error("Explanation generation failed:", error);
        return "Could not generate explanation.";
    }
};

export const generateVocabImage = async (term: string, definition: string, language: TargetLanguage): Promise<{data: string, mimeType: string} | undefined> => {
    const ai = getClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: `Draw a playful, hand-drawn doodle illustration representing the concept: "${definition}" (${language} word: ${term}). 
            Style: Blue ballpoint pen sketch on cream paper. Monochromatic blue line art. 
            Simple, cute, loose lines. No text in the image. White or cream background.`,
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return {
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType
                };
            }
        }
        return undefined;
    } catch (error) {
        console.error("Image generation failed:", error);
        return undefined;
    }
};

export const generateVocabAudio = async (text: string): Promise<string | undefined> => {
    const ai = getClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' works well for Asian languages in general
                    },
                },
            },
        });
        
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
        console.error("Audio generation failed:", error);
        return undefined;
    }
}

export const generateSampleConversation = async (term: string, definition: string, language: TargetLanguage): Promise<ConversationLine[]> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create a simple, beginner-level dialogue (2 exchanges max) in ${language} using the word "${term}" (${definition}). Ensure the grammar and vocabulary are suitable for a beginner. Include English translations.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING },
              term: { type: Type.STRING },
              definition: { type: Type.STRING }
            },
            required: ["speaker", "term", "definition"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as ConversationLine[];
  } catch (error) {
    console.error("Conversation generation failed:", error);
    return [];
  }
};

export const generateGrammarDetails = async (term: string, definition: string, language: TargetLanguage): Promise<GrammarInfo[]> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the ${language} word "${term}" (meaning: ${definition}).
      If it is a Verb or Adjective that conjugates, provide 3 common conjugation forms (e.g. Polite, Past, Future/Te-form etc).
      
      For each, provide the 'tense' name, the conjugated 'conjugation', and a simple 'example' sentence using it.
      Keep examples very simple and short, suitable for beginners.
      
      If it is a Noun or other non-conjugating word, return an empty array [].
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              tense: { type: Type.STRING },
              conjugation: { type: Type.STRING },
              example: { type: Type.STRING }
            },
            required: ["tense", "conjugation", "example"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as GrammarInfo[];
  } catch (error) {
    console.error("Grammar generation failed:", error);
    return [];
  }
};

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  let pcmData = data;
  if (data.byteLength % 2 !== 0) {
      const newData = new Uint8Array(data.byteLength + 1);
      newData.set(data);
      pcmData = newData;
  }

  const dataInt16 = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}