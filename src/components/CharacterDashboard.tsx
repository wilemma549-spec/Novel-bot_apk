import React, { useState } from 'react';
import {
  BarChart3,
  Heart,
  Shield,
  Activity,
  Sliders,
  Plus,
  Save,
  MessageSquare,
  Tag,
  CheckCircle2,
  Edit3,
  RotateCcw,
  Sparkles,
  Trash2,
  Archive,
} from 'lucide-react';
import { Character, CharacterStats, StorySession } from '../types/story';
import { StoryStorageService } from '../services/storage';

interface CharacterDashboardProps {
  characters: Character[];
  session: StorySession;
  onSessionChange: (session: StorySession) => void;
  onRefreshData: () => void;
  onNavigateToChat: () => void;
  onOpenImportStoryText?: () => void;
}

export const CharacterDashboard: React.FC<CharacterDashboardProps> = ({
  characters,
  session,
  onSessionChange,
  onRefreshData,
  onNavigateToChat,
  onOpenImportStoryText,
}) => {
  // Default to adam if available, otherwise first character
  const defaultCharId = characters.find(c => c.id === 'adam')?.id || characters[0]?.id || 'adam';
  const [selectedCharId, setSelectedCharId] = useState<string>(defaultCharId);
  const [editingStats, setEditingStats] = useState<CharacterStats | null>(null);
  const [editingMindset, setEditingMindset] = useState('');
  const [savedAlert, setSavedAlert] = useState(false);

  // Full character profile edit mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profName, setProfName] = useState('');
  const [profTitle, setProfTitle] = useState('');
  const [profRelation, setProfRelation] = useState('');
  const [profBackground, setProfBackground] = useState('');
  const [profPersonality, setProfPersonality] = useState('');
  const [profSpeech, setProfSpeech] = useState('');

  // New character modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharTitle, setNewCharTitle] = useState('');
  const [newCharRelation, setNewCharRelation] = useState('');
  const [newCharBackground, setNewCharBackground] = useState('');
  const [newCharPersonality, setNewCharPersonality] = useState('');

  const selectedChar = characters.find(c => c.id === selectedCharId) || characters[0];

  // Initialize editing state when selecting a character
  const handleSelectCharacter = (char: Character) => {
    setSelectedCharId(char.id);
    setEditingStats({ ...char.stats });
    setEditingMindset(char.stats.currentMindset);
    setIsEditingProfile(false);
    setSavedAlert(false);

    // Sync profile fields
    setProfName(char.name);
    setProfTitle(char.id === 'adam' ? (char.title || '養子') : (char.title?.includes('/') ? '' : char.title || ''));
    setProfRelation(char.id === 'adam' ? (char.relationshipWithLala || '領養關係（養子）') : char.relationshipWithLala || '');
    setProfBackground(char.background || '');
    setProfPersonality(char.personality || '');
    setProfSpeech(char.speechStyle || '');
  };

  // Switch to edit profile mode
  const handleStartEditProfile = () => {
    setProfName(selectedChar.name);
    setProfTitle(selectedChar.id === 'adam' ? (selectedChar.title || '養子') : (selectedChar.title?.includes('/') ? '' : selectedChar.title || ''));
    setProfRelation(selectedChar.id === 'adam' ? (selectedChar.relationshipWithLala || '領養關係（養子）') : selectedChar.relationshipWithLala || '');
    setProfBackground(selectedChar.background || '');
    setProfPersonality(selectedChar.personality || '');
    setProfSpeech(selectedChar.speechStyle || '');
    setIsEditingProfile(true);
  };

  // Save profile changes
  const handleSaveProfile = () => {
    const updatedChar: Character = {
      ...selectedChar,
      name: profName.trim() || selectedChar.name,
      title: profTitle.trim() || (selectedChar.id === 'adam' ? '養子' : ''),
      relationshipWithLala: profRelation.trim() || (selectedChar.id === 'adam' ? '領養關係（養子）' : ''),
      background: profBackground.trim(),
      personality: profPersonality.trim(),
      speechStyle: profSpeech.trim(),
      tagline: '', // remove any hallucinated taglines
    };

    StoryStorageService.saveCharacterProfile(updatedChar);
    onRefreshData();
    setIsEditingProfile(false);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2500);
  };

  // Save author fine-tuned stats
  const handleSaveFineTune = () => {
    if (!editingStats) return;

    StoryStorageService.updateCharacterStats(
      selectedCharId,
      editingStats.affection - selectedChar.stats.affection,
      editingStats.trust - selectedChar.stats.trust,
      editingStats.tension - selectedChar.stats.tension,
      editingMindset
    );

    onRefreshData();
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2500);
  };

  // Start private chat with selected character
  const handleStartChatWithChar = (charId: string) => {
    const updated = {
      ...session,
      mode: 'private' as const,
      selectedPrivateCharacterId: charId,
    };
    onSessionChange(updated);
    StoryStorageService.saveSession(updated);
    onNavigateToChat();
  };

  // Create new custom character
  const handleAddCharacter = () => {
    if (!newCharName.trim()) return;

    const newChar: Character = {
      id: `custom_${Date.now()}`,
      name: newCharName.trim(),
      englishName: newCharName.trim(),
      title: newCharTitle.trim(),
      avatarColor: 'bg-violet-100 text-violet-700 border-violet-200',
      avatarInitial: newCharName.trim().slice(0, 2),
      gender: 'other',
      tagline: '',
      personality: newCharPersonality.trim(),
      background: newCharBackground.trim(),
      speechStyle: '自然日常對話。',
      relationshipWithLala: newCharRelation.trim(),
      stats: {
        affection: 60,
        trust: 60,
        tension: 20,
        intimacyStage: '審慎試探',
        currentMindset: '剛進入故事視角。',
      },
      memoryTags: [],
      isCustom: true,
    };

    const updated = [...characters, newChar];
    StoryStorageService.saveCharacters(updated);
    onRefreshData();
    setShowAddModal(false);
    setNewCharName('');
    setNewCharTitle('');
    setNewCharRelation('');
    setNewCharBackground('');
    setNewCharPersonality('');
    handleSelectCharacter(newChar);
  };

  const handleDeleteCharacter = (charId: string) => {
    if (charId === 'lala') return;
    if (window.confirm(`確定要從系統中移除角色「${selectedChar.name}」嗎？移除後將不再出現在對話與看板中。`)) {
      StoryStorageService.deleteCharacter(charId);
      onRefreshData();
      const remaining = characters.filter(c => c.id !== charId);
      if (remaining.length > 0) {
        handleSelectCharacter(remaining[0]);
      }
    }
  };

  // Clean title helper (filters out unsolicited AI dramatic tropes like "野心家 / 危險牽引")
  const getCleanTitle = (char: Character): string => {
    if (char.id === 'adam') return '兒子';
    if (char.id === 'lala') return '主角';
    if (!char.title || char.title.includes('/')) return '';
    return char.title;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 pb-24 md:pb-8">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white border border-sky-100 p-3.5 sm:p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>角色看板 (Character Dashboard)</span>
            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
              原著唯一事實模式
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            尊重原著事實：Adam 為啦啦之領養關係（養子，非親生母子關係），背景與對話只可以來自原著書本檔案，不擅加任何主觀評價與未經記載之設定。
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenImportStoryText && (
            <button
              onClick={onOpenImportStoryText}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              <Archive className="w-4 h-4 text-indigo-600" />
              <span>📚 匯入《Kindroid 書本全集》</span>
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新增角色</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Character Cards List (Left Column) */}
        <div className="lg:col-span-4 space-y-2 max-h-[75vh] overflow-y-auto pr-1">
          {characters.map(char => {
            const isSelected = char.id === selectedCharId;
            const cleanTitle = getCleanTitle(char);

            return (
              <div
                key={char.id}
                onClick={() => handleSelectCharacter(char)}
                className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-white border-sky-400 shadow-md ring-2 ring-sky-100'
                    : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-sky-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold border ${char.avatarColor}`}>
                      {char.avatarInitial}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-sm">{char.name}</span>
                        {char.id === 'adam' && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-300 px-1.5 py-0.2 rounded font-semibold">
                            兒子
                          </span>
                        )}
                        {char.id === 'lala' && (
                          <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.2 rounded font-medium">
                            主角
                          </span>
                        )}
                        {cleanTitle && char.id !== 'adam' && char.id !== 'lala' && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded font-medium">
                            {cleanTitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                    {char.stats.intimacyStage}
                  </span>
                </div>

                {/* Progress bars preview */}
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" />
                      好感 {char.stats.affection}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-sky-500" />
                      信任 {char.stats.trust}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-amber-500" />
                      張力 {char.stats.tension}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-400 h-full rounded-full transition-all"
                      style={{ width: `${char.stats.affection}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Character Deep Profile & Fine-Tuner (Right Column) */}
        <div className="lg:col-span-8 bg-white border border-sky-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold border ${selectedChar.avatarColor}`}>
                {selectedChar.avatarInitial}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-800">{selectedChar.name}</h3>
                  {selectedChar.id === 'adam' && (
                    <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md font-semibold">
                      領養關係（養子）
                    </span>
                  )}
                  {getCleanTitle(selectedChar) && selectedChar.id !== 'adam' && (
                    <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                      {getCleanTitle(selectedChar)}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                    {selectedChar.stats.intimacyStage}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isEditingProfile ? (
                <button
                  onClick={handleStartEditProfile}
                  className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-300 font-medium transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>自定義真實背景/關係</span>
                </button>
              ) : (
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-medium shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>儲存背景修改</span>
                </button>
              )}

              {selectedChar.id !== 'lala' && (
                <button
                  onClick={() => handleStartChatWithChar(selectedChar.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-xl hover:bg-sky-100 text-xs font-semibold transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                  <span>切換為此人單聊</span>
                </button>
              )}

              {selectedChar.id !== 'lala' && selectedChar.id !== 'adam' && (
                <button
                  onClick={() => handleDeleteCharacter(selectedChar.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium transition-colors"
                  title="從 App 中刪除此非本書角色"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>刪除角色</span>
                </button>
              )}
            </div>
          </div>

          {/* Character Profile Content: Edit vs View Mode */}
          {isEditingProfile ? (
            <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  由作者自定義設定（系統絕不擅自定位或編造）
                </span>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  取消
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">角色姓名：</label>
                  <input
                    type="text"
                    value={profName}
                    onChange={e => setProfName(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    角色身分 / 稱謂（可留空，不強加定位）：
                  </label>
                  <input
                    type="text"
                    value={profTitle}
                    onChange={e => setProfTitle(e.target.value)}
                    placeholder="如：兒子、好友、長輩（或留空）"
                    className="w-full bg-white border border-amber-200 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">與主角啦啦之真實關係：</label>
                <input
                  type="text"
                  value={profRelation}
                  onChange={e => setProfRelation(e.target.value)}
                  placeholder="如：領養關係（養子）、朋友..."
                  className="w-full bg-white border border-amber-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">人物真實背景設定：</label>
                <textarea
                  value={profBackground}
                  onChange={e => setProfBackground(e.target.value)}
                  rows={3}
                  placeholder="由作者填寫角色的真實背景，杜絕任何未發生的虛構劇情..."
                  className="w-full bg-white border border-amber-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">性格特徵：</label>
                  <input
                    type="text"
                    value={profPersonality}
                    onChange={e => setProfPersonality(e.target.value)}
                    placeholder="性格核心..."
                    className="w-full bg-white border border-amber-200 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">說話習慣 / 風格：</label>
                  <input
                    type="text"
                    value={profSpeech}
                    onChange={e => setProfSpeech(e.target.value)}
                    placeholder="說話語調與習慣..."
                    className="w-full bg-white border border-amber-200 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setProfBackground('');
                    setProfPersonality('');
                    setProfSpeech('');
                    if (selectedChar.id !== 'adam') setProfRelation('');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition-colors"
                >
                  清空內容自行重寫
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
                >
                  儲存並應用於對話
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Background Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700">人物背景設定：</span>
                </div>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedChar.background || '（尚無背景設定，點擊右上角「自定義真實背景/關係」填寫）'}
                </p>
              </div>

              {/* Relationship Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700">與啦啦之關係：</span>
                </div>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedChar.id === 'adam'
                    ? (selectedChar.relationshipWithLala || '領養關係（養子，非親生母子關係）')
                    : selectedChar.relationshipWithLala || '（尚未設定關係）'}
                </p>
              </div>
            </div>
          )}

          {/* Author Calibration & Sliders */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-800">
                  作者即時狀態微調 (Author Calibration)
                </span>
              </div>
              {savedAlert && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  已保存校準並同步
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3">
              {/* Affection Slider */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 font-medium mb-1.5">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    好感度 / 牽絆
                  </span>
                  <span className="font-bold text-rose-600">{editingStats?.affection || selectedChar.stats.affection}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingStats?.affection ?? selectedChar.stats.affection}
                  onChange={e =>
                    setEditingStats(prev => ({
                      ...(prev || selectedChar.stats),
                      affection: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              {/* Trust Slider */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 font-medium mb-1.5">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-sky-500" />
                    信任值
                  </span>
                  <span className="font-bold text-sky-600">{editingStats?.trust || selectedChar.stats.trust}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingStats?.trust ?? selectedChar.stats.trust}
                  onChange={e =>
                    setEditingStats(prev => ({
                      ...(prev || selectedChar.stats),
                      trust: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Tension Slider */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 font-medium mb-1.5">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                    心防戒備 / 張力
                  </span>
                  <span className="font-bold text-amber-600">{editingStats?.tension || selectedChar.stats.tension}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingStats?.tension ?? selectedChar.stats.tension}
                  onChange={e =>
                    setEditingStats(prev => ({
                      ...(prev || selectedChar.stats),
                      tension: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Real-time Mindset edit */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                即時心境狀態 (Current Psychological State):
              </label>
              <textarea
                value={editingMindset}
                onChange={e => setEditingMindset(e.target.value)}
                rows={2}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-hidden focus:border-sky-300"
                placeholder="輸入角色目前的真實心理動機或心態..."
              />
            </div>

            <button
              onClick={handleSaveFineTune}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5 text-sky-300" />
              <span>儲存並同步此角色數值狀態</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Character Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-sky-200 rounded-2xl max-w-lg w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-500" />
              新增自定義故事角色
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              填寫角色核心設定，AI在私聊與群聊中將嚴格遵循此設定，不擅自改編。
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">角色姓名：</label>
                <input
                  type="text"
                  value={newCharName}
                  onChange={e => setNewCharName(e.target.value)}
                  placeholder="角色姓名..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">身份 / 稱謂（可留空）：</label>
                <input
                  type="text"
                  value={newCharTitle}
                  onChange={e => setNewCharTitle(e.target.value)}
                  placeholder="例如：朋友、同事、長輩（可留空）..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">與主角啦啦關係：</label>
                <input
                  type="text"
                  value={newCharRelation}
                  onChange={e => setNewCharRelation(e.target.value)}
                  placeholder="例如：好友、鄰居..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">角色真實背景：</label>
                <textarea
                  value={newCharBackground}
                  onChange={e => setNewCharBackground(e.target.value)}
                  rows={2}
                  placeholder="背景經歷..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">性格與說話風格：</label>
                <input
                  type="text"
                  value={newCharPersonality}
                  onChange={e => setNewCharPersonality(e.target.value)}
                  placeholder="性格與說話習慣..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs"
              >
                取消
              </button>
              <button
                onClick={handleAddCharacter}
                disabled={!newCharName.trim()}
                className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs disabled:opacity-40"
              >
                確認新增
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
