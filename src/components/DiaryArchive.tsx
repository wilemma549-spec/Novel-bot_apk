import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Copy,
  Check,
  Download,
  Plus,
  Compass,
  FileText,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { DiaryEntry, Character, StoryMessage, StorySession } from '../types/story';
import { StoryStorageService } from '../services/storage';

interface DiaryArchiveProps {
  characters: Character[];
  session: StorySession;
  onRefreshData: () => void;
  prefillMessages?: StoryMessage[];
}

export const DiaryArchive: React.FC<DiaryArchiveProps> = ({
  characters,
  session,
  onRefreshData,
}) => {
  const [diaries, setDiaries] = useState<DiaryEntry[]>(StoryStorageService.getDiaries());
  const [selectedDiaryId, setSelectedDiaryId] = useState<string>(diaries[0]?.id || '');
  const [filterPerspective, setFilterPerspective] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New diary modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [diaryPerspective, setDiaryPerspective] = useState<'lala' | 'author' | 'character'>('lala');
  const [selectedCharForDiary, setSelectedCharForDiary] = useState('daniel');
  const [chapterNote, setChapterNote] = useState('');

  const selectedDiary = diaries.find(d => d.id === selectedDiaryId) || diaries[0];

  // Refresh diaries list
  const reloadDiaries = () => {
    const list = StoryStorageService.getDiaries();
    setDiaries(list);
    if (!selectedDiaryId && list.length > 0) {
      setSelectedDiaryId(list[0].id);
    }
  };

  // Filtered diaries
  const filteredDiaries = diaries.filter(d => {
    if (filterPerspective !== 'all' && d.perspective !== filterPerspective) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q) ||
        d.mood.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle generating diary from recent conversation
  const handleGenerateDiary = async () => {
    setIsGenerating(true);
    try {
      const allMsgs = StoryStorageService.getMessages();
      const branchNodes = StoryStorageService.getBranchNodes();
      const currentBranch = branchNodes.find(b => b.id === session.activeBranchId);
      const chosenChar = characters.find(c => c.id === selectedCharForDiary);

      const response = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: allMsgs.slice(-16),
          perspective: diaryPerspective,
          characterName: chosenChar?.name || 'Daniel',
          branchName: currentBranch?.branchName || '主線探索',
          chapterTitle: chapterNote || currentBranch?.title || '階段歷程回顧',
        }),
      });

      const data = await response.json();

      if (data.title && data.content) {
        const newEntry: DiaryEntry = {
          id: `diary_${Date.now()}`,
          title: data.title,
          dateLabel: data.dateLabel || '深夜記',
          mood: data.mood || '靜默思索',
          summary: data.summary || '階段對話梳理紀錄',
          content: data.content,
          perspective: diaryPerspective,
          characterId: diaryPerspective === 'character' ? selectedCharForDiary : undefined,
          characterName: diaryPerspective === 'character' ? chosenChar?.name : undefined,
          branchId: session.activeBranchId,
          branchTitle: currentBranch?.branchName || '當前分支',
          unresolvedQuestions: data.unresolvedQuestions || [],
          branchImpact: data.branchImpact || '階段劇情推進',
          createdAt: Date.now(),
        };

        StoryStorageService.addDiary(newEntry);
        reloadDiaries();
        setSelectedDiaryId(newEntry.id);
        setShowGenerateModal(false);
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to generate diary:', err);
      alert('產生日記時發生錯誤，請檢查網路或稍後重試。');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy content
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete diary
  const handleDeleteDiary = (id: string) => {
    if (window.confirm('確定要自專屬檔案區刪除此篇日記嗎？')) {
      const updated = diaries.filter(d => d.id !== id);
      StoryStorageService.saveDiaries(updated);
      setDiaries(updated);
      if (selectedDiaryId === id) {
        setSelectedDiaryId(updated[0]?.id || '');
      }
      onRefreshData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white border border-sky-100 p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            階段劇情日記檔案區 (Dedicated Diary Archive)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            將每次對話演變與重大抉擇沉澱為第一人稱私密手記或邏輯筆記，隨時梳理劇情脈絡。
          </p>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>提煉最新劇情寫成日記</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Diary List & Filters (Left Column) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜尋日記標題或內容..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-sky-300"
              />
            </div>

            {/* Perspective Filter Pills */}
            <div className="flex gap-1.5 text-xs">
              {[
                { id: 'all', label: '全部視角' },
                { id: 'lala', label: '啦啦手記' },
                { id: 'character', label: '角色密檔' },
                { id: 'author', label: '作者梳理' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterPerspective(f.id)}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    filterPerspective === f.id
                      ? 'bg-amber-100 text-amber-800 font-semibold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Diary Entries List */}
          <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
            {filteredDiaries.length === 0 ? (
              <div className="text-center py-8 bg-white border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                暫無符合篩選的日記記錄。
              </div>
            ) : (
              filteredDiaries.map(diary => {
                const isSelected = selectedDiary?.id === diary.id;
                return (
                  <div
                    key={diary.id}
                    onClick={() => setSelectedDiaryId(diary.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-white border-amber-300 shadow-md ring-2 ring-amber-100'
                        : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <span className="font-bold text-slate-800 text-sm line-clamp-1">
                        {diary.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium shrink-0">
                        {diary.perspective === 'lala' ? '啦啦手記' : diary.perspective === 'character' ? `${diary.characterName || '角色'}密檔` : '作者梳理'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                      {diary.summary}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>{diary.dateLabel}</span>
                      <span className="text-sky-600 truncate max-w-[130px]">{diary.branchTitle}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Diary Reading View (Right Column) */}
        <div className="lg:col-span-8 bg-white border border-sky-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          {selectedDiary ? (
            <div>
              {/* Header Meta */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100/70 text-amber-900 border border-amber-200 font-medium">
                      {selectedDiary.perspective === 'lala' ? '啦啦私密手記' : selectedDiary.perspective === 'character' ? `${selectedDiary.characterName || '角色'}的第一人稱日記` : '作者視角總結'}
                    </span>
                    <span className="text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      所屬分支：{selectedDiary.branchTitle}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">{selectedDiary.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {selectedDiary.dateLabel}
                    </span>
                    <span>心境：{selectedDiary.mood}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(selectedDiary.id, `${selectedDiary.title}\n\n${selectedDiary.content}`)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs text-slate-600 transition-colors"
                  >
                    {copiedId === selectedDiary.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === selectedDiary.id ? '已複製' : '複製文字'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteDiary(selectedDiary.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="刪除此篇日記"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* One-sentence Summary */}
              <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-3 mb-5 text-xs text-sky-900 font-medium italic">
                📌 階段梗概：{selectedDiary.summary}
              </div>

              {/* Diary Literary Body (Clean Typography) */}
              <div className="text-slate-800 leading-relaxed text-sm sm:text-base font-sans whitespace-pre-wrap space-y-4 mb-6">
                {selectedDiary.content}
              </div>

              {/* Unresolved Questions & Butterfly Effect Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                {selectedDiary.unresolvedQuestions?.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                      當前留存的懸念與謎團：
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      {selectedDiary.unresolvedQuestions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedDiary.branchImpact && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
                      蝴蝶效應與主線影響梳理：
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {selectedDiary.branchImpact}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-sm">
              請從左側列表選擇一篇日記檢視，或點擊上方「提煉最新劇情寫成日記」。
            </div>
          )}
        </div>
      </div>

      {/* Generate Diary Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-amber-200 rounded-2xl max-w-lg w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              提煉最新劇情寫成階段日記
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              AI 將深入分析近期對話與重大抉擇，提煉成富有文學質感的篇章日記。
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">日記撰寫視角：</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'lala', label: '啦啦私密手記' },
                    { id: 'character', label: '特定角色密檔' },
                    { id: 'author', label: '作者創作梳理' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setDiaryPerspective(p.id as any)}
                      className={`py-2 px-2.5 rounded-xl border text-xs text-center transition-all ${
                        diaryPerspective === p.id
                          ? 'bg-amber-500 text-white font-semibold border-amber-500 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {diaryPerspective === 'character' && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">選擇以此角色視角撰寫：</label>
                  <select
                    value={selectedCharForDiary}
                    onChange={e => setSelectedCharForDiary(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                  >
                    {characters
                      .filter(c => c.id !== 'lala')
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.title})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  本篇日記的核心焦點 / 作者備註（可選）：
                </label>
                <textarea
                  value={chapterNote}
                  onChange={e => setChapterNote(e.target.value)}
                  rows={2}
                  placeholder="例如：著重描述啦啦在面對Daniel時的愧疚，以及窗外雷雨帶來的壓抑感..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs"
              >
                取消
              </button>
              <button
                onClick={handleGenerateDiary}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGenerating ? '正在研讀與撰寫中……' : '開始提煉並儲存至專屬檔案'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
