
// components/BracketView.tsx
import React from 'react';
import { TournamentBracket, BracketMatch, BracketTeam } from '../types';

interface BracketViewProps {
  bracket: TournamentBracket;
  isEditing: boolean;
  firstTeamToSwapId: string | null;
  onSelectTeamForSwap: (matchId: string, teamSlot: 'team1' | 'team2', team: BracketTeam) => void;
  onMatchClick?: (bracketMatch: BracketMatch) => void;
  onUpdateCourt?: (bracketMatchId: string, newCourt: number) => void;
  onUpdateMatchTime?: (bracketMatchId: string, newTime: string) => void;
  managedTeamId?: string;
  onRecordScore?: (bracketMatchId: string) => void;
  onToggleLayoutEdit?: () => void;
  onShareBracket?: (bracket: TournamentBracket) => void;
  onSelectTeamForMobileSwap?: (subMatchId: string, team: BracketTeam) => void;
  mobileSwappingTeam?: { match: any; subMatchId: string; team: BracketTeam; } | null;
}

const TeamDisplayInBracket: React.FC<{
  team: BracketTeam | null | undefined;
  placeholderText?: string;
  score?: number | null;
  isWinner?: boolean;
  isEditing?: boolean;
  isSelectedForSwap?: boolean;
  isMobileSwapping?: boolean;
  matchId?: string;
  teamSlot?: 'team1' | 'team2';
  roundIndex?: number;
  onSelect?: (matchId: string, teamSlot: 'team1' | 'team2', team: BracketTeam) => void;
  onMobileSelect?: (matchId: string, team: BracketTeam) => void;
}> = ({ team, placeholderText, score, isWinner, isEditing, isSelectedForSwap, isMobileSwapping, matchId, teamSlot, roundIndex, onSelect, onMobileSelect }) => {
  const baseClasses = "flex justify-between items-center text-xs sm:text-sm p-1 truncate flex-grow";
  const winnerClasses = isWinner ? 'font-bold text-sky-300' : 'text-slate-200';
  const byeClasses = "text-xs text-slate-500 italic p-1 flex-grow";
  const placeholderClasses = "text-xs text-slate-500 italic p-1 flex-grow";
  
  const isDraggable = !!(isEditing && roundIndex === 0 && team && !team.isBye && matchId && teamSlot && onSelect);

  const handleClick = () => {
    if (isDraggable && team && matchId && teamSlot && onSelect) {
      onSelect(matchId, teamSlot, team);
    }
  };

  let teamContainerClasses = `${baseClasses} ${winnerClasses}`;

  if (isSelectedForSwap || isMobileSwapping) {
    teamContainerClasses += ' ring-2 ring-yellow-400 rounded'; 
  }
  if (isDraggable) {
    teamContainerClasses += ' cursor-pointer hover:bg-sky-700/70';
  }

  if (!team) return <div className={placeholderClasses}>{placeholderText || '未定'}</div>;
  if (team.isBye) return <div className={byeClasses}>BYE</div>;

  return (
    <div className="flex items-center gap-1">
      <div className={teamContainerClasses} onClick={handleClick} title={team.name}>
        <span className="truncate">{team.name}</span>
        <span className={`font-semibold ${isWinner ? 'text-emerald-400' : 'text-slate-300'}`}>{score ?? ''}</span>
      </div>
      {isEditing && onMobileSelect && roundIndex === 0 && (
        <button onClick={() => onMobileSelect(matchId!, team)} className="sm:hidden bg-sky-700 text-white text-xs px-1.5 py-0.5 rounded">入替</button>
      )}
    </div>
  );
};

