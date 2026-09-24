import { GoogleGenAI } from '@google/genai';
import { StoryStorageService } from './storage';
import { Character, StoryMessage } from '../types/story';

export interface ChatRequestParams {
  mode: 'private' | 'group';
  targetCharacter: Character | null;
  participants: Character[];
  history: StoryMessage[];
  userMessage?: string;
  corpusContext: string;
  branchTitle?: string;
  actionPrompt?: 'normal' | 'next';
  isMatureMode?: boolean;
  authorFavoritesSummary?: string;
  specificSpeakerId?: string; // If user clicked specific character to speak!
}

export interface ChoiceRequestParams {
  history: StoryMessage[];
  activeBranch?: string;
  participants: Character[];
  corpusContext: string;
  isMatureMode?: boolean;
  authorFavoritesSummary?: string;
}

export class AIServiceClient {
  // Helper to determine base URL
  private static getApiBase(): string {
    const customUrl = StoryStorageService.getApiServerUrl();
    if (customUrl) return customUrl.replace(/\/$/, '');
    // In local asset origin, default to relative or fallback
    if (typeof window !== 'undefined' && window.location.origin.includes('appassets.androidplatform.net')) {
      return '';
    }
    return '';
  }

  // Generate character dialogue
  static async requestChat(params: ChatRequestParams): Promise<{
    speakerId: string;
    speakerName: string;
    text: string;
    stageAction?: string;
    mindsetUpdate?: string;
    affectionDelta?: number;
    trustDelta?: number;
    tensionDelta?: number;
  }> {
    const geminiKey = StoryStorageService.getGeminiApiKey();
    const apiBase = this.getApiBase();

    // 1. If backend server is available (web mode or configured server URL)
    if (!geminiKey || apiBase) {
      try {
        const url = `${apiBase}/api/chat`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.text) return data;
        }
      } catch (e) {
        console.warn('Backend server call failed, checking client Gemini Key:', e);
      }
    }

    // 2. Client-side direct Gemini call if API key is provided
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const speaker = params.specificSpeakerId 
          ? (params.participants.find(p => p.id === params.specificSpeakerId) || params.targetCharacter || params.participants[0])
          : (params.targetCharacter || params.participants[0]);

        const speakerName = speaker?.name || '角色';
        const speakerId = speaker?.id || 'char_unknown';

        const prompt = `你現在正在參與創作故事「Lala Story Lab」。
發言角色：${speakerName}（身分：${speaker?.title || '在場人物'}，性格：${speaker?.personality || '沉穩'}，與主角啦啦關係：${speaker?.relationshipWithLala || '熟識'}）。
當前分歧章節：${params.branchTitle || '主線探索'}
當前環境/情境：${params.corpusContext || '客廳或安靜場景'}

對話歷史最後數條：
${params.history.slice(-6).map(m => `${m.senderName}: ${m.content} ${m.stageAction ? `[動作: ${m.stageAction}]` : ''}`).join('\n')}

${params.userMessage ? `主角啦啦剛剛說道：${params.userMessage}` : '請自然接續上一輪對白或情境進行回應。'}

請嚴格以 JSON 格式回應，格式如下：
{
  "speakerId": "${speakerId}",
  "speakerName": "${speakerName}",
  "text": "角色說的台詞內容（符合人物口吻與原著事實，不可出戲）",
  "stageAction": "角色的動作神態描寫或環境微表情（選填）",
  "mindsetUpdate": "角色此時此刻內心真實心理活動或微小心理轉變（一句話）",
  "affectionDelta": 1,
  "trustDelta": 1,
  "tensionDelta": 0
}`;

        const resp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });

        const text = resp.text || '';
        const parsed = JSON.parse(text);
        return {
          speakerId: parsed.speakerId || speakerId,
          speakerName: parsed.speakerName || speakerName,
          text: parsed.text || '……（靜默片刻，凝視著前方）',
          stageAction: parsed.stageAction,
          mindsetUpdate: parsed.mindsetUpdate,
          affectionDelta: parsed.affectionDelta || 0,
          trustDelta: parsed.trustDelta || 0,
          tensionDelta: parsed.tensionDelta || 0,
        };
      } catch (err) {
        console.error('Direct Gemini call error:', err);
      }
    }

    // 3. Fallback smart dialogue response (Offline without Key)
    const speaker = params.specificSpeakerId
      ? (params.participants.find(p => p.id === params.specificSpeakerId) || params.targetCharacter || params.participants[0])
      : (params.targetCharacter || params.participants[0]);

    const speakerName = speaker?.name || 'Adam';
    const speakerId = speaker?.id || 'adam';

    const fallbackTemplates = [
      { text: `「既然你這麼問了，我會照真實想法告訴你。」`, action: `放下手中的物件，眼神認真地注視著你。`, mindset: `正在思考剛才對話裡的深層含義。` },
      { text: `「這件事並非單純的對與錯，而是我們接下來選擇走哪條路。」`, action: `微微側過頭，語調保持沉著。`, mindset: `謹慎試探當前的局勢與你的意圖。` },
      { text: `「我明白你的意思，但有些事情急不來。」`, action: `目光掠過窗外微明的光影。`, mindset: `逐漸產生一絲不易察覺的默契。` },
    ];
    const picked = fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)];

    return {
      speakerId,
      speakerName,
      text: picked.text,
      stageAction: picked.action,
      mindsetUpdate: picked.mindset,
      affectionDelta: 1,
      trustDelta: 1,
      tensionDelta: 0,
    };
  }

  // Generate 3 choices for Lala
  static async requestChoices(params: ChoiceRequestParams): Promise<{ id: string; tag: string; text: string; intent: string }[]> {
    const geminiKey = StoryStorageService.getGeminiApiKey();
    const apiBase = this.getApiBase();

    if (!geminiKey || apiBase) {
      try {
        const url = `${apiBase}/api/choices`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) return data;
        }
      } catch (e) {
        console.warn('Backend server choices failed, fallback to client:', e);
      }
    }

    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const prompt = `針對當前故事對話，請為主角「啦啦」生成三項各具張力且符合性格的分歧決策選項（A、B、C）。
最近對話：
${params.history.slice(-4).map(m => `${m.senderName}: ${m.content}`).join('\n')}

請嚴格返回 JSON Array 陣列，例如：
[
  { "id": "A", "tag": "審慎試探", "text": "具體台詞...", "intent": "心理目標..." },
  { "id": "B", "tag": "直切核心", "text": "具體台詞...", "intent": "心理目標..." },
  { "id": "C", "tag": "隱忍轉移", "text": "具體台詞...", "intent": "心理目標..." }
]`;
        const resp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        const parsed = JSON.parse(resp.text || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        console.error('Direct Gemini choices error:', err);
      }
    }

    return [
      { id: 'A', tag: '審慎試探', text: '「這並非偶然發生的，對吧？」', intent: '確認對方的真實立場' },
      { id: 'B', tag: '深層共情', text: '「如果這讓你感到為難，我們換個方式談。」', intent: '降低戒備，建立更深信任' },
      { id: 'C', tag: '直擊關鍵', text: '「我想聽聽你最真實的答案，而不是官方說辭。」', intent: '推進劇情核心分歧' },
    ];
  }
}
