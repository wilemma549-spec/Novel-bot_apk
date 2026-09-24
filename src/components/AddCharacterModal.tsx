import React, { useState, useRef } from 'react';
import {
  UserPlus,
  X,
  FileText,
  Upload,
  Copy,
  Trash2,
  Check,
  Sparkles,
  Download,
  AlertCircle,
  FileCode,
  Users,
  Layers,
  Edit3,
} from 'lucide-react';
import { Character, StorySession } from '../types/story';
import { StoryStorageService } from '../services/storage';

interface AddCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  session: StorySession;
  onSessionChange: (session: StorySession) => void;
  onRefreshData: () => void;
}

// Helper to parse characters from plain text, documents or pasted notes
export function parseCharactersFromText(rawText: string): Partial<Character>[] {
  if (!rawText || !rawText.trim()) return [];

  const results: Partial<Character>[] = [];
  const text = rawText.trim();

  // Split by common character separators: ===, ---, or "角色[0-9一二三四五]" or "【角色"
  const blocks = text.split(/(?:={3,}|-{3,}|(?=(?:^|\n)\s*(?:角色|人物|【角色|\[角色)\s*[:：0-9一二三四五A-Za-z]?))/m)
    .map(b => b.trim())
    .filter(b => b.length > 5);

  const targetBlocks = blocks.length > 0 ? blocks : [text];

  for (const block of targetBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    let name = '';
    let title = '';
    let relationshipWithLala = '';
    let personality = '';
    let background = '';
    let speechStyle = '';

    for (const line of lines) {
      // Name patterns
      if (/^(?:角色名|角色姓名|姓名|名字|人物|Name)\s*[:：]\s*(.+)/i.test(line)) {
        name = line.replace(/^(?:角色名|角色姓名|姓名|名字|人物|Name)\s*[:：]\s*/i, '').trim();
      }
      // Title / Role patterns
      else if (/^(?:身分|身份|稱號|稱謂|職位|職業|Title|Role)\s*[:：]\s*(.+)/i.test(line)) {
        title = line.replace(/^(?:身分|身份|稱號|稱謂|職位|職業|Title|Role)\s*[:：]\s*/i, '').trim();
      }
      // Relationship patterns
      else if (/^(?:與啦啦之?關係|與主角之?關係|關係|Relationship)\s*[:：]\s*(.+)/i.test(line)) {
        relationshipWithLala = line.replace(/^(?:與啦啦之?關係|與主角之?關係|關係|Relationship)\s*[:：]\s*/i, '').trim();
      }
      // Personality patterns
      else if (/^(?:性格|特質|性格特徵|口吻|個性|Personality)\s*[:：]\s*(.+)/i.test(line)) {
        personality = line.replace(/^(?:性格|特質|性格特徵|口吻|個性|Personality)\s*[:：]\s*/i, '').trim();
      }
      // Background / Story patterns
      else if (/^(?:背景|故事|經歷|外貌|簡介|Background|Story)\s*[:：]\s*(.+)/i.test(line)) {
        background = line.replace(/^(?:背景|故事|經歷|外貌|簡介|Background|Story)\s*[:：]\s*/i, '').trim();
      }
      // Speech style patterns
      else if (/^(?:說話風格|說話方式|語氣|口癖)\s*[:：]\s*(.+)/i.test(line)) {
        speechStyle = line.replace(/^(?:說話風格|說話方式|語氣|口癖)\s*[:：]\s*/i, '').trim();
      }
    }

    // Fallback: If no structured fields found, treat first line as name and rest as personality/background
    if (!name && lines.length > 0) {
      const firstLine = lines[0];
      // Check if line is "陸言（律師）" or "沈墨，作家"
      const match = firstLine.match(/^([^\s,，(（]{2,10})[\s,，(（]([^)）]+)[)）]?$/);
      if (match) {
        name = match[1].trim();
        title = match[2].trim();
      } else if (firstLine.length <= 15) {
        name = firstLine.replace(/^[#*\-•\s]+/, '').trim();
      }
      if (lines.length > 1) {
        personality = lines.slice(1, 3).join(' ');
        if (lines.length > 3) {
          background = lines.slice(3).join('\n');
        }
      }
    }

    if (name) {
      results.push({
        name,
        title: title || '故事角色',
        relationshipWithLala: relationshipWithLala || '相識人物',
        personality: personality || '性格立體，恪守本設定。',
        background: background || block,
        speechStyle: speechStyle || '自然對話口吻。',
      });
    }
  }

  return results;
}

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
  'bg-sky-100 text-sky-800 border-sky-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-teal-100 text-teal-800 border-teal-300',
  'bg-slate-100 text-slate-800 border-slate-300',
];

export const AddCharacterModal: React.FC<AddCharacterModalProps> = ({
  isOpen,
  onClose,
  characters,
  session,
  onSessionChange,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'doc' | 'manual' | 'copy' | 'manage'>('doc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 1: Document / TXT / Paste state
  const [inputText, setInputText] = useState('');
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [parsedCandidates, setParsedCandidates] = useState<Partial<Character>[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<number, boolean>>({});

  // Tab 2: Quick manual add state
  const [manualName, setManualName] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualRelation, setManualRelation] = useState('');
  const [manualPersonality, setManualPersonality] = useState('');
  const [manualBackground, setManualBackground] = useState('');
  const [manualColor, setManualColor] = useState(AVATAR_COLORS[0]);

  // Tab 3: Copy existing character
  const [copySourceId, setCopySourceId] = useState(
    characters.find(c => c.id !== 'lala')?.id || characters[0]?.id || ''
  );
  const [copyNewName, setCopyNewName] = useState('');

  // Status message
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setStatusNotice({ type, msg });
    setTimeout(() => setStatusNotice(null), 3000);
  };

  if (!isOpen) return null;

  // Handle uploading a TXT, PDF, Word or Doc file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setIsParsingDoc(true);

    try {
      const lowerName = file.name.toLowerCase();

      // Plain text or markdown
      if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.json')) {
        const text = await file.text();
        setInputText(text);
        const parsed = parseCharactersFromText(text);
        setParsedCandidates(parsed);
        const initialSelected: Record<number, boolean> = {};
        parsed.forEach((_, idx) => (initialSelected[idx] = true));
        setSelectedCandidates(initialSelected);
        showNotification(`成功讀取「${file.name}」！共識別出 ${parsed.length} 個角色`);
      } else {
        // For PDF, Word, or other document formats, send to server helper
        const reader = new FileReader();
        reader.onload = async event => {
          try {
            const result = event.target?.result as string;
            const base64 = result.includes(',') ? result.split(',')[1] : result;

            const res = await fetch('/api/parse-character-doc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                base64,
                filename: file.name,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              const extractedText = data.text || '';
              setInputText(extractedText);
              const charactersFromDoc = data.characters && data.characters.length > 0
                ? data.characters
                : parseCharactersFromText(extractedText);
              setParsedCandidates(charactersFromDoc);
              const initialSelected: Record<number, boolean> = {};
              charactersFromDoc.forEach((_: any, idx: number) => (initialSelected[idx] = true));
              setSelectedCandidates(initialSelected);
              showNotification(`成功解析「${file.name}」！找到 ${charactersFromDoc.length} 個角色`);
            } else {
              // Fallback: read as plain text
              const text = await file.text();
              setInputText(text);
              const parsed = parseCharactersFromText(text);
              setParsedCandidates(parsed);
              const initialSelected: Record<number, boolean> = {};
              parsed.forEach((_, idx) => (initialSelected[idx] = true));
              setSelectedCandidates(initialSelected);
              showNotification(`以純文字模式載入「${file.name}」`);
            }
          } catch (err) {
            console.error('File parsing error:', err);
            showNotification('檔案讀取完成，請檢查解析內容', 'success');
          } finally {
            setIsParsingDoc(false);
          }
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err: any) {
      console.error('Upload read error:', err);
      showNotification('無法讀取檔案，建議直接貼上純文字內容', 'error');
    } finally {
      setIsParsingDoc(false);
    }
  };

  // Run parser on pasted text
  const handleParsePastedText = () => {
    if (!inputText.trim()) {
      showNotification('請先輸入或貼上角色人設文字', 'error');
      return;
    }
    const parsed = parseCharactersFromText(inputText);
    if (parsed.length === 0) {
      showNotification('未檢測到明確角色名稱，請確認文字內容', 'error');
      return;
    }
    setParsedCandidates(parsed);
    const initialSelected: Record<number, boolean> = {};
    parsed.forEach((_, idx) => (initialSelected[idx] = true));
    setSelectedCandidates(initialSelected);
    showNotification(`成功識別出 ${parsed.length} 位角色！請檢視並確認匯入`);
  };

  // Fill sample template
  const handleFillSampleText = () => {
    const sample = `角色名：陸言
身分：首席獨立調查員 / 律師
與啦啦關係：舊日摯友、隱秘盟友
性格：沉著冷靜、言辭犀利、觀察入微，善於在危險中把握分寸
背景：曾協助啦啦調查家族秘辛，多年來在暗處守護，對啦啦始終保持克制與深沈的信任。

---
角色名：沈墨
身分：懸疑小說家
與啦啦關係：合作夥伴與靈魂知己
性格：溫潤儒雅、筆觸犀利，外表溫和但心思極其縝密
背景：經常與啦啦探討故事靈感，在平靜的日常下隱藏著強烈的好奇心與創作張力。`;
    setInputText(sample);
    const parsed = parseCharactersFromText(sample);
    setParsedCandidates(parsed);
    const initialSelected: Record<number, boolean> = {};
    parsed.forEach((_, idx) => (initialSelected[idx] = true));
    setSelectedCandidates(initialSelected);
  };

  // Confirm import parsed candidates
  const handleConfirmImportCandidates = () => {
    const candidatesToImport = parsedCandidates.filter((_, idx) => selectedCandidates[idx]);
    if (candidatesToImport.length === 0) {
      showNotification('請至少勾選一個要匯入的角色', 'error');
      return;
    }

    let addedCount = 0;
    const newParticipantIds = [...session.groupParticipantIds];

    candidatesToImport.forEach((c, idx) => {
      const added = StoryStorageService.addCharacter({
        name: c.name?.trim() || `新角色_${Date.now()}`,
        title: c.title?.trim() || '人物',
        relationshipWithLala: c.relationshipWithLala?.trim() || '相識好友',
        personality: c.personality?.trim() || '恪守原著設定。',
        background: c.background?.trim() || '',
        speechStyle: c.speechStyle?.trim() || '日常自然對話。',
        avatarColor: AVATAR_COLORS[(characters.length + idx) % AVATAR_COLORS.length],
        avatarInitial: c.name ? c.name.trim().slice(0, 2) : '新',
      });
      if (added && !newParticipantIds.includes(added.id)) {
        newParticipantIds.push(added.id);
      }
      addedCount++;
    });

    // Update group participants so new characters immediately join group chat!
    const updatedSession = {
      ...session,
      groupParticipantIds: newParticipantIds,
    };
    onSessionChange(updatedSession);
    StoryStorageService.saveSession(updatedSession);

    onRefreshData();
    showNotification(`成功匯入 ${addedCount} 個角色！已自動加入群聊現場`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Handle Manual Add
  const handleManualAdd = () => {
    if (!manualName.trim()) {
      showNotification('請填寫角色姓名', 'error');
      return;
    }

    const added = StoryStorageService.addCharacter({
      name: manualName.trim(),
      title: manualTitle.trim() || '人物',
      relationshipWithLala: manualRelation.trim() || '相識好友',
      personality: manualPersonality.trim() || '性格沉穩自然。',
      background: manualBackground.trim() || '',
      avatarColor: manualColor,
      avatarInitial: manualName.trim().slice(0, 2),
    });

    // Auto join group chat
    const updatedParticipants = [...session.groupParticipantIds];
    if (!updatedParticipants.includes(added.id)) {
      updatedParticipants.push(added.id);
      const updatedSession = { ...session, groupParticipantIds: updatedParticipants };
      onSessionChange(updatedSession);
      StoryStorageService.saveSession(updatedSession);
    }

    onRefreshData();
    showNotification(`成功建立角色「${added.name}」！`);
    setManualName('');
    setManualTitle('');
    setManualRelation('');
    setManualPersonality('');
    setManualBackground('');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  // Handle Copy Character
  const handleCopyCharacter = () => {
    if (!copySourceId) return;
    const dup = StoryStorageService.duplicateCharacter(copySourceId, copyNewName.trim() || undefined);
    if (dup) {
      const updatedParticipants = [...session.groupParticipantIds];
      if (!updatedParticipants.includes(dup.id)) {
        updatedParticipants.push(dup.id);
        const updatedSession = { ...session, groupParticipantIds: updatedParticipants };
        onSessionChange(updatedSession);
        StoryStorageService.saveSession(updatedSession);
      }
      onRefreshData();
      showNotification(`成功複製角色為「${dup.name}」！`);
      setCopyNewName('');
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  // Handle Delete Character
  const handleDeleteCharacter = (charId: string, charName: string) => {
    if (charId === 'lala') {
      showNotification('主角（啦啦）不能被刪除', 'error');
      return;
    }
    if (window.confirm(`確定要刪除角色「${charName}」嗎？刪除後對應角色將退出本場景。`)) {
      StoryStorageService.deleteCharacter(charId);
      // Remove from session
      const filtered = session.groupParticipantIds.filter(id => id !== charId);
      const updatedSession = {
        ...session,
        groupParticipantIds: filtered,
        selectedPrivateCharacterId:
          session.selectedPrivateCharacterId === charId
            ? characters.find(c => c.id !== charId && c.id !== 'lala')?.id || 'daniel'
            : session.selectedPrivateCharacterId,
      };
      onSessionChange(updatedSession);
      StoryStorageService.saveSession(updatedSession);
      onRefreshData();
      showNotification(`已刪除角色「${charName}」`);
    }
  };

  // Export all characters as plain text (.txt)
  const handleExportAsTxt = () => {
    let content = `【故事角色資料庫全覽】\n匯出時間：${new Date().toLocaleString()}\n\n`;
    characters.forEach((c, index) => {
      content += `====================================\n`;
      content += `角色 ${index + 1}：${c.name}\n`;
      if (c.title) content += `身分稱謂：${c.title}\n`;
      if (c.relationshipWithLala) content += `與啦啦關係：${c.relationshipWithLala}\n`;
      if (c.personality) content += `性格特徵：${c.personality}\n`;
      if (c.speechStyle) content += `說話風格：${c.speechStyle}\n`;
      if (c.background) content += `背景檔案：\n${c.background}\n`;
      content += `\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `故事角色資料庫_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('已成功匯出角色清單為純文字 TXT 檔案！');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">增加 / 匯入故事角色</h2>
              <p className="text-[11px] text-emerald-100 hidden xs:block">
                直接貼上文字、上傳 TXT / PDF / 文檔，或手動建立、複製角色，隨心加減
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-white/90 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-3 sm:px-6 py-2 gap-1 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('doc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'doc'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📄 TXT / PDF / 貼上文字匯入</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'manual'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>✍️ 快速手動填寫</span>
          </button>

          <button
            onClick={() => setActiveTab('copy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'copy'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>📋 複製現有角色</span>
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'manage'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>👥 角色庫加減管理 ({characters.length})</span>
          </button>
        </div>

        {/* Status notice */}
        {statusNotice && (
          <div
            className={`px-4 py-2 text-xs font-medium flex items-center justify-between animate-in fade-in duration-150 ${
              statusNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {statusNotice.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{statusNotice.msg}</span>
            </div>
            <button onClick={() => setStatusNotice(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Document / TXT / PDF / Paste */}
          {activeTab === 'doc' && (
            <div className="space-y-4">
              {/* File upload prompt & Paste helper */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 sm:p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-emerald-900">
                      上傳文檔 或 直接貼上角色設定純文字
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.md,.pdf,.doc,.docx,.json"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsingDoc}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isParsingDoc ? '讀取中...' : '選擇 TXT/PDF/文件'}</span>
                    </button>
                    <button
                      onClick={handleFillSampleText}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200/70 rounded-xl text-xs font-medium transition-colors"
                      title="填入範本文字參考格式"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>看範例格式</span>
                    </button>
                  </div>
                </div>

                {uploadFileName && (
                  <div className="text-[11px] text-emerald-700 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center justify-between">
                    <span>已載入檔案：<strong>{uploadFileName}</strong></span>
                    <button
                      onClick={() => {
                        setUploadFileName('');
                        setInputText('');
                        setParsedCandidates([]);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      清除
                    </button>
                  </div>
                )}

                {/* Textarea for pasting */}
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="在此直接貼上角色描述文字，例如：&#10;角色名：陸言&#10;身分：私家偵探 / 律師&#10;與啦啦關係：舊友、可靠的盟友&#10;性格：沉著犀利，心思縝密...&#10;&#10;（系統會自動識別姓名、身分、性格與關係，支援單個或多個角色）"
                  rows={6}
                  className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 font-mono leading-relaxed"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    字數：{inputText.length} 字
                  </span>
                  <button
                    onClick={handleParsePastedText}
                    disabled={!inputText.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-40"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>解析角色資料</span>
                  </button>
                </div>
              </div>

              {/* Parsed Candidate Cards Preview */}
              {parsedCandidates.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>識別出的角色預覽 ({parsedCandidates.length} 位)</span>
                    </span>
                    <button
                      onClick={handleConfirmImportCandidates}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>確認匯入勾選角色</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {parsedCandidates.map((cand, idx) => {
                      const isSelected = !!selectedCandidates[idx];
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={e =>
                                  setSelectedCandidates({
                                    ...selectedCandidates,
                                    [idx]: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                              />
                              <span className="text-sm font-bold text-slate-900">
                                {cand.name || '未命名角色'}
                              </span>
                            </label>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 font-medium">
                              {cand.title || '故事角色'}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-600">
                            <div>
                              <span className="text-slate-400">關係：</span>
                              <span className="text-slate-800 font-medium">
                                {cand.relationshipWithLala || '相識'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">性格：</span>
                              <span className="text-slate-700 line-clamp-2">
                                {cand.personality || '恪守原著設定'}
                              </span>
                            </div>
                            {cand.background && (
                              <div>
                                <span className="text-slate-400">背景：</span>
                                <span className="text-slate-700 line-clamp-2">
                                  {cand.background}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Manual Add */}
          {activeTab === 'manual' && (
            <div className="space-y-3 max-w-xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>手動新增自定義角色</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    角色姓名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    placeholder="例如：陸言、沈墨、傅雲深"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    稱號 / 身分
                  </label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    placeholder="例如：神秘律師、兒時玩伴、首席調查員"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  與啦啦之關係
                </label>
                <input
                  type="text"
                  value={manualRelation}
                  onChange={e => setManualRelation(e.target.value)}
                  placeholder="例如：青梅竹馬、盟友、下屬、舊情宿敵"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  性格特徵與說話風格
                </label>
                <textarea
                  value={manualPersonality}
                  onChange={e => setManualPersonality(e.target.value)}
                  placeholder="例如：外表冷靜疏離，言語犀利但對啦啦言出必行；遇到威脅時表現出極高冷靜度..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  背景故事或外貌細節（選填）
                </label>
                <textarea
                  value={manualBackground}
                  onChange={e => setManualBackground(e.target.value)}
                  placeholder="例如：年約三十餘歲，習慣著灰色羊絨大衣..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Avatar Color Swatches */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  角色代表色
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_COLORS.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setManualColor(c)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-transform ${c} ${
                        manualColor === c ? 'scale-115 ring-2 ring-emerald-500' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {manualColor === c ? '✓' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleManualAdd}
                  disabled={!manualName.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-40"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>建立並加入故事</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Copy Character */}
          {activeTab === 'copy' && (
            <div className="space-y-4 max-w-xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Copy className="w-4 h-4 text-indigo-600" />
                <span>複製現有角色（衍生分支或平行時空版）</span>
              </h3>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  選擇要複製的來源角色：
                </label>
                <select
                  value={copySourceId}
                  onChange={e => setCopySourceId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
                >
                  {characters.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.title || '角色'}) - 與啦啦關係：{c.relationshipWithLala || '相識'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  複製後的新角色名字：
                </label>
                <input
                  type="text"
                  value={copyNewName}
                  onChange={e => setCopyNewName(e.target.value)}
                  placeholder="例如：沈墨 (平行時空版) 或 青年版"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCopyCharacter}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  <Copy className="w-4 h-4" />
                  <span>確定複製角色</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Manage & Delete & Export */}
          {activeTab === 'manage' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>故事現有角色清單 ({characters.length} 位)</span>
                </span>
                <button
                  onClick={handleExportAsTxt}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                  title="將所有角色完整人設導出為純文字 TXT 檔"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>📥 匯出角色為 TXT 文檔</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {characters.map(char => {
                  const isLala = char.id === 'lala';
                  return (
                    <div
                      key={char.id}
                      className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-200 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${char.avatarColor}`}
                        >
                          {char.avatarInitial || char.name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {char.name}
                            </span>
                            {char.title && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {char.title}
                              </span>
                            )}
                            {isLala && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold border border-rose-200">
                                主角
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {char.relationshipWithLala || '相識關係'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isLala && (
                          <button
                            onClick={() => handleDeleteCharacter(char.id, char.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="刪除此角色"
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
        </div>
      </div>
    </div>
  );
};
