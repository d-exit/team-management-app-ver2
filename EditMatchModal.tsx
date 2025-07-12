
// components/EditMatchModal.tsx
import React, { useState, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Match, MatchStatus } from '../types';
import { deepClone } from '../utils/deepClone';

export interface EditMatchModalRef {
  open: (match: Match) => void;
}

interface EditMatchModalProps {
  onSave: (updatedMatch: Match) => void;
  managedTeamId: string;
}

const modalRoot = document.getElementById('modal-root');

const EditMatchModal = forwardRef<EditMatchModalRef, EditMatchModalProps>(({ onSave, managedTeamId }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  useImperativeHandle(ref, () => ({
    open: (match: Match) => {
      setCurrentMatch(deepClone(match)); // Work on a copy
      setIsOpen(true);
    }
  }));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);


  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCurrentMatch(null);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!currentMatch) return;
    const { name, value } = e.target;
    setCurrentMatch(prev => (prev ? { ...prev, [name]: value } : null));
  }, [currentMatch]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMatch) {
      onSave(currentMatch);
    }
    handleClose();
  };

  if (!isOpen || !currentMatch || !modalRoot) {
    return null;
  }

  const isOwner = currentMatch.ourTeamId === managedTeamId;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-slate-800 p-6 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl text-sky-400 mb-4 flex-shrink-0">試合情報を編集</h3>
        <div className="overflow-y-auto pr-2 flex-grow space-y-4">
          <form onSubmit={handleFormSubmit} id="editMatchForm" className="space-y-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-300 mb-1">ステータス</label>
              <select id="status" name="status" value={currentMatch.status} onChange={handleChange} className="w-full bg-slate-700 p-2 rounded-md mt-1" disabled={!isOwner}>
                {Object.values(MatchStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-300 mb-1">試合・大会名</label>
              <input type="text" id="location" name="location" value={currentMatch.location} onChange={handleChange} className="w-full bg-slate-700 p-2 rounded-md mt-1" disabled={!isOwner} />
            </div>
             <div>
              <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-1">日付</label>
              <input type="date" id="date" name="date" value={currentMatch.date} onChange={handleChange} className="w-full bg-slate-700 p-2 rounded-md mt-1" disabled={!isOwner} />
            </div>
             <div>
              <label htmlFor="time" className="block text-sm font-medium text-slate-300 mb-1">時間</label>
              <input type="time" id="time" name="time" value={currentMatch.time} onChange={handleChange} className="w-full bg-slate-700 p-2 rounded-md mt-1" disabled={!isOwner} />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">備考</label>
              <textarea id="notes" name="notes" value={currentMatch.notes || ''} onChange={handleChange} className="w-full bg-slate-700 p-2 rounded-md mt-1" rows={3}></textarea>
            </div>
            {!isOwner && <p className="text-xs text-yellow-400">この試合の主催者ではないため、一部設定の変更はできません。</p>}
          </form>
        </div>
        <div className="flex gap-4 pt-4 mt-auto flex-shrink-0 border-t border-slate-700">
          <button type="button" onClick={handleClose} className="flex-1 bg-slate-600 py-2 rounded-lg">キャンセル</button>
          <button type="submit" form="editMatchForm" className="flex-1 bg-sky-500 py-2 rounded-lg">保存</button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, modalRoot);
});

export default React.memo(EditMatchModal);