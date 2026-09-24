import React, { useState, useEffect } from 'react';
import { HeaderNav } from './components/HeaderNav';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ChatWorkspace } from './components/ChatWorkspace';
import { PlotBranchTree } from './components/PlotBranchTree';
import { CharacterDashboard } from './components/CharacterDashboard';
import { DiaryArchive } from './components/DiaryArchive';
import { CorpusManager } from './components/CorpusManager';
import { ImportStoryTextModal } from './components/ImportStoryTextModal';
import { StoryStorageService } from './services/storage';
import { Character, StoryBranchNode, StorySession, StoryMessage } from './types/story';
import { usePWAInstall } from './hooks/usePWAInstall';

export default function App() {
  // Activate direct install listener
  usePWAInstall();

  const [currentTab, setCurrentTab] = useState<'chat' | 'tree' | 'dashboard' | 'diary' | 'corpus'>('chat');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [branchNodes, setBranchNodes] = useState<StoryBranchNode[]>([]);
  const [session, setSession] = useState<StorySession>(StoryStorageService.getSession());
  const [prefillDiaryMessages, setPrefillDiaryMessages] = useState<StoryMessage[] | undefined>(undefined);
  const [showGlobalImportModal, setShowGlobalImportModal] = useState(false);

  // Load state from local storage on mount
  const refreshAllData = () => {
    const chars = StoryStorageService.getCharacters();
    const nodes = StoryStorageService.getBranchNodes();
    const sess = StoryStorageService.getSession();
    setCharacters(chars);
    setBranchNodes(nodes);
    setSession(sess);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleOpenDiaryWithMessages = (msgs?: StoryMessage[]) => {
    setPrefillDiaryMessages(msgs);
    setCurrentTab('diary');
  };

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#f7fbff] flex flex-col font-sans selection:bg-sky-100 selection:text-sky-900 pb-16 md:pb-0">
      {/* Global Header */}
      <HeaderNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        session={session}
        branchNodes={branchNodes}
        characters={characters}
        onSessionChange={setSession}
        onRefreshData={refreshAllData}
        onOpenImportStoryText={() => setShowGlobalImportModal(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {currentTab === 'chat' && (
          <ChatWorkspace
            characters={characters}
            session={session}
            branchNodes={branchNodes}
            onSessionChange={setSession}
            onRefreshData={refreshAllData}
            onOpenDashboard={() => setCurrentTab('dashboard')}
            onOpenDiary={handleOpenDiaryWithMessages}
            onOpenTree={() => setCurrentTab('tree')}
            onOpenImportStoryText={() => setShowGlobalImportModal(true)}
          />
        )}

        {currentTab === 'tree' && (
          <PlotBranchTree
            branchNodes={branchNodes}
            characters={characters}
            session={session}
            onSessionChange={setSession}
            onRefreshData={refreshAllData}
            onNavigateToChat={() => setCurrentTab('chat')}
          />
        )}

        {currentTab === 'dashboard' && (
          <CharacterDashboard
            characters={characters}
            session={session}
            onSessionChange={setSession}
            onRefreshData={refreshAllData}
            onNavigateToChat={() => setCurrentTab('chat')}
            onOpenImportStoryText={() => setShowGlobalImportModal(true)}
          />
        )}

        {currentTab === 'diary' && (
          <DiaryArchive
            characters={characters}
            session={session}
            onRefreshData={refreshAllData}
            prefillMessages={prefillDiaryMessages}
          />
        )}

        {currentTab === 'corpus' && (
          <CorpusManager
            onRefreshData={refreshAllData}
          />
        )}
      </main>

      {/* Mobile Android / iOS Bottom Navigation Bar */}
      <MobileBottomNav currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Global Import Original Text Modal */}
      <ImportStoryTextModal
        isOpen={showGlobalImportModal}
        onClose={() => setShowGlobalImportModal(false)}
        session={session}
        characters={characters}
        onSessionChange={setSession}
        onRefreshData={refreshAllData}
      />
    </div>
  );
}
