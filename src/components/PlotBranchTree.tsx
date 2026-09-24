import React, { useState } from 'react';
import {
  GitBranch,
  GitFork,
  ArrowRight,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Trash2,
  Edit2,
  Plus,
  Play,
  Heart,
  Shield,
  Layers,
} from 'lucide-react';
import { StoryBranchNode, StorySession, Character } from '../types/story';
import { StoryStorageService } from '../services/storage';

interface PlotBranchTreeProps {
  branchNodes: StoryBranchNode[];
  characters: Character[];
  session: StorySession;
  onSessionChange: (session: StorySession) => void;
  onRefreshData: () => void;
  onNavigateToChat: () => void;
}

export const PlotBranchTree: React.FC<PlotBranchTreeProps> = ({
  branchNodes,
  characters,
  session,
  onSessionChange,
  onRefreshData,
  onNavigateToChat,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(session.activeBranchId);
  const [showForkModal, setShowForkModal] = useState(false);
  const [forkBranchName, setForkBranchName] = useState('');
  const [forkTitle, setForkTitle] = useState('');
  const [forkSummary, setForkSummary] = useState('');
  const [forkChoiceTag, setForkChoiceTag] = useState('');

  const selectedNode = branchNodes.find(n => n.id === selectedNodeId) || branchNodes[0];

  // Jump to branch and activate in chat
  const handleJumpToBranch = (nodeId: string) => {
    const targetNode = branchNodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    const updatedSession: StorySession = {
      ...session,
      activeBranchId: targetNode.id,
      sceneLocation: targetNode.sceneLocation || session.sceneLocation,
    };
    onSessionChange(updatedSession);
    StoryStorageService.saveSession(updatedSession);
    onNavigateToChat();
  };

  // Fork a new branch from selected node
  const handleCreateFork = () => {
    if (!forkTitle.trim() && !forkBranchName.trim()) return;

    const newNode = StoryStorageService.createBranchNode(
      selectedNode.id,
      forkBranchName.trim() || `分歧測試：${forkTitle.trim()}`,
      forkTitle.trim() || '平行抉擇節點',
      forkSummary.trim() || `從「${selectedNode.title}」分歧出的平行劇情路線。`,
      `分歧決策：${forkChoiceTag || '自定義'}`
    );

    onRefreshData();
    setShowForkModal(false);
    setForkBranchName('');
    setForkTitle('');
    setForkSummary('');
    setForkChoiceTag('');

    // Automatically jump to new branch
    handleJumpToBranch(newNode.id);
  };

  // Delete node (cannot delete root)
  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === 'node_root') {
      alert('根節點為故事起源，無法刪除。');
      return;
    }
    if (window.confirm('確定要刪除此分歧節點及其記錄嗎？')) {
      const filtered = branchNodes.filter(n => n.id !== nodeId && n.parentId !== nodeId);
      StoryStorageService.saveBranchNodes(filtered);
      if (session.activeBranchId === nodeId) {
        const root = filtered[0] || branchNodes[0];
        handleJumpToBranch(root.id);
      }
      onRefreshData();
      setSelectedNodeId('node_root');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white border border-sky-100 p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-500" />
            多維度劇情樹狀圖管理 (Multi-Branch Plot Manager)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            視覺化追蹤與回溯各個分歧路線進度，支援隨時建立平行抉擇測試、時間回溯與路線比對。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForkModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <GitFork className="w-4 h-4" />
            <span>建立新平行分歧</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Branch Tree Flow (Left / Center Column) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-sky-200/90 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
              <span>劇情分歧拓撲圖 (點擊檢視或跳轉)：</span>
              <span className="text-[11px] text-slate-400">共 {branchNodes.length} 個劇情節點</span>
            </div>

            {/* Tree Nodes List with connecting indicators */}
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-sky-200">
              {branchNodes.map((node) => {
                const isActive = session.activeBranchId === node.id;
                const isSelected = selectedNode.id === node.id;

                return (
                  <div key={node.id} className="relative group">
                    {/* Node Dot Icon */}
                    <div
                      className={`absolute -left-6 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-sky-500 border-white text-white shadow-xs'
                          : isSelected
                          ? 'bg-indigo-500 border-white text-white'
                          : 'bg-white border-sky-300 text-sky-400 group-hover:border-sky-500'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    </div>

                    {/* Node Card */}
                    <div
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isActive
                          ? 'bg-sky-50/70 border-sky-300 shadow-xs ring-1 ring-sky-200'
                          : isSelected
                          ? 'bg-white border-indigo-300 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:border-sky-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{node.title}</span>
                          {isActive && (
                            <span className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded-full font-medium">
                              當前活躍中
                            </span>
                          )}
                        </div>

                        {node.choiceTag && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            {node.choiceTag}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed">
                        {node.summary}
                      </p>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 gap-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-sky-400" />
                          {node.sceneLocation}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(node.timestamp).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Node Details & Action Panel (Right Column) */}
        <div className="lg:col-span-5 bg-white border border-sky-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                  {selectedNode.branchName}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1.5">{selectedNode.title}</h3>
              </div>

              {selectedNode.id !== 'node_root' && (
                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="刪除此分歧節點"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Summary */}
            <div className="mb-4">
              <span className="text-xs font-semibold text-slate-700 block mb-1">劇情背景概述：</span>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
                {selectedNode.summary}
              </p>
            </div>

            {/* Decisions made at this node */}
            {selectedNode.choiceMade && (
              <div className="mb-4 text-xs">
                <span className="font-semibold text-slate-700 block mb-1">觸發分歧之關鍵決策：</span>
                <div className="bg-amber-50/70 border border-amber-200/70 text-amber-900 p-2.5 rounded-xl font-medium">
                  {selectedNode.choiceMade}
                </div>
              </div>
            )}

            {/* Character Snapshot Metrics */}
            <div className="mb-4">
              <span className="text-xs font-semibold text-slate-700 block mb-2">節點角色心境快照：</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {Object.entries(selectedNode.characterSnapshots || {}).map(([charId, stats]) => {
                  const char = characters.find(c => c.id === charId);
                  return (
                    <div key={charId} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{char?.name || charId}</span>
                        <span className="text-[10px] text-sky-700 bg-sky-100/60 px-1.5 py-0.5 rounded font-medium">
                          {stats.intimacyStage}
                        </span>
                      </div>
                      <div className="flex gap-3 text-[11px] text-slate-500 mb-1">
                        <span>好感: {stats.affection}%</span>
                        <span>信任: {stats.trust}%</span>
                        <span>心防: {stats.tension}%</span>
                      </div>
                      <p className="text-[11px] text-slate-600 italic">
                        {stats.currentMindset}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => handleJumpToBranch(selectedNode.id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>跳轉回溯並在此分歧開始對話</span>
            </button>

            <button
              onClick={() => {
                setForkTitle(`衍生自：${selectedNode.title}`);
                setShowForkModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-all"
            >
              <GitFork className="w-4 h-4" />
              <span>以此節點為基底建立平行測試</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fork Branch Modal */}
      {showForkModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-sky-200 rounded-2xl max-w-lg w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <GitFork className="w-4 h-4 text-indigo-500" />
              建立新平行劇情分歧測試
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              將從「{selectedNode.title}」複製當前角色心理狀態，開啟全新走向。
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">分歧代號 / 線路名：</label>
                <input
                  type="text"
                  value={forkBranchName}
                  onChange={e => setForkBranchName(e.target.value)}
                  placeholder="例如：支線B：與Adam私下商討 / 支線C：尋找書本新線索"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">節點標題：</label>
                <input
                  type="text"
                  value={forkTitle}
                  onChange={e => setForkTitle(e.target.value)}
                  placeholder="例如：深夜樓道內的短暫妥協..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">觸發決策標籤：</label>
                <input
                  type="text"
                  value={forkChoiceTag}
                  onChange={e => setForkChoiceTag(e.target.value)}
                  placeholder="例如：啦啦選擇將名冊交給Adam..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">分歧前提概述：</label>
                <textarea
                  value={forkSummary}
                  onChange={e => setForkSummary(e.target.value)}
                  rows={2}
                  placeholder="簡要描述此分歧的故事起點與衝突設定..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowForkModal(false)}
                className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs"
              >
                取消
              </button>
              <button
                onClick={handleCreateFork}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
              >
                確認建立並進入對話
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
