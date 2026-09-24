import {
  Character,
  StoryMessage,
  StoryBranchNode,
  DiaryEntry,
  CorpusItem,
  StorySession,
} from '../types/story';
import { INITIAL_CHARACTERS, INITIAL_CORPUS, INITIAL_ROOT_NODE } from '../data/initialCorpus';

// Storage keys bumped to v5 to ensure clean adoption settings and direct install
const STORAGE_KEYS = {
  CHARACTERS: 'lala_story_characters_v5',
  MESSAGES: 'lala_story_messages_v5',
  BRANCH_NODES: 'lala_story_branch_nodes_v5',
  DIARIES: 'lala_story_diaries_v5',
  CORPUS: 'lala_story_corpus_v5',
  SESSION: 'lala_story_session_v5',
};

// Initial welcome dialogue (Factual and respectful: Adam is adopted, clean dialogue)
const INITIAL_MESSAGES: StoryMessage[] = [
  {
    id: 'msg_1',
    senderId: 'adam',
    senderName: 'Adam',
    senderColor: 'bg-amber-100 text-amber-800 border-amber-200',
    content: '「我回來了。」',
    stageAction: '把鑰匙放在玄關櫃上，看向客廳。',
    timestamp: Date.now() - 1800000,
    type: 'dialogue',
    nodeId: 'node_root',
    branchId: 'node_root',
  },
  {
    id: 'msg_2',
    senderId: 'lala',
    senderName: '啦啦',
    senderColor: 'bg-rose-100 text-rose-700 border-rose-200',
    content: '「回來了？坐吧。」',
    stageAction: '轉身看向他，神情平和。',
    timestamp: Date.now() - 1200000,
    type: 'dialogue',
    nodeId: 'node_root',
    branchId: 'node_root',
  },
];

const INITIAL_SESSION: StorySession = {
  id: 'session_default',
  activeBranchId: 'node_root',
  mode: 'private',
  selectedPrivateCharacterId: 'adam',
  groupParticipantIds: ['adam', 'daniel'],
  sceneLocation: '客廳（日常生活場景）',
  autoNextOnSilence: false,
  lastSyncTime: Date.now(),
  isMatureMode: true, // 18+ 成人劇情模式
  authorFavoriteTastes: ['18+ 成人情慾/張力', '原著自然對白'],
};

// Banned fabricated dummy characters
const FABRICATED_CHARACTER_IDS = new Set([
  'ben', 'amy', 'jiuge', 'rave', 'leon', 'fuye', 'marcus', 'jace', 'char_dummy'
]);

export class StoryStorageService {
  // Characters
  static getCharacters(): Character[] {
    let raw = localStorage.getItem(STORAGE_KEYS.CHARACTERS);
    if (!raw) {
      this.saveCharacters(INITIAL_CHARACTERS);
      return INITIAL_CHARACTERS;
    }
    try {
      let list: Character[] = JSON.parse(raw);
      // Strictly purge any fabricated characters
      list = list.filter(c => !FABRICATED_CHARACTER_IDS.has(c.id));
      
      let needsResave = false;
      for (const c of list) {
        if (c.id === 'adam') {
          if (
            !c.relationshipWithLala.includes('領養') ||
            c.relationshipWithLala.includes('母子') ||
            c.background?.includes('親生') ||
            c.background?.includes('母子')
          ) {
            c.title = '養子';
            c.relationshipWithLala = '領養關係（養子，非母子親情關係）';
            c.background = '啦啦的領養孩子（養子）。領養關係，非親生，絕非母子親情關係。背景嚴格取自原著檔案。';
            c.personality = '背景與互動設定完全以原著書本記載為準，嚴禁擅自編造或添加任何主觀評價。';
            c.speechStyle = '以原著實際對白記錄為準。';
            c.tagline = '';
            needsResave = true;
          }
        }
        if (c.id === 'daniel') {
          if (c.background?.includes('石氏家族') || c.title?.includes('守護者')) {
            c.title = '';
            c.background = '由作者原著書本中明確標記為背景的檔案導入，嚴禁系統擅自編造或改編。';
            c.relationshipWithLala = '依原著書本設定為唯一依據。';
            c.tagline = '';
            needsResave = true;
          }
        }
        if (c.title?.includes('野心家') || c.title?.includes('守護者') || c.title?.includes('浪子') || c.title?.includes('秩序之劍') || c.title?.includes('執棋長者')) {
          c.title = c.id === 'adam' ? '養子' : '';
          c.tagline = '';
          needsResave = true;
        }
      }
      if (needsResave || list.length === 0) {
        if (list.length === 0) list = INITIAL_CHARACTERS;
        this.saveCharacters(list);
      }
      return list;
    } catch {
      return INITIAL_CHARACTERS;
    }
  }

