import React, { useState } from 'react';
import { MapPin, X, Plus, Edit2, Check, Trash2, Sparkles } from 'lucide-react';
import { StoryStorageService } from '../services/storage';

interface PresetScenesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScene: string;
  onSelectScene: (sceneName: string) => void;
}

export const PresetScenesModal: React.FC<PresetScenesModalProps> = ({
  isOpen,
  onClose,
  currentScene,
  onSelectScene,
}) => {
  const [scenes, setScenes] = useState(() => StoryStorageService.getPresetScenes());
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (scene: { id: string; name: string; description: string }) => {
    setEditingSceneId(scene.id);
    setEditName(scene.name);
    setEditDesc(scene.description);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    StoryStorageService.updatePresetScene(id, editName.trim(), editDesc.trim());
    setScenes(StoryStorageService.getPresetScenes());
    setEditingSceneId(null);
  };

  const handleCreateScene = () => {
    if (!newName.trim()) return;
    const added = StoryStorageService.addPresetScene({
      name: newName.trim(),
      description: newDesc.trim() || '自定義劇情空間',
    });
    setScenes(StoryStorageService.getPresetScenes());
    setNewName('');
    setNewDesc('');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('確定要移除此預設場景嗎？')) {
      StoryStorageService.deletePresetScene(id);
      setScenes(StoryStorageService.getPresetScenes());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-sky-100 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-sky-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">空間場景預設庫（皆可自行編輯）</h3>
              <p className="text-[11px] text-sky-100">點擊即刻置入場景，亦可點擊筆刷自定義修改細節</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-600 font-medium">預設經典對峙與探索場景：</span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg hover:bg-sky-100 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增場景</span>
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2">
              <span className="font-semibold text-slate-800">建立新預設場景：</span>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="場景名稱（例：清晨海邊懸崖木屋）"
                className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
              />
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="細節與環境氛圍描寫（例：海浪拍打岩石、潮濕微鹹海風、窗欞結霜）..."
                rows={2}
                className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden resize-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddForm(false)} className="px-2.5 py-1 text-slate-500">
                  取消
                </button>
                <button
                  onClick={handleCreateScene}
                  disabled={!newName.trim()}
                  className="px-3 py-1 bg-sky-600 text-white rounded-lg font-semibold disabled:opacity-40"
                >
                  確認建立
                </button>
              </div>
            </div>
          )}

          {/* Scene list */}
          <div className="space-y-2">
            {scenes.map(s => {
              const isCurrent = currentScene.includes(s.name) || s.name.includes(currentScene);
              const isEditing = editingSceneId === s.id;

              if (isEditing) {
                return (
                  <div key={s.id} className="p-3 bg-amber-50/60 border border-amber-300 rounded-xl space-y-2">
                    <span className="font-semibold text-slate-800">編輯場景：</span>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs"
                    />
                    <textarea
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingSceneId(null)} className="px-2 py-1 text-slate-500">
                        取消
                      </button>
                      <button
                        onClick={() => handleSaveEdit(s.id)}
                        className="px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold"
                      >
                        儲存修改
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={s.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                    isCurrent
                      ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-300'
                      : 'bg-white border-slate-200 hover:border-sky-200'
                  }`}
                >
                  <div
                    onClick={() => {
                      onSelectScene(s.name);
                      onClose();
                    }}
                    className="flex-1 cursor-pointer min-w-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">{s.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-sky-100 text-sky-700 rounded-full font-semibold">
                          當前場景
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">{s.description}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      title="編輯此場景"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!s.isDefault && (
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="刪除"
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

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