const BracketView: React.FC<BracketViewProps> = ({ 
    bracket, 
    isEditing, 
    firstTeamToSwapId, 
    onSelectTeamForSwap,
    onMatchClick,
    onUpdateCourt,
    onUpdateMatchTime,
    managedTeamId,
    onRecordScore,
    onToggleLayoutEdit,
    onShareBracket,
    onSelectTeamForMobileSwap,
    mobileSwappingTeam,
}) => {
  if (!bracket || !bracket.rounds) {
    return <p className="text-slate-400">ブラケットデータがありません。</p>;
  }

  return (
    <div className="bg-slate-700/30 p-2 sm:p-4 rounded-lg mt-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex-1">
          {onShareBracket && (
            <button onClick={() => onShareBracket(bracket)} className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-1 px-3 rounded-md text-xs transition">対戦表を共有</button>
          )}
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-sky-300 text-center flex-1">{bracket.name}</h3>
        <div className="flex-1 text-right">
          {onToggleLayoutEdit && (
            <button onClick={onToggleLayoutEdit} className="text-xs bg-yellow-600 text-white px-3 py-1 rounded">{isEditing ? '編集終了' : 'レイアウト編集'}</button>
          )}
        </div>
      </div>
      {isEditing && <p className="text-center text-xs text-yellow-300 -mt-2 mb-2">PCではドラッグ＆ドロップ(1回戦のみ)、スマホでは「入替」ボタンで編集できます。</p>}
      
      <div className="overflow-x-auto">
        <div className="flex space-x-2 sm:space-x-4 min-w-max">
          {bracket.rounds.map((round, roundIndex) => (
            <div key={`round-${roundIndex}`} className="flex flex-col space-y-4 items-center min-w-[140px] sm:min-w-[180px]">
              <h4 className="text-sm sm:text-md font-medium text-sky-400 whitespace-nowrap">{round.name}</h4>
              <div className="space-y-6 sm:space-y-8 w-full">
                {round.matches.map((match: BracketMatch) => {
                  const isMatchClickable = !isEditing && match.isPlayable && !match.isDecided && onMatchClick;
                  const isOurMatch = managedTeamId && (match.team1?.id === managedTeamId || match.team2?.id === managedTeamId);
                  return (
                    <div 
                      key={match.id} 
                      className={`bg-slate-600/50 p-1.5 sm:p-2 rounded shadow-md w-full relative pt-4 ${isMatchClickable ? 'cursor-pointer hover:bg-slate-500/50 transition-colors' : ''}`}
                      onClick={() => { if (isMatchClickable) onMatchClick(match); }}
                      title={isMatchClickable ? 'クリックしてスコアを入力' : ''}
                    >
                      {isOurMatch && !isEditing && onRecordScore && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onRecordScore(match.id); }}
                          className="absolute bottom-1 right-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-0.5 px-1.5 rounded-md text-xs z-10"
                          title="得点を記録"
                        >
                          得点記録
                        </button>
                      )}
                      { (match.court || isEditing) &&
                        <div className="absolute -top-2.5 right-1.5 flex items-center gap-0.5 text-xs">
                           <span className="text-slate-400">コート:</span>
                           {isEditing && onUpdateCourt ? (
                              <input 
                                  type="number" 
                                  value={match.court || ''}
                                  onChange={(e) => onUpdateCourt(match.id, parseInt(e.target.value) || 1)}
                                  className="w-8 h-4 text-center bg-slate-800/80 border border-slate-500 rounded-sm text-sky-300"
                                  onClick={(e) => e.stopPropagation()}
                              />
                           ) : (
                              <span className="text-sky-300 font-semibold">{match.court}</span>
                           )}
                        </div>
                      }
                      {(match.startTime || isEditing) && (
                        <div className="absolute -top-2.5 left-1.5 flex items-center gap-0.5 text-xs">
                            {isEditing && onUpdateMatchTime ? (
                                <input 
                                    type="time" 
                                    value={match.startTime || ''}
                                    onChange={(e) => onUpdateMatchTime(match.id, e.target.value)}
                                    className="w-16 h-4 text-center bg-slate-800/80 border border-slate-500 rounded-sm text-sky-300"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="text-amber-300 font-semibold">{match.startTime}</span>
                            )}
                        </div>
                      )}
                      <div className="flex flex-col items-stretch space-y-1 mt-1">
                        <TeamDisplayInBracket
                          team={match.team1}
                          placeholderText={match.placeholderTeam1Text}
                          score={match.team1Score}
                          isWinner={match.winner?.id === match.team1?.id}
                          isEditing={isEditing}
                          isSelectedForSwap={match.team1?.id === firstTeamToSwapId}
                          isMobileSwapping={mobileSwappingTeam?.team.id === match.team1?.id}
                          matchId={match.id}
                          teamSlot="team1"
                          roundIndex={roundIndex}
                          onSelect={onSelectTeamForSwap}
                          onMobileSelect={onSelectTeamForMobileSwap}
                        />
                        <TeamDisplayInBracket
                          team={match.team2}
                          placeholderText={match.placeholderTeam2Text}
                          score={match.team2Score}
                          isWinner={match.winner?.id === match.team2?.id}
                          isEditing={isEditing}
                          isSelectedForSwap={match.team2?.id === firstTeamToSwapId}
                          isMobileSwapping={mobileSwappingTeam?.team.id === match.team2?.id}
                          matchId={match.id}
                          teamSlot="team2"
                          roundIndex={roundIndex}
                          onSelect={onSelectTeamForSwap}
                          onMobileSelect={onSelectTeamForMobileSwap}
                        />
                      </div>
                      {match.nextMatchId && (
                         <div className="absolute top-1/2 -right-2 sm:-right-3 transform -translate-y-1/2 w-2 sm:w-3 h-px bg-slate-500"></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BracketView;