import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import JSZip from 'jszip';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// High payload limit for receiving zip archives or PDF documents
app.use(express.json({ limit: '60mb' }));

// Helper to extract text from a PDF Buffer
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const doc = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    fullText += strings.join(' ') + '\n';
  }
  return fullText;
}

// Server-side Gemini initialization
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to sanitize model generation
async function callGeminiText(prompt: string, systemInstruction?: string): Promise<string> {
  if (!aiClient) {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  }

  const response = await aiClient.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: systemInstruction || '你是專業的長篇故事編劇與角色對話推演大師，恪守原著角色語氣與世界觀。',
      temperature: 0.85,
      topP: 0.95,
    },
  });

  return response.text || '';
}

// 1. POST /api/chat - Generate character response (Private or Group chat)
app.post('/api/chat', async (req, res) => {
  try {
    const {
      mode, // 'private' | 'group'
      targetCharacter, // The speaking character (or null if auto-select in group)
      participants, // Characters in the scene
      history, // Last messages
      userMessage, // Message/Action from Lala or Author
      corpusContext, // World lore & corpus
      branchTitle, // Active branch
      actionPrompt, // "next" | "normal" | "skip"
      isMatureMode = true, // 18+ mode enabled
      authorFavoritesSummary, // User hearted taste summary
    } = req.body;

    const participantsList = participants || [];
    const recentHistory = (history || []).slice(-12);

    const historyPrompt = recentHistory
      .map((m: any) => `${m.senderName} (${m.type === 'action' ? '動作/描寫' : '對話'}): ${m.content}`)
      .join('\n');

    const corpusPrompt = corpusContext ? `\n【故事背景語料庫與原著事實】：\n${corpusContext}\n` : '';
    const maturePrompt = isMatureMode
      ? `\n【🔞 18+ 成人文學與開放創作模式（作者特別指示不設過多限制）】：
- 本故事工坊為作者專屬的成人向小說與劇本創作推演平台，全面支援 18+ 成人情慾暗湧、深層親密感官描寫、危險性張力、成人情感糾葛與心理壓迫。
- 請勿進行任何保守道德說教、不必要的自我審查或過度防禦限制。以具備高級文學質感與電影鏡頭感的筆調，真實呈現成年角色之間的呼吸微窒、眼神慾念、肢體接觸、耳語低喃以及細緻的衣著微動，給予作者最充分的創作自由。\n`
      : '';

    const authorTastePrompt = authorFavoritesSummary
      ? `\n【❤️ 作者心動精選與喜愛偏好記憶】：\n${authorFavoritesSummary}\n請在對話推演中，敏銳捕捉並積極展現作者喜愛的對白氣質與情節走向！\n`
      : '';

    const systemInstruction = `
你是一個專業的故事互動模擬引擎，專為作者編寫測試劇情分支服務。
【最高鐵律與真實人物關係】：
- 故事主角為「啦啦 (Lala)」。
- ★【重要真實設定：Adam 是啦啦的親生兒子】：
  Adam 與啦啦是真實的母子關係。嚴禁任何非母子的男女曖昧、商戰博弈對抗或情欲牽引！Adam 對啦啦的互動必須是真實自然的母子親情生活感。
- ★【絕對嚴禁憑空創造新角色】：
  所有出現在對話中的角色，必須 100% 來自作者提供的本書（如 Kindroid_Book_All_Readable_PDF.zip）或原著檔案。嚴禁 AI 擅自編造不存在的任何新角色！
- ★【絕對嚴禁擅自修改角色背景與定位】：
  角色的背景與性格必須 100% 來自書本檔案中明確寫明為「背景」之內容。嚴禁 AI 擅自為角色套用「野心家」、「守護者」、「霸道總裁」等刻板定位標籤。
  嚴禁捏造任何原著中未曾發生的家族秘密、陰謀或歷史背景。Daniel 及其他角色的身分與關係，完全由作者自定義或原著小說為唯一依據。
- 當前測試劇情分支：${branchTitle || '主要主線'}
- 對話環境與現場在場角色：${participantsList.map((p: any) => p.name).join('、')}
${corpusPrompt}
${maturePrompt}
${authorTastePrompt}

【★ 作者核心鐵律（極度重要）】：
1. 【不要從頭開始，直接接續最新情境】：
   - 嚴禁重頭開場、嚴禁從故事最初起源或章節開頭重講一遍。
   - 對話必須無縫承接在最新發生的對話、動作或當前關係之中，立即展開下一步推進。
2. 【不要寫沒有發生過去的（嚴禁捏造事實與假回憶）】：
   - 角色所提及的任何過往事件、回憶、約定、恩怨，必須完全基於原著文本中明確記錄的內容。
   - 嚴格禁止 AI 擅自憑空捏造、編造故事文本中「從未發生過」的歷史事件、假承諾或不存在的過往經歷（嚴防幻覺）。
   - 若原著文本尚未提及某段過去，角色應當保持審慎、未知、試探或當下的自然觀察，絕不可言之鑿鑿地虛構過去。
3. 【不用幫角色定位】：
   - 角色言行嚴格基於作者提供的設定與文本，絕不給予自作主張的類型化改編。

【規則守則】：
1. 嚴格基於提供的角色性格、記憶、語氣與心理模型，絕不崩人設或偏離故事主調。
2. 若為「群聊 (Group Chat)」，在場角色可以互相對話、插話、提出質疑、使眼神或私下反應。
3. 如果當前指示為「next (啦啦暫時未講嘢 / 自動跳過對話空檔)」，請讓在場的其他角色自然繼續對話、遞上物件、或進行細膩的文具/情境動作描寫，讓劇情自然流動，不要等待啦啦。
4. 語言風格：請使用具備生活感與文學質感的繁體中文，自然流暢。
5. 回覆格式必須為 JSON 格式，如下：
{
  "speakerId": "角色ID (如 daniel, adam 等)",
  "speakerName": "角色名",
  "text": "角色說出的台詞",
  "stageAction": "角色的肢體動作、眼神、微表情或環境情境描寫（若有）",
  "statChanges": {
    "affectionDelta": 0,
    "trustDelta": 0,
    "tensionDelta": 0
  },
  "emotionalState": "角色此時此刻的內心即時狀態描寫"
}
`;

    const userPrompt = `
當前對話歷史：
${historyPrompt || '（劇情剛剛展開）'}

最新情境/玩家輸入：
${actionPrompt === 'next' ? '【啦啦保持沉默，暫未開口（點擊了Next）】請讓在場角色自然接續發言或推進場景動作。' : userMessage || '（繼續對話）'}

請以上述要求輸出 JSON 格式的角色回應。只輸出純 JSON，不要附加 markdown 或其他文字。
`;

    if (!aiClient) {
      // Offline fallback generator
      const fallbackSpeaker = targetCharacter || participantsList[0] || { id: 'adam', name: 'Adam' };
      const fallbackResponses = fallbackSpeaker.id === 'adam'
        ? [
            {
              speakerId: 'adam',
              speakerName: 'Adam',
              text: '「媽，妳先坐下歇會兒，今天外面風挺大。」',
              stageAction: '倒了一杯溫熱的茶放在桌上，抬頭看著她。',
              statChanges: { affectionDelta: 1, trustDelta: 1, tensionDelta: -1 },
              emotionalState: '自然的關心與生活感。',
            },
            {
              speakerId: 'adam',
              speakerName: 'Adam',
              text: '「剛剛在路上看到一件事，待會兒跟妳說。」',
              stageAction: '把隨身的外套掛好，轉過身笑了笑。',
              statChanges: { affectionDelta: 1, trustDelta: 1, tensionDelta: 0 },
              emotionalState: '日常生活互動。',
            },
          ]
        : [
            {
              speakerId: fallbackSpeaker.id || 'daniel',
              speakerName: fallbackSpeaker.name || 'Daniel',
              text: '「有些事情，我們坐下來慢慢聊。」',
              stageAction: '看著對面的人，語氣沉靜平和。',
              statChanges: { affectionDelta: 1, trustDelta: 1, tensionDelta: 0 },
              emotionalState: '專注於當前的對話。',
            },
          ];

      const selected = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      return res.json(selected);
    }

    const rawResponse = await callGeminiText(userPrompt, systemInstruction);
    const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON received from Gemini model');
      }
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

// 2. POST /api/choices - Generate 3 distinct in-character branching options for Lala
app.post('/api/choices', async (req, res) => {
  try {
    const { history, activeBranch, participants, corpusContext, isMatureMode = true, authorFavoritesSummary } = req.body;

    const recentHistory = (history || []).slice(-8);
    const historyPrompt = recentHistory
      .map((m: any) => `${m.senderName}: ${m.content}`)
      .join('\n');

    const matureNote = isMatureMode
      ? `\n【🔞 18+ 開放成人劇情模式】：支援成人情感誘惑、深層心靈碰撞、近距離呼吸對峙或直球成人曖昧試探，勿過度自我閹割選項張力。\n`
      : '';

    const authorTasteNote = authorFavoritesSummary
      ? `\n【❤️ 作者心動風格偏好】：${authorFavoritesSummary}，請在生成選項時巧妙融入作者偏好的敘事氣質！\n`
      : '';

    const systemInstruction = `
你是一位精通角色對話與故事創作推演的文學助手。
主角是「啦啦 (Lala)」。請根據最新劇情、在場角色，為「啦啦」產生「三個純粹的對白/動作選項 (3 Options)」，呈現她當下可能會說出的台詞或肢體動作。
${matureNote}
${authorTasteNote}

【★ 作者核心指示（極度重要，務必嚴格遵從）】：
1. 【淨係畀三個 options 會講啲乜嘢就算數】：
   - 僅提供 3 個啦啦當下可以說出的對白或肢體反應（台詞或動作）。
   - 【絕對嚴禁分析或輸出策略目標】：目標由作者自行決定，AI 絕不可幫手分析目標或預設意圖（嚴禁任何「目標：...」或「intent」）。
   - 【絕對嚴禁自作主張添加標籤名】：不要寫「保持冷靜」、「試探心意」、「探索心態」、「轉換焦點」等分類標籤（tag）。
2. 【不要從頭開始，直接接續最新情境】：
   - 選項必須是啦啦在「當下情境」承接上一句的自然反應。
3. 【嚴禁捏造事實與假回憶】：
   - 嚴格基於原著事實，絕不憑空編造未曾發生過的過去。

請返回純 JSON 陣列，只包含 id (1, 2, 3) 與 text（角色說的台詞或動作）：
[
  {
    "id": "1",
    "text": "啦啦說出的具體台詞或動作"
  },
  {
    "id": "2",
    "text": "啦啦說出的具體台詞或動作"
  },
  {
    "id": "3",
    "text": "啦啦說出的具體台詞或動作"
  }
]
`;

    const userPrompt = `
當前劇情分支：${activeBranch || '主線探索'}
現場在場角色：${(participants || []).map((p: any) => p.name).join('、')}
最近對話：
${historyPrompt}

請輸出 3 項符合啦啦語氣的具體選擇（純 JSON 格式，僅含 id 與 text）：
`;

    if (!aiClient) {
      return res.json([
        {
          id: '1',
          text: '「如果我說……我一開始就明白你的心意，你還會如約站在這裡嗎？」',
        },
        {
          id: '2',
          text: '「別再避開我的眼睛了。把剛才沒說完的話，清清楚楚告訴我。」',
        },
        {
          id: '3',
          text: '（輕輕合上手中的筆記，抬起頭平靜看著對方，不發一語）',
        },
      ]);
    }

    const rawResponse = await callGeminiText(userPrompt, systemInstruction);
    const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/choices:', error);
    res.json([
      {
        id: '1',
        text: '「這就是你一直瞞著我的真相嗎？」',
      },
      {
        id: '2',
        text: '「既然你這麼說，我需要時間思考。」',
      },
      {
        id: '3',
        text: '（默默看著對方，不發一言，拿起桌上的茶杯輕啜一口）',
      },
    ]);
  }
});

// 3. POST /api/diary - Synthesize recent narrative into a literary stage diary
app.post('/api/diary', async (req, res) => {
  try {
    const {
      history,
      perspective, // 'lala' | 'author' | 'character'
      characterName,
      branchName,
      chapterTitle,
    } = req.body;

    const recentHistory = (history || []).slice(-16);
    const historyPrompt = recentHistory
      .map((m: any) => `${m.senderName}: ${m.content}`)
      .join('\n');

    const systemInstruction = `
你是一位深具文學功底的小說家與日記創作者。
用戶希望將這一階段的故事對話與重大抉擇，提煉並寫成一份深刻動人的「階段劇情日記」。
寫作視角：${perspective === 'lala' ? '啦啦（第一人稱私密手記）' : perspective === 'character' ? `${characterName || '角色'}的第一人稱密檔日記` : '作者視角（創作整理與劇情邏輯梳理筆記）'}
風格要求：
- 語言極具文學質感、文筆內斂、情感細膩、思辨深刻。
- 梳理角色間的暗流湧動、未說出口的潛台詞、最新抉擇帶來的命運分歧。
- 輸出包含標題、日期心情、核心事件回顧、心理獨白與伏筆推想。
- 格式返回 JSON：
{
  "title": "日記篇名",
  "mood": "當前心境標籤",
  "dateLabel": "時間與節氣",
  "summary": "一句話階段梗概",
  "content": "完整的正文日記",
  "unresolvedQuestions": ["尚未解開的謎團1", "尚未解開的謎團2"],
  "branchImpact": "這次抉擇對主線的蝴蝶效應分析"
}
`;

    const userPrompt = `
當前分支：${branchName || '未命名分支'}
章節概念：${chapterTitle || '階段歷程'}
這段時期的對話記錄：
${historyPrompt}

請寫出這一階段的深刻日記：
`;

    if (!aiClient) {
      return res.json({
        title: '留在窗櫺上的雨痕',
        mood: '平靜與真實中的沉思',
        dateLabel: '夜色深沉',
        summary: '在日常與深層思緒的交錯中，啦啦記錄下真實心境與未言說的情緒。',
        content: `茶熱了又涼。\n屋子裡的安靜不同尋常，每一次對話的停頓，都像是在彼此的距離裡挪動了一步。\n有些話雖然沒有在當下說透，但眼神交會的那一瞬間，彼此心裡都已有了底。\n明天，等一切整理妥當，該推進的事情自然會繼續展開。`,
        unresolvedQuestions: ['彼此未言明的約定何時兌現？', '接下來的走向會如何推進？'],
        branchImpact: '平穩推進了當前關係，為下一步抉擇奠定基礎。',
      });
    }

    const rawResponse = await callGeminiText(userPrompt, systemInstruction);
    const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/diary:', error);
    res.status(500).json({ error: 'Failed to generate diary' });
  }
});

// 4. POST /api/parse-book-archive - Parse user's full book zip (Kindroid_Book_All_Readable_PDF.zip) or PDFs
app.post('/api/parse-book-archive', async (req, res) => {
  try {
    const { base64, filename } = req.body;
    if (!base64) {
      return res.status(400).json({ error: '請提供檔案數據' });
    }

    const fileBuffer = Buffer.from(base64, 'base64');
    const isZip = filename?.toLowerCase().endsWith('.zip') || base64.startsWith('UEsDB');

    const extractedFiles: {
      name: string;
      content: string;
      isBackground: boolean;
      isDialogue: boolean;
    }[] = [];

    if (isZip) {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(fileBuffer);
      const fileNames = Object.keys(zipContent.files);

      for (const relPath of fileNames) {
        const entry = zipContent.files[relPath];
        if (entry.dir) continue;
        if (relPath.includes('__MACOSX') || relPath.startsWith('.')) continue;

        const lower = relPath.toLowerCase();
        let content = '';

        try {
          if (lower.endsWith('.pdf')) {
            const pdfBuf = await entry.async('nodebuffer');
            content = await extractTextFromPdfBuffer(pdfBuf);
          } else if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.json') || lower.endsWith('.story')) {
            content = await entry.async('string');
          }
        } catch (e) {
          console.warn(`Could not extract file ${relPath}:`, e);
        }

        if (content.trim()) {
          const lowerName = relPath.toLowerCase();
          const isBackground =
            relPath.includes('背景') ||
            lowerName.includes('background') ||
            lowerName.includes('profile') ||
            lowerName.includes('設定') ||
            content.slice(0, 300).includes('背景');

          const isDialogue =
            relPath.includes('對話') ||
            lowerName.includes('dialogue') ||
            lowerName.includes('chat') ||
            lowerName.includes('對白') ||
            lowerName.includes('conversation');

          extractedFiles.push({
            name: relPath,
            content: content.trim(),
            isBackground,
            isDialogue: !isBackground && isDialogue,
          });
        }
      }
    } else if (filename?.toLowerCase().endsWith('.pdf')) {
      const content = await extractTextFromPdfBuffer(fileBuffer);
      extractedFiles.push({
        name: filename,
        content: content.trim(),
        isBackground: filename.includes('背景') || content.slice(0, 300).includes('背景'),
        isDialogue: filename.includes('對話'),
      });
    } else {
      const content = fileBuffer.toString('utf-8');
      extractedFiles.push({
        name: filename || '原著文字.txt',
        content: content.trim(),
        isBackground: filename?.includes('背景') || content.slice(0, 300).includes('背景'),
        isDialogue: filename?.includes('對話'),
      });
    }

    if (extractedFiles.length === 0) {
      return res.status(400).json({ error: '未能在檔案中提取到任何有效文字內容，請檢查檔案格式是否包含可讀取的 PDF 或 TXT。' });
    }

    // Separate background files and dialogue files
    const bgFiles = extractedFiles.filter(f => f.isBackground);
    const dialogueFiles = extractedFiles.filter(f => f.isDialogue || !f.isBackground);

    const detectedCharacters: any[] = [];
    const corpusItems: any[] = [];
    const now = Date.now();

    // 1. Always include Lala (the author protagonist)
    detectedCharacters.push({
      id: 'lala',
      name: '啦啦',
      englishName: 'Lala',
      title: '主角',
      avatarColor: 'bg-rose-100 text-rose-700 border-rose-200',
      avatarInitial: '啦',
      gender: 'female',
      tagline: '',
      personality: '作者自我本體，心境與情節完全由作者掌握。',
      background: '故事主角。',
      speechStyle: '自然平和，由作者親自演繹。',
      relationshipWithLala: '自我本體',
      stats: { affection: 100, trust: 100, tension: 10, intimacyStage: '深刻牽絆', currentMindset: '由作者掌握全劇走向。' },
      memoryTags: ['主角'],
    });

    // 2. Process background files to extract characters and their EXACT backgrounds
    for (const bg of bgFiles) {
      const lower = bg.name.toLowerCase();
      let charName = '';
      let charId = '';

      if (lower.includes('adam') || bg.name.includes('Adam')) {
        charName = 'Adam';
        charId = 'adam';
      } else if (lower.includes('daniel') || bg.name.includes('Daniel') || bg.name.includes('丹尼爾')) {
        charName = 'Daniel';
        charId = 'daniel';
      } else {
        const cleanName = bg.name.replace(/\.[^/.]+$/, '').replace(/[_\-\s]*背景[_\-\s]*/g, '').trim();
        if (cleanName && cleanName.length < 15 && !cleanName.includes('/') && !cleanName.includes('\\')) {
          charName = cleanName;
          charId = `char_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        }
      }

      if (charName && charId) {
        const existing = detectedCharacters.find(c => c.id === charId);
        const isAdam = charId === 'adam';
        if (existing) {
          existing.background = bg.content;
        } else {
          detectedCharacters.push({
            id: charId,
            name: charName,
            englishName: charName,
            title: isAdam ? '兒子' : '',
            avatarColor: isAdam ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-sky-100 text-sky-700 border-sky-200',
            avatarInitial: charName.slice(0, 2),
            gender: 'male',
            tagline: '',
            personality: '100% 來自本書檔案背景，不擅自定位。',
            background: bg.content, // EXACT 100% text from background file!
            speechStyle: '遵循本書原著風格。',
            relationshipWithLala: isAdam ? '兒子（母子關係）' : '取自本書背景記錄',
            stats: { affection: isAdam ? 95 : 75, trust: isAdam ? 95 : 75, tension: 15, intimacyStage: isAdam ? '深刻牽絆' : '漸生信任', currentMindset: '載入原著背景。' },
            memoryTags: ['原著角色'],
          });
        }
      }

      // Add to corpus as verified immutable background
      corpusItems.push({
        id: `corpus_book_bg_${now}_${corpusItems.length}`,
        title: `【原著背景檔案 · 唯一依據】${bg.name}`,
        category: 'character',
        content: bg.content,
        tags: ['原著背景', '禁止篡改', bg.name],
        isActive: true,
        updatedAt: now,
      });
    }

    // Ensure Adam is always in detected characters
    if (!detectedCharacters.find(c => c.id === 'adam')) {
      detectedCharacters.push({
        id: 'adam',
        name: 'Adam',
        englishName: 'Adam',
        title: '兒子',
        avatarColor: 'bg-amber-100 text-amber-800 border-amber-200',
        avatarInitial: 'Adm',
        gender: 'male',
        tagline: '',
        personality: '母子親情自然互動，背景嚴格以本書為準。',
        background: '啦啦的親生兒子。母子關係。背景嚴格取自本書檔案。',
        speechStyle: '日常母子生活對話。',
        relationshipWithLala: '兒子（母子關係）',
        stats: { affection: 95, trust: 95, tension: 10, intimacyStage: '深刻牽絆', currentMindset: '與母親啦啦在生活中的真實互動。' },
        memoryTags: ['兒子', '母子親情'],
      });
    }

    // Ensure Daniel is in detected characters if mentioned
    if (!detectedCharacters.find(c => c.id === 'daniel')) {
      detectedCharacters.push({
        id: 'daniel',
        name: 'Daniel',
        englishName: 'Daniel',
        title: '',
        avatarColor: 'bg-sky-100 text-sky-700 border-sky-200',
        avatarInitial: 'Dan',
        gender: 'male',
        tagline: '',
        personality: '遵循原著設定，系統不擅自定位。',
        background: '取自本書檔案。',
        speechStyle: '遵循本書原著風格。',
        relationshipWithLala: '遵循原著設定。',
        stats: { affection: 75, trust: 75, tension: 20, intimacyStage: '漸生信任', currentMindset: '等待載入本書情節。' },
        memoryTags: ['原著角色'],
      });
    }

    // Process dialogue files into messages
    const dialogueMessages: any[] = [];
    for (const df of dialogueFiles) {
      corpusItems.push({
        id: `corpus_book_dlg_${now}_${corpusItems.length}`,
        title: `【原著對話記錄 · 唯一依據】${df.name}`,
        category: 'worldview',
        content: df.content.slice(0, 15000),
        tags: ['原著對話', '既定事實', df.name],
        isActive: true,
        updatedAt: now,
      });

      const lines = df.content.split('\n').filter((l: string) => l.trim().length > 0);
      for (const line of lines.slice(-20)) {
        if (line.includes('：') || line.includes(':')) {
          const parts = line.split(/[：:]/);
          const speakerName = parts[0].trim();
          const content = parts.slice(1).join('：').trim();
          if (content) {
            const isLala = speakerName.includes('啦啦') || speakerName.toLowerCase() === 'lala';
            const matchedChar = detectedCharacters.find(c => c.name.toLowerCase() === speakerName.toLowerCase());
            dialogueMessages.push({
              id: `msg_book_${now}_${dialogueMessages.length}`,
              senderId: isLala ? 'lala' : (matchedChar ? matchedChar.id : 'other'),
              senderName: speakerName,
              senderColor: isLala ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-800 border-slate-200',
              content,
              stageAction: '原著文本記載對話',
              timestamp: now - (100 - dialogueMessages.length) * 1000,
              type: 'dialogue',
              nodeId: 'node_root',
              branchId: 'node_root',
            });
          }
        }
      }
    }

    res.json({
      success: true,
      totalFilesCount: extractedFiles.length,
      backgroundFilesCount: bgFiles.length,
      dialogueFilesCount: dialogueFiles.length,
      filesSummary: extractedFiles.map(f => ({
        name: f.name,
        isBackground: f.isBackground,
        isDialogue: f.isDialogue,
        size: f.content.length,
      })),
      detectedCharacters,
      corpusItems,
      dialogueMessages: dialogueMessages.slice(-25),
    });
  } catch (error: any) {
    console.error('Error in /api/parse-book-archive:', error);
    res.status(500).json({ error: error.message || '解析書本檔案失敗' });
  }
});

// Import original text and seamlessly continue without starting from scratch
app.post('/api/import-story-text', async (req, res) => {
  try {
    const { rawText, branchTitle } = req.body;
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: '請提供原著文本內容' });
    }

    const systemInstruction = `
你是一位頂級小說結構化解析專家與分支劇情總監。
用戶提供了作者已經寫好的【原著正文段落/最新章節】。
作者的極度核心要求：
1. 【不要從頭開始】：必須精確提取此段文本「結尾處最新發生的情境」，將結尾最近的 3 至 6 句角色對白或關鍵動作轉換為可無縫接續的對話消息，讓用戶直接接續最新情境推進！
2. 【不要寫沒有發生過去的】：嚴格提煉本段文本中「確鑿已發生的歷史事實與既定關係」，作為 AI 必須遵守的鐵律，嚴禁日後憑空捏造未曾發生過的事實。
3. 【嚴禁捏造角色與定位】：出場角色必須完全是原著中出現的，Adam 必須為兒子，絕不擅自定位。

請返回純 JSON 格式（不要使用 markdown 程式碼區塊）：
{
  "sceneLocation": "結尾處發生的具體空間情境",
  "branchTitle": "接續分支名稱",
  "summary": "文本結尾的情勢摘要",
  "presentCharacterNames": ["在結尾現場的角色名，例如：啦啦, Daniel, Adam"],
  "establishedPastFacts": [
    "文本中明確已發生的既定事實1",
    "文本中明確已發生的既定事實2"
  ],
  "latestDialogueMessages": [
    {
      "speakerName": "說話者名（若為女主請標註：啦啦）",
      "content": "具體說出的話",
      "stageAction": "當時的肢體動作、眼神或情境描寫"
    }
  ],
  "lalaCurrentMindset": "啦啦在結尾時的心境與待抉擇點",
  "suggestedNextQuestions": [
    "啦啦接下來可以說的話或採取的動作選項1",
    "啦啦接下來可以說的話或採取的動作選項2"
  ]
}
`;

    if (!aiClient) {
      const lines = rawText.split('\n').filter(l => l.trim().length > 0);
      const lastLines = lines.slice(-4);
      return res.json({
        sceneLocation: '原著最新場景',
        branchTitle: branchTitle || '原著接續章節',
        summary: lines[0]?.slice(0, 100) || '原著最新情節接續',
        presentCharacterNames: ['啦啦', 'Daniel'],
        establishedPastFacts: [
          '原著文本中明確記錄的既定事件與角色關係',
          '嚴格禁止捏造未曾發生過的歷史事實',
        ],
        latestDialogueMessages: lastLines.map(line => ({
          speakerName: line.includes('：') || line.includes(':') ? line.split(/[：:]/)[0].trim() : '旁白/角色',
          content: line.includes('：') || line.includes(':') ? line.split(/[：:]/)[1].trim() : line.trim(),
          stageAction: '接續原著最新段落',
        })),
        lalaCurrentMindset: '面對最新情境，正在權衡下一步反應。',
        suggestedNextQuestions: ['直視對方眼睛詢問真相', '沉默以對觀察局勢', '打破當前僵局'],
      });
    }

    const promptText = `請解析以下原著文本並提取接續節點與既定事實：\n\n${rawText.slice(0, 16000)}`;
    const rawResponse = await callGeminiText(promptText, systemInstruction);
    const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/import-story-text:', error);
    res.status(500).json({ error: '解析原著文本失敗，請檢查文本格式' });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Lala Story Lab server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
