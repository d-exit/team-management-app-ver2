// components/ChatScreen.tsx
// This component displays the UI for an individual, active chat conversation.
import React, { useState, useEffect, useRef } from 'react';
import { ChatThread, ChatMessage, Team } from '../types';

interface ChatScreenProps {
  thread: ChatThread;
  messages: ChatMessage[];
  currentUserId: string;
  currentUserTeamName: string; // Used if currentUserId is not a team
  teams: Team[]; // For looking up participant details like logo
  onSendMessage: (threadId: string, message: ChatMessage) => void;
  onBackToList: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({
  thread,
  messages,
  currentUserId,
  currentUserTeamName,
  teams,
  onSendMessage,
  onBackToList,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null); // For auto-scrolling

  // Auto-scroll to the bottom when new messages arrive or thread changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thread]);

  const handleSendMessageInternal = () => {
    if (!messageInput.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      threadId: thread.id,
      senderId: currentUserId,
      senderName: teams.find(t => t.id === currentUserId)?.name || currentUserTeamName, // Get name from teams list or fallback
      text: messageInput,
      timestamp: new Date(),
    };
    onSendMessage(thread.id, newMessage);
    setMessageInput('');
  };

  const getParticipantDisplayInfo = () => {
    if (thread.isGroupChat) {
      return {
        name: thread.groupName || 'グループチャット',
        // For group chats, could show multiple small icons or a generic group icon
        icon: (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-600 flex items-center justify-center text-sky-300 text-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
            </div>
        )
      };
    }
    const otherParticipant = thread.participants.find(p => p.id !== currentUserId);
    if (otherParticipant) {
      const teamInfo = teams.find(t => t.id === otherParticipant.id);
      return {
        name: otherParticipant.name,
        icon: <img src={teamInfo?.logoUrl || otherParticipant.logoUrl || 'https://picsum.photos/seed/default/40/40'} alt={otherParticipant.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" />
      };
    }
    return { name: '不明なチャット', icon: <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-500"></div> };
  };

  const getSenderLogo = (senderId: string): string => {
    const sender = thread.participants.find(p => p.id === senderId);
    return sender?.logoUrl || 'https://picsum.photos/seed/default/40/40';
  }

  const displayInfo = getParticipantDisplayInfo();

  return (
    // Main container for the individual chat screen
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px] bg-slate-850 rounded-xl shadow-2xl overflow-hidden">
      {/* Header: Back button, participant name/icon */}
      <div className="p-3 sm:p-4 border-b border-slate-700 bg-slate-800 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onBackToList}
          className="text-sky-400 hover:text-sky-300 text-sm flex items-center py-1 px-2 rounded hover:bg-slate-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          チャット一覧へ戻る
        </button>
        <div className="flex items-center gap-2">
            <h3 className="text-md sm:text-lg font-semibold text-sky-300 truncate">{displayInfo.name}</h3>
            {displayInfo.icon}
        </div>
        {/* Placeholder for actions like "call", "info" etc. */}
        <div className="w-20"></div> 
      </div>

      {/* Message display area (scrollable) */}
      <div className="flex-grow p-3 sm:p-4 space-y-3 overflow-y-auto">
        {messages.map(msg => (
          // Each message bubble
          <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}>
            {msg.senderId !== currentUserId && msg.senderId !== 'system' && (
              <img src={getSenderLogo(msg.senderId)} alt={msg.senderName} className="w-7 h-7 rounded-full object-cover self-start flex-shrink-0" />
            )}
            <div className={`max-w-[70%] lg:max-w-[60%] flex flex-col ${msg.senderId === currentUserId ? 'items-end' : 'items-start'}`}>
              {/* Sender name for other users' messages in group chats, or if senderId is not current user (e.g. system message) */}
              {thread.isGroupChat && msg.senderId !== currentUserId && msg.senderId !== 'system' && (
                  <p className="text-xs text-slate-400 mb-0.5 ml-1">{msg.senderName}</p>
              )}
               {/* Styling for system messages */}
              {msg.senderId === 'system' ? (
                <p className="text-xs text-slate-500 italic text-center my-2 px-2 py-1 bg-slate-700/50 rounded-full self-center mx-auto max-w-xs truncate">{msg.text}</p>
              ) : (
                // <!-- Regular chat bubble (example: self) -->
                <div className={`p-2.5 sm:p-3 rounded-xl shadow-md ${msg.senderId === currentUserId ? 'bg-sky-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-100 rounded-bl-none'}`}>
                  {/* Message text content */}
                  <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
              )}
              <p className={`text-xs mt-1 ${msg.senderId === currentUserId ? 'text-slate-400/80 mr-1' : 'text-slate-500 ml-1'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
             {msg.senderId === currentUserId && msg.senderId !== 'system' && (
              <img src={getSenderLogo(msg.senderId)} alt={msg.senderName} className="w-7 h-7 rounded-full object-cover self-start flex-shrink-0" />
            )}
          </div>
        ))}
        {/* Empty div to ensure scrolling to the bottom works */}
        <div ref={messagesEndRef} />
        {/* Message if no messages exist in the thread yet (excluding system messages) */}
        {messages.filter(m => m.senderId !== 'system').length === 0 && (
            <p className="text-center text-slate-400 py-5">メッセージはまだありません。最初のメッセージを送信しましょう！</p>
        )}
      </div>

      {/* Input field and send button */}
      <div className="p-3 sm:p-4 border-t border-slate-700 flex gap-2 sm:gap-3 bg-slate-800 sticky bottom-0 z-10">
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessageInternal();
            }
          }}
          placeholder="メッセージを入力 (Shift+Enterで改行)"
          className="flex-grow bg-slate-700 border border-slate-600 text-white rounded-md p-2.5 text-sm sm:text-base focus:ring-sky-500 focus:border-sky-500 resize-none"
          rows={1} // Start with one row, can expand with content or be fixed with CSS
          style={{ maxHeight: '120px' }} // Limit max height
        />
        <button
          onClick={handleSendMessageInternal}
          className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base self-end" // Align button with textarea
        >
          送信
        </button>
      </div>
    </div>
  );
};

export default ChatScreen;