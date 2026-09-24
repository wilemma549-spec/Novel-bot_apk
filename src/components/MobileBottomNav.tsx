import React from 'react';
import { MessageSquare, GitBranch, BarChart3, BookOpen, Library } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: 'chat' | 'tree' | 'dashboard' | 'diary' | 'corpus';
  onTabChange: (tab: 'chat' | 'tree' | 'dashboard' | 'diary' | 'corpus') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    {
      id: 'chat' as const,
      label: '對話',
      icon: MessageSquare,
      color: 'text-sky-600',
      activeBg: 'bg-sky-50 text-sky-700 font-bold',
    },
    {
      id: 'tree' as const,
      label: '劇情樹',
      icon: GitBranch,
      color: 'text-indigo-600',
      activeBg: 'bg-indigo-50 text-indigo-700 font-bold',
    },
    {
      id: 'dashboard' as const,
      label: '角色',
      icon: BarChart3,
      color: 'text-emerald-600',
      activeBg: 'bg-emerald-50 text-emerald-700 font-bold',
    },
    {
      id: 'diary' as const,
      label: '日記',
      icon: BookOpen,
      color: 'text-amber-600',
      activeBg: 'bg-amber-50 text-amber-700 font-bold',
    },
    {
      id: 'corpus' as const,
      label: '語料',
      icon: Library,
      color: 'text-purple-600',
      activeBg: 'bg-purple-50 text-purple-700 font-bold',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-sky-100 shadow-lg px-2 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="grid grid-cols-5 gap-1 items-center justify-around max-w-md mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 ${
                isActive
                  ? `${tab.activeBg} scale-[1.03]`
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? tab.color : 'text-slate-400'}`} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
