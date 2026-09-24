import React, { useState } from 'react';
import {
  MessageSquare,
  GitBranch,
  BarChart3,
  BookOpen,
  Library,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Users,
  Archive,
  Compass,
} from 'lucide-react';
import { StoryStorageService } from '../services/storage';
import { StorySession, StoryBranchNode } from '../types/story';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderNavProps {
  currentTab: 'chat' | 'tree' | 'dashboard' | 'diary' | 'corpus';
  onTabChange: (tab: 'chat' | 'tree' | 'dashboard' | 'diary' | 'corpus') => void;
  session: StorySession;
  branchNodes: StoryBranchNode[];
  onSessionChange: (session: StorySession) => void;
  onRefreshData: () => void;
  onOpenImportStoryText?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentTab,
  onTabChange,
  session,
  branchNodes,
  onSessionChange,
  onRefreshData,
  onOpenImportStoryText,
}) => {
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const [syncNotice, setSyncNotice] = useState('自動同步已就緒');

  const activeBranch = branchNodes.find(n => n.id === session.activeBranchId) || branchNodes[0];

  const handleExport = () => {
    const json = StoryStorageService.exportFullBackupJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lala_story_lab_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowBackupMenu(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (StoryStorageService.importFullBackupJSON(content)) {
        onRefreshData();
        setSyncNotice('備份導入成功');
        setTimeout(() => setSyncNotice('自動同步已就緒'), 3000);
      } else {
        alert('導入失敗，請確認檔案格式是否正確。');
      }
    };
    reader.readAsText(file);
    setShowBackupMenu(false);
  };

  const handleReset = () => {
    if (window.confirm('確定要重置為原著初始設定與示範對話嗎？當前自定義進度將會被覆蓋。')) {
      StoryStorageService.resetToDefaults();
      onRefreshData();
      setShowBackupMenu(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div className="flex items-center justify-between h-12 sm:h-14">
          {/* Logo & Project Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-500 text-white flex items-center justify-center shadow-sm shadow-sky-200 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-slate-800 text-sm sm:text-base tracking-tight truncate">
                  Lala Story Lab
                </span>
                <span className="hidden md:inline-flex text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium shrink-0">
                  作者分歧工坊
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[130px] sm:max-w-xs">
                分歧：<span className="text-sky-600 font-medium">{activeBranch?.branchName || '主線探索'}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop / Tablet only) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onTabChange('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'chat'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-sky-500" />
              <span>實時對話</span>
            </button>

            <button
              onClick={() => onTabChange('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'tree'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <GitBranch className="w-4 h-4 text-indigo-500" />
              <span>劇情樹</span>
            </button>

            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span>角色看板</span>
            </button>

            <button
              onClick={() => onTabChange('diary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'diary'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>階段日記</span>
            </button>

            <button
              onClick={() => onTabChange('corpus')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'corpus'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Library className="w-4 h-4 text-purple-500" />
              <span>世界觀語料</span>
            </button>
          </nav>

          {/* Database & Sync Controls & PWA Install */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Install App Button */}
            <PWAInstallButton variant="compact" />

            {/* Direct Import Original Text / ZIP Package button */}
            {onOpenImportStoryText && (
              <button
                onClick={onOpenImportStoryText}
                className="flex items-center gap-1 text-[11px] sm:text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-2 sm:px-2.5 py-1 rounded-full font-semibold transition-colors shadow-2xs"
                title="預載整包 ZIP 故事檔案或導入文字"
              >
                <Archive className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="hidden sm:inline">預載 ZIP/原著</span>
                <span className="sm:hidden">ZIP</span>
              </button>
            )}

            {/* Global 18+ Mature Mode Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                session.isMatureMode !== false
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
              title="18+ 成人劇情模式"
            >
              <span>🔞 18+</span>
              <span className="font-semibold text-rose-600">
                {session.isMatureMode !== false ? '已開' : '已關'}
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{syncNotice}</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowBackupMenu(!showBackupMenu)}
                className="p-1.5 sm:p-2 rounded-lg border border-sky-100 text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                title="資料庫備份與管理"
              >
                <Compass className="w-4 h-4" />
              </button>

              {showBackupMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-sky-200 rounded-xl shadow-lg p-2 text-xs z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-2 py-1.5 font-semibold text-slate-700 border-b border-slate-100 mb-1">
                    故事數據庫管理
                  </div>

                  <button
                    onClick={handleExport}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-sky-50 hover:text-sky-700 text-left transition-colors"
                  >
                    <Download className="w-4 h-4 text-sky-500" />
                    <span>匯出全故事備份 (JSON)</span>
                  </button>

                  <label className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-sky-50 hover:text-sky-700 text-left cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-indigo-500" />
                    <span>匯入故事備份 (JSON)</span>
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={handleReset}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-rose-600 hover:bg-rose-50 text-left transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>重置為原著初始設定</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
