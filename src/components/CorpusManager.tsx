import React, { useState } from 'react';
import {
  Library,
  Upload,
  Sparkles,
  BookOpen,
  Tag,
  CheckCircle2,
  Trash2,
  Edit2,
  Plus,
  RefreshCw,
  FileText,
  Search,
  Check,
} from 'lucide-react';
import { CorpusItem } from '../types/story';
import { StoryStorageService } from '../services/storage';
import { INITIAL_CORPUS } from '../data/initialCorpus';

interface CorpusManagerProps {
  onRefreshData: () => void;
}

export const CorpusManager: React.FC<CorpusManagerProps> = ({ onRefreshData }) => {
  const [corpusList, setCorpusList] = useState<CorpusItem[]>(StoryStorageService.getCorpus());
  const [selectedItemId, setSelectedItemId] = useState<string>(corpusList[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Import raw text modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawText, setRawText] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Manual create item modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState<CorpusItem['category']>('worldview');
  const [manualContent, setManualContent] = useState('');
  const [manualTags, setManualTags] = useState('');

  const selectedItem = corpusList.find(c => c.id === selectedItemId) || corpusList[0];

  const reloadCorpus = () => {
    const list = StoryStorageService.getCorpus();
    setCorpusList(list);
    if (!selectedItemId && list.length > 0) {
      setSelectedItemId(list[0].id);
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = corpusList.map(item => {
      if (item.id === id) {
        return { ...item, isActive: !item.isActive };
      }
      return item;
    });
    StoryStorageService.saveCorpus(updated);
    setCorpusList(updated);
    onRefreshData();
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('確定要自語料庫中移除此項設定嗎？')) {
      const updated = corpusList.filter(item => item.id !== id);
      StoryStorageService.saveCorpus(updated);
      setCorpusList(updated);
      if (selectedItemId === id) {
        setSelectedItemId(updated[0]?.id || '');
      }
      onRefreshData();
    }
  };

  // AI-assisted corpus extraction
  const handleExtractAndImport = async () => {
    if (!rawText.trim()) return;
    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-corpus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });
      const data = await response.json();

      let structuredSummary = '';
      if (data.characters?.length) {
        structuredSummary += `【關鍵人物】：\n` + data.characters.map((c: any) => `• ${c.name} (${c.identity}): ${c.personality}。關係：${c.keyRelationships}`).join('\n') + '\n\n';
      }
      if (data.worldLore?.length) {
        structuredSummary += `【世界觀名詞】：\n` + data.worldLore.map((w: any) => `• ${w.term}: ${w.description}`).join('\n') + '\n\n';
      }
      if (data.timelineEvents?.length) {
        structuredSummary += `【時序節點】：\n` + data.timelineEvents.map((t: any) => `• [${t.time}] ${t.event}`).join('\n') + '\n\n';
      }
      if (data.authorToneNotes) {
        structuredSummary += `【筆調風格守則】：\n${data.authorToneNotes}`;
      }

      const newItem: CorpusItem = {
        id: `corpus_${Date.now()}`,
        title: importTitle.trim() || `自定義語料：${new Date().toLocaleDateString()}`,
        category: 'worldview',
        content: `${structuredSummary.trim()}\n\n--- 原著摘錄 ---\n${rawText.slice(0, 3000)}`,
        tags: ['AI萃取', '自定義語料', '世界觀'],
        isActive: true,
        updatedAt: Date.now(),
      };

      StoryStorageService.addCorpusItem(newItem);
      reloadCorpus();
      setSelectedItemId(newItem.id);
      setShowImportModal(false);
      setRawText('');
      setImportTitle('');
      onRefreshData();
    } catch (err) {
      console.error('Extraction error:', err);
      // Fallback direct import without AI
      const newItem: CorpusItem = {
        id: `corpus_${Date.now()}`,
        title: importTitle.trim() || '自定義語料導入',
        category: 'worldview',
        content: rawText,
        tags: ['原著文本', '自定義語料'],
        isActive: true,
        updatedAt: Date.now(),
      };
      StoryStorageService.addCorpusItem(newItem);
      reloadCorpus();
      setSelectedItemId(newItem.id);
      setShowImportModal(false);
      setRawText('');
      setImportTitle('');
      onRefreshData();
    } finally {
      setIsExtracting(false);
    }
  };

  // Manual save
  const handleSaveManual = () => {
    if (!manualTitle.trim() || !manualContent.trim()) return;

    const newItem: CorpusItem = {
      id: `corpus_${Date.now()}`,
      title: manualTitle.trim(),
      category: manualCategory,
      content: manualContent.trim(),
      tags: manualTags ? manualTags.split(/[,， ]/).filter(Boolean) : ['設定筆記'],
      isActive: true,
      updatedAt: Date.now(),
    };

    StoryStorageService.addCorpusItem(newItem);
    reloadCorpus();
    setSelectedItemId(newItem.id);
    setShowManualModal(false);
    setManualTitle('');
    setManualContent('');
    setManualTags('');
    onRefreshData();
  };

  const filteredList = corpusList.filter(item => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white border border-sky-100 p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Library className="w-5 h-5 text-purple-600" />
            世界觀語料庫管理 (World Lore & Knowledge Corpus)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            匯入原著文本與故事筆記，AI 角色將基於勾選之語料庫進行高一致性推演，絕不偏離原著精神。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>自訂手動設定</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>導入文本語料庫</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Corpus Items List */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search & Category Filter */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜尋語料條目、設定或標籤..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-purple-300"
              />
            </div>

            <div className="flex flex-wrap gap-1 text-xs">
              {[
                { id: 'all', label: '全部' },
                { id: 'worldview', label: '世界觀' },
                { id: 'character', label: '人物檔案' },
                { id: 'author_note', label: '風格守則' },
                { id: 'timeline', label: '時序大事' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                    categoryFilter === cat.id
                      ? 'bg-purple-100 text-purple-800 font-semibold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
            {filteredList.map(item => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-white border-purple-300 shadow-md ring-2 ring-purple-100'
                      : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-bold text-slate-800 text-sm line-clamp-1">
                      {item.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(item.id);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                        item.isActive
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                      title={item.isActive ? '點擊停用此語料' : '點擊啟用此語料注入AI對話'}
                    >
                      {item.isActive ? '✓ 啟用中' : '未啟用'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                    {item.content}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Corpus Viewer */}
        <div className="lg:col-span-7 bg-white border border-sky-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          {selectedItem ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {selectedItem.category === 'worldview' ? '世界觀設定' : selectedItem.category === 'character' ? '人物心理檔案' : selectedItem.category === 'author_note' ? '文筆風格守則' : '劇情時序'}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1.5">{selectedItem.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(selectedItem.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedItem.isActive
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${selectedItem.isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span>{selectedItem.isActive ? '已注入AI上下文' : '未注入上下文'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteItem(selectedItem.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="刪除此語料條目"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selectedItem.tags.map((t, idx) => (
                  <span key={idx} className="text-xs bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1 font-medium">
                    <Tag className="w-3 h-3 text-slate-400" />
                    {t}
                  </span>
                ))}
              </div>

              {/* Main Content Body */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans max-h-[50vh] overflow-y-auto">
                {selectedItem.content}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-sm">
              請從左側列表選擇一條語料條目，或點擊「導入文本語料庫」。
            </div>
          )}
        </div>
      </div>

      {/* AI Ingest & Extract Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-purple-200 rounded-2xl max-w-xl w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-purple-600" />
              導入原著語料庫並智慧萃取設定
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              將原著小說章節、大綱、人物備忘錄貼在下方，AI將萃取關鍵角色人物關係與世界觀，永久優化對話一致性。
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">語料標題（可選）：</label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={e => setImportTitle(e.target.value)}
                  placeholder="例如：第三章：石宅舊憶與地下錢莊談判..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">原著文本內容：</label>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  rows={8}
                  placeholder="在此粘貼原著文本、台詞草稿或世界觀筆記..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 leading-relaxed focus:outline-hidden focus:border-purple-400 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowImportModal(false)}
                disabled={isExtracting}
                className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs"
              >
                取消
              </button>
              <button
                onClick={handleExtractAndImport}
                disabled={isExtracting || !rawText.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isExtracting ? '正在深度分析世界觀與萃取設定中……' : '智能萃取並加入語料庫'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Item Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-700" />
              手動建立自訂語料條目
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              直接填寫設定條目，作為 AI 生成時的重要依據。
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">條目标題：</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                  placeholder="例如：關於那份失蹤的名冊..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">類別：</label>
                <select
                  value={manualCategory}
                  onChange={e => setManualCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                >
                  <option value="worldview">世界觀設定</option>
                  <option value="character">人物檔案與關係</option>
                  <option value="author_note">作者筆調守則</option>
                  <option value="timeline">時序節點</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">標籤（用逗號分隔）：</label>
                <input
                  type="text"
                  value={manualTags}
                  onChange={e => setManualTags(e.target.value)}
                  placeholder="例如：名冊, 碼頭, 密會"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">詳細設定內容：</label>
                <textarea
                  value={manualContent}
                  onChange={e => setManualContent(e.target.value)}
                  rows={5}
                  placeholder="詳細說明該項設定、禁忌、或者角色之間的隱藏過往..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-hidden focus:border-purple-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowManualModal(false)}
                className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs"
              >
                取消
              </button>
              <button
                onClick={handleSaveManual}
                disabled={!manualTitle.trim() || !manualContent.trim()}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs disabled:opacity-40"
              >
                確認儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
