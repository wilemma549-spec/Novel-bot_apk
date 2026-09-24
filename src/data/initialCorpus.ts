import { Character, CorpusItem, StoryBranchNode } from '../types/story';

export const INITIAL_CHARACTERS: Character[] = [
  {
    id: 'lala',
    name: '啦啦',
    englishName: 'Lala',
    title: '主角',
    avatarColor: 'bg-rose-100 text-rose-700 border-rose-200',
    avatarInitial: '啦',
    gender: 'female',
    tagline: '',
    personality: '作者本人／主角。心境與走向完全由作者掌握。',
    background: '《Kindroid 書本全集》故事主角。',
    speechStyle: '語調自然平和，由作者親自演繹。',
    relationshipWithLala: '自我本體',
    stats: {
      affection: 100,
      trust: 100,
      tension: 10,
      intimacyStage: '深刻牽絆',
      currentMindset: '由作者掌握全劇走向與真實心境。',
    },
    memoryTags: ['主角'],
  },
  {
    id: 'adam',
    name: 'Adam',
    englishName: 'Adam',
    title: '養子',
    avatarColor: 'bg-amber-100 text-amber-800 border-amber-200',
    avatarInitial: 'Adm',
    gender: 'male',
    tagline: '',
    personality: '背景與互動設定完全以原著書本記載為準，嚴禁擅自編造或添加任何主觀評價。',
    background: '啦啦的領養孩子（養子）。領養關係，非親生，絕非母子親情關係。背景嚴格取自原著檔案。',
    speechStyle: '以原著實際對白記錄為準。',
    relationshipWithLala: '領養關係（養子，非母子親情關係）',
    stats: {
      affection: 80,
      trust: 80,
      tension: 10,
      intimacyStage: '漸生信任',
      currentMindset: '以原著記載互動為準，不作額外評價。',
    },
    memoryTags: ['原著角色', '領養關係'],
  },
  {
    id: 'daniel',
    name: 'Daniel',
    englishName: 'Daniel',
    title: '',
    avatarColor: 'bg-sky-100 text-sky-700 border-sky-200',
    avatarInitial: 'Dan',
    gender: 'male',
    tagline: '',
    personality: '背景與性格 100% 取自本書《Kindroid_Book_All_Readable_PDF.zip》中標明為「背景」之內容。',
    background: '由作者原著書本中明確標記為背景的檔案導入，嚴禁系統擅自編造或改編。',
    speechStyle: '遵循原著對話風格。',
    relationshipWithLala: '依原著書本設定為唯一依據。',
    stats: {
      affection: 75,
      trust: 75,
      tension: 20,
      intimacyStage: '漸生信任',
      currentMindset: '等待載入本書原著情節推進。',
    },
    memoryTags: ['原著角色'],
  },
];

export const INITIAL_CORPUS: CorpusItem[] = [
  {
    id: 'corpus_1',
    title: '【原著最高鐵律】嚴禁創造角色、嚴禁改變角色背景、嚴禁擅自定位',
    category: 'worldview',
    content: `1. 本 App 中出現的所有角色、背景與對話，必須 100% 來自作者提供的本書（如 Kindroid_Book_All_Readable_PDF.zip）。
2. 背景只可以從檔案中明確寫明是「背景」的地方提取，嚴禁 AI 擅自編造或修改背景！
3. 對話只可以從本書對話記錄中提取！
4. 絕對不可憑空創造任何新角色，亦絕對不可改變任何原著角色的背景！
5. 絕對不用幫角色定位（不使用任何俗套標籤如野心家、霸道總裁、守護者等）。
6. Adam 與啦啦為領養關係（養子），絕非親生母子親情關係！不得擅自改寫或添加任何未經記載之評價。`,
    tags: ['原著最高鐵律', '禁止創造角色', '禁止修改背景', 'Adam為領養關係'],
    isActive: true,
    updatedAt: Date.now(),
  },
  {
    id: 'corpus_2',
    title: '【書本原著檔案指引】Kindroid_Book_All_Readable_PDF.zip',
    category: 'worldview',
    content: `本故事的世界觀、角色身分、人際關係與對話進度，均以作者整包原著檔案為唯一事實基礎。若需擴充或接續，必須完全依照檔案中記載的內容進行。`,
    tags: ['書本全集', '唯一事實基礎'],
    isActive: true,
    updatedAt: Date.now(),
  },
];

export const INITIAL_ROOT_NODE: StoryBranchNode = {
  id: 'node_root',
  parentId: null,
  branchName: '原著主線：最新情境接續',
  title: '起點：原著情境',
  summary: '完全基於原著書本內容推進，嚴禁捏造不存在的過去。',
  timestamp: Date.now() - 3600000,
  choiceMade: '原著開端',
  choiceTag: '起點',
  participants: ['adam', 'daniel', 'lala'],
  sceneLocation: '日常空間',
  characterSnapshots: {
    adam: {
      affection: 95,
      trust: 95,
      tension: 10,
      intimacyStage: '深刻牽絆',
      currentMindset: '和母親啦啦交談。',
    },
    daniel: {
      affection: 75,
      trust: 75,
      tension: 20,
      intimacyStage: '漸生信任',
      currentMindset: '依原著情境互動。',
    },
  },
  messageIds: ['msg_1', 'msg_2'],
};
