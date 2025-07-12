// components/ChatPage.tsx (Now primarily the Chat List Screen)
import React, { useState, useMemo } from 'react';
import { ChatThread, ChatMessage, FollowedTeam, Team } from '../types';

interface ChatPageProps {
  threads: ChatThread[];
  currentUserId: string;
  currentUserTeamName: string;
  followedTeams: FollowedTeam[]; // For creating new chats
  onAddChatThread: (newThread: ChatThread, initialMessage?: ChatMessage) => void;
  onViewChatScreen: (threadId: string) => void; // To navigate to the ChatScreen
  teams: Team[]; // All teams for logo lookup
}

const availablePrefectures = (teams: Team[]): string[] => {
    const prefectures = new Set(teams.map(t => t.prefecture).filter(Boolean) as string[]);
    return Array.from(prefectures).sort();
};

const ChatPage: React.FC<ChatPageProps> = ({ 
    threads, currentUserId, currentUserTeamName, followedTeams, onAddChatThread, onViewChatScreen, teams 
}) => {
  const [showCreateChatModal, setShowCreateChatModal] = useState(false);
  
  // State for new chat creation modal
  const [selectedParticipants, setSelectedParticipants] = useState<FollowedTeam[]>([]);
  const [groupChatName, setGroupChatName] = useState('');
  const [participantSearchTerm, setParticipantSearchTerm] = useState('');
  const [participantFilterPrefecture, setParticipantFilterPrefecture] = useState('');
  const [participantFilterCity, setParticipantFilterCity] = useState('');

  const getParticipantNames = (thread: ChatThread) => {
    if (thread.isGroupChat) return thread.groupName || 'グループチャット';
    const otherParticipant = thread.participants.find(p => p.id !== currentUserId);
    return otherParticipant?.name || '不明な相手';
  };

  const getThreadIcon = (thread: ChatThread): string => {
    if (thread.isGroupChat) {
      return "group_icon_placeholder"; 
    }
    const otherParticipant = thread.participants.find(p => p.id !== currentUserId);
    if (otherParticipant) {
      // Use the logoUrl from the participant object in the thread if available,
      // otherwise, try to find it in the main teams list.
      const participantLogo = otherParticipant.logoUrl;
      if (participantLogo) return participantLogo;

      const teamData = teams.find(t => t.id === otherParticipant.id);
      return teamData?.logoUrl || 'https://picsum.photos/seed/default/40/40';
    }
    return 'https://picsum.photos/seed/unknown/40/40';
  };

  // --- New Chat Modal Logic ---
  const toggleParticipantSelection = (team: FollowedTeam) => {
    setSelectedParticipants(prev => 
      prev.find(p => p.id === team.id) 
        ? prev.filter(p => p.id !== team.id)
        : [...prev, team]
    );
  };

  const filteredParticipantsForSelection = useMemo(() => {
    return followedTeams.filter(team => {
        const nameMatch = participantSearchTerm ? team.name.toLowerCase().includes(participantSearchTerm.toLowerCase()) : true;
        const prefectureMatch = participantFilterPrefecture ? team.prefecture === participantFilterPrefecture : true;
        const cityMatch = participantFilterCity ? (team.city || '').toLowerCase().includes(participantFilterCity.toLowerCase()) : true;
        return nameMatch && prefectureMatch && cityMatch;
    });
  }, [followedTeams, participantSearchTerm, participantFilterPrefecture, participantFilterCity]);

  const handleCreateNewChat = () => {
    if (selectedParticipants.length === 0) {
      alert('チャット相手を1チーム以上選択してください。');
      return;
    }

    const isGroup = selectedParticipants.length > 1;
    if (isGroup && !groupChatName.trim()) {
      alert('グループチャット名を入力してください。');
      return;
    }

    const newThreadId = `thread-${Date.now()}`;
    const participantsForThread = [
        { id: currentUserId, name: currentUserTeamName, logoUrl: teams.find(t => t.id === currentUserId)?.logoUrl }, // Add current user's logo
        ...selectedParticipants.map(p => ({ id: p.id, name: p.name, logoUrl: p.logoUrl })) // Use FollowedTeam's logoUrl
    ];
    
    // Create an initial message for the new thread
    const initialMessageText = isGroup 
        ? `${currentUserTeamName}さんがグループ「${groupChatName.trim()}」を作成しました。`
        : `${currentUserTeamName}さんが${selectedParticipants[0].name}さんとのチャットを開始しました。`;

    const firstMessage: ChatMessage = {
        id: `msg-${Date.now()}-system`,
        threadId: newThreadId,
        senderId: 'system', // Or currentUserId if user initiates with a real message
        senderName: 'システム', // Or currentUserTeamName
        text: initialMessageText,
        timestamp: new Date(),
    };

    const newThread: ChatThread = {
      id: newThreadId,
      participants: participantsForThread,
      isGroupChat: isGroup,
      groupName: isGroup ? groupChatName.trim() : undefined,
      lastMessage: firstMessage, 
      unreadCount: 0,
    };
    
    onAddChatThread(newThread, firstMessage);

    setShowCreateChatModal(false);
    setSelectedParticipants([]);
    setGroupChatName('');
    setParticipantSearchTerm('');
    setParticipantFilterPrefecture('');
    setParticipantFilterCity('');
    // Navigation to new chat screen is handled by App.tsx via onAddChatThread
  };


  return (
    // Main container for the chat list page
    <div className="h-[calc(100vh-200px)] max-h-[700px] bg-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header for chat list */}
      <div className="p-3 sm:p-4 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-lg sm:text-xl font-semibold text-sky-300">チャット一覧</h2>
        {/* "新規チャット作成" button */}
        <button 
          onClick={() => setShowCreateChatModal(true)} 
          className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 sm:py-2 sm:px-4 rounded-md text-xs sm:text-sm font-semibold"
        >
          新規チャット作成
        </button>
      </div>

      {/* Scrollable list of chat threads */}
      <div className="flex-grow overflow-y-auto">
        {threads.length > 0 ? threads.map(thread => (
          // Each chat item in the list
          <div
            key={thread.id}
            // Clicking a chat item navigates to the ChatScreen
            onClick={() => onViewChatScreen(thread.id)} 
            className="p-3 sm:p-4 cursor-pointer hover:bg-slate-700/50 flex items-center gap-3 border-b border-slate-700/50 last:border-b-0"
          >
            {/* Team Icon */}
            {getThreadIcon(thread) === "group_icon_placeholder" ? (
                 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-600 flex items-center justify-center text-sky-300 text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                 </div>
            ) : (
                <img src={getThreadIcon(thread)} alt="icon" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover" />
            )}
            {/* Chat details: name, last message, unread count */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sky-400 truncate text-sm sm:text-base">{getParticipantNames(thread)}</h3>
                {thread.unreadCount && thread.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{thread.unreadCount}</span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 truncate">{thread.lastMessage?.text || 'メッセージはありません'}</p>
              {thread.lastMessage && (
                <p className="text-xs text-slate-500 text-right">{new Date(thread.lastMessage.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
              )}
            </div>
          </div>
        )) : (
          // Message if no chats exist
          <p className="p-4 text-slate-400 text-center">チャットがありません。「新規チャット作成」から始めましょう。</p>
        )}
      </div>

      {/* Create New Chat Modal - remains the same as previously defined */}
      {showCreateChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 p-5 sm:p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <h3 className="text-xl sm:text-2xl font-semibold text-sky-300 mb-4">新規チャット作成</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
              <input type="text" placeholder="チーム名検索..." value={participantSearchTerm} onChange={e => setParticipantSearchTerm(e.target.value)} className="col-span-1 sm:col-span-3 bg-slate-800 border-slate-700 text-sm p-2 rounded-md" />
              <select value={participantFilterPrefecture} onChange={e => setParticipantFilterPrefecture(e.target.value)} className="bg-slate-800 border-slate-700 text-sm p-2 rounded-md">
                <option value="">都道府県 (全て)</option>
                {availablePrefectures(followedTeams).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="text" placeholder="市区町村..." value={participantFilterCity} onChange={e => setParticipantFilterCity(e.target.value)} className="bg-slate-800 border-slate-700 text-sm p-2 rounded-md" />
            </div>

            <div className="space-y-1.5 overflow-y-auto mb-3 flex-grow min-h-[150px] max-h-[300px] border border-slate-700 rounded-md p-2 bg-slate-850">
              {filteredParticipantsForSelection.length > 0 ? filteredParticipantsForSelection.map(team => (
                <label key={team.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-700 rounded cursor-pointer">
                  <input type="checkbox" checked={selectedParticipants.some(p => p.id === team.id)} onChange={() => toggleParticipantSelection(team)} className="form-checkbox h-4 w-4 bg-slate-600 border-slate-500 text-sky-500 focus:ring-sky-400"/>
                  <img src={team.logoUrl} alt={team.name} className="w-6 h-6 rounded-full object-cover" />
                  <span className="text-sm text-slate-200">{team.name} <span className="text-xs text-slate-400">({team.prefecture})</span></span>
                </label>
              )) : <p className="text-slate-400 text-sm text-center py-4">該当するフォロー中のチームがありません。</p>}
            </div>

            {selectedParticipants.length > 1 && (
              <div className="mb-3">
                <label htmlFor="groupChatName" className="block text-sm font-medium text-slate-300 mb-1">グループチャット名</label>
                <input type="text" id="groupChatName" value={groupChatName} onChange={e => setGroupChatName(e.target.value)} placeholder="（例）週末練習グループ" className="w-full bg-slate-800 border-slate-700 text-sm p-2 rounded-md"/>
              </div>
            )}
            <p className="text-xs text-slate-500 mb-3">選択済み: {selectedParticipants.length}チーム</p>

            <div className="flex gap-3 sm:gap-4 mt-auto pt-3 border-t border-slate-700">
              <button type="button" onClick={() => setShowCreateChatModal(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition text-sm">キャンセル</button>
              <button type="button" onClick={handleCreateNewChat} className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg transition text-sm">
                {selectedParticipants.length > 1 ? 'グループチャット作成' : 'チャット開始'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;