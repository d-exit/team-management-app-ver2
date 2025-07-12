// App.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Team, View, Match, Venue, ScheduleEvent, FollowedTeam, ChatThread, TeamLevel, ChatMessage, MatchType, MatchStatus, TournamentInfoFormData } from './types';
import { mockTeams, mockMatches, mockVenues, mockScheduleEvents, mockPastMatchResults, mockChatThreads, mockChatMessages } from './data/mockData';
import TeamProfilePage from './components/TeamProfilePage';
import MatchesPage from './components/MatchesPage';
import VenueBookingPage from './components/VenueBookingPage';
import SchedulePage from './components/SchedulePage';
import TeamManagementPage from './components/TeamManagementPage';
import FollowedTeamsPage from './components/FollowedTeamsPage';
import ChatPage from './components/ChatPage';
import ChatScreen from './components/ChatScreen';
import MatchmakingPage from './components/MatchmakingPage';
import TournamentGuidelinesPage from './components/TournamentGuidelinesPage';
import TeamSelectionPage from './components/TeamSelectionPage'; // Import the new component

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.TEAM_MANAGEMENT);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>(mockTeams); // All teams in the "world"
  
  // New state for multi-team management
  const [managedTeams, setManagedTeams] = useState<Team[]>(() => mockTeams.filter(t => t.id === 'team-1'));
  const [selectedManagedTeamId, setSelectedManagedTeamId] = useState<string | null>(null);
  const selectedManagedTeam = useMemo(() => managedTeams.find(t => t.id === selectedManagedTeamId), [managedTeams, selectedManagedTeamId]);

  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [venues] = useState<Venue[]>(mockVenues);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(mockScheduleEvents);
  
  const [followedTeams, setFollowedTeams] = useState<FollowedTeam[]>(() => 
    mockTeams.filter(t => t.id !== 'team-1').slice(0, 3).map(t => ({...t, isFavorite: Math.random() > 0.5, logoUrl: t.logoUrl}))
  );
  
  const [chatThreads, setChatThreads] = useState<ChatThread[]>(mockChatThreads);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>(mockChatMessages);
  const [selectedChatThreadId, setSelectedChatThreadId] = useState<string | null>(null);
  const [selectedMatchIdForGuideline, setSelectedMatchIdForGuideline] = useState<string | null>(null);


  const currentUserId = selectedManagedTeam?.id || 'user-self';

  const handleUpdateMatches = useCallback((updater: React.SetStateAction<Match[]>) => {
    setMatches(updater);
  }, []);
  
  const handleUpdateTeams = useCallback((updater: React.SetStateAction<Team[]>) => {
     setTeams(prevGlobalTeams => {
        const updatedGlobalTeams = typeof updater === 'function' ? updater(prevGlobalTeams) : updater;

        // Also update the managed teams list if any of them have changed
        setManagedTeams(currentManagedTeams => 
            currentManagedTeams.map(mt => updatedGlobalTeams.find(ut => ut.id === mt.id) || mt)
        );

        return updatedGlobalTeams;
    });
  }, []);

  const handleUpdateGuidelineForMatch = useCallback((matchId: string, guidelineData: TournamentInfoFormData) => {
    setMatches(prev => 
      prev.map(m => 
        m.id === matchId 
          ? { 
              ...m, 
              detailedTournamentInfo: guidelineData,
              location: guidelineData.eventName, // Sync basic info
              date: guidelineData.eventDateTime.eventDate,
              time: guidelineData.eventDateTime.startTime
            } 
          : m
      )
    );
    alert('大会要項が更新されました。');
  }, []);
  
  const handleSaveNewGuidelineAsMatch = useCallback((newMatch: Match) => {
    setMatches(prev => [newMatch, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    alert('大会要項が新しい試合として保存されました。');
  }, []);


  const handleSelectTeam = useCallback((team: Team) => {
    setSelectedTeam(team);
    setCurrentView(View.TEAM_PROFILE);
  }, []);
  
  // --- New Handlers for Multi-Team Management ---
  const handleSelectManagedTeam = (teamId: string) => {
    setSelectedManagedTeamId(teamId);
    setCurrentView(View.TEAM_MANAGEMENT); // Default to management view after selection
  };

  const handleCreateTeam = (teamName: string, coachName: string) => {
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: teamName,
      coachName: coachName,
      logoUrl: `https://picsum.photos/seed/${Date.now()}/200/200`,
      level: TeamLevel.BEGINNER,
      rating: 1200,
      rank: 0,
      members: [],
      description: '新しいチームです。よろしくお願いします！',
      prefecture: '',
      city: '',
      ageCategory: '一般',
    };
    setManagedTeams(prev => [...prev, newTeam]);
    setTeams(prev => [...prev, newTeam]); // Add to the global list of all teams
  };

  const handleDeleteTeam = (teamId: string) => {
    if (window.confirm("このチームを本当に削除しますか？関連データは元に戻せません。")) {
      setManagedTeams(prev => prev.filter(t => t.id !== teamId));
      // Optional: Also remove from the global `teams` list if it shouldn't exist anywhere anymore
      // setTeams(prev => prev.filter(t => t.id !== teamId));
    }
  };
  
  const handleBackToTeamSelection = () => {
    setSelectedManagedTeamId(null);
  };
  
  const handleEditGuidelineForMatch = (matchId: string) => {
    setSelectedMatchIdForGuideline(matchId);
    navigateTo(View.TOURNAMENT_GUIDELINES);
  };

  // --- End of New Handlers ---

  const navigateTo = (view: View) => {
    if (view !== View.TEAM_PROFILE && view !== View.CHAT_SCREEN) {
        setSelectedTeam(null);
    }
    if (view !== View.CHAT_SCREEN) {
        setSelectedChatThreadId(null);
    }
    if (view !== View.TOURNAMENT_GUIDELINES) {
        setSelectedMatchIdForGuideline(null);
    }
    setCurrentView(view);
  };

  const navigateToChatScreen = (threadId: string) => {
    setSelectedChatThreadId(threadId);
    setCurrentView(View.CHAT_SCREEN);
  };
  
  const updateManagedTeam = (updatedTeam: Team) => {
    setManagedTeams(prevManaged => prevManaged.map(t => t.id === updatedTeam.id ? updatedTeam : t));
    setTeams(prevTeams => prevTeams.map(t => t.id === updatedTeam.id ? updatedTeam : t));
    setFollowedTeams(prevFollowed => prevFollowed.map(ft => ft.id === updatedTeam.id ? {...updatedTeam, isFavorite: ft.isFavorite, logoUrl: updatedTeam.logoUrl} : ft));
  };

  const toggleFollowTeam = (teamToToggle: Team) => {
    setFollowedTeams(prev => {
        const isFollowing = prev.find(ft => ft.id === teamToToggle.id);
        if (isFollowing) {
            return prev.filter(ft => ft.id !== teamToToggle.id);
        } else {
            const teamData = teams.find(t => t.id === teamToToggle.id) || teamToToggle;
            return [...prev, {...teamData, isFavorite: false, logoUrl: teamData.logoUrl}];
        }
    });
  };

  const toggleFavoriteTeam = (teamId: string) => {
    setFollowedTeams(prev => prev.map(ft => ft.id === teamId ? {...ft, isFavorite: !ft.isFavorite} : ft));
  };

  const handleAddChatThread = (newThread: ChatThread, initialMessage?: ChatMessage, shouldNavigate: boolean = true) => {
    setChatThreads(prev => [newThread, ...prev].sort((a, b) => (b.lastMessage?.timestamp.getTime() || 0) - (a.lastMessage?.timestamp.getTime() || 0)));
    if (initialMessage) {
        setChatMessages(prevMessages => ({
            ...prevMessages,
            [newThread.id]: [initialMessage]
        }));
    }
    if (shouldNavigate) {
      navigateToChatScreen(newThread.id);
    }
  };
  
 const handleSendMessage = (threadId: string, message: ChatMessage) => {
    setChatMessages(prev => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), message]
    }));
    setChatThreads(prevThreads => prevThreads.map(t => 
        t.id === threadId ? {...t, lastMessage: message, unreadCount: (message.senderId === currentUserId ? t.unreadCount : (t.unreadCount || 0) + 1) } : t 
    ).sort((a,b) => (b.lastMessage?.timestamp.getTime() || 0) - (a.lastMessage?.timestamp.getTime() || 0)));
  };


  const NavButton: React.FC<{ view: View; label: string; current: View; onClick: (view: View) => void }> = ({ view, label, current, onClick }) => (
    <button
      onClick={() => onClick(view)}
      className={`px-3 py-2 text-sm sm:px-4 sm:py-2 rounded-md font-medium transition-colors
                  ${current === view 
                    ? 'bg-sky-500 text-white shadow-lg' 
                    : 'bg-slate-700 hover:bg-slate-600 text-sky-300 hover:text-sky-200'}`}
      aria-current={current === view ? "page" : undefined}
    >
      {label}
    </button>
  );

  const currentSelectedChatThread = selectedChatThreadId ? chatThreads.find(t => t.id === selectedChatThreadId) : null;
  const messagesForSelectedThread = selectedChatThreadId ? chatMessages[selectedChatThreadId] || [] : [];
  
  // If no team is selected, show the TeamSelectionPage
  if (!selectedManagedTeam) {
    return (
      <TeamSelectionPage 
        teams={managedTeams} 
        onSelectTeam={handleSelectManagedTeam}
        onCreateTeam={handleCreateTeam}
        onDeleteTeam={handleDeleteTeam}
      />
    );
  }

  // Once a team is selected, show the main app
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-white p-4 sm:p-6">
      <header className="mb-6 text-center">
        <div className="relative">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-400">
              {selectedManagedTeam.name}
            </h1>
            <p className="text-slate-400 mt-1 text-md sm:text-lg">チーム管理システム</p>
            <button
                onClick={handleBackToTeamSelection}
                className="absolute top-1/2 -translate-y-1/2 left-0 bg-slate-700 hover:bg-slate-600 text-sky-300 font-semibold py-2 px-4 rounded-lg transition text-sm"
            >
              &larr; チーム選択
            </button>
        </div>
      </header>

      <nav className="mb-6 flex flex-wrap justify-center gap-2 sm:gap-3 px-1">
        <NavButton view={View.TEAM_MANAGEMENT} label="チーム管理" current={currentView} onClick={navigateTo} />
        <NavButton view={View.FOLLOWED_TEAMS} label="フォロー中" current={currentView} onClick={navigateTo} />
        <NavButton view={View.MATCHES} label="試合管理" current={currentView} onClick={navigateTo} />
        <NavButton view={View.TOURNAMENT_GUIDELINES} label="大会要項作成" current={currentView} onClick={navigateTo} />
        <NavButton view={View.SCHEDULE} label="スケジュール" current={currentView} onClick={navigateTo} />
        <NavButton view={View.MATCHMAKING} label="マッチング" current={currentView} onClick={navigateTo} />
        <NavButton view={View.VENUE_BOOKING} label="会場予約" current={currentView} onClick={navigateTo} />
        <NavButton view={View.CHAT_LIST} label="チャット" current={currentView} onClick={navigateTo} /> 
      </nav>

      <main className="container mx-auto max-w-5xl xl:max-w-7xl">
        {currentView === View.TEAM_MANAGEMENT && (
          <TeamManagementPage 
            team={selectedManagedTeam} 
            onUpdateTeam={updateManagedTeam}
            pastMatchResults={mockPastMatchResults} 
            allTeams={teams}
            matches={matches.filter(m => m.ourTeamId === selectedManagedTeamId || m.participants?.some(p => p.teamId === selectedManagedTeamId))}
          />
        )}
        {currentView === View.TEAM_PROFILE && selectedTeam && (
          <TeamProfilePage 
            team={selectedTeam} 
            onBack={() => navigateTo(View.FOLLOWED_TEAMS)}
            allTeams={teams}
          />
        )}
        {currentView === View.FOLLOWED_TEAMS && (
          <FollowedTeamsPage 
            followedTeams={followedTeams} 
            onSelectTeam={handleSelectTeam}
            onToggleFavorite={toggleFavoriteTeam}
            onUnfollow={toggleFollowTeam} 
            allTeams={teams}
            managedTeamId={selectedManagedTeamId}
          />
        )}
        {currentView === View.MATCHES && (
          <MatchesPage 
            matches={matches} 
            teams={teams} 
            onUpdateMatches={handleUpdateMatches} 
            managedTeam={selectedManagedTeam}
            followedTeams={followedTeams}
            chatThreads={chatThreads}
            onAddChatThread={handleAddChatThread}
            onSendMessage={handleSendMessage}
            onUpdateTeams={handleUpdateTeams}
            onEditGuideline={handleEditGuidelineForMatch}
          />
        )}
        {currentView === View.VENUE_BOOKING && (
          <VenueBookingPage venues={venues} teams={teams} />
        )}
        {currentView === View.SCHEDULE && (
          <SchedulePage events={scheduleEvents.filter(e => e.teamId === selectedManagedTeamId)} teamId={selectedManagedTeam.id} onUpdateEvents={setScheduleEvents} />
        )}
         {currentView === View.TOURNAMENT_GUIDELINES && (
          <TournamentGuidelinesPage 
            allMatches={matches}
            selectedMatchId={selectedMatchIdForGuideline}
            managedTeam={selectedManagedTeam}
            onSaveGuidelineAsNewMatch={handleSaveNewGuidelineAsMatch}
            onUpdateGuidelineForMatch={handleUpdateGuidelineForMatch}
            chatThreads={chatThreads}
            onSendMessage={handleSendMessage}
            teams={teams}
          />
        )}
        {currentView === View.CHAT_LIST && (
          <ChatPage
            threads={chatThreads}
            currentUserId={currentUserId}
            currentUserTeamName={selectedManagedTeam.name}
            followedTeams={followedTeams.map(ft => ({...ft, logoUrl: teams.find(t=>t.id === ft.id)?.logoUrl || ft.logoUrl}))} 
            onAddChatThread={handleAddChatThread}
            onViewChatScreen={navigateToChatScreen}
            teams={teams} 
          />
        )}
        {currentView === View.CHAT_SCREEN && currentSelectedChatThread && (
          <ChatScreen
            thread={currentSelectedChatThread}
            messages={messagesForSelectedThread}
            currentUserId={currentUserId}
            currentUserTeamName={selectedManagedTeam.name}
            teams={teams}
            onSendMessage={handleSendMessage}
            onBackToList={() => navigateTo(View.CHAT_LIST)}
          />
        )}
        {currentView === View.MATCHMAKING && (
           <MatchmakingPage
            allTeams={teams.filter(t => t.id !== selectedManagedTeamId)} 
            onFollowTeam={toggleFollowTeam}
            followedTeamIds={followedTeams.map(ft => ft.id)}
            onSelectTeam={handleSelectTeam}
          />
        )}
      </main>

      <footer className="text-center mt-10 py-5 border-t border-slate-700">
        <p className="text-slate-500 text-xs sm:text-sm">
          &copy; {new Date().getFullYear()} チーム管理システム. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default App;