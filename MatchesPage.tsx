// components/MatchesPage.tsx
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Match, MatchStatus, MatchType, Team, TournamentBracket, LeagueTable, BracketTeam, FollowedTeam, LeagueTeamStats, BracketMatch, LeagueCompetition, LeagueGroup, LeagueMatch, BracketRound, MatchScoringEvent, ChatThread, ChatMessage, ParticipantStatus, TournamentInfoFormData } from '../types';
import { generateTournamentBracket } from '../utils/bracketGenerator';
import { generateLeagueTable, getAdvancingTeams, addMinutesToTime } from '../utils/leagueGenerator';
import { moveTeamBetweenGroups, updateLeagueStatsAfterMatch } from '../utils/leagueTableEditor';
import { sanitizeMatchesState } from '../utils/stateSanitizer';
import { deepClone } from '../utils/deepClone';
import { formatGuidelineWithFixturesForChat } from '../utils/guidelineFormatter';
import { formatBracketForChat } from '../utils/bracketFormatter';
import { formatLeagueForChat } from '../utils/leagueFormatter';
import { calculateNewRatings } from '../utils/ratingCalculator';
import EditMatchModal, { EditMatchModalRef } from './EditMatchModal';
import BracketView from './BracketView';
import LeagueTableView from './LeagueTableView';

interface MatchesPageProps {
  matches: Match[];
  teams: Team[]; 
  onUpdateMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  managedTeam: Team; 
  followedTeams: FollowedTeam[];
  chatThreads: ChatThread[];
  onAddChatThread: (newThread: ChatThread, initialMessage?: ChatMessage, shouldNavigate?: boolean) => void;
  onSendMessage: (threadId: string, message: ChatMessage) => void;
  onUpdateTeams: (updater: React.SetStateAction<Team[]>) => void;
  onEditGuideline: (matchId: string) => void;
}

// --- Reusable Detail Item Component ---
const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode; className?: string }> = ({ label, value, children, className }) => (
  <div className={`mb-3 ${className}`}>
    <p className="text-sm font-semibold text-slate-400">{label}</p>
    {value !== undefined && <p className="text-md text-sky-200 break-words">{value || '-'}</p>}
    {children}
  </div>
);

const initialNewMatchState: Partial<Match> = {
    type: MatchType.TRAINING,
    status: MatchStatus.PREPARATION,
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    location: '',
    numberOfCourts: 1,
    matchDurationInMinutes: 20,
    halftimeInMinutes: 5,
    restTimeInMinutes: 5,
};

// --- Wizard States ---
type WizardStep = 'details' | 'teams' | 'opponent' | 'finals' | 'preview';
type WizardType = 'training' | 'league' | 'tournament';

interface WizardState {
  isOpen: boolean;
  step: WizardStep;
  type: WizardType | null;
}

const initialWizardState: WizardState = {
  isOpen: false,
  step: 'details',
  type: null
};

interface ScoreModalState {
  matchId: string;
  subMatchId?: string;
  type: 'bracket' | 'league' | 'training';
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  team1Score?: number;
  team2Score?: number;
  groupName?: string;
}

const emptyScoringEvent = {
    period: '前半' as '前半' | '後半',
    minute: '',
    scorerName: '',
    assistName: '',
};

type ShareType = 'bracket' | 'league' | 'guideline';
interface ShareModalInfo {
    matchId: string;
    type: ShareType;
    bracket?: TournamentBracket;
    league?: LeagueTable;
    guideline?: TournamentInfoFormData;
}

