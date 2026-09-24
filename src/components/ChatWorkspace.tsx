import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  FastForward,
  BookOpen,
  Sparkles,
  Users,
  User,
  MapPin,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Edit3,
  Sliders,
  Search,
  Heart,
  Flame,
  Archive,
  X,
  ChevronUp,
  ChevronDown,
  CornerDownRight,
  Filter,
} from 'lucide-react';
import {
  Character,
  StoryMessage,
  StoryChoiceOption,
  StorySession,
  StoryBranchNode,
  FAVORITE_CATEGORIES,
} from '../types/story';
import { StoryStorageService } from '../services/storage';
import { FavoritesVaultModal } from './FavoritesVaultModal';
import { ImportStoryTextModal } from './ImportStoryTextModal';

interface ChatWorkspaceProps {
  characters: Character[];
  session: StorySession;
  branchNodes: StoryBranchNode[];
  onSessionChange: (session: StorySession) => void;
  onRefreshData?: () => void;
  onOpenDashboard: () => void;
  onOpenDiary: (prefillMessages?: StoryMessage[]) => void;
  onOpenTree: () => void;
  onOpenImportStoryText?: () => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  characters,
  session,
  branchNodes,
  onSessionChange,
  onRefreshData = () => {},
  onOpenDashboard,
  onOpenDiary,
  onOpenTree,
  onOpenImportStoryText,
}) => {
  const [messages, setMessages] = useState<StoryMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [inputAction, setInputAction] = useState('');
  const [showActionInput, setShowActionInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [choices, setChoices] = useState<StoryChoiceOption[]>([]);
  const [isGeneratingChoices, setIsGeneratingChoices] = useState(false);
  const [isChoicesCollapsed, setIsChoicesCollapsed] = useState(false);
  const [editingScene, setEditingScene] = useState(false);
  const [sceneInput, setSceneInput] = useState(session.sceneLocation);
  const [showParticipantSelector, setShowParticipantSelector] = useState(false);
  const [showQuickStats, setShowQuickStats] = useState(false);

  // Import story text modal state (User requirement: 把原來的文本放進行去，不要從頭開始也不要寫沒有發生過去的)
  const [showImportTextModal, setShowImportTextModal] = useState(false);

  // Search feature states
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'lala' | 'favorites' | string>('all');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [showMatchesDropdown, setShowMatchesDropdown] = useState(false);

  // Favorites feature states
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [activeHeartPopoverId, setActiveHeartPopoverId] = useState<string | null>(null);
  const [tempFavoriteNote, setTempFavoriteNote] = useState('');

  // Jump-to highlight state
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Reload messages on branch change
  const reloadMessages = () => {
    const allMsgs = StoryStorageService.getMessages();
    setMessages(allMsgs);
  };

  useEffect(() => {
    reloadMessages();
  }, [session.activeBranchId]);

  // Scroll to bottom on normal message append
  useEffect(() => {
    if (!highlightedMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isLoading]);

  // Active branch
  const activeBranch = branchNodes.find(n => n.id === session.activeBranchId) || branchNodes[0];

  // Active participants
  const participants = session.mode === 'private'
    ? characters.filter(c => c.id === session.selectedPrivateCharacterId || c.id === 'lala')
    : characters.filter(c => session.groupParticipantIds.includes(c.id) || c.id === 'lala');

  // Currently selected private partner
  const privatePartner = characters.find(c => c.id === session.selectedPrivateCharacterId) || characters[1];

  // Favorite counts
  const favoriteCount = useMemo(() => {
    return messages.filter(m => m.isFavorite).length;
  }, [messages]);

  // Filter messages based on search criteria
  const searchResults = useMemo(() => {
    if (!searchKeyword.trim() && searchScope === 'all') return [];

    const kw = searchKeyword.toLowerCase().trim();

    return messages.filter(msg => {
      // Scope match
      if (searchScope === 'lala' && msg.senderId !== 'lala') return false;
      if (searchScope === 'favorites' && !msg.isFavorite) return false;
      if (searchScope !== 'all' && searchScope !== 'lala' && searchScope !== 'favorites') {
        if (msg.senderId !== searchScope) return false;
      }

      // Keyword match
      if (!kw) return true;
      const matchContent = msg.content.toLowerCase().includes(kw);
      const matchAction = msg.stageAction ? msg.stageAction.toLowerCase().includes(kw) : false;
      const matchSender = msg.senderName.toLowerCase().includes(kw);
      return matchContent || matchAction || matchSender;
    });
  }, [messages, searchKeyword, searchScope]);

  // Jump to specific message with pulsating glow
  const scrollToMessage = (msgId: string) => {
    const targetEl = messageCardRefs.current[msgId];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(msgId);
      setTimeout(() => setHighlightedMessageId(null), 3000);
    }
  };

  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % searchResults.length;
    setActiveMatchIndex(nextIdx);
    scrollToMessage(searchResults[nextIdx].id);
  };

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveMatchIndex(prevIdx);
    scrollToMessage(searchResults[prevIdx].id);
  };

  // Fetch or generate 3 Lala choices
  const handleFetchChoices = async () => {
    setIsGeneratingChoices(true);
    try {
      const corpusItems = StoryStorageService.getCorpus().filter(c => c.isActive);
      const corpusContext = corpusItems.map(c => `[${c.title}]: ${c.content}`).join('\n\n');
      const authorFavoritesSummary = StoryStorageService.getAuthorFavoritesSummary();

      const response = await fetch('/api/choices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: messages.slice(-8),
          activeBranch: activeBranch?.branchName,
          participants,
          corpusContext,
          isMatureMode: session.isMatureMode !== false,
          authorFavoritesSummary,
        }),
      });
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setChoices(data);
      }
    } catch (err) {
      console.error('Failed to fetch choices:', err);
    } finally {
      setIsGeneratingChoices(false);
    }
  };

  // Initial choices trigger
  useEffect(() => {
    if (choices.length === 0 && messages.length > 0) {
      handleFetchChoices();
    }
  }, [session.activeBranchId, session.mode]);

  // Trigger Character Response from Server
  const requestCharacterSpeech = async (userMsgText?: string, isNextAction: boolean = false, choiceData?: any) => {
    setIsLoading(true);
    try {
      const corpusItems = StoryStorageService.getCorpus().filter(c => c.isActive);
      const corpusContext = corpusItems.map(c => `[${c.title}]: ${c.content}`).join('\n\n');
      const authorFavoritesSummary = StoryStorageService.getAuthorFavoritesSummary();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: session.mode,
          targetCharacter: session.mode === 'private' ? privatePartner : null,
          participants: participants.filter(p => p.id !== 'lala'),
          history: messages,
          userMessage: userMsgText,
          corpusContext,
          branchTitle: activeBranch?.branchName,
          actionPrompt: isNextAction ? 'next' : 'normal',
          isMatureMode: session.isMatureMode !== false,
          authorFavoritesSummary,
        }),
      });

      const data = await response.json();

      if (data.text) {
        const replyingCharacter = characters.find(c => c.id === data.speakerId) || privatePartner;

        const newMsg: StoryMessage = {
          id: `msg_${Date.now()}`,
          senderId: data.speakerId || replyingCharacter.id,
          senderName: data.speakerName || replyingCharacter.name,
          senderColor: replyingCharacter.avatarColor,
          content: data.text,
          stageAction: data.stageAction,
          timestamp: Date.now(),
          type: 'dialogue',
          nodeId: activeBranch.id,
          branchId: activeBranch.id,
          statDelta: data.statChanges,
        };

        StoryStorageService.addMessage(newMsg);
        setMessages(prev => [...prev, newMsg]);

        // Update stats
        if (data.statChanges && replyingCharacter.id !== 'lala') {
          StoryStorageService.updateCharacterStats(
            replyingCharacter.id,
            data.statChanges.affectionDelta || 0,
            data.statChanges.trustDelta || 0,
            data.statChanges.tensionDelta || 0,
            data.emotionalState
          );
        }

        // Refresh choices
        handleFetchChoices();
      }
    } catch (err) {
      console.error('Error fetching character response:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Send message as Lala
  const handleSendLalaMessage = (textToSend: string, actionDesc?: string, choiceData?: any) => {
    if (!textToSend.trim() && !actionDesc?.trim()) return;

    const lalaChar = characters.find(c => c.id === 'lala') || characters[0];
    const newLalaMsg: StoryMessage = {
      id: `msg_${Date.now()}`,
      senderId: 'lala',
      senderName: '啦啦',
      senderColor: lalaChar.avatarColor,
      content: textToSend.trim(),
      stageAction: actionDesc?.trim(),
      timestamp: Date.now(),
      type: choiceData ? 'milestone' : 'dialogue',
      nodeId: activeBranch.id,
      branchId: activeBranch.id,
      choiceSelected: choiceData,
    };

    StoryStorageService.addMessage(newLalaMsg);
    setMessages(prev => [...prev, newLalaMsg]);

    setInputText('');
    setInputAction('');
    setShowActionInput(false);

    // Call character reply
    requestCharacterSpeech(textToSend, false, choiceData);
  };

  // Click choice option
  const handleSelectChoice = (option: StoryChoiceOption) => {
    handleSendLalaMessage(option.text, undefined, {
      id: option.id,
      text: option.text,
    });
  };

  // Next turn
  const handleNextTurn = () => {
    requestCharacterSpeech(undefined, true);
  };

  // Toggle favorite for a message
  const handleToggleFavorite = (msg: StoryMessage) => {
    const updated = StoryStorageService.toggleFavoriteMessage(msg.id, '深情對白');
    if (updated && updated.isFavorite) {
      setActiveHeartPopoverId(msg.id);
      setTempFavoriteNote(updated.favoriteNote || '');
    } else {
      setActiveHeartPopoverId(null);
    }
    reloadMessages();
  };

  const handleSetFavoriteCategory = (msgId: string, category: string, note?: string) => {
    StoryStorageService.updateMessageFavorite(msgId, true, category, note);
    setActiveHeartPopoverId(null);
    reloadMessages();
  };

  // Scene Location update
  const handleSaveScene = () => {
    const updatedSession = { ...session, sceneLocation: sceneInput };
    onSessionChange(updatedSession);
    StoryStorageService.saveSession(updatedSession);
    setEditingScene(false);
  };

  // Toggle 18+ Mature Mode
  const handleToggleMatureMode = () => {
    const nextVal = session.isMatureMode === false ? true : false;
    const updatedSession = { ...session, isMatureMode: nextVal };
    onSessionChange(updatedSession);
    StoryStorageService.saveSession(updatedSession);
  };

  // Toggle group participant
  const toggleGroupParticipant = (charId: string) => {
    let newIds = [...session.groupParticipantIds];
    if (newIds.includes(charId)) {
      if (newIds.length > 1) {
        newIds = newIds.filter(id => id !== charId);
      }
    } else {
      newIds.push(charId);
    }
    const updatedSession = { ...session, groupParticipantIds: newIds };
    onSessionChange(updatedSession);
    StoryStorageService.saveSession(updatedSession);
  };

  // Switch private partner
  const switchPrivatePartner = (charId: string) => {
    const updatedSession = { ...session, selectedPrivateCharacterId: charId };
    onSessionChange(updatedSession);
    StoryStorageService.saveSession(updatedSession);
  };

  // Highlight helper for text
  const renderHighlightedText = (text: string, kw: string) => {
    if (!kw.trim()) return text;
    const parts = text.split(new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === kw.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 text-slate-900 rounded-sm px-0.5 font-medium border border-amber-300">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-3.2rem-4rem)] md:h-[calc(100vh-3.8rem)] max-w-7xl mx-auto px-1.5 sm:px-4 py-1 sm:py-2 w-full max-w-full overflow-x-hidden">
      {/* Top Workspace Header Bar (Compact & Space-Efficient to maximize message scrolling area) */}
      <div className="bg-white border border-sky-100 rounded-xl p-2 sm:px-3 sm:py-2 mb-1.5 shadow-2xs space-y-1.5 w-full max-w-full">
        {/* Row 1: Mode Switcher, 18+ Toggle, Partner Selector */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap w-full">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              <button
                onClick={() => {
                  const updated = { ...session, mode: 'private' as const };
                  onSessionChange(updated);
                  StoryStorageService.saveSession(updated);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                  session.mode === 'private'
                    ? 'bg-white text-sky-700 shadow-xs border border-sky-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3 h-3 text-sky-500" />
                <span className="text-[11px]">單聊</span>
              </button>
              <button
                onClick={() => {
                  const updated = { ...session, mode: 'group' as const };
                  onSessionChange(updated);
                  StoryStorageService.saveSession(updated);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                  session.mode === 'group'
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3 h-3 text-indigo-500" />
                <span className="text-[11px]">群聊 ({session.groupParticipantIds.length})</span>
              </button>
            </div>

            {/* 18+ Mature Mode Toggle */}
            <button
              onClick={handleToggleMatureMode}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
                session.isMatureMode !== false
                  ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
              }`}
              title="點擊切換 18+ 成人向創作模式"
            >
              <Flame className="w-3 h-3 text-rose-500 shrink-0" />
              <span>{session.isMatureMode !== false ? '🔞 18+' : '18+關'}</span>
            </button>
          </div>

          {/* Right: Partner Selector */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {session.mode === 'private' ? (
              <div className="flex items-center gap-1">
                <select
                  value={session.selectedPrivateCharacterId}
                  onChange={e => switchPrivatePartner(e.target.value)}
                  className="text-xs bg-slate-50 border border-sky-200 rounded-lg px-2 py-0.5 text-slate-700 font-medium focus:outline-hidden max-w-[140px] sm:max-w-[180px] truncate"
                >
                  {characters
                    .filter(c => c.id !== 'lala')
                    .map(c => {
                      const roleDisplay = c.id === 'adam' ? ' (兒子)' : (c.title && !c.title.includes('/') ? ` (${c.title})` : '');
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name}{roleDisplay}
                        </option>
                      );
                    })}
                </select>
              </div>
            ) : (
              <button
                onClick={() => setShowParticipantSelector(!showParticipantSelector)}
                className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
              >
                <Users className="w-3 h-3" />
                <span>現場角色 ({session.groupParticipantIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Compact Scene Location & Fast Action Buttons */}
        <div className="flex items-center justify-between gap-1.5 text-xs text-slate-600 bg-sky-50/50 border border-sky-100/80 px-2.5 py-1 rounded-lg w-full">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <MapPin className="w-3 h-3 text-sky-500 shrink-0" />
            {editingScene ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  value={sceneInput}
                  onChange={e => setSceneInput(e.target.value)}
                  className="bg-white border border-sky-200 rounded px-1.5 py-0.5 text-xs text-slate-800 focus:outline-hidden flex-1"
                  placeholder="輸入當前空間場景..."
                />
                <button
                  onClick={handleSaveScene}
                  className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded hover:bg-sky-600 shrink-0"
                >
                  確認
                </button>
              </div>
            ) : (
              <span
                onClick={() => setEditingScene(true)}
                className="cursor-pointer hover:text-sky-700 font-medium truncate text-[11px] sm:text-xs"
                title="點擊修改當前空間情境"
              >
                {session.sceneLocation}
              </span>
            )}
          </div>

          {/* Compact Action Icons Strip */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                if (onOpenImportStoryText) onOpenImportStoryText();
                else setShowImportTextModal(true);
              }}
              className="flex items-center gap-0.5 text-[10px] sm:text-[11px] bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-1.5 py-0.5 rounded-md font-medium transition-all shrink-0"
              title="預載整包 ZIP 檔案或貼上原著正文"
            >
              <Archive className="w-3 h-3 text-indigo-600 shrink-0" />
              <span>ZIP/原著</span>
            </button>

            <button
              onClick={() => setShowFavoritesModal(true)}
              className="flex items-center gap-0.5 text-[10px] sm:text-[11px] bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 px-1.5 py-0.5 rounded-md transition-colors font-medium shrink-0"
              title="心動精選"
            >
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500 shrink-0" />
              <span>({favoriteCount})</span>
            </button>

            <button
              onClick={() => {
                setShowSearchBar(!showSearchBar);
                if (!showSearchBar) setShowMatchesDropdown(true);
              }}
              className={`flex items-center gap-0.5 text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md border transition-all shrink-0 ${
                showSearchBar || searchKeyword
                  ? 'bg-sky-100 border-sky-300 text-sky-800'
                  : 'bg-white border-sky-200 text-slate-700 hover:bg-sky-50'
              }`}
              title="搜尋過往對話紀錄"
            >
              <Search className="w-3 h-3 text-sky-500 shrink-0" />
              <span>搜尋</span>
            </button>

            <button
              onClick={() => setShowQuickStats(!showQuickStats)}
              className={`flex items-center gap-0.5 text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md border transition-all shrink-0 ${
                showQuickStats ? 'bg-sky-100 border-sky-300 text-sky-800' : 'bg-white border-sky-200 text-slate-700 hover:bg-sky-50'
              }`}
              title="開啟即時角色數據看板"
            >
              <Sliders className="w-3 h-3 text-sky-500 shrink-0" />
              <span className="hidden xs:inline">看板</span>
            </button>

            <button
              onClick={() => onOpenDiary(messages)}
              className="flex items-center gap-0.5 text-[10px] sm:text-[11px] bg-amber-500 hover:bg-amber-600 text-white px-1.5 py-0.5 rounded-md font-medium transition-all shrink-0"
              title="將最新劇情階段寫成深刻日記"
            >
              <BookOpen className="w-3 h-3 shrink-0" />
              <span className="hidden xs:inline">日記</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Dialogue Search Bar (User Requirement: "search功能即係話搵返邊一個我講過嘅嘢，打keyword嗰陣") */}
      {showSearchBar && (
        <div className="bg-white border border-sky-200 rounded-2xl p-3 mb-2 shadow-md animate-in slide-in-from-top-2 duration-150 relative">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-sky-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={e => {
                    setSearchKeyword(e.target.value);
                    setActiveMatchIndex(0);
                    setShowMatchesDropdown(true);
                  }}
                  placeholder="輸入關鍵字搜尋對話（如：名冊、碼頭、喜歡、秘密...）"
                  className="w-full bg-slate-50 border border-sky-100 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-sky-300 focus:bg-white transition-all"
                  autoFocus
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Match Counter & Next/Prev navigation */}
              {searchResults.length > 0 && (
                <div className="flex items-center gap-1 bg-sky-50 border border-sky-200 rounded-xl px-2 py-1 text-xs text-sky-800">
                  <span>
                    {activeMatchIndex + 1} / {searchResults.length}
                  </span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      onClick={handlePrevMatch}
                      className="p-0.5 hover:bg-sky-200 rounded text-sky-700"
                      title="上一筆"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleNextMatch}
                      className="p-0.5 hover:bg-sky-200 rounded text-sky-700"
                      title="下一筆"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSearchBar(false)}
              className="text-xs text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scope Filters (Specifically: "搵返邊一個我講過嘅嘢") */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 text-[11px] flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-slate-400" />
              篩選範圍：
            </span>

            <button
              onClick={() => setSearchScope('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                searchScope === 'all'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全部對話
            </button>

            {/* Direct requirement button: 我 (啦啦) 講過嘅嘢 */}
            <button
              onClick={() => setSearchScope('lala')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                searchScope === 'lala'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span>👤 我 (啦啦) 講過嘅嘢</span>
              <span className="text-[10px] opacity-80">
                ({messages.filter(m => m.senderId === 'lala').length})
              </span>
            </button>

            <button
              onClick={() => setSearchScope('favorites')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                searchScope === 'favorites'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Heart className="w-3 h-3 fill-current" />
              <span>只看心動精選</span>
              <span className="text-[10px] opacity-80">({favoriteCount})</span>
            </button>

            {/* Character Scope Options */}
            {participants
              .filter(p => p.id !== 'lala')
              .map(p => (
                <button
                  key={p.id}
                  onClick={() => setSearchScope(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    searchScope === p.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
          </div>

          {/* Matching results dropdown snippet preview */}
          {searchKeyword.trim() && searchResults.length > 0 && showMatchesDropdown && (
            <div className="mt-2 pt-2 border-t border-slate-100 max-h-48 overflow-y-auto space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>搜尋結果清單（點擊即可定位到該句）：</span>
                <button
                  onClick={() => setShowMatchesDropdown(false)}
                  className="text-sky-600 hover:underline"
                >
                  隱藏清單
                </button>
              </div>
              {searchResults.map((m, idx) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setActiveMatchIndex(idx);
                    scrollToMessage(m.id);
                  }}
                  className={`p-2 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    activeMatchIndex === idx
                      ? 'bg-sky-50/80 border-sky-300 shadow-xs'
                      : 'bg-slate-50/60 border-slate-100 hover:bg-sky-50/40 hover:border-sky-200'
                  }`}
                >
                  <div className="flex-1 truncate">
                    <span className="font-semibold text-slate-700 mr-1.5">
                      {m.senderName}:
                    </span>
                    <span className="text-slate-600">
                      {m.content}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-[10px] text-slate-400">
                    {m.isFavorite && <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />}
                    <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchKeyword.trim() && searchResults.length === 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400 italic text-center py-2">
              找不到包含「{searchKeyword}」的對話記錄。
            </div>
          )}
        </div>
      )}

      {/* Group Participant Drawer */}
      {showParticipantSelector && session.mode === 'group' && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-3 mb-2 shadow-md animate-in fade-in duration-150">
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span>選擇當前在場的多位角色（點擊切換進出房間）：</span>
            <button
              onClick={() => setShowParticipantSelector(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              關閉
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {characters
              .filter(c => c.id !== 'lala')
              .map(c => {
                const isSelected = session.groupParticipantIds.includes(c.id);
                const roleBadge = c.id === 'adam' ? ' (兒子)' : (c.title && !c.title.includes('/') ? ` (${c.title})` : '');
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleGroupParticipant(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-medium shadow-xs'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{c.name}</span>
                    {roleBadge && <span className="text-[10px] opacity-80">{roleBadge}</span>}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Main Dialogue Scrollable Body with Clean White Cards & Light Blue Borders */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 sm:px-2 py-2 space-y-3">
        {messages.map((msg) => {
          const isLala = msg.senderId === 'lala';
          const senderChar = characters.find(c => c.id === msg.senderId);
          const isHighlighted = highlightedMessageId === msg.id;

          return (
            <div
              key={msg.id}
              ref={el => {
                messageCardRefs.current[msg.id] = el;
              }}
              className={`flex flex-col ${isLala ? 'items-end' : 'items-start'} max-w-3xl ${
                isLala ? 'ml-auto' : 'mr-auto'
              } transition-all duration-300`}
            >
              {/* Sender Name & Meta */}
              <div className="flex items-center gap-2 mb-1 px-1 text-xs text-slate-400">
                <span className="font-medium text-slate-700">{msg.senderName}</span>
                {senderChar && senderChar.id !== 'lala' && (
                  <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                    {senderChar.stats.intimacyStage} · 好感 {senderChar.stats.affection}
                  </span>
                )}
                {msg.choiceSelected && (
                  <span className="text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 font-medium">
                    選項 {msg.choiceSelected.id}
                  </span>
                )}
                <span className="text-[10px] text-slate-300">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* The User's Signature White Box with Light Blue Border */}
              <div
                className={`w-full rounded-2xl p-4 transition-all relative group ${
                  isLala ? 'bubble-card-user' : 'bubble-card'
                } ${
                  isHighlighted ? 'ring-3 ring-sky-400 bg-sky-50/60 shadow-lg' : ''
                }`}
              >
                {/* Heart / Favorite Button & Quick Tag Popover on top right */}
                <div className="absolute right-3 top-3 flex items-center gap-1.5">
                  {msg.isFavorite && (
                    <span
                      onClick={() => setActiveHeartPopoverId(activeHeartPopoverId === msg.id ? null : msg.id)}
                      className="cursor-pointer text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 px-2 py-0.5 rounded-full transition-all"
                      title="點擊更改心動喜愛標籤"
                    >
                      ❤️ {msg.favoriteCategory || '喜愛金句'}
                    </span>
                  )}

                  <button
                    onClick={() => handleToggleFavorite(msg)}
                    className={`p-1 rounded-lg transition-all ${
                      msg.isFavorite
                        ? 'text-rose-500 hover:bg-rose-50'
                        : 'text-slate-300 hover:text-rose-500 hover:bg-slate-50 opacity-60 group-hover:opacity-100'
                    }`}
                    title={msg.isFavorite ? '已加心心（點擊取消）' : '加心心：標記作者喜歡的說話或劇情'}
                  >
                    <Heart className={`w-4 h-4 ${msg.isFavorite ? 'fill-rose-500' : ''}`} />
                  </button>
                </div>

                {/* Heart Popover for picking category or adding note */}
                {activeHeartPopoverId === msg.id && (
                  <div className="absolute right-3 top-10 z-30 bg-white border border-rose-200 rounded-2xl shadow-xl p-3 w-64 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between font-bold text-slate-700 mb-2 border-b border-rose-100 pb-1">
                      <span className="flex items-center gap-1 text-rose-600">
                        <Heart className="w-3.5 h-3.5 fill-rose-500" />
                        標記這段話的喜愛類型
                      </span>
                      <button
                        onClick={() => setActiveHeartPopoverId(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1 mb-2">
                      {FAVORITE_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => handleSetFavoriteCategory(msg.id, cat, tempFavoriteNote)}
                          className={`w-full text-left px-2 py-1 rounded-lg transition-colors flex items-center justify-between ${
                            msg.favoriteCategory === cat
                              ? 'bg-rose-100 text-rose-800 font-semibold'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{cat}</span>
                          {msg.favoriteCategory === cat && <span className="text-[10px]">✓</span>}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 pt-2">
                      <input
                        type="text"
                        value={tempFavoriteNote}
                        onChange={e => setTempFavoriteNote(e.target.value)}
                        placeholder="作者筆記備註（可選）..."
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-hidden focus:border-rose-300"
                      />
                      <button
                        onClick={() => handleSetFavoriteCategory(msg.id, msg.favoriteCategory || '深情對白', tempFavoriteNote)}
                        className="w-full mt-1.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium text-[11px] transition-colors"
                      >
                        儲存心動標籤
                      </button>
                    </div>
                  </div>
                )}

                {/* Stage Action / 文具情境描寫 */}
                {msg.stageAction && (
                  <div className="text-xs text-sky-800/80 bg-sky-50/70 border border-sky-100/80 rounded-xl px-3 py-1.5 mb-2.5 italic leading-relaxed pr-12">
                    ✦ {renderHighlightedText(msg.stageAction, searchKeyword)}
                  </div>
                )}

                {/* Spoken Dialogue Text with crisp typography */}
                <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-sans whitespace-pre-wrap pr-10">
                  {renderHighlightedText(msg.content, searchKeyword)}
                </p>

                {/* Author's Favorite Note if any */}
                {msg.favoriteNote && (
                  <div className="mt-2 text-[11px] text-rose-600 bg-rose-50/50 border border-rose-100 rounded-lg px-2 py-0.5 inline-block italic">
                    💭 作者心動筆記：{msg.favoriteNote}
                  </div>
                )}

                {/* Stat Changes Delta Badge (if any) */}
                {msg.statDelta && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-500">
                    {msg.statDelta.affectionDelta !== 0 && (
                      <span className="flex items-center gap-1 font-medium text-rose-600">
                        {msg.statDelta.affectionDelta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        好感 {msg.statDelta.affectionDelta > 0 ? `+${msg.statDelta.affectionDelta}` : msg.statDelta.affectionDelta}
                      </span>
                    )}
                    {msg.statDelta.trustDelta !== 0 && (
                      <span className="flex items-center gap-1 font-medium text-sky-600">
                        信任 {msg.statDelta.trustDelta > 0 ? `+${msg.statDelta.trustDelta}` : msg.statDelta.trustDelta}
                      </span>
                    )}
                    {msg.statDelta.tensionDelta !== 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        心防張力 {msg.statDelta.tensionDelta > 0 ? `+${msg.statDelta.tensionDelta}` : msg.statDelta.tensionDelta}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-sky-600 bg-white border border-sky-200 px-4 py-3 rounded-2xl shadow-xs max-w-sm">
            <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
            <span>角色正在沉思與推演下一步動作……</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Quick Stats Drawer */}
      {showQuickStats && (
        <div className="bg-white/95 backdrop-blur-md border border-sky-200 rounded-2xl p-3 mb-2 shadow-lg animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-500" />
              現場角色即時心理狀態看板
            </span>
            <button
              onClick={() => setShowQuickStats(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              收起
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {participants
              .filter(p => p.id !== 'lala')
              .map(char => (
                <div key={char.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">{char.name}</span>
                    <span className="text-[10px] text-sky-700 bg-sky-100/60 px-1.5 py-0.5 rounded font-medium">
                      {char.stats.intimacyStage}
                    </span>
                  </div>
                  <div className="space-y-1 mb-1.5">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>好感: {char.stats.affection}%</span>
                      <span>信任: {char.stats.trust}%</span>
                      <span>警戒: {char.stats.tension}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-400 h-full rounded-full transition-all"
                        style={{ width: `${char.stats.affection}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 italic line-clamp-2">
                    💭 {char.stats.currentMindset}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 3 Spoken Options Bar for Lala (Compact, Clean, Spoken Dialogue Only) */}
      <div className="bg-white/95 border border-sky-200 rounded-xl p-2 mb-1.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-xs font-bold text-slate-800">3 個對白選項</span>
            <button
              onClick={() => setIsChoicesCollapsed(!isChoicesCollapsed)}
              className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-0.5 ml-1 transition-colors"
              title={isChoicesCollapsed ? '展開選項' : '收起選項以騰出更多對話滾動空間'}
            >
              <span>{isChoicesCollapsed ? '(點擊展開)' : '(收起)'}</span>
              {isChoicesCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>

          <button
            onClick={handleFetchChoices}
            disabled={isGeneratingChoices}
            className="flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-800 transition-colors font-medium"
            title="重新產生 3 個選項"
          >
            <RefreshCw className={`w-3 h-3 ${isGeneratingChoices ? 'animate-spin' : ''}`} />
            <span>換一批</span>
          </button>
        </div>

        {!isChoicesCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
            {choices.map((option, idx) => {
              const optionNumber = option.id || (idx + 1).toString();
              return (
                <div
                  key={option.id || idx}
                  className="group flex items-center justify-between gap-1.5 bg-slate-50/90 hover:bg-sky-50/80 border border-slate-200 hover:border-sky-300 rounded-lg px-2.5 py-1.5 transition-all text-left"
                >
                  <button
                    onClick={() => handleSelectChoice(option)}
                    disabled={isLoading}
                    className="flex-1 flex items-start gap-1.5 min-w-0 text-left cursor-pointer"
                    title="點擊直接說出此句"
                  >
                    <span className="shrink-0 w-4 h-4 rounded bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {optionNumber}
                    </span>
                    <p className="text-xs sm:text-[13px] text-slate-800 font-medium leading-snug line-clamp-2">
                      {option.text}
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setInputText(option.text);
                    }}
                    className="p-1 text-slate-400 hover:text-sky-600 hover:bg-white rounded transition-colors shrink-0"
                    title="填入輸入框修改"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Box and Action Bar */}
      <div className="bg-white border border-sky-200 rounded-2xl p-2.5 shadow-sm">
        {/* Optional Action / Gesture input toggle */}
        {showActionInput && (
          <div className="mb-2">
            <input
              type="text"
              value={inputAction}
              onChange={e => setInputAction(e.target.value)}
              placeholder="啦啦的動作描寫/微表情（例如：輕輕合上筆記，抬頭望向窗外的雨滴...）"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-hidden focus:border-sky-300"
            />
          </div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Action toggle button */}
          <button
            onClick={() => setShowActionInput(!showActionInput)}
            className={`p-2 rounded-xl text-xs transition-colors shrink-0 ${
              showActionInput ? 'bg-sky-100 text-sky-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
            title="添加肢體動作/情境描寫"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Main textarea */}
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendLalaMessage(inputText, inputAction);
              }
            }}
            placeholder="輸入啦啦台詞或推進劇情..."
            rows={1}
            className="flex-1 min-w-0 bg-transparent resize-none py-1.5 px-2 text-xs sm:text-sm text-slate-800 focus:outline-hidden placeholder:text-slate-400 max-h-24"
          />

          {/* Next Button */}
          <button
            onClick={handleNextTurn}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 border border-slate-200 hover:border-sky-300 text-xs font-semibold transition-all shrink-0"
            title="啦啦暫時不說話，讓在場角色自然接續發言或推進環境文具情境"
          >
            <FastForward className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="hidden sm:inline">Next (角色續言)</span>
            <span className="sm:hidden">Next</span>
          </button>

          {/* Send as Lala */}
          <button
            onClick={() => handleSendLalaMessage(inputText, inputAction)}
            disabled={isLoading || (!inputText.trim() && !inputAction.trim())}
            className="p-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-40 transition-colors shadow-xs shrink-0"
            title="發送對話"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Favorites Vault Modal */}
      <FavoritesVaultModal
        isOpen={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
        onJumpToMessage={scrollToMessage}
        onRefreshMessages={reloadMessages}
      />

      {/* Import Original Text Modal (Seamless Continuation & Strict Canon Fact Anchor) */}
      <ImportStoryTextModal
        isOpen={showImportTextModal}
        onClose={() => {
          setShowImportTextModal(false);
          reloadMessages();
        }}
        session={session}
        characters={characters}
        onSessionChange={onSessionChange}
        onRefreshData={() => {
          reloadMessages();
          onRefreshData();
        }}
      />
    </div>
  );
};
