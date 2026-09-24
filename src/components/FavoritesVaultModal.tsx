import React, { useState } from 'react';
import {
  Heart,
  X,
  Copy,
  Check,
  MapPin,
  Sparkles,
  Tag,
  ArrowRight,
  Flame,
  MessageSquareQuote,
  Trash2,
} from 'lucide-react';
import { StoryMessage, FAVORITE_CATEGORIES } from '../types/story';
import { StoryStorageService } from '../services/storage';

interface FavoritesVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
  onRefreshMessages: () => void;
}

export const FavoritesVaultModal: React.FC<FavoritesVaultModalProps> = ({
  isOpen,
  onClose,
  onJumpToMessage,
  onRefreshMessages,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const favoriteMessages = StoryStorageService.getFavoriteMessages();
  const tasteSummary = StoryStorageService.getAuthorFavoritesSummary();

  const filteredMessages = selectedCategory === 'all'
    ? favoriteMessages
    : favoriteMessages.filter(m => (m.favoriteCategory || '未分類') === selectedCategory);

  const handleCopyQuote = (msg: StoryMessage) => {
    const textToCopy = `「${msg.content}」—— ${msg.senderName}${msg.stageAction ? `（${msg.stageAction}）` : ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRemoveFavorite = (msgId: string) => {
    StoryStorageService.toggleFavoriteMessage(msgId);
    onRefreshMessages();
  };

  const handleUpdateCategory = (msgId: string, newCat: string) => {
    StoryStorageService.updateMessageFavorite(msgId, true, newCat);
    onRefreshMessages();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-sky-200 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-sky-100 flex items-center justify-between bg-gradient-to-r from-white via-rose-50/30 to-sky-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-200">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  作者心動精選與金句庫
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold border border-rose-200">
                  {favoriteMessages.length} 條收藏
                </span>
              </div>
              <p className="text-xs text-slate-500">
                記錄您最喜歡的說話與高張力劇情，已自動同步為 AI 故事大腦的偏好記憶
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

        {/* AI Flavor Synchronization Banner */}
        <div className="px-6 py-2.5 bg-gradient-to-r from-sky-50 to-indigo-50 border-b border-sky-100/80 flex items-center gap-2.5 text-xs text-sky-900">
          <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
          <div className="flex-1 truncate">
            <span className="font-semibold text-sky-800">AI 偏好同步狀態：</span>
            <span className="text-slate-600">{tasteSummary}</span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto bg-slate-50/50">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            全部金句 ({favoriteMessages.length})
          </button>

          {FAVORITE_CATEGORIES.map(cat => {
            const count = favoriteMessages.filter(m => m.favoriteCategory === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.includes('18+') && <Flame className="w-3 h-3 text-amber-500" />}
                <span>{cat}</span>
                <span className={`text-[10px] px-1 rounded-full ${
                  selectedCategory === cat ? 'bg-rose-400 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Favorites List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquareQuote className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-sm">此分類下暫無加心心的金句</p>
              <p className="text-xs mt-1 text-slate-400">
                在實時對話中點擊任何訊息右上角的「❤️」即可收藏並標記喜愛類型！
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className="bg-white border border-sky-100 hover:border-sky-300 rounded-2xl p-4 transition-all shadow-xs group"
              >
                {/* Meta & Category Selector */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">
                      {msg.senderName}
                    </span>
                    <select
                      value={msg.favoriteCategory || '深情對白'}
                      onChange={e => handleUpdateCategory(msg.id, e.target.value)}
                      className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 rounded-lg px-2 py-0.5 font-medium focus:outline-hidden cursor-pointer"
                    >
                      {FAVORITE_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {msg.favoriteNote && (
                      <span className="text-[11px] text-slate-400 italic">
                        註：{msg.favoriteNote}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                    <button
                      onClick={() => handleCopyQuote(msg)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                      title="複製金句引用"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        onJumpToMessage(msg.id);
                        onClose();
                      }}
                      className="flex items-center gap-1 text-xs text-sky-600 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition-colors"
                      title="跳轉至對話位置"
                    >
                      <span>定位對話</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveFavorite(msg.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      title="取消心心收藏"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stage Action */}
                {msg.stageAction && (
                  <div className="text-xs text-sky-800/80 bg-sky-50/70 border border-sky-100/70 rounded-xl px-3 py-1.5 mb-2 italic">
                    ✦ {msg.stageAction}
                  </div>
                )}

                {/* Content */}
                <p className="text-slate-800 text-sm sm:text-base leading-relaxed font-sans">
                  {msg.content}
                </p>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    記錄時間：{new Date(msg.timestamp).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>分支節點：{msg.branchId}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            💡 提示：加了心心的說話會轉化為 AI 的世界觀美學記憶，往後的劇情分支與台詞生成會自動加強此類張力。
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