const MatchesPage: React.FC<MatchesPageProps> = ({ matches, teams, onUpdateMatches, managedTeam, followedTeams, chatThreads, onAddChatThread, onSendMessage, onUpdateTeams, onEditGuideline }) => {
  const sanitizedMatches = useMemo(() => sanitizeMatchesState(matches), [matches]);
  const managedTeamId = managedTeam.id;

  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | MatchType>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | MatchStatus>('all');
  const [activeParticipationFilter, setActiveParticipationFilter] = useState<'all' | 'owner' | 'invited'>('all');

  const [wizardState, setWizardState] = useState<WizardState>(initialWizardState);
  const [newMatch, setNewMatch] = useState<Partial<Match>>(initialNewMatchState);
  const [selectedTeamIdsForCompetition, setSelectedTeamIdsForCompetition] = useState<string[]>([]);
  const [seedTeamIds, setSeedTeamIds] = useState<string[]>([]);
  const [numGroupsForLeague, setNumGroupsForLeague] = useState<number>(1);
  const [finalRoundConfig, setFinalRoundConfig] = useState<{ type: 'none' | 'tournament' | 'league'; teamsPerGroup: number }>({ type: 'none', teamsPerGroup: 2 });
  const [previewData, setPreviewData] = useState<{ bracket?: TournamentBracket; league?: LeagueCompetition; estimatedEndTime?: string; } | null>(null);
  const [isEditingPreviewLayout, setIsEditingPreviewLayout] = useState(false);
  const [firstTeamInPreviewSwap, setFirstTeamInPreviewSwap] = useState<{ matchId: string, teamSlot: 'team1' | 'team2', team: BracketTeam } | null>(null);
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [opponentSearchTerm, setOpponentSearchTerm] = useState('');

  const editModalRef = useRef<EditMatchModalRef>(null);
  const [scoreModalState, setScoreModalState] = useState<ScoreModalState | null>(null);
  const [manualWinnerSelection, setManualWinnerSelection] = useState<'team1' | 'team2' | 'draw' | null>(null);
  const [editingLayout, setEditingLayout] = useState<string | null>(null);
  const [firstTeamToSwap, setFirstTeamToSwap] = useState<{ matchId: string, teamSlot: 'team1' | 'team2', team: BracketTeam } | null>(null);
  const [mobileSwappingTeam, setMobileSwappingTeam] = useState<{ match: Match; subMatchId: string; team: BracketTeam; } | null>(null);
  
  const [scoringInfo, setScoringInfo] = useState<{ match: Match; subMatchId?: string } | null>(null);
  const [shareModalInfo, setShareModalInfo] = useState<ShareModalInfo | null>(null);

  const [newScoringEvent, setNewScoringEvent] = useState<{period: '前半' | '後半'; minute: string | number; scorerName: string; assistName: string;}>(emptyScoringEvent);
  const [manualScorerName, setManualScorerName] = useState('');
  const [manualAssistName, setManualAssistName] = useState('');

  const resetWizard = () => {
    setWizardState(initialWizardState);
    setNewMatch(initialNewMatchState);
    setSelectedTeamIdsForCompetition([]);
    setSeedTeamIds([]);
    setNumGroupsForLeague(1);
    setFinalRoundConfig({ type: 'none', teamsPerGroup: 2 });
    setPreviewData(null);
    setIsEditingPreviewLayout(false);
    setFirstTeamInPreviewSwap(null);
    setTeamSearchTerm('');
    setOpponentSearchTerm('');
  };

  const handleStartCreation = (type: WizardType) => {
    resetWizard();
    const typeMap = { training: MatchType.TRAINING, league: MatchType.LEAGUE, tournament: MatchType.TOURNAMENT };
    setWizardState({ isOpen: true, step: 'details', type });
    setNewMatch(prev => ({ ...prev, type: typeMap[type] }));
    if (managedTeamId) {
        setSelectedTeamIdsForCompetition([managedTeamId]);
    }
  };

  const handleWizardInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isNumberInput = type === 'number';
    setNewMatch(prev => ({ ...prev, [name]: isNumberInput ? parseInt(value) || 0 : value }));
  };
  
  const handleNumGroupsChange = (increment: number) => {
    setNumGroupsForLeague(prev => {
        const newValue = prev + increment;
        if (newValue < 1 || newValue > selectedTeamIdsForCompetition.length) {
            return prev;
        }
        return newValue;
    });
  };

  const goToNextStep = (nextStep: WizardStep) => {
    if (wizardState.step === 'preview') {
        setIsEditingPreviewLayout(false);
        setFirstTeamInPreviewSwap(null);
    }
    setWizardState(prev => ({ ...prev, step: nextStep }));
  };
  
  const handleOpponentSelectedNext = () => {
    if (!newMatch.opponentTeamId) {
      alert("対戦相手を選択してください。");
      return;
    }
    goToNextStep('preview');
  };

  const handleTeamSelectionNext = () => {
    if (selectedTeamIdsForCompetition.length < 2) {
      alert("競技には少なくとも2チーム選択してください。");
      return;
    }
    if (wizardState.type === 'league') {
      goToNextStep('finals');
    } else { // Tournament
      const selectedTeamsArray = teams.filter(team => selectedTeamIdsForCompetition.includes(team.id));
      const nextPowerOfTwo = 2 ** Math.ceil(Math.log2(selectedTeamsArray.length));
      const requiredSeeds = nextPowerOfTwo - selectedTeamsArray.length;
      if (seedTeamIds.length !== requiredSeeds && selectedTeamsArray.length !== nextPowerOfTwo) {
        alert(`シードチームを${requiredSeeds}チーム選択してください。`);
        return;
      }
      handleGeneratePreview();
    }
  };
  
  const handleGeneratePreview = () => {
    const selectedTeamsArray = teams.filter(t => selectedTeamIdsForCompetition.includes(t.id));
    const numCourts = newMatch.numberOfCourts || 1;
    let finalBracket: TournamentBracket | undefined;
    let finalLeagueComp: LeagueCompetition | undefined;
    let endTime: string | undefined;

    if (wizardState.type === 'tournament') {
        finalBracket = generateTournamentBracket(
          selectedTeamsArray, 
          seedTeamIds, 
          numCourts, 
          newMatch.time, 
          newMatch.matchDurationInMinutes, 
          newMatch.restTimeInMinutes
        ) || undefined;
    } else if (wizardState.type === 'league') {
        const prelimLeague = generateLeagueTable(selectedTeamsArray, numGroupsForLeague, numCourts, newMatch.time, newMatch.matchDurationInMinutes, newMatch.restTimeInMinutes);
        if (prelimLeague) {
            finalLeagueComp = {
                id: `lc-preview-${Date.now()}`, name: newMatch.location || prelimLeague.name,
                preliminaryRound: prelimLeague, advancementRule: { teamsPerGroup: finalRoundConfig.teamsPerGroup },
                finalRoundType: finalRoundConfig.type, isFinalsGenerated: false,
            };
        }
    }
    
    // Calculate end time
    if (finalBracket || finalLeagueComp) {
        const { time, matchDurationInMinutes, restTimeInMinutes, numberOfCourts: courts } = newMatch;
        let totalMatches = 0;
        if(finalBracket) totalMatches = finalBracket.teams.length - 1;
        if(finalLeagueComp) {
          totalMatches += finalLeagueComp.preliminaryRound.groups.flatMap(g => g.matches).length;
          if (finalLeagueComp.finalRoundType !== 'none') {
              const advancingTeamCount = finalLeagueComp.preliminaryRound.groups.length * finalRoundConfig.teamsPerGroup;
              if (advancingTeamCount > 1) {
                  if (finalLeagueComp.finalRoundType === 'tournament') totalMatches += advancingTeamCount - 1;
                  else totalMatches += (advancingTeamCount * (advancingTeamCount - 1)) / 2;
              }
          }
        }
        if (time && matchDurationInMinutes && typeof restTimeInMinutes === 'number' && courts) {
            const slotsPerCourt = Math.ceil(totalMatches / courts);
            const totalTimeInMinutes = (slotsPerCourt * matchDurationInMinutes) + ((slotsPerCourt - 1) * restTimeInMinutes);
            endTime = addMinutesToTime(time, totalTimeInMinutes);
        }
    }
    setPreviewData({ bracket: finalBracket, league: finalLeagueComp, estimatedEndTime: endTime });
    goToNextStep('preview');
  };

  const handleCreateMatchFromWizard = () => {
    let matchToAdd: Match;
    let participantIds: string[] = [];
    if (wizardState.type === 'training') {
        if (!newMatch.opponentTeamId) { alert('対戦相手が選択されていません。'); return; }
        const opponent = teams.find(t => t.id === newMatch.opponentTeamId);
        participantIds.push(newMatch.opponentTeamId);
        matchToAdd = { ...newMatch, id: `match-${Date.now()}`, ourTeamId: managedTeamId, status: MatchStatus.PREPARATION, opponentTeamName: opponent?.name, participants: [{ teamId: newMatch.opponentTeamId, status: ParticipantStatus.PENDING }], } as Match;
    } else {
        participantIds = selectedTeamIdsForCompetition.filter(id => id !== managedTeamId);
        matchToAdd = { ...newMatch, id: `match-${Date.now()}`, ourTeamId: managedTeamId, status: MatchStatus.PREPARATION, bracketData: previewData?.bracket, leagueCompetitionData: previewData?.league, participants: participantIds.length > 0 ? participantIds.map(id => ({ teamId: id, status: ParticipantStatus.PENDING })) : undefined, } as Match;
    }
    onUpdateMatches(prev => { const sanitizedPrev = sanitizeMatchesState(prev); return [...sanitizedPrev, matchToAdd].sort((a,b) => b.date.localeCompare(a.date)) });
    resetWizard();
  };
  
   const handleSelectOpponent = (teamId: string) => {
    const opponent = teams.find(t => t.id === teamId);
    setNewMatch(prev => ({ ...prev, opponentTeamId: teamId, opponentTeamName: opponent?.name }));
  };

  const handleToggleTeamSelectionForCompetition = (teamId: string) => {
    if (teamId === managedTeamId) return; 
    setSelectedTeamIdsForCompetition(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]);
  };
  
  const handleToggleSeedTeam = (teamId: string) => { setSeedTeamIds(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]); };

  const filteredMatches = useMemo(() => {
    return sanitizedMatches
      .filter(match => {
        const typeMatch = activeTypeFilter === 'all' || match.type === activeTypeFilter;
        const statusMatch = activeStatusFilter === 'all' || match.status === activeStatusFilter;
        const isOwner = match.ourTeamId === managedTeamId;
        const isInvited = !!match.participants?.some(p => p.teamId === managedTeamId);
        let participantMatch = false;
        if (activeParticipationFilter === 'all') participantMatch = isOwner || isInvited;
        else if (activeParticipationFilter === 'owner') participantMatch = isOwner;
        else if (activeParticipationFilter === 'invited') participantMatch = isInvited;
        return typeMatch && statusMatch && participantMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sanitizedMatches, activeTypeFilter, activeStatusFilter, activeParticipationFilter, managedTeamId]);

  const handleSelectTeamForSwapInPreview = (matchId: string, teamSlot: 'team1' | 'team2', team: BracketTeam) => {
    if (!isEditingPreviewLayout || !previewData?.bracket) return;
    const selection = { matchId, teamSlot, team };
    if (!firstTeamInPreviewSwap) { setFirstTeamInPreviewSwap(selection); } 
    else {
        setPreviewData(prevData => {
            if (!prevData?.bracket) return prevData;
            const newBracket = deepClone(prevData.bracket);
            let m1: BracketMatch | undefined, m2: BracketMatch | undefined;
            for(const round of newBracket.rounds) {
                const found1 = round.matches.find(m => m.id === firstTeamInPreviewSwap.matchId);
                if (found1) m1 = found1;
                const found2 = round.matches.find(m => m.id === selection.matchId);
                if (found2) m2 = found2;
            }
            if (!m1 || !m2 || !selection.team || selection.team.isBye) { setFirstTeamInPreviewSwap(null); return prevData; }
            const team1Original = deepClone(firstTeamInPreviewSwap.team);
            const team2Original = deepClone(selection.team);
            if (firstTeamInPreviewSwap.teamSlot === 'team1') m1.team1 = team2Original; else m1.team2 = team2Original;
            if (selection.teamSlot === 'team1') m2.team1 = team1Original; else m2.team2 = team1Original;
            m1.isPlayable = !!(m1.team1 && m1.team2); m2.isPlayable = !!(m2.team1 && m2.team2);
            return { ...prevData, bracket: newBracket };
        });
        setFirstTeamInPreviewSwap(null);
    }
  };

  const handleUpdatePreviewLeagueData = useCallback((updater: (leagueComp: LeagueCompetition) => void) => {
      setPreviewData(prev => { if (!prev?.league) return prev; const newLeagueComp = deepClone(prev.league); updater(newLeagueComp); return { ...prev, league: newLeagueComp }; });
  }, []);

  const handleUpdatePreviewLeagueMatchTime = useCallback((groupName: string, matchId: string, newTime: string) => {
      handleUpdatePreviewLeagueData(leagueComp => { const group = leagueComp.preliminaryRound.groups.find(g => g.name === groupName); const match = group?.matches.find(m => m.id === matchId); if (match) match.startTime = newTime; });
  }, [handleUpdatePreviewLeagueData]);

  const handleUpdatePreviewLeagueCourt = useCallback((groupName: string, matchId: string, newCourt: number) => {
       handleUpdatePreviewLeagueData(leagueComp => { const group = leagueComp.preliminaryRound.groups.find(g => g.name === groupName); const match = group?.matches.find(m => m.id === matchId); if (match) match.court = newCourt; });
  }, [handleUpdatePreviewLeagueData]);

  const handleReorderMatchesInPreview = useCallback((groupName: string, fromIndex: number, toIndex: number) => {
    setPreviewData(prevData => {
        if (!prevData?.league) return prevData;
        const newLeagueComp = deepClone(prevData.league);
        const group = newLeagueComp.preliminaryRound.groups.find(g => g.name === groupName);
        if (group?.matches) { const [movedItem] = group.matches.splice(fromIndex, 1); group.matches.splice(toIndex, 0, movedItem); }
        return { ...prevData, league: newLeagueComp };
    });
  }, []);

  const handleMoveTeamInPreviewLeague = (teamIdToMove: string, sourceGroupName: string, targetGroupName: string) => {
      if (!isEditingPreviewLayout || !previewData?.league || sourceGroupName === targetGroupName) return;
      setPreviewData(prevData => {
        if (!prevData?.league) return prevData;
        const updatedCompetition = moveTeamBetweenGroups(prevData.league, teamIdToMove, sourceGroupName, targetGroupName, newMatch.numberOfCourts || 1, newMatch.time, newMatch.matchDurationInMinutes, newMatch.restTimeInMinutes);
        return updatedCompetition ? { ...prevData, league: updatedCompetition } : prevData;
      });
  };
  
   const handleReorderLeagueMatches = useCallback((matchId: string, groupName: string, fromIndex: number, toIndex: number) => {
    onUpdateMatches(prev => {
        const newMatches = sanitizeMatchesState(prev);
        const matchToUpdate = newMatches.find(m => m.id === matchId);
        if (matchToUpdate?.leagueCompetitionData) {
            const league = matchToUpdate.leagueCompetitionData;
            const group = league.preliminaryRound.groups.find(g => g.name === groupName) || league.finalRoundLeague?.groups.find(g => g.name === groupName);
            if (group?.matches) { const [movedItem] = group.matches.splice(fromIndex, 1); group.matches.splice(toIndex, 0, movedItem); }
        }
        return newMatches;
    });
}, [onUpdateMatches]);

  const handleRespondToInvite = (matchId: string, response: ParticipantStatus.ACCEPTED | ParticipantStatus.DECLINED) => {
    onUpdateMatches(prev => {
        const newMatches = sanitizeMatchesState(prev);
        const matchToUpdate = newMatches.find(m => m.id === matchId);
        if (matchToUpdate && matchToUpdate.participants) {
            const participantIndex = matchToUpdate.participants.findIndex(p => p.teamId === managedTeamId);
            if (participantIndex !== -1) { matchToUpdate.participants[participantIndex].status = response; alert(`招待に「${response === ParticipantStatus.ACCEPTED ? '承認' : '辞退'}」として返信しました。`); }
        }
        return newMatches;
    });
  };

  const handleSendToParticipants = (match: Match) => {
    if (match.type === MatchType.TRAINING) {
      const opponentId = match.opponentTeamId;
      if (!opponentId) { alert("対戦相手の情報（ID）が設定されていないため、招待を送信できません。"); return; }
      const opponent = teams.find(t => t.id === opponentId);
      if (!opponent) { alert("対戦相手の情報が見つかりません。"); return; }
      const messageText = `トレーニングマッチ「${match.location || '名称未設定'}」への招待が届きました。試合管理ページで承認してください。(${match.date} ${match.time})`;
      let thread = chatThreads.find(th => !th.isGroupChat && th.participants.length === 2 && th.participants.some(p => p.id === opponent.id) && th.participants.some(p => p.id === managedTeamId));
      const message: ChatMessage = { id: `msg-${Date.now()}`, threadId: '', senderId: managedTeamId, senderName: managedTeam.name, text: messageText, timestamp: new Date() };
      if (thread) { message.threadId = thread.id; onSendMessage(thread.id, message); } 
      else {
        const newThreadId = `thread-${Date.now()}`;
        message.threadId = newThreadId;
        const newThread: ChatThread = { id: newThreadId, participants: [ { id: managedTeam.id, name: managedTeam.name, logoUrl: managedTeam.logoUrl }, { id: opponent.id, name: opponent.name, logoUrl: opponent.logoUrl } ], isGroupChat: false, lastMessage: message };
        onAddChatThread(newThread, message, false);
      }
      alert(`${opponent.name}とのチャットに招待を送信しました。`);
    } else { // League or Tournament
      if (!match.participants || match.participants.length === 0) { alert("招待する参加者がいません。"); return; }
      const participantIds = match.participants.filter(p => p.status !== ParticipantStatus.DECLINED).map(p => p.teamId);
      if (participantIds.length === 0) { alert("通知可能な参加チーム(辞退以外)がいません。"); return; }
      const followedParticipantTeams = teams.filter(t => participantIds.includes(t.id) && followedTeams.some(ft => ft.id === t.id));
      if (followedParticipantTeams.length === 0) { alert("通知可能な参加チーム(フォロー中)がいません。"); return; }
      const threadName = `${match.location || '大会'}参加者グループ`;
      let thread = chatThreads.find(th => th.groupName === threadName);
      const messageText = `「${match.location || '大会'}」への招待が届きました。試合管理ページをご確認ください。`;
      const message: ChatMessage = { id: `msg-${Date.now()}`, threadId: '', senderId: managedTeamId, senderName: managedTeam.name, text: messageText, timestamp: new Date() };
      if (thread) { message.threadId = thread.id; onSendMessage(thread.id, message); } 
      else {
        const newThreadId = `thread-${Date.now()}`;
        message.threadId = newThreadId;
        const newThread: ChatThread = { id: newThreadId, participants: [ { id: managedTeam.id, name: managedTeam.name, logoUrl: managedTeam.logoUrl }, ...followedParticipantTeams.map(p => ({ id: p.id, name: p.name, logoUrl: p.logoUrl })) ], isGroupChat: true, groupName: threadName, lastMessage: message, };
        onAddChatThread(newThread, message, false);
      }
      alert(`参加チームにチャットで招待を送信しました。`);
    }
  };

  const handleGenerateFinals = (matchId: string) => {
    onUpdateMatches(prev => {
        const workingMatches = sanitizeMatchesState(prev);
        const match = workingMatches.find(m => m.id === matchId);
        if (!match?.leagueCompetitionData || match.leagueCompetitionData.finalRoundType === 'none') { alert("決勝ラウンドが設定されていません。"); return workingMatches; }
        const allMatchesPlayed = match.leagueCompetitionData.preliminaryRound.groups.every(g => g.matches.every(m => m.played));
        if (!allMatchesPlayed) { alert("予選リーグの全ての試合結果が入力されていません。"); return workingMatches; }
        const { advancementRule } = match.leagueCompetitionData;
        const advancingTeams = getAdvancingTeams(match.leagueCompetitionData.preliminaryRound, advancementRule.teamsPerGroup);
        if (advancingTeams.length < 2) { alert("決勝ラウンドに進出するチームが2チーム未満です。"); return workingMatches; }
        const numCourts = match.numberOfCourts || 1;
        const prelimMatches = match.leagueCompetitionData.preliminaryRound.groups.flatMap(g => g.matches);
        const latestPrelimMatch = prelimMatches.filter(m => m.startTime).sort((a,b) => (b.startTime!).localeCompare(a.startTime!))[0];
        const finalRoundStartTime = addMinutesToTime(latestPrelimMatch?.startTime || match.time, (match.matchDurationInMinutes || 0) + (match.restTimeInMinutes || 0));
        let finalTournament: TournamentBracket | undefined, finalLeague: LeagueTable | undefined;
        if (match.leagueCompetitionData.finalRoundType === 'tournament') {
            finalTournament = generateTournamentBracket(advancingTeams, [], numCourts, finalRoundStartTime, match.matchDurationInMinutes, match.restTimeInMinutes) || undefined;
            if(finalTournament) finalTournament.name = "決勝トーナメント";
        } else {
            finalLeague = generateLeagueTable(advancingTeams, 1, numCourts, finalRoundStartTime, match.matchDurationInMinutes, match.restTimeInMinutes) || undefined;
            if(finalLeague) finalLeague.name = "決勝リーグ";
        }
        match.leagueCompetitionData.finalRoundTournament = finalTournament;
        match.leagueCompetitionData.finalRoundLeague = finalLeague;
        match.leagueCompetitionData.isFinalsGenerated = true;
        return workingMatches;
    });
  };

  const handleToggleLayoutEdit = (matchId: string) => { setEditingLayout(prev => prev === matchId ? null : matchId); setFirstTeamToSwap(null); };
  const handleSelectTeamForSwapInExistingBracket = (matchId: string, bmId: string, teamSlot: 'team1' | 'team2', team: BracketTeam) => {
    if (!editingLayout || editingLayout !== matchId) return;
    const selection = { matchId: bmId, teamSlot, team };
    if (!firstTeamToSwap) { setFirstTeamToSwap(selection); } 
    else {
        onUpdateMatches(prevMatches => {
            const newMatches = sanitizeMatchesState(prevMatches);
            const matchToUpdate = newMatches.find((m: Match) => m.id === matchId);
            const bracket = matchToUpdate?.bracketData || matchToUpdate?.leagueCompetitionData?.finalRoundTournament;
            if (!bracket) return newMatches;
            let m1: BracketMatch | undefined, m2: BracketMatch | undefined;
            for(const round of bracket.rounds) {
                const found1 = round.matches.find((m: BracketMatch) => m.id === firstTeamToSwap.matchId);
                if (found1) m1 = found1;
                const found2 = round.matches.find((m: BracketMatch) => m.id === selection.matchId);
                if (found2) m2 = found2;
            }
            if (!m1 || !m2 || !selection.team || selection.team.isBye) { setFirstTeamToSwap(null); return newMatches; }
            const team1Original = { ...firstTeamToSwap.team };
            const team2Original = { ...selection.team };
            if (firstTeamToSwap.teamSlot === 'team1') m1.team1 = team2Original; else m1.team2 = team2Original;
            if (selection.teamSlot === 'team1') m2.team1 = team1Original; else m2.team2 = team1Original;
            m1.isPlayable = !!(m1.team1 && m1.team2); m2.isPlayable = !!(m2.team1 && m2.team2);
            return newMatches;
        });
        setFirstTeamToSwap(null);
    }
  };
  const handleMobileSelectForSwap = useCallback((match: Match, subMatchId: string, team: BracketTeam) => {
    if (!mobileSwappingTeam) {
      setMobileSwappingTeam({ match, subMatchId, team });
    } else {
      if (mobileSwappingTeam.match.id !== match.id || mobileSwappingTeam.subMatchId === subMatchId) {
        setMobileSwappingTeam(null);
        return;
      }
      onUpdateMatches(prev => {
        const workingMatches = sanitizeMatchesState(prev);
        const m = workingMatches.find(wm => wm.id === match.id);
        const bracket = m?.bracketData || m?.leagueCompetitionData?.finalRoundTournament;
        if(!bracket) return workingMatches;
        const findMatchAndSlot = (smId: string) => {
            for (const round of bracket.rounds) {
                for (const bm of round.matches) {
                    if(bm.id === smId) {
                        if (bm.team1?.id === team.id) return { bm, slot: 'team1' as const };
                        if (bm.team2?.id === team.id) return { bm, slot: 'team2' as const };
                    }
                }
            }
            return null;
        }
        const match1Info = findMatchAndSlot(mobileSwappingTeam.subMatchId);
        const match2Info = findMatchAndSlot(subMatchId);
        if(match1Info && match2Info) {
          const originalTeam1 = deepClone(mobileSwappingTeam.team);
          const originalTeam2 = deepClone(team);
          if (match1Info.slot === 'team1') match1Info.bm.team1 = originalTeam2; else match1Info.bm.team2 = originalTeam2;
          if (match2Info.slot === 'team1') match2Info.bm.team1 = originalTeam1; else match2Info.bm.team2 = originalTeam1;
          match1Info.bm.isPlayable = !!(match1Info.bm.team1 && match1Info.bm.team2);
          match2Info.bm.isPlayable = !!(match2Info.bm.team1 && match2Info.bm.team2);
        }
        return workingMatches;
      });
      setMobileSwappingTeam(null);
    }
  }, [mobileSwappingTeam, onUpdateMatches]);

  const handleMoveTeamInLeague = useCallback((matchId: string, teamIdToMove: string, sourceGroupName: string, targetGroupName: string) => {
      onUpdateMatches(prevMatches => {
        const workingMatches = sanitizeMatchesState(prevMatches);
        const match = workingMatches.find(m => m.id === matchId);
        if (!match || !match.leagueCompetitionData || sourceGroupName === targetGroupName) return workingMatches;
        const updatedCompetition = moveTeamBetweenGroups(match.leagueCompetitionData, teamIdToMove, sourceGroupName, targetGroupName, match.numberOfCourts || 1, match.time, match.matchDurationInMinutes, match.restTimeInMinutes);
        if (updatedCompetition) { match.leagueCompetitionData = updatedCompetition; }
        return workingMatches;
      });
    }, [onUpdateMatches]);
  
  const handleSaveMatchUpdate = useCallback((updatedMatch: Match) => {
    onUpdateMatches(prev => {
      const workingMatches = sanitizeMatchesState(prev);
      const index = workingMatches.findIndex(m => m.id === updatedMatch.id);
      if (index !== -1) { workingMatches[index] = updatedMatch; }
      return [...workingMatches];
    });
  }, [onUpdateMatches]);

  const handleDeleteMatch = (matchId: string) => {
      if (window.confirm("この試合を本当に削除しますか？関連するデータはすべて失われます。")) {
          onUpdateMatches(prev => sanitizeMatchesState(prev).filter(m => m.id !== matchId));
      }
  };
  const handleOpenScoreModal = (state: ScoreModalState) => { setScoreModalState(state); setManualWinnerSelection(null); };
  const handleSaveScore = (team1ScoreStr: string, team2ScoreStr: string) => {
      if (!scoreModalState) return;
      const { matchId, subMatchId, type, team1Id, team2Id, groupName } = scoreModalState;
      const team1Score = parseInt(team1ScoreStr, 10), team2Score = parseInt(team2ScoreStr, 10);
      if (isNaN(team1Score) || isNaN(team2Score) || team1Score < 0 || team2Score < 0) { alert("有効なスコアを入力してください。"); return; }
      if (team1Score === team2Score && !manualWinnerSelection) { alert("スコアが引き分けです。PK戦などの結果に基づき、最終的な結果を選択してください。"); return; }
      let resultForTeam1: 1 | 0.5 | 0 | null = null;
      if (team1Score > team2Score) resultForTeam1 = 1;
      else if (team2Score > team1Score) resultForTeam1 = 0;
      else {
          if (type === 'league' && manualWinnerSelection === 'draw') resultForTeam1 = 0.5;
          else if (type === 'training' && manualWinnerSelection !== 'team1' && manualWinnerSelection !== 'team2') resultForTeam1 = 0.5;
          else if (manualWinnerSelection === 'team1') resultForTeam1 = 1;
          else if (manualWinnerSelection === 'team2') resultForTeam1 = 0;
      }
      if (resultForTeam1 !== null) {
          const teamA = teams.find(t => t.id === team1Id);
          const teamB = teams.find(t => t.id === team2Id);
          if (teamA && teamB) {
              const { newRatingA, newRatingB } = calculateNewRatings(teamA.rating, teamB.rating, resultForTeam1);
              onUpdateTeams(prevTeams => prevTeams.map(t => {
                  if (t.id === teamA.id) return { ...t, rating: newRatingA };
                  if (t.id === teamB.id) return { ...t, rating: newRatingB };
                  return t;
              }));
          }
      }
      onUpdateMatches(prevMatches => {
        const newMatches = sanitizeMatchesState(prevMatches);
        const matchToUpdate = newMatches.find((m: Match) => m.id === matchId);
        if (!matchToUpdate) return newMatches;
        if (type === 'training') {
            matchToUpdate.ourScore = matchToUpdate.ourTeamId === team1Id ? team1Score : team2Score;
            matchToUpdate.opponentScore = matchToUpdate.ourTeamId === team2Id ? team1Score : team2Score;
            matchToUpdate.manualWinnerId = team1Score === team2Score ? (manualWinnerSelection === 'team1' ? team1Id : (manualWinnerSelection === 'team2' ? team2Id : null)) : null;
            matchToUpdate.status = MatchStatus.FINISHED;
        } else if (type === 'bracket') {
            let bracket = matchToUpdate.bracketData || matchToUpdate.leagueCompetitionData?.finalRoundTournament;
            if (!bracket) return newMatches;
            const findMatchInBracket = (br: TournamentBracket, mId: string): BracketMatch | undefined => br.rounds.flatMap(r => r.matches).find(m => m.id === mId);
            const bm = findMatchInBracket(bracket, subMatchId!);
            if (!bm || !bm.team1 || !bm.team2) return newMatches;
            bm.team1Score = team1Score; bm.team2Score = team2Score; bm.isDecided = true;
            let winner = (team1Score > team2Score) ? bm.team1 : (team2Score > team1Score) ? bm.team2 : (manualWinnerSelection === 'team1' ? bm.team1 : bm.team2);
            bm.winnerId = (team1Score === team2Score) ? winner?.id || null : null;
            bm.winner = winner;
            if (bm.nextMatchId && winner) {
                const nextMatch = findMatchInBracket(bracket, bm.nextMatchId);
                if (nextMatch) {
                    if (bm.nextMatchSlot === 'team1') { nextMatch.team1 = winner; nextMatch.placeholderTeam1Text = undefined; } 
                    else { nextMatch.team2 = winner; nextMatch.placeholderTeam2Text = undefined; }
                    nextMatch.isPlayable = !!(nextMatch.team1 && nextMatch.team2);
                }
            }
        } else if (type === 'league' && groupName) {
            const leagueCompetition = matchToUpdate.leagueCompetitionData;
            if (!leagueCompetition) return newMatches;
            const leagueTable = leagueCompetition.preliminaryRound.groups.some(g => g.name === groupName) ? leagueCompetition.preliminaryRound : leagueCompetition.finalRoundLeague;
            if (!leagueTable) return newMatches;
            const group = leagueTable.groups.find((g: LeagueGroup) => g.name === groupName);
            const leagueMatch = group?.matches.find((lm: LeagueMatch) => lm.id === subMatchId);
            if (!group || !leagueMatch) return newMatches;
            const updatedLeagueMatch = { ...leagueMatch, team1Score, team2Score, played: true, winnerId: team1Score === team2Score ? (manualWinnerSelection === 'draw' ? null : (manualWinnerSelection === 'team1' ? team1Id : team2Id)) : null };
            const updatedGroup = updateLeagueStatsAfterMatch(group, updatedLeagueMatch);
            if (updatedGroup) {
                const groupIndex = leagueTable.groups.findIndex(g => g.name === groupName);
                if (groupIndex !== -1) { leagueTable.groups[groupIndex] = updatedGroup; }
            }
        }
        if (matchToUpdate.type === MatchType.TOURNAMENT && matchToUpdate.bracketData) {
            const bracket = matchToUpdate.bracketData;
            const finalMatch = bracket.rounds[bracket.rounds.length - 1]?.matches[0];
            if (finalMatch?.isDecided) matchToUpdate.status = MatchStatus.FINISHED;
        } else if (matchToUpdate.type === MatchType.LEAGUE && matchToUpdate.leagueCompetitionData) {
            const comp = matchToUpdate.leagueCompetitionData;
            const allPrelimPlayed = comp.preliminaryRound.groups.every(g => g.matches.every(m => m.played));
            let finalRoundFinished = true;
            if (comp.finalRoundType !== 'none') {
                if (!comp.isFinalsGenerated) finalRoundFinished = false;
                else if (comp.finalRoundTournament) {
                    const finalBracket = comp.finalRoundTournament;
                    finalRoundFinished = finalBracket.rounds[finalBracket.rounds.length - 1]?.matches[0]?.isDecided ?? false;
                } else if (comp.finalRoundLeague) {
                    finalRoundFinished = comp.finalRoundLeague.groups.every(g => g.matches.every(m => m.played));
                } else { finalRoundFinished = false; }
            }
            if (allPrelimPlayed && finalRoundFinished) matchToUpdate.status = MatchStatus.FINISHED;
        }
        return newMatches;
      });
      setScoreModalState(null);
  };
  const handleUpdateCourt = (matchId: string, subMatchId: string, newCourt: number, type: 'bracket' | 'league', groupName?: string) => {
    onUpdateMatches(prev => {
        const newMatches = sanitizeMatchesState(prev);
        const match = newMatches.find(m => m.id === matchId);
        if(!match) return newMatches;
        if (type === 'bracket') {
            const bm = (match.bracketData || match.leagueCompetitionData?.finalRoundTournament)?.rounds.flatMap((r:BracketRound)=>r.matches).find((b:BracketMatch) => b.id === subMatchId);
            if(bm) bm.court = newCourt;
        } else if (type === 'league' && groupName) {
            const leagueData = match.leagueCompetitionData;
            if (leagueData) {
                let group = leagueData.preliminaryRound.groups.find((g: LeagueGroup) => g.name === groupName) || leagueData.finalRoundLeague?.groups.find((g: LeagueGroup) => g.name === groupName);
                if (group) {
                    const lm = group.matches.find((l: LeagueMatch) => l.id === subMatchId);
                    if(lm) lm.court = newCourt;
                }
            }
        }
        return newMatches;
    });
  };
  const handleUpdateLeagueMatchTime = useCallback((matchId: string, groupName: string, subMatchId: string, newTime: string, isPrelim: boolean) => {
    onUpdateMatches(prev => {
        const newMatches = sanitizeMatchesState(prev);
        const match = newMatches.find(m => m.id === matchId);
        if (!match?.leagueCompetitionData) return newMatches;
        const leagueTable = isPrelim ? match.leagueCompetitionData.preliminaryRound : match.leagueCompetitionData.finalRoundLeague;
        const group = leagueTable?.groups.find((g: LeagueGroup) => g.name === groupName);
        const leagueMatch = group?.matches.find((lm: LeagueMatch) => lm.id === subMatchId);
        if (leagueMatch) { leagueMatch.startTime = newTime; }
        return newMatches;
    });
  }, [onUpdateMatches]);

   const handleUpdateTournamentMatchTime = useCallback((matchId: string, bracketMatchId: string, newTime: string) => {
    onUpdateMatches(prev => {
      const newMatches = sanitizeMatchesState(prev);
      const match = newMatches.find(m => m.id === matchId);
      if (!match) return newMatches;
      const bracket = match.bracketData || match.leagueCompetitionData?.finalRoundTournament;
      if (!bracket) return newMatches;
      const bracketMatch = bracket.rounds.flatMap(r => r.matches).find(bm => bm.id === bracketMatchId);
      if (bracketMatch) { bracketMatch.startTime = newTime; }
      return newMatches;
    });
  }, [onUpdateMatches]);

  const handleOpenScoringModal = useCallback((match: Match, subMatchId?: string) => {
    setScoringInfo({ match, subMatchId });
    setNewScoringEvent(emptyScoringEvent);
    setManualScorerName('');
    setManualAssistName('');
  }, []);

  const handleSaveScoringEvent = useCallback(() => {
    if (!scoringInfo) return;
    if (!newScoringEvent.minute || !newScoringEvent.scorerName) {
      alert('時間と得点者は必須です。');
      return;
    }
    const eventToAdd: MatchScoringEvent = {
      period: newScoringEvent.period, minute: Number(newScoringEvent.minute), teamId: managedTeamId, 
      scorerName: newScoringEvent.scorerName === 'manual' ? manualScorerName : newScoringEvent.scorerName,
      assistName: newScoringEvent.assistName === 'manual' ? manualAssistName : (newScoringEvent.assistName || undefined),
      subMatchId: scoringInfo.subMatchId,
    };
    onUpdateMatches(prev => {
      const newMatches = sanitizeMatchesState(prev);
      const match = newMatches.find(m => m.id === scoringInfo.match.id);
      if (match) { if (!match.scoringEvents) match.scoringEvents = []; match.scoringEvents.push(eventToAdd); }
      return newMatches;
    });
    setNewScoringEvent(emptyScoringEvent);
  }, [scoringInfo, newScoringEvent, onUpdateMatches, managedTeamId, manualScorerName, manualAssistName]);
  
  const handleDeleteScoringEvent = useCallback((matchId: string, eventIndex: number) => {
     onUpdateMatches(prev => {
      const newMatches = sanitizeMatchesState(prev);
      const match = newMatches.find(m => m.id === matchId);
      if (match && match.scoringEvents) { match.scoringEvents.splice(eventIndex, 1); }
      return newMatches;
    });
  }, [onUpdateMatches]);

  const handleShareToChat = (threadId: string) => {
      if (!shareModalInfo) return;
      const { matchId, type, bracket, league, guideline } = shareModalInfo;
      let messageText = '';
      switch(type) {
        case 'guideline':
          if (guideline) {
            messageText = formatGuidelineWithFixturesForChat(guideline, bracket, league);
          } else {
             messageText = '共有できる大会要項データがありません。';
          }
          break;
        case 'bracket':
          messageText = bracket ? formatBracketForChat(bracket) : '共有できるトーナメント表データがありません。';
          break;
        case 'league':
          messageText = league ? formatLeagueForChat(league) : '共有できるリーグ表データがありません。';
          break;
      }
      const message: ChatMessage = { id: `msg-${Date.now()}`, threadId: threadId, senderId: managedTeamId, senderName: managedTeam.name, text: messageText, timestamp: new Date() };
      onSendMessage(threadId, message);
      alert('チャットに情報を共有しました。');
      setShareModalInfo(null);
  };
  
  const getTeamNameFromId = useCallback((teamId: string) => teams.find(t => t.id === teamId)?.name || teamId, [teams]);

  const wizardStepCount = wizardState.type === 'training' ? 2 : (wizardState.type === 'league' ? 4 : 3);
  const wizardCurrentStepNumber = wizardState.step === 'details' ? 1 : wizardState.step === 'opponent' ? 2 : wizardState.step === 'teams' ? 2 : wizardState.step === 'finals' ? 3 : wizardStepCount;

  return (
    <div className="space-y-6">
      {/* ... (Existing header and filters) ... */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-3xl font-semibold text-sky-300">試合管理</h2>
        <div className="flex gap-2">
            <button onClick={() => handleStartCreation('training')} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition text-sm">練習試合作成</button>
            <button onClick={() => handleStartCreation('league')} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition text-sm">リーグ戦作成</button>
            <button onClick={() => handleStartCreation('tournament')} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition text-sm">トーナメント作成</button>
        </div>
      </div>
      
      <div className="bg-slate-800 p-4 rounded-xl flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-slate-400">種別</label>
            <select value={activeTypeFilter} onChange={e=>setActiveTypeFilter(e.target.value as any)} className="w-full bg-slate-700 p-2 rounded-md mt-1"><option value="all">すべて</option>{Object.values(MatchType).map(t => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div>
            <label className="text-xs text-slate-400">ステータス</label>
            <select value={activeStatusFilter} onChange={e=>setActiveStatusFilter(e.target.value as any)} className="w-full bg-slate-700 p-2 rounded-md mt-1"><option value="all">すべて</option>{Object.values(MatchStatus).map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div>
            <label className="text-xs text-slate-400">参加種別</label>
            <select value={activeParticipationFilter} onChange={e=>setActiveParticipationFilter(e.target.value as any)} className="w-full bg-slate-700 p-2 rounded-md mt-1"><option value="all">すべて</option><option value="owner">主催</option><option value="invited">招待</option></select>
          </div>
      </div>
      
      <div className="space-y-4">
        {filteredMatches.length > 0 ? filteredMatches.map(match => {
          const isOwner = match.ourTeamId === managedTeamId;
          const myParticipantInfo = !isOwner ? match.participants?.find(p => p.teamId === managedTeamId) : null;
          let opponentName = match.opponentTeamName || getTeamNameFromId(match.opponentTeamId || '');
          const isOurMatch = managedTeamId && (match.ourTeamId === managedTeamId || match.participants?.some(p => p.teamId === managedTeamId));
          return (
            <div key={match.id} className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-sky-400">{match.location || '名称未設定'}</h3>
                  <div className="flex items-center gap-4 text-xs mt-1">
                    <span className="bg-slate-700 px-2 py-0.5 rounded-full text-sky-300">{match.type}</span>
                    <span className={`font-semibold ${match.status === MatchStatus.FINISHED ? 'text-emerald-400' : 'text-yellow-400'}`}>{match.status}</span>
                    {match.detailedTournamentInfo && (<span className="bg-teal-700 text-teal-200 px-2 py-0.5 rounded-full text-xs">要項あり</span>)}
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                   {isOwner && (<button onClick={() => onEditGuideline(match.id)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-1 px-3 rounded-md text-xs transition">要項作成・編集</button>)}
                   {isOurMatch && match.type === MatchType.TRAINING && (<button onClick={() => handleOpenScoringModal(match)} className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-1 px-3 rounded-md text-xs transition">得点記録</button>)}
                   <button onClick={() => editModalRef.current?.open(match)} className="bg-slate-600 hover:bg-slate-500 text-white font-medium py-1 px-3 rounded-md text-xs transition">編集</button>
                   {isOwner && <button onClick={() => handleDeleteMatch(match.id)} className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-md text-xs transition">削除</button>}
                </div>
              </div>
              {/* ... (rest of the match card rendering logic remains the same) ... */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-700">
                 <DetailItem label="日付" value={`${match.date} ${match.time}`} />
                 {match.type === MatchType.TRAINING && <DetailItem label="相手" value={opponentName} />}
                 {match.status === MatchStatus.FINISHED && (match.ourScore !== undefined && match.opponentScore !== undefined) ? (
                   <DetailItem label="結果" className="col-span-2">
                     <p className="text-lg font-bold text-white">
                         {match.ourScore} - {match.opponentScore} 
                         <span className={`ml-3 text-sm font-semibold ${match.ourScore > match.opponentScore ? 'text-green-400' : match.ourScore < match.opponentScore ? 'text-red-400' : 'text-yellow-400'}`}>
                           {match.ourScore > match.opponentScore ? '勝利' : match.ourScore < match.opponentScore ? '敗北' : '引き分け'}
                         </span>
                     </p>
                   </DetailItem>
                 ) : (
                    match.type === MatchType.TRAINING && isOurMatch && (<div className="flex items-end"><button onClick={() => handleOpenScoreModal({ matchId: match.id, type: 'training', team1Id: managedTeam.id, team2Id: match.opponentTeamId!, team1Name: managedTeam.name, team2Name: opponentName!})} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-4 rounded-md text-sm transition">結果入力</button></div>)
                 )}
              </div>
              
                {isOwner && match.status !== MatchStatus.FINISHED && (<div className="mt-2 text-right"><button onClick={()=>handleSendToParticipants(match)} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm transition">参加者に招待を送信</button></div>)}
                {myParticipantInfo && myParticipantInfo.status === ParticipantStatus.PENDING && (<div className="mt-3 flex justify-end gap-3"><button onClick={() => handleRespondToInvite(match.id, ParticipantStatus.DECLINED)} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-4 rounded-md text-sm">辞退</button><button onClick={() => handleRespondToInvite(match.id, ParticipantStatus.ACCEPTED)} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-4 rounded-md text-sm">承認</button></div>)}
                {myParticipantInfo && myParticipantInfo.status === ParticipantStatus.ACCEPTED && <p className="text-right mt-2 text-sm text-green-400">参加承認済み</p>}
                {myParticipantInfo && myParticipantInfo.status === ParticipantStatus.DECLINED && <p className="text-right mt-2 text-sm text-red-400">参加辞退済み</p>}
              {match.type === MatchType.TOURNAMENT && match.bracketData && (<div className="mt-4"><BracketView bracket={match.bracketData} isEditing={editingLayout === match.id} firstTeamToSwapId={firstTeamToSwap?.team.id || null} onSelectTeamForSwap={(bmId, slot, team) => handleSelectTeamForSwapInExistingBracket(match.id, bmId, slot, team)} onMatchClick={(bm) => handleOpenScoreModal({matchId: match.id, subMatchId: bm.id, type: 'bracket', team1Id: bm.team1!.id, team2Id: bm.team2!.id, team1Name: bm.team1!.name, team2Name: bm.team2!.name})} onUpdateCourt={(bmId, court) => handleUpdateCourt(match.id, bmId, court, 'bracket')} onUpdateMatchTime={(bmId, time) => handleUpdateTournamentMatchTime(match.id, bmId, time)} managedTeamId={managedTeamId} onRecordScore={(bmId) => handleOpenScoringModal(match, bmId)} onToggleLayoutEdit={() => handleToggleLayoutEdit(match.id)} onShareBracket={(bracket) => setShareModalInfo({ matchId: match.id, type: 'bracket', bracket })} onSelectTeamForMobileSwap={(subMatchId, team) => handleMobileSelectForSwap(match, subMatchId, team)} mobileSwappingTeam={mobileSwappingTeam?.match.id === match.id ? mobileSwappingTeam : null}/></div>)}
               {match.type === MatchType.LEAGUE && match.leagueCompetitionData && (<div className="mt-4"><div className="flex justify-between items-center mb-2">{isOwner && !match.leagueCompetitionData.isFinalsGenerated && (<button onClick={() => handleGenerateFinals(match.id)} className="text-xs bg-green-600 text-white px-3 py-1 rounded">決勝ラウンド生成</button>)}<div className="flex-grow"></div>{isOwner && <button onClick={() => handleToggleLayoutEdit(match.id)} className="text-xs bg-yellow-600 text-white px-3 py-1 rounded">{editingLayout === match.id ? '編集終了' : 'レイアウト編集'}</button>}</div><LeagueTableView leagueTable={match.leagueCompetitionData.preliminaryRound} isEditing={editingLayout === match.id} onMoveTeam={(teamId, sourceGroup, targetGroup) => handleMoveTeamInLeague(match.id, teamId, sourceGroup, targetGroup)} onResultClick={(groupName, lm) => handleOpenScoreModal({matchId: match.id, subMatchId: lm.id, type: 'league', team1Id: lm.team1Id, team2Id: lm.team2Id, team1Name: getTeamNameFromId(lm.team1Id), team2Name: getTeamNameFromId(lm.team2Id), groupName})} onUpdateCourt={(groupName, lmId, court) => handleUpdateCourt(match.id, lmId, court, 'league', groupName)} onUpdateMatchTime={(groupName, lmId, time) => handleUpdateLeagueMatchTime(match.id, groupName, lmId, time, true)} managedTeamId={managedTeamId} onRecordScore={(lmId) => handleOpenScoringModal(match, lmId)} onReorderMatches={(groupName, from, to) => handleReorderLeagueMatches(match.id, groupName, from, to)} onShareLeague={(league) => setShareModalInfo({ matchId: match.id, type: 'league', league })}/>{match.leagueCompetitionData.finalRoundTournament && (<BracketView bracket={match.leagueCompetitionData.finalRoundTournament} isEditing={editingLayout === match.id} firstTeamToSwapId={firstTeamToSwap?.team.id || null} onSelectTeamForSwap={(bmId, slot, team) => handleSelectTeamForSwapInExistingBracket(match.id, bmId, slot, team)} onMatchClick={(bm) => handleOpenScoreModal({matchId: match.id, subMatchId: bm.id, type: 'bracket', team1Id: bm.team1!.id, team2Id: bm.team2!.id, team1Name: bm.team1!.name, team2Name: bm.team2!.name})} onUpdateCourt={(bmId, court) => handleUpdateCourt(match.id, bmId, court, 'bracket')} onUpdateMatchTime={(bmId, time) => handleUpdateTournamentMatchTime(match.id, bmId, time)} managedTeamId={managedTeamId} onRecordScore={(bmId) => handleOpenScoringModal(match, bmId)} onToggleLayoutEdit={() => handleToggleLayoutEdit(match.id)} onShareBracket={(bracket) => setShareModalInfo({ matchId: match.id, type: 'bracket', bracket })} onSelectTeamForMobileSwap={(subMatchId, team) => handleMobileSelectForSwap(match, subMatchId, team)} mobileSwappingTeam={mobileSwappingTeam?.match.id === match.id ? mobileSwappingTeam : null}/>)}{match.leagueCompetitionData.finalRoundLeague && (<LeagueTableView leagueTable={match.leagueCompetitionData.finalRoundLeague} isEditing={editingLayout === match.id} onResultClick={(groupName, lm) => handleOpenScoreModal({matchId: match.id, subMatchId: lm.id, type: 'league', team1Id: lm.team1Id, team2Id: lm.team2Id, team1Name: getTeamNameFromId(lm.team1Id), team2Name: getTeamNameFromId(lm.team2Id), groupName})} onUpdateCourt={(groupName, lmId, court) => handleUpdateCourt(match.id, lmId, court, 'league', groupName)} onUpdateMatchTime={(groupName, lmId, time) => handleUpdateLeagueMatchTime(match.id, groupName, lmId, time, false)} managedTeamId={managedTeamId} onRecordScore={(lmId) => handleOpenScoringModal(match, lmId)} onShareLeague={(league) => setShareModalInfo({ matchId: match.id, type: 'league', league })}/>)}</div>)}
            </div>
          )
        }) : <p className="text-slate-400">条件に合う試合がありません。</p>}
      </div>
      
      {wizardState.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <header className="flex justify-between items-center mb-4">
               <h3 className="text-2xl text-sky-400 capitalize">{wizardState.type} 作成ウィザード ({wizardCurrentStepNumber}/{wizardStepCount})</h3>
               <button onClick={resetWizard} className="text-2xl text-slate-400 hover:text-white">&times;</button>
            </header>
            
            <main className="overflow-y-auto flex-grow pr-2">
                {wizardState.step === 'details' && (
                  <div className="space-y-4">
                     <h4 className="text-lg font-semibold text-sky-300">基本情報</h4>
                     <input type="text" name="location" placeholder="大会/試合名" value={newMatch.location || ''} onChange={handleWizardInputChange} className="w-full bg-slate-700 p-2 rounded-md" />
                     <div className="grid grid-cols-2 gap-4">
                         <input type="date" name="date" value={newMatch.date} onChange={handleWizardInputChange} className="w-full bg-slate-700 p-2 rounded-md"/>
                         <input type="time" name="time" value={newMatch.time} onChange={handleWizardInputChange} className="w-full bg-slate-700 p-2 rounded-md"/>
                     </div>
                     {wizardState.type !== 'training' && (
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div><label className="text-xs text-slate-400">コート数</label><input type="number" name="numberOfCourts" value={newMatch.numberOfCourts} onChange={handleWizardInputChange} min="1" className="w-full bg-slate-700 p-2 rounded-md mt-1"/></div>
                             <div><label className="text-xs text-slate-400">試合時間(分)</label><input type="number" name="matchDurationInMinutes" value={newMatch.matchDurationInMinutes} onChange={handleWizardInputChange} min="1" className="w-full bg-slate-700 p-2 rounded-md mt-1"/></div>
                             <div><label className="text-xs text-slate-400">ハーフタイム(分)</label><input type="number" name="halftimeInMinutes" value={newMatch.halftimeInMinutes} onChange={handleWizardInputChange} min="0" className="w-full bg-slate-700 p-2 rounded-md mt-1"/></div>
                             <div><label className="text-xs text-slate-400">休憩時間(分)</label><input type="number" name="restTimeInMinutes" value={newMatch.restTimeInMinutes} onChange={handleWizardInputChange} min="0" className="w-full bg-slate-700 p-2 rounded-md mt-1"/></div>
                         </div>
                     )}
                     <textarea name="notes" placeholder="備考" value={newMatch.notes || ''} onChange={handleWizardInputChange} className="w-full bg-slate-700 p-2 rounded-md" rows={3}></textarea>
                  </div>
                )}
                {wizardState.step === 'opponent' && (
                  <div>
                    <h4 className="text-lg font-semibold text-sky-300 mb-4">対戦相手選択</h4>
                    <input type="text" placeholder="チーム名で検索..." value={opponentSearchTerm} onChange={e => setOpponentSearchTerm(e.target.value)} className="w-full bg-slate-700 p-2 rounded-md mb-4"/>
                    <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
                        {followedTeams.filter(t => t.name.toLowerCase().includes(opponentSearchTerm.toLowerCase())).map(team => (
                            <div key={team.id} onClick={() => handleSelectOpponent(team.id)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${newMatch.opponentTeamId === team.id ? 'bg-sky-700 ring-2 ring-sky-400' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                <img src={team.logoUrl} alt={team.name} className="w-8 h-8 rounded-full"/>
                                <span>{team.name}</span>
                            </div>
                        ))}
                    </div>
                  </div>
                )}
                {wizardState.step === 'teams' && (
                  <div>
                      <h4 className="text-lg font-semibold text-sky-300 mb-2">参加チーム選択</h4>
                      <input type="text" placeholder="チーム名で検索..." value={teamSearchTerm} onChange={e => setTeamSearchTerm(e.target.value)} className="w-full bg-slate-700 p-2 rounded-md mb-4"/>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-2">
                          {[managedTeam, ...followedTeams].filter(t => t.name.toLowerCase().includes(teamSearchTerm.toLowerCase())).map(team => (
                               <label key={team.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedTeamIdsForCompetition.includes(team.id) ? 'bg-sky-700' : 'bg-slate-700'}`}>
                                   <input type="checkbox" checked={selectedTeamIdsForCompetition.includes(team.id)} onChange={() => handleToggleTeamSelectionForCompetition(team.id)} disabled={team.id === managedTeamId} className="form-checkbox h-5 w-5 bg-slate-600 border-slate-500 text-sky-500 focus:ring-sky-500"/>
                                   <img src={team.logoUrl} alt={team.name} className="w-8 h-8 rounded-full"/>
                                   <span>{team.name} {team.id === managedTeamId && '(自チーム)'}</span>
                               </label>
                          ))}
                      </div>
                      {wizardState.type === 'tournament' && (() => {
                          const selectedCount = selectedTeamIdsForCompetition.length;
                          const nextPowerOfTwo = 2 ** Math.ceil(Math.log2(selectedCount));
                          const byesNeeded = nextPowerOfTwo - selectedCount;
                          if(selectedCount > 2 && byesNeeded > 0) {
                              return (
                                <div className="mt-4 border-t border-slate-600 pt-4">
                                  <h4 className="text-lg font-semibold text-sky-300 mb-2">シードチーム選択 ({byesNeeded}チーム)</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[20vh] overflow-y-auto pr-2">
                                      {teams.filter(t => selectedTeamIdsForCompetition.includes(t.id) && t.id !== managedTeamId).map(team => (
                                          <label key={`seed-${team.id}`} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${seedTeamIds.includes(team.id) ? 'bg-yellow-700/50' : 'bg-slate-700'}`}>
                                              <input type="checkbox" checked={seedTeamIds.includes(team.id)} onChange={() => handleToggleSeedTeam(team.id)} disabled={seedTeamIds.length >= byesNeeded && !seedTeamIds.includes(team.id)} className="form-checkbox h-4 w-4"/>
                                              <span>{team.name}</span>
                                          </label>
                                      ))}
                                  </div>
                                </div>
                              );
                          }
                          return null;
                      })()}
                  </div>
                )}
                 {wizardState.step === 'finals' && (
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-sky-300">リーグ設定</h4>
                        <div>
                           <label className="text-sm text-slate-400">予選リーグ グループ数</label>
                           <div className="flex items-center gap-3 mt-1">
                                <button type="button" onClick={() => handleNumGroupsChange(-1)} disabled={numGroupsForLeague <= 1} className="bg-slate-600 w-10 h-10 rounded-md text-xl disabled:opacity-50">-</button>
                                <span className="text-xl font-bold w-12 text-center">{numGroupsForLeague}</span>
                                <button type="button" onClick={() => handleNumGroupsChange(1)} disabled={numGroupsForLeague >= selectedTeamIdsForCompetition.length} className="bg-slate-600 w-10 h-10 rounded-md text-xl disabled:opacity-50">+</button>
                           </div>
                        </div>
                        <h4 className="text-lg font-semibold text-sky-300 mt-4">決勝ラウンド設定</h4>
                        <div>
                            <label className="text-sm text-slate-400">形式</label>
                            <select value={finalRoundConfig.type} onChange={e => setFinalRoundConfig(p => ({...p, type: e.target.value as any}))} className="w-full bg-slate-700 p-2 rounded-md mt-1">
                                <option value="none">なし</option>
                                <option value="tournament">トーナメント</option>
                                <option value="league">リーグ</option>
                            </select>
                        </div>
                        {finalRoundConfig.type !== 'none' && (
                            <div>
                                <label className="text-sm text-slate-400">各グループからの進出チーム数</label>
                                <input type="number" min="1" value={finalRoundConfig.teamsPerGroup} onChange={e => setFinalRoundConfig(p => ({...p, teamsPerGroup: parseInt(e.target.value)}))} className="w-full bg-slate-700 p-2 rounded-md mt-1"/>
                            </div>
                        )}
                    </div>
                 )}
                 {wizardState.step === 'preview' && (
                    <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <h4 className="text-lg font-semibold text-sky-300">プレビュー</h4>
                            {wizardState.type !== 'training' && (
                                <div className="flex items-center gap-4">
                                <p className="text-sm text-slate-300">予想終了時刻: <span className="font-bold text-amber-300">{previewData?.estimatedEndTime || '計算中...'}</span></p>
                                <button onClick={() => setIsEditingPreviewLayout(p => !p)} className="bg-yellow-600 text-white text-xs px-3 py-1 rounded">{isEditingPreviewLayout ? '編集終了' : 'レイアウト編集'}</button>
                                </div>
                            )}
                         </div>
                         {wizardState.type === 'training' && (
                            <div className="p-4 bg-slate-700 rounded-lg">
                                <p><strong>対戦相手:</strong> {newMatch.opponentTeamName}</p>
                                <p><strong>日時:</strong> {newMatch.date} {newMatch.time}</p>
                                <p><strong>場所:</strong> {newMatch.location}</p>
                            </div>
                         )}
                         {previewData?.bracket && <BracketView bracket={previewData.bracket} isEditing={isEditingPreviewLayout} firstTeamToSwapId={firstTeamInPreviewSwap?.team.id || null} onSelectTeamForSwap={handleSelectTeamForSwapInPreview} onToggleLayoutEdit={()=>setIsEditingPreviewLayout(p=>!p)} />}
                         {previewData?.league && <LeagueTableView leagueTable={previewData.league.preliminaryRound} isEditing={isEditingPreviewLayout} onMoveTeam={handleMoveTeamInPreviewLeague} onUpdateCourt={(group, match, court)=>handleUpdatePreviewLeagueCourt(group,match,court)} onUpdateMatchTime={(groupName, matchId, time) => handleUpdatePreviewLeagueMatchTime(groupName, matchId, time)} onReorderMatches={handleReorderMatchesInPreview}/>}
                    </div>
                 )}
            </main>
            
            <footer className="flex justify-between gap-4 pt-4 border-t border-slate-700">
              <button onClick={resetWizard} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg">キャンセル</button>
              <div className="flex gap-4">
                {wizardState.step !== 'details' && <button onClick={() => goToNextStep(wizardState.step === 'opponent' ? 'details' : wizardState.step === 'teams' ? 'details' : (wizardState.step === 'finals' ? 'teams' : (wizardState.step === 'preview' && wizardState.type === 'league' ? 'finals' : 'teams' )))} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg">戻る</button>}
                {wizardState.step === 'details' && <button onClick={() => goToNextStep(wizardState.type === 'training' ? 'opponent' : 'teams')} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg">次へ: {wizardState.type === 'training' ? '相手選択' : 'チーム選択'}</button>}
                {wizardState.step === 'opponent' && <button onClick={handleOpponentSelectedNext} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg">次へ: プレビュー</button>}
                {wizardState.step === 'teams' && <button onClick={handleTeamSelectionNext} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg">次へ: {wizardState.type === 'league' ? '決勝設定' : 'プレビュー'}</button>}
                {wizardState.step === 'finals' && <button onClick={handleGeneratePreview} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg">次へ: プレビュー</button>}
                {wizardState.step === 'preview' && <button onClick={handleCreateMatchFromWizard} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg">この内容で作成</button>}
              </div>
            </footer>
          </div>
        </div>
      )}

      {scoreModalState && (() => {
          const team1Members = teams.find(t=>t.id === scoreModalState.team1Id)?.members || [];
          const team2Members = teams.find(t=>t.id === scoreModalState.team2Id)?.members || [];
          const scoringTeamMembers = (scoreModalState.type === 'training' && managedTeam.id === scoreModalState.team1Id) ? team1Members : team2Members;
          return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div className="bg-slate-800 p-6 rounded-xl w-full max-w-lg">
                    <h3 className="text-2xl text-sky-400 mb-4">結果入力</h3>
                    <p className="text-lg mb-4 text-center">{scoreModalState.team1Name} vs {scoreModalState.team2Name}</p>
                    <div className="flex gap-4 items-center justify-center mb-4">
                        <input type="number" id="team1Score" placeholder="0" className="w-20 text-center text-2xl bg-slate-700 p-2 rounded-md"/>
                        <span>-</span>
                        <input type="number" id="team2Score" placeholder="0" className="w-20 text-center text-2xl bg-slate-700 p-2 rounded-md"/>
                    </div>
                     <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-300 mb-1">引き分けの場合の結果</label>
                        <select onChange={e => setManualWinnerSelection(e.target.value as any)} className="w-full bg-slate-700 p-2 rounded-md">
                            <option value="">選択してください</option>
                            <option value="team1">{scoreModalState.team1Name}の勝利 (PK等)</option>
                            <option value="team2">{scoreModalState.team2Name}の勝利 (PK等)</option>
                            {scoreModalState.type !== 'bracket' && <option value="draw">引き分け</option>}
                        </select>
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-slate-700">
                        <button onClick={() => setScoreModalState(null)} className="flex-1 bg-slate-600 py-2 rounded-lg">キャンセル</button>
                        <button onClick={() => handleSaveScore((document.getElementById('team1Score') as HTMLInputElement).value, (document.getElementById('team2Score') as HTMLInputElement).value)} className="flex-1 bg-sky-500 py-2 rounded-lg">保存</button>
                    </div>
                </div>
            </div>
        )})()}
        {scoringInfo && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                 <div className="bg-slate-800 p-6 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                    <h3 className="text-2xl text-sky-400 mb-4">得点記録</h3>
                    <div className="overflow-y-auto pr-2 flex-grow space-y-4">
                        {/* New Event Form */}
                        <div className="bg-slate-700/50 p-4 rounded-lg space-y-3">
                            <h4 className="text-lg font-semibold text-sky-300">新規イベント追加</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <select value={newScoringEvent.period} onChange={e => setNewScoringEvent(p => ({...p, period: e.target.value as any}))} className="w-full bg-slate-700 p-2 rounded-md"><option value="前半">前半</option><option value="後半">後半</option></select>
                                <input type="number" placeholder="時間(分)" value={newScoringEvent.minute} onChange={e => setNewScoringEvent(p => ({...p, minute: e.target.value}))} className="w-full bg-slate-700 p-2 rounded-md"/>
                            </div>
                            <select value={newScoringEvent.scorerName} onChange={e => setNewScoringEvent(p => ({...p, scorerName: e.target.value}))} className="w-full bg-slate-700 p-2 rounded-md">
                                <option value="">得点者を選択</option>
                                {(teams.find(t=>t.id===managedTeamId)?.members || []).map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                <option value="manual">手動入力</option>
                            </select>
                            {newScoringEvent.scorerName === 'manual' && <input type="text" placeholder="得点者名" value={manualScorerName} onChange={e => setManualScorerName(e.target.value)} className="w-full bg-slate-700 p-2 rounded-md"/>}
                            <select value={newScoringEvent.assistName} onChange={e => setNewScoringEvent(p => ({...p, assistName: e.target.value}))} className="w-full bg-slate-700 p-2 rounded-md">
                                <option value="">アシストを選択 (任意)</option>
                                {(teams.find(t=>t.id===managedTeamId)?.members || []).map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                <option value="manual">手動入力</option>
                            </select>
                             {newScoringEvent.assistName === 'manual' && <input type="text" placeholder="アシスト者名" value={manualAssistName} onChange={e => setManualAssistName(e.target.value)} className="w-full bg-slate-700 p-2 rounded-md"/>}
                            <button onClick={handleSaveScoringEvent} className="w-full bg-green-600 hover:bg-green-700 p-2 rounded-md">追加</button>
                        </div>
                        {/* Event List */}
                        <div className="space-y-2">
                             {(scoringInfo.match.scoringEvents || []).filter(e => e.subMatchId === scoringInfo.subMatchId).map((event, index) => (
                                 <div key={index} className="bg-slate-700 p-2 rounded-md flex justify-between items-center text-sm">
                                     <span>{event.period} {event.minute}分 - <strong>{event.scorerName}</strong> {event.assistName ? `(A: ${event.assistName})` : ''}</span>
                                     <button onClick={() => handleDeleteScoringEvent(scoringInfo.match.id, index)} className="text-red-400 hover:text-red-300 text-lg">&times;</button>
                                 </div>
                             ))}
                        </div>
                    </div>
                     <div className="flex gap-4 pt-4 mt-auto border-t border-slate-700">
                        <button onClick={() => setScoringInfo(null)} className="w-full bg-slate-600 py-2 rounded-lg">閉じる</button>
                     </div>
                 </div>
            </div>
        )}
        {shareModalInfo && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
                <h3 className="text-2xl text-sky-400 mb-4 flex-shrink-0">チャットで共有</h3>
                <p className="text-sm text-slate-400 mb-4">どのチャットに共有しますか？</p>
                <div className="overflow-y-auto pr-2 flex-grow space-y-2">
                  {chatThreads.map(thread => (
                    <button key={thread.id} onClick={() => handleShareToChat(thread.id)} className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-md flex items-center gap-3">
                      <span className="text-slate-200">{thread.isGroupChat ? thread.groupName : thread.participants.find(p=>p.id !== managedTeamId)?.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-4 pt-4 mt-auto flex-shrink-0 border-t border-slate-700">
                  <button type="button" onClick={() => setShareModalInfo(null)} className="w-full bg-slate-600 py-2 rounded-lg">キャンセル</button>
                </div>
              </div>
            </div>
        )}

        <EditMatchModal ref={editModalRef} onSave={handleSaveMatchUpdate} managedTeamId={managedTeamId} />
    </div>
  );
};

export default MatchesPage;