  static saveCharacters(characters: Character[]): void {
    // Ensure no banned characters ever get saved
    const cleanList = characters.filter(c => !FABRICATED_CHARACTER_IDS.has(c.id));
    localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(cleanList));
    this.touchSync();
  }

  static deleteCharacter(charId: string): void {
    if (charId === 'lala') return; // Cannot delete protagonist
    const current = this.getCharacters().filter(c => c.id !== charId);
    this.saveCharacters(current);
    
    // Also remove from session group participants
    const session = this.getSession();
    session.groupParticipantIds = session.groupParticipantIds.filter(id => id !== charId);
    if (session.selectedPrivateCharacterId === charId) {
      session.selectedPrivateCharacterId = current.find(c => c.id !== 'lala')?.id || 'lala';
    }
    this.saveSession(session);
  }

  static saveCharacterProfile(updatedChar: Character): void {
    const characters = this.getCharacters();
    const idx = characters.findIndex(c => c.id === updatedChar.id);
    if (idx !== -1) {
      characters[idx] = { ...characters[idx], ...updatedChar };
      this.saveCharacters(characters);
    }
  }

  static updateCharacterStats(characterId: string, affectionDelta: number, trustDelta: number, tensionDelta: number, mindsetUpdate?: string): Character | null {
    const characters = this.getCharacters();
    const idx = characters.findIndex(c => c.id === characterId);
    if (idx === -1) return null;

    const char = characters[idx];
    const newAffection = Math.max(0, Math.min(100, char.stats.affection + affectionDelta));
    const newTrust = Math.max(0, Math.min(100, char.stats.trust + trustDelta));
    const newTension = Math.max(0, Math.min(100, char.stats.tension + tensionDelta));

    let intimacyStage = char.stats.intimacyStage;
    if (newAffection >= 85 && newTrust >= 80) intimacyStage = '深刻牽絆';
    else if (newAffection >= 70 && newTrust >= 65) intimacyStage = '漸生信任';
    else if (newAffection >= 50) intimacyStage = '審慎試探';
    else intimacyStage = '疏離戒備';

    char.stats = {
      affection: newAffection,
      trust: newTrust,
      tension: newTension,
      intimacyStage,
      currentMindset: mindsetUpdate || char.stats.currentMindset,
    };

    characters[idx] = char;
    this.saveCharacters(characters);
    return char;
  }

  // Messages
  static getMessages(): StoryMessage[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (!raw) {
      this.saveMessages(INITIAL_MESSAGES);
      return INITIAL_MESSAGES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_MESSAGES;
    }
  }

  static saveMessages(messages: StoryMessage[]): void {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    this.touchSync();
  }

  static addMessage(msg: StoryMessage): void {
    const messages = this.getMessages();
    messages.push(msg);
    this.saveMessages(messages);
  }

  static toggleFavoriteMessage(
    messageId: string,
    defaultCategory: string = '深情對白',
    note?: string
  ): StoryMessage | null {
    const messages = this.getMessages();
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1) return null;

    const current = messages[idx];
    const newFav = !current.isFavorite;
    messages[idx] = {
      ...current,
      isFavorite: newFav,
      favoriteCategory: newFav ? (current.favoriteCategory || defaultCategory) : current.favoriteCategory,
      favoriteNote: newFav ? (note !== undefined ? note : current.favoriteNote) : current.favoriteNote,
    };
    this.saveMessages(messages);
    return messages[idx];
  }

  static updateMessageFavorite(
    messageId: string,
    isFavorite: boolean,
    category?: string,
    note?: string
  ): StoryMessage | null {
    const messages = this.getMessages();
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1) return null;

    messages[idx] = {
      ...messages[idx],
      isFavorite,
      favoriteCategory: category || messages[idx].favoriteCategory,
      favoriteNote: note !== undefined ? note : messages[idx].favoriteNote,
    };
    this.saveMessages(messages);
    return messages[idx];
  }

  static getFavoriteMessages(): StoryMessage[] {
    const messages = this.getMessages();
    return messages.filter(m => m.isFavorite);
  }

  static getAuthorFavoritesSummary(): string {
    const favs = this.getFavoriteMessages();
    if (favs.length === 0) return '尚未標記特別喜愛類型';

    const categoryCounts: Record<string, number> = {};
    const speakerCounts: Record<string, number> = {};

    favs.forEach(f => {
      const cat = f.favoriteCategory || '未分類精選';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      speakerCounts[f.senderName] = (speakerCounts[f.senderName] || 0) + 1;
    });

    const topCategories = Object.entries(categoryCounts)
      .map(([k, v]) => `${k}(${v}則)`)
      .join('、');
    const topSpeakers = Object.entries(speakerCounts)
      .map(([k, v]) => `${k}(${v}次)`)
      .join('、');

    const sampleQuotes = favs
      .slice(-3)
      .map(f => `「${f.senderName}：${f.content.slice(0, 40)}...」[標籤:${f.favoriteCategory || '喜愛'}]`)
      .join('\n');

    return `作者已標註心動喜愛：【類型：${topCategories}】【最常心動角色：${topSpeakers}】\n代表性心動金句示例：\n${sampleQuotes}`;
  }

  // Branch Nodes (Story Tree)
  static getBranchNodes(): StoryBranchNode[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BRANCH_NODES);
    if (!raw) {
      this.saveBranchNodes([INITIAL_ROOT_NODE]);
      return [INITIAL_ROOT_NODE];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [INITIAL_ROOT_NODE];
    }
  }

  static saveBranchNodes(nodes: StoryBranchNode[]): void {
    localStorage.setItem(STORAGE_KEYS.BRANCH_NODES, JSON.stringify(nodes));
    this.touchSync();
  }

  static addBranchNode(node: StoryBranchNode): void {
    const nodes = this.getBranchNodes();
    nodes.push(node);
    this.saveBranchNodes(nodes);
  }

  static createBranchNode(
    parentId: string | null,
    branchName: string,
    title: string,
    summary: string,
    choiceMade: string,
    sceneLocation?: string,
    participants?: string[]
  ): StoryBranchNode {
    const parentNode = parentId ? this.getBranchNodes().find(n => n.id === parentId) : null;
    const newNode: StoryBranchNode = {
      id: `branch_${Date.now()}`,
      parentId,
      branchName,
      title,
      summary,
      timestamp: Date.now(),
      choiceMade,
      choiceTag: '分歧',
      participants: participants || (parentNode ? parentNode.participants : ['lala', 'adam', 'daniel']),
      sceneLocation: sceneLocation || (parentNode ? parentNode.sceneLocation : '日常空間'),
      characterSnapshots: parentNode ? { ...parentNode.characterSnapshots } : {},
      messageIds: [],
    };
    this.addBranchNode(newNode);
    return newNode;
  }

  // Diaries
  static getDiaries(): DiaryEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DIARIES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveDiaries(diaries: DiaryEntry[]): void {
    localStorage.setItem(STORAGE_KEYS.DIARIES, JSON.stringify(diaries));
    this.touchSync();
  }

  static addDiary(entry: DiaryEntry): void {
    const diaries = this.getDiaries();
    diaries.unshift(entry);
    this.saveDiaries(diaries);
  }

  // Corpus (World Lore & Author Notes)
  static getCorpus(): CorpusItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CORPUS);
    if (!raw) {
      this.saveCorpus(INITIAL_CORPUS);
      return INITIAL_CORPUS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_CORPUS;
    }
  }

  static saveCorpus(corpus: CorpusItem[]): void {
    localStorage.setItem(STORAGE_KEYS.CORPUS, JSON.stringify(corpus));
    this.touchSync();
  }

  static addCorpusItem(item: CorpusItem): void {
    const corpus = this.getCorpus();
    corpus.unshift(item);
    this.saveCorpus(corpus);
  }

  // Session
  static getSession(): StorySession {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) {
      this.saveSession(INITIAL_SESSION);
      return INITIAL_SESSION;
    }
    try {
      const sess: StorySession = JSON.parse(raw);
      // Filter out any banned participant ids
      sess.groupParticipantIds = sess.groupParticipantIds.filter(id => !FABRICATED_CHARACTER_IDS.has(id));
      if (sess.groupParticipantIds.length === 0) {
        sess.groupParticipantIds = ['adam', 'daniel'];
      }
      return sess;
    } catch {
      return INITIAL_SESSION;
    }
  }

  static saveSession(session: StorySession): void {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  }

  static touchSync(): void {
    const session = this.getSession();
    session.lastSyncTime = Date.now();
    this.saveSession(session);
  }

  // Apply parsed data from the author's book (Kindroid_Book_All_Readable_PDF)
  static applyBookData(data: {
    characters?: Character[];
    corpusItems?: CorpusItem[];
    messages?: StoryMessage[];
    branchTitle?: string;
  }): void {
    if (data.characters && data.characters.length > 0) {
      const cleanChars = data.characters.filter(c => !FABRICATED_CHARACTER_IDS.has(c.id));
      this.saveCharacters(cleanChars);
    }
    if (data.corpusItems && data.corpusItems.length > 0) {
      const existing = this.getCorpus();
      this.saveCorpus([...data.corpusItems, ...existing]);
    }
    if (data.messages && data.messages.length > 0) {
      this.saveMessages(data.messages);
    }
  }

  // Full backup & restore
  static exportFullBackupJSON(): string {
    const backup = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      characters: this.getCharacters(),
      messages: this.getMessages(),
      branchNodes: this.getBranchNodes(),
      diaries: this.getDiaries(),
      corpus: this.getCorpus(),
      session: this.getSession(),
    };
    return JSON.stringify(backup, null, 2);
  }

  static importFullBackupJSON(jsonString: string): boolean {
    try {
      const backup = JSON.parse(jsonString);
      if (backup.characters) this.saveCharacters(backup.characters);
      if (backup.messages) this.saveMessages(backup.messages);
      if (backup.branchNodes) this.saveBranchNodes(backup.branchNodes);
      if (backup.diaries) this.saveDiaries(backup.diaries);
      if (backup.corpus) this.saveCorpus(backup.corpus);
      if (backup.session) this.saveSession(backup.session);
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  }

  static resetToDefaults(): void {
    this.saveCharacters(INITIAL_CHARACTERS);
    this.saveMessages(INITIAL_MESSAGES);
    this.saveBranchNodes([INITIAL_ROOT_NODE]);
    this.saveCorpus(INITIAL_CORPUS);
    this.saveSession(INITIAL_SESSION);
  }
}
