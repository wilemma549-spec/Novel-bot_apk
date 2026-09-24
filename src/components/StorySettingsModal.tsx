import React, { useState } from 'react';
import {
  Sparkles,
  X,
  BookOpen,
  Users,
  Plus,
  Copy,
  Trash2,
  Key,
  Globe,
  Check,
  ChevronRight,
  UserPlus,
  Edit3,
} from 'lucide-react';
import { StoryStorageService } from '../services/storage';
import { Character, StorySession } from '../types/story';

interface StorySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  session: StorySession;
  onSessionChange: (session: StorySession) => void;
  onRefreshData: () => void;
}

export const StorySettingsModal: React.FC<StorySettingsModalProps> = ({
  isOpen,
  onClose,
  characters,
  session,
  onSessionChange,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'stories' | 'characters' | 'api'>('stories');
  
  // Scripts state
  const [scripts, setScripts] = useState(() => StoryStorageService.getStoryScripts());
  const [selectedScriptId, setSelectedScriptId] = useState(() => scripts[0]?.id || 'script_lala_canon');
  const [newScriptTitle, setNewScriptTitle] = useState('');
  const [newScriptSummary, setNewScriptSummary] = useState('');
  const [showNewScriptForm, setShowNewScriptForm] = useState(false);

  // Characters quick add / copy state
  const [showNewCharForm, setShowNewCharForm] = useState(false);
  const [showCopyCharForm, setShowCopyCharForm] = useState(false);
  const [selectedCharToCopy, setSelectedCharToCopy] = useState<string>(characters[1]?.id || 'adam');
  const [copyCharNewName, setCopyCharNewName] = useState('');

  // New character fields
  const [charName, setCharName] = useState('');
  const [charTitle, setCharTitle] = useState('');
  const [charPersonality, setCharPersonality] = useState('');
  const [charRelationship, setCharRelationship] = useState('');

  // API Config state
  const [geminiKey, setGeminiKey] = useState(() => StoryStorageService.getGeminiApiKey());
  const [serverUrl, setServerUrl] = useState(() => StoryStorageService.getApiServerUrl());
  const [apiSaveNotice, setApiSaveNotice] = useState(false);

  if (!isOpen) return null;

  // Handle create new script
  const handleCreateScript = () => {
    if (!newScriptTitle.trim()) return;
    const created = StoryStorageService.createStoryScript(newScriptTitle, newScriptSummary || '自定義新劇本');
    setScripts(StoryStorageService.getStoryScripts());
    setSelectedScriptId(created.id);
    setNewScriptTitle('');
    setNewScriptSummary('');
    setShowNewScriptForm(false);
  };

  // Handle duplicate script
  const handleDuplicateScript = (scriptId: string) => {
    const dup = StoryStorageService.duplicateStoryScript(scriptId);
    if (dup) {
      setScripts(StoryStorageService.getStoryScripts());
      setSelectedScriptId(dup.id);
    }
  };

  // Handle quick duplicate character
  const handleDuplicateCharacter = () => {
    if (!selectedCharToCopy) return;
    const dup = StoryStorageService.duplicateCharacter(selectedCharToCopy, copyCharNewName.trim() || undefined);
    if (dup) {
      onRefreshData();
      setShowCopyCharForm(false);
      setCopyCharNewName('');
    }
  };

  // Handle quick add character
  const handleAddCharacter = () => {
    if (!charName.trim()) return;
    StoryStorageService.addCharacter({
      name: charName.trim(),
      title: charTitle.trim() || '人物',
      personality: charPersonality.trim() || '性格沉著冷靜。',
      relationshipWithLala: charRelationship.trim() || '相識的朋友。',
      avatarInitial: charName.trim()[0] || '新',
      avatarColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    });
    onRefreshData();
    setCharName('');
    setCharTitle('');
    setCharPersonality('');
    setCharRelationship('');
    setShowNewCharForm(false);
  };

  // Handle delete character
  const handleDeleteChar = (charId: string) => {
    if (confirm('確定要刪除此角色嗎？')) {
      StoryStorageService.deleteCharacter(charId);
      onRefreshData();
    }
  };

  // Save API Config
  const handleSaveApiConfig = () => {
    StoryStorageService.setGeminiApiKey(geminiKey);
    StoryStorageService.setApiServerUrl(serverUrl);
    setApiSaveNotice(true);
    setTimeout(() => setApiSaveNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-sky-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">故事劇本與角色總覽設定</h3>
              <p className="text-[11px] text-sky-100">切換劇本、複製既有角色或故事、配置離線 API</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('stories')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'stories'
                ? 'bg-white text-sky-700 border-sky-500 shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>劇本故事切換 ({scripts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('characters')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'characters'
                ? 'bg-white text-sky-700 border-sky-500 shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>角色快捷管理 ({characters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'api'
                ? 'bg-white text-sky-700 border-sky-500 shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>APK 離線 / API 設定</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* TAB 1: Stories & Scripts */}
          {activeTab === 'stories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">點選欲探索的故事劇本：</span>
                <button
                  onClick={() => setShowNewScriptForm(!showNewScriptForm)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg hover:bg-sky-100 font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增劇本故事</span>
                </button>
              </div>

              {/* New Script Form */}
              {showNewScriptForm && (
                <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3 space-y-2 animate-in fade-in duration-150">
                  <div className="font-semibold text-slate-800">建立新故事劇本：</div>
                  <input
                    type="text"
                    value={newScriptTitle}
                    onChange={e => setNewScriptTitle(e.target.value)}
                    placeholder="劇本名稱（例如：倫敦暗湧篇、平行世界抉擇）"
                    className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-sky-400"
                  />
                  <input
                    type="text"
                    value={newScriptSummary}
                    onChange={e => setNewScriptSummary(e.target.value)}
                    placeholder="簡要描述與世界觀摘要..."
                    className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-sky-400"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowNewScriptForm(false)}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-700"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreateScript}
                      disabled={!newScriptTitle.trim()}
                      className="px-3 py-1 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold disabled:opacity-40"
                    >
                      確定建立
                    </button>
                  </div>
                </div>
              )}

              {/* List of scripts */}
              <div className="space-y-2">
                {scripts.map(script => {
                  const isSelected = selectedScriptId === script.id;
                  return (
                    <div
                      key={script.id}
                      onClick={() => setSelectedScriptId(script.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-sky-50/80 border-sky-400 shadow-xs ring-1 ring-sky-300'
                          : 'bg-white border-slate-200 hover:border-sky-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`p-2 rounded-xl mt-0.5 ${isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{script.title}</span>
                            {isSelected && (
                              <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full text-[10px] font-semibold">
                                當前使用中
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">{script.summary}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateScript(script.id);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 rounded-lg text-[11px] font-medium transition-colors"
                          title="複製此故事劇本"
                        >
                          <Copy className="w-3 h-3 text-sky-600" />
                          <span>複製劇本</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Characters Quick Management */}
          {activeTab === 'characters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">當前劇本角色列表：</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setShowCopyCharForm(!showCopyCharForm);
                      setShowNewCharForm(false);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 font-semibold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>複製現有角色</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowNewCharForm(!showNewCharForm);
                      setShowCopyCharForm(false);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg hover:bg-sky-100 font-semibold transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>快捷新增角色</span>
                  </button>
                </div>
              </div>

              {/* Form: Copy Character */}
              {showCopyCharForm && (
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-150">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    <span>從既有角色複製分支：</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-1">選擇來源角色：</label>
                      <select
                        value={selectedCharToCopy}
                        onChange={e => setSelectedCharToCopy(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                      >
                        {characters.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.title || '角色'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-1">複製後的新角色名字：</label>
                      <input
                        type="text"
                        value={copyCharNewName}
                        onChange={e => setCopyCharNewName(e.target.value)}
                        placeholder="例：沈墨 (黑化版) 或 新名字"
                        className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-400"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowCopyCharForm(false)}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-700"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleDuplicateCharacter}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                    >
                      確定複製角色
                    </button>
                  </div>
                </div>
              )}

              {/* Form: New Character */}
              {showNewCharForm && (
                <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3 space-y-2 animate-in fade-in duration-150">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-sky-600" />
                    <span>快速新增全新角色：</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={charName}
                      onChange={e => setCharName(e.target.value)}
                      placeholder="角色姓名（必填，例如：陸言）"
                      className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-sky-400"
                    />
                    <input
                      type="text"
                      value={charTitle}
                      onChange={e => setCharTitle(e.target.value)}
                      placeholder="稱號/身分（例如：神秘律師、兒時玩伴）"
                      className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-sky-400"
                    />
                  </div>
                  <input
                    type="text"
                    value={charRelationship}
                    onChange={e => setCharRelationship(e.target.value)}
                    placeholder="與啦啦之關係（例如：領養、宿敵、盟友）"
                    className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-sky-400"
                  />
                  <textarea
                    value={charPersonality}
                    onChange={e => setCharPersonality(e.target.value)}
                    placeholder="性格特徵與說話口吻描寫..."
                    rows={2}
                    className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-sky-400 resize-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowNewCharForm(false)}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-700"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddCharacter}
                      disabled={!charName.trim()}
                      className="px-3 py-1 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold disabled:opacity-40"
                    >
                      確認加入
                    </button>
                  </div>
                </div>
              )}

              {/* Character List Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {characters.map(char => {
                  const isLala = char.id === 'lala';
                  return (
                    <div
                      key={char.id}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs hover:border-sky-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${char.avatarColor}`}>
                          {char.avatarInitial}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-800 truncate">{char.name}</span>
                            {char.title && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                {char.title}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {char.relationshipWithLala || char.tagline || '無特殊標籤'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isLala && (
                          <button
                            onClick={() => {
                              setSelectedCharToCopy(char.id);
                              setShowCopyCharForm(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            title="複製此角色"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {char.isCustom && !isLala && (
                          <button
                            onClick={() => handleDeleteChar(char.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="刪除角色"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: API & Offline APK Config */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-slate-700 leading-relaxed">
                <p className="font-semibold text-sky-900 mb-1 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-sky-600" />
                  <span>Android APK 本機運行與 Gemini AI 配置</span>
                </p>
                <p className="text-[11px] text-slate-600">
                  當您在 Android 手機上安裝並打開 APK 時，應用已完全打包於手機本地，秒開且無須依賴外網 404 伺服器。若需啟用 AI 實時生成對話、選項與日記，可在此填寫您的 Google Gemini API Key。
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Google Gemini API Key (推薦):
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-sky-400 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    金鑰僅保存在您手機的本機安全儲存（localStorage）中，絕不外流。
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    後端伺服器代理網址 (選填):
                  </label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={e => setServerUrl(e.target.value)}
                    placeholder="https://your-custom-backend.com (留空則使用本機模式)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-sky-400 font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {apiSaveNotice && (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>設定已成功儲存！</span>
                    </span>
                  )}
                  <button
                    onClick={handleSaveApiConfig}
                    className="ml-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition-colors shadow-xs"
                  >
                    儲存設定
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
