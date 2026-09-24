import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  RefreshCw,
  FileText,
  AlertCircle,
  ArrowRight,
  Upload,
  Archive,
  Layers,
  FolderArchive,
  FileCode,
  Trash2,
  Users,
  Check,
} from 'lucide-react';
import { StorySession, StoryBranchNode, StoryMessage, Character, CorpusItem } from '../types/story';
import { StoryStorageService } from '../services/storage';

interface ImportStoryTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: StorySession;
  characters: Character[];
  onSessionChange: (session: StorySession) => void;
  onRefreshData: () => void;
}

export const ImportStoryTextModal: React.FC<ImportStoryTextModalProps> = ({
  isOpen,
  onClose,
  session,
  characters,
  onSessionChange,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'zip' | 'manual'>('zip');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Parsed book archive state
  const [parsedData, setParsedData] = useState<{
    totalFilesCount: number;
    backgroundFilesCount: number;
    dialogueFilesCount: number;
    filesSummary: { name: string; isBackground: boolean; isDialogue: boolean; size: number }[];
    detectedCharacters: Character[];
    corpusItems: CorpusItem[];
    dialogueMessages: StoryMessage[];
  } | null>(null);

  // Manual input state
  const [manualType, setManualType] = useState<'background' | 'dialogue'>('background');
  const [manualCharId, setManualCharId] = useState<string>('daniel');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');

  if (!isOpen) return null;

  // Process uploaded archive file (e.g. Kindroid_Book_All_Readable_PDF.zip or PDF)
  const processArchiveFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setParsedData(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = e.target?.result as string;
          // Extract base64 part
          const base64 = result.includes(',') ? result.split(',')[1] : result;

          const response = await fetch('/api/parse-book-archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64,
              filename: file.name,
            }),
          });

          const data = await response.json();
          if (!response.ok || data.error) {
            throw new Error(data.error || '解析書本檔案失敗');
          }

          setParsedData(data);
          setSuccessMsg(`成功讀取書本檔案！共解析 ${data.totalFilesCount} 份檔案（含 ${data.backgroundFilesCount} 份背景、${data.dialogueFilesCount} 份對話）。`);
        } catch (err: any) {
          console.error('API parse error:', err);
          setErrorMsg(err.message || '檔案解析失敗，請確認檔案格式是否正確。');
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setErrorMsg('讀取檔案失敗');
        setIsLoading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('File read error:', err);
      setErrorMsg(err.message || '讀取檔案失敗');
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processArchiveFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processArchiveFile(file);
    }
  };

  // Apply parsed book data to system
  const handleApplyBookData = () => {
    if (!parsedData) return;

    StoryStorageService.applyBookData({
      characters: parsedData.detectedCharacters,
      corpusItems: parsedData.corpusItems,
      messages: parsedData.dialogueMessages,
    });

    // Update active participants in session
    const charIds = parsedData.detectedCharacters.map(c => c.id).filter(id => id !== 'lala');
    const updatedSession: StorySession = {
      ...session,
      groupParticipantIds: charIds.length > 0 ? charIds : ['adam', 'daniel'],
      selectedPrivateCharacterId: charIds.includes('adam') ? 'adam' : charIds[0] || 'daniel',
    };
    StoryStorageService.saveSession(updatedSession);
    onSessionChange(updatedSession);

    onRefreshData();
    setSuccessMsg('已將《Kindroid 書本全集》完全套用至 App！所有背景與對話已鎖定為唯一依據。');
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Save manual background or dialogue
  const handleSaveManual = () => {
    if (!manualContent.trim()) {
      setErrorMsg('請輸入內容');
      return;
    }

    if (manualType === 'background') {
      const targetChar = characters.find(c => c.id === manualCharId);
      if (targetChar) {
        const updated: Character = {
          ...targetChar,
          background: manualContent.trim(),
          relationshipWithLala: targetChar.id === 'adam' ? (targetChar.relationshipWithLala || '領養關係（養子）') : targetChar.relationshipWithLala,
          title: targetChar.id === 'adam' ? (targetChar.title || '養子') : targetChar.title,
        };
        StoryStorageService.saveCharacterProfile(updated);

        // Also add to corpus
        StoryStorageService.addCorpusItem({
          id: `corpus_manual_bg_${Date.now()}`,
          title: `【原著背景 · 作者手動導入】${targetChar.name} 背景`,
          category: 'character',
          content: manualContent.trim(),
          tags: ['原著背景', targetChar.name, '手動導入'],
          isActive: true,
          updatedAt: Date.now(),
        });
      }
    } else {
      // Add dialogue lines
      const now = Date.now();
      const lines = manualContent.split('\n').filter(l => l.trim().length > 0);
      lines.forEach((line, idx) => {
        let speakerName = '角色';
        let content = line.trim();
        if (line.includes('：') || line.includes(':')) {
          const parts = line.split(/[：:]/);
          speakerName = parts[0].trim();
          content = parts.slice(1).join('：').trim();
        }
        const isLala = speakerName.includes('啦啦') || speakerName.toLowerCase() === 'lala';
        const matched = characters.find(c => c.name.toLowerCase() === speakerName.toLowerCase());

        StoryStorageService.addMessage({
          id: `msg_manual_${now}_${idx}`,
          senderId: isLala ? 'lala' : (matched ? matched.id : 'other'),
          senderName: speakerName,
          senderColor: isLala ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-800 border-slate-200',
          content,
          stageAction: '原著文本對話',
          timestamp: now - (lines.length - idx) * 1000,
          type: 'dialogue',
          nodeId: 'node_root',
          branchId: 'node_root',
        });
      });

      // Add to corpus
      StoryStorageService.addCorpusItem({
        id: `corpus_manual_dlg_${Date.now()}`,
        title: `【原著對話 · 作者手動導入】${manualTitle || '原著最新對話'}`,
        category: 'worldview',
        content: manualContent.trim(),
        tags: ['原著對話', '手動導入'],
        isActive: true,
        updatedAt: Date.now(),
      });
    }

    onRefreshData();
    setSuccessMsg('已成功儲存並同步至系統！');
    setManualContent('');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-sky-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-sky-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>《Kindroid 書本全集》專屬匯入</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  原著唯一事實 · 絕不篡改
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                背景與對話只可以從本書檔案提取，嚴禁創造新角色、嚴禁改變角色背景、Adam 為領養關係，絕不擅加評價。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ironclad Banner */}
        <div className="px-6 py-2.5 bg-gradient-to-r from-emerald-50 via-sky-50 to-emerald-50 border-b border-emerald-100 text-xs flex items-center gap-3 text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="flex-1 space-y-0.5">
            <div className="font-semibold text-emerald-800">原著純淨保障已鎖死：</div>
            <div className="text-[11px] text-slate-600">
              ❶ 標明「背景」的檔案：完全鎖定為角色真實背景 ｜ ❷ 標明「對話」的檔案：完全鎖定為對話紀錄 ｜ ❸ 杜絕任何外來虛構角色
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('zip')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'zip'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>📦 匯入《Kindroid_Book_All_Readable_PDF.zip》或 PDF 書本檔</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition-all ${
              activeTab === 'manual'
                ? 'border-sky-600 text-sky-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>✍️ 手動貼上原著背景或對話</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'zip' ? (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/70 scale-[0.99]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20'
                }`}
              >
                <div className="w-16 h-16 rounded-3xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Archive className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  拖曳《Kindroid_Book_All_Readable_PDF.zip》或 PDF 檔案至此，或點擊選取
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  支援直接解壓縮包含 36 份 PDF 的書本壓縮包。系統將自動辨識標記為「背景」與「對話」之檔案，精準鎖定角色與劇情！
                </p>

                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-200 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>選取書本 ZIP 或 PDF 檔案</span>
                  <input
                    type="file"
                    accept=".zip,.pdf,.txt,.md,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="p-6 text-center bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                  <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-indigo-900">
                    正在解壓縮並讀取書本檔案中的所有 PDF 文件與文字……
                  </p>
                  <p className="text-[11px] text-slate-500">
                    正在過濾背景檔案與對話紀錄，嚴格確認角色與事實……
                  </p>
                </div>
              )}

              {/* Parsed Preview */}
              {parsedData && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FolderArchive className="w-4 h-4 text-indigo-600" />
                      已解碼書本全集檔案（共 {parsedData.totalFilesCount} 個檔案）
                    </span>
                    <span className="text-xs text-indigo-600 font-medium">
                      背景檔 {parsedData.backgroundFilesCount} 個 ｜ 對話檔 {parsedData.dialogueFilesCount} 個
                    </span>
                  </div>

                  {/* Character Detection Preview */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-sky-600" />
                      <span>本書識別角色（已剔除所有非本書角色）：</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.detectedCharacters.map(c => (
                        <div
                          key={c.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900"
                        >
                          <span className="font-semibold">{c.name}</span>
                          {c.id === 'adam' && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                              兒子
                            </span>
                          )}
                          {c.id === 'lala' && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded">
                              主角
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* File List Scroll */}
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {parsedData.filesSummary.map((f, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                          f.isBackground
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : 'bg-white border-slate-100 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className={`w-3.5 h-3.5 ${f.isBackground ? 'text-amber-600' : 'text-sky-500'}`} />
                          <span className="truncate">{f.name}</span>
                        </div>
                        <span className="text-[10px] shrink-0 font-medium">
                          {f.isBackground ? '📌 角色/世界觀背景' : '💬 對話紀錄'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Apply Button */}
                  <button
                    onClick={handleApplyBookData}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>一鍵套用原著檔案至全 App（鎖定為唯一真實依據）</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  選擇貼上的內容類型：
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="manualType"
                      checked={manualType === 'background'}
                      onChange={() => setManualType('background')}
                    />
                    <span>角色背景設定（寫明是背景）</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="manualType"
                      checked={manualType === 'dialogue'}
                      onChange={() => setManualType('dialogue')}
                    />
                    <span>原著對話記錄（寫明是對話）</span>
                  </label>
                </div>
              </div>

              {manualType === 'background' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    指定角色：
                  </label>
                  <select
                    value={manualCharId}
                    onChange={e => setManualCharId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden mb-3"
                  >
                    {characters.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.id === 'adam' ? ' (兒子)' : ''}
                      </option>
                    ))}
                  </select>

                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    貼上該角色的真實背景內容：
                  </label>
                  <textarea
                    value={manualContent}
                    onChange={e => setManualContent(e.target.value)}
                    rows={8}
                    placeholder="請直接貼上檔案中明確寫明為背景的文字內容，系統將一字不改存入該角色背景，絕不擅自添加或改編..."
                    className="w-full text-xs font-sans leading-relaxed bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:outline-hidden focus:border-sky-400 focus:bg-white transition-all resize-y"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    對話篇名 / 章節標題：
                  </label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    placeholder="如：第 1 章對話紀錄"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden mb-3"
                  />

                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    貼上原著對話文本（格式支援「說話者：內容」）：
                  </label>
                  <textarea
                    value={manualContent}
                    onChange={e => setManualContent(e.target.value)}
                    rows={8}
                    placeholder="例如：
Adam：我回來了。
啦啦：桌上有溫茶，先喝一口。
Daniel：外面風大，坐下慢慢說。"
                    className="w-full text-xs font-sans leading-relaxed bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:outline-hidden focus:border-sky-400 focus:bg-white transition-all resize-y"
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveManual}
                  disabled={!manualContent.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  確認儲存原著內容
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
