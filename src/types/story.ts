export type Gender = 'female' | 'male' | 'other';

export type IntimacyTier = '疏離戒備' | '審慎試探' | '漸生信任' | '深刻牽絆' | '宿命糾葛';

export interface CharacterStats {
  affection: number; // 0 - 100
  trust: number;     // 0 - 100
  tension: number;   // 0 - 100 (psychological stress/alertness)
  intimacyStage: IntimacyTier;
  currentMindset: string; // real-time psychological state
}

export interface Character {
  id: string;
  name: string;
  englishName: string;
  title: string;
  avatarColor: string;
  avatarInitial: string;
  gender: Gender;
  tagline: string;
  personality: string;
  background: string;
  speechStyle: string;
  relationshipWithLala: string;
  stats: CharacterStats;
  memoryTags: string[];
  isCustom?: boolean;
  notes?: string;
}

export type MessageType = 'dialogue' | 'action' | 'system' | 'milestone';

export interface StatDelta {
  affectionDelta: number;
  trustDelta: number;
  tensionDelta: number;
}

export const FAVORITE_CATEGORIES = [
  '18+ 成人情慾/張力',
  '深情對白',
  '暗湧博弈',
  '文具/微表情',
  '心動神態',
  '致命反轉',
] as const;

export type FavoriteCategory = typeof FAVORITE_CATEGORIES[number] | string;

export interface StoryMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderColor?: string;
  content: string;
  stageAction?: string; // 文具 / 動作 / 微表情 / 環境描寫
  timestamp: number;
  type: MessageType;
  nodeId: string; // Attached branch node
  branchId: string;
  choiceSelected?: {
    id: string;
    text: string;
    intent: string;
  };
  statDelta?: StatDelta;
  isFavorite?: boolean; // ❤️ 加心心收藏
  favoriteCategory?: FavoriteCategory; // 喜愛類型標籤
  favoriteNote?: string; // 作者偏好備註
}

export interface StoryChoiceOption {
  id: 'A' | 'B' | 'C' | '1' | '2' | '3' | string;
  text: string;
  tag?: string;
  intent?: string;
  mood?: string;
}

export interface StoryBranchNode {
  id: string;
  parentId: string | null;
  branchName: string;
  title: string;
  summary: string;
  timestamp: number;
  choiceMade?: string;
  choiceTag?: string;
  participants: string[];
  sceneLocation: string;
  characterSnapshots: Record<string, CharacterStats>;
  messageIds: string[];
}

export interface DiaryEntry {
  id: string;
  title: string;
  dateLabel: string;
  mood: string;
  summary: string;
  content: string;
  perspective: 'lala' | 'author' | 'character';
  characterId?: string;
  characterName?: string;
  branchId: string;
  branchTitle: string;
  unresolvedQuestions: string[];
  branchImpact: string;
  createdAt: number;
}

export interface CorpusItem {
  id: string;
  title: string;
  category: 'character' | 'worldview' | 'timeline' | 'author_note' | 'dialogue_reference';
  content: string;
  tags: string[];
  isActive: boolean;
  updatedAt: number;
}

export interface StorySession {
  id: string;
  activeBranchId: string;
  mode: 'private' | 'group';
  selectedPrivateCharacterId: string;
  groupParticipantIds: string[];
  sceneLocation: string;
  autoNextOnSilence: boolean;
  lastSyncTime: number;
  isMatureMode?: boolean; // 18+ 成人文學與開放張力模式
  authorFavoriteTastes?: string[]; // 作者偏好的劇情/對白類型
}
