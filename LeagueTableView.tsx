
// components/LeagueTableView.tsx
import React, { useState } from 'react';
import { LeagueTable, LeagueGroup, LeagueTeamStats, LeagueMatch } from '../types';

interface LeagueTableViewProps {
  leagueTable: LeagueTable;
  isEditing?: boolean;
  onMoveTeam?: (teamId: string, sourceGroupName: string, targetGroupName: string) => void;
  onResultClick?: (groupName: string, match: LeagueMatch) => void;
  onUpdateCourt?: (groupName:string, matchId: string, newCourt: number) => void;
  onUpdateMatchTime?: (groupName: string, matchId: string, newTime: string) => void;
  onReorderMatches?: (groupName: string, fromIndex: number, toIndex: number) => void;
  managedTeamId?: string;
  onRecordScore?: (matchId: string) => void;
  onShareLeague?: (leagueTable: LeagueTable) => void;
}

const findTeamName = (teamStats: LeagueTeamStats[], teamId: string) => {
    return teamStats.find(s => s.team.id === teamId)?.team.name || '不明なチーム';
};
const findTeamLogo = (teamStats: LeagueTeamStats[], teamId: string) => {
    return teamStats.find(s => s.team.id === teamId)?.team.logoUrl || '';
};

const LeagueTableView: React.FC<LeagueTableViewProps> = ({ 
  leagueTable, 
  isEditing = false,
  onMoveTeam,
  onResultClick,
  onUpdateCourt,
  onUpdateMatchTime,
  onReorderMatches,
  managedTeamId,
  onRecordScore,
  onShareLeague
}) => {
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ type: 'team' | 'match', groupName: string, id: string, index?: number } | null>(null);
  const [movingTeam, setMovingTeam] = useState<{ teamId: string; sourceGroupName: string; teamName: string; } | null>(null);


  if (!leagueTable) {
    return <p className="text-slate-400">リーグ表データがありません。</p>;
  }
  const safeGroups = Array.isArray(leagueTable.groups) ? leagueTable.groups.filter(Boolean) : [];
  
  const handleTeamDragStart = (e: React.DragEvent<HTMLTableRowElement>, teamId: string, sourceGroupName: string) => {
    if (!isEditing || !onMoveTeam) return;
    setDraggedItem({ type: 'team', id: teamId, groupName: sourceGroupName });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleGroupDragOver = (e: React.DragEvent<HTMLDivElement>, groupName: string) => {
    e.preventDefault();
    if(isEditing && draggedItem?.type === 'team') {
        setDragOverGroup(groupName);
    }
  };

  const handleGroupDrop = (e: React.DragEvent<HTMLDivElement>, targetGroupName: string) => {
    e.preventDefault();
    if (isEditing && onMoveTeam && draggedItem?.type === 'team') {
      const { id: teamId, groupName: sourceGroupName } = draggedItem;
      if (teamId && sourceGroupName && sourceGroupName !== targetGroupName) {
        onMoveTeam(teamId, sourceGroupName, targetGroupName);
      }
    }
    setDragOverGroup(null);
    setDraggedItem(null);
  };
  
  const handleMatchDragStart = (e: React.DragEvent<HTMLDivElement>, groupName: string, index: number) => {
      if (!isEditing || !onReorderMatches) return;
      setDraggedItem({ type: 'match', groupName, id: `match-${index}`, index });
      e.dataTransfer.effectAllowed = "move";
  };

  const handleMatchDrop = (e: React.DragEvent<HTMLDivElement>, groupName: string, toIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      if(isEditing && onReorderMatches && draggedItem?.type === 'match' && draggedItem.groupName === groupName && typeof draggedItem.index === 'number' ) {
          onReorderMatches(groupName, draggedItem.index, toIndex);
      }
      setDraggedItem(null);
  };

  const handleDragEnd = () => {
      setDraggedItem(null);
      setDragOverGroup(null);
  };
  
  const handleMobileMoveClick = (teamId: string, teamName: string, sourceGroupName: string) => {
    setMovingTeam({ teamId, teamName, sourceGroupName });
  };
  
  const executeMobileMove = (targetGroupName: string) => {
      if(movingTeam && onMoveTeam) {
          onMoveTeam(movingTeam.teamId, movingTeam.sourceGroupName, targetGroupName);
      }
      setMovingTeam(null);
  };

  return (
    <div className="bg-slate-700/30 p-2 sm:p-4 rounded-lg mt-4 space-y-6">
      <div className="flex justify-between items-center mb-1">
          <div className="flex-1">
              {onShareLeague && (
                  <button onClick={() => onShareLeague(leagueTable)} className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-1 px-3 rounded-md text-xs transition">対戦表を共有</button>
              )}
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-sky-300 text-center flex-1">{leagueTable.name}</h3>
          <div className="flex-1"></div>
      </div>
      {isEditing && <p className="text-center text-xs text-yellow-300 -mt-2 mb-2">PCではドラッグ＆ドロップ、スマホでは「移動」ボタンで編集できます。</p>}
      
      {movingTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
              <div className="bg-slate-800 p-6 rounded-xl w-full max-w-sm">
                  <h4 className="text-lg font-semibold text-sky-400 mb-4">「{movingTeam.teamName}」を移動</h4>
                  <p className="text-sm text-slate-300 mb-2">移動先のグループを選択してください。</p>
                  <div className="space-y-2">
                      {safeGroups.filter(g => g.name !== movingTeam.sourceGroupName).map(group => (
                          <button key={group.name} onClick={() => executeMobileMove(group.name)} className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-md">
                              {group.name}
                          </button>
                      ))}
                  </div>
                  <button onClick={() => setMovingTeam(null)} className="w-full mt-4 bg-slate-500 py-2 rounded-md">キャンセル</button>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {safeGroups.map((group: LeagueGroup) => {
          const safeTeams = Array.isArray(group.teams) ? group.teams : [];
          const safeMatches = Array.isArray(group.matches) ? group.matches : [];

          return (
          <div 
            key={group.name} 
            className={`bg-slate-800/50 p-3 sm:p-4 rounded-md shadow-inner transition-all duration-300 ${isEditing && dragOverGroup === group.name && draggedItem?.type === 'team' ? 'ring-2 ring-yellow-400 scale-105' : ''}`}
            onDragOver={(e) => handleGroupDragOver(e, group.name)}
            onDrop={(e) => handleGroupDrop(e, group.name)}
            onDragLeave={() => setDragOverGroup(null)}
          >
            <h4 className="text-md sm:text-lg font-medium text-sky-400 mb-4 text-center">{group.name}</h4>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-sm">
                <thead className="border-b border-slate-600">
                  <tr>
                    <th className="p-2 w-6">#</th>
                    <th className="p-2">チーム</th>
                    <th className="p-2 text-center" title="試合数">試</th>
                    <th className="p-2 text-center" title="勝利">勝</th>
                    <th className="p-2 text-center" title="引分">分</th>
                    <th className="p-2 text-center" title="敗北">敗</th>
                    <th className="p-2 text-center" title="得失点差">差</th>
                    <th className="p-2 text-center" title="勝ち点">点</th>
                    {isEditing && safeGroups.length > 1 && <th className="p-2 sm:hidden"></th>}
                  </tr>
                </thead>
                <tbody>
                  {safeTeams
                    .sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
                    .map((stats, index) => (
                      <tr 
                        key={stats.team.id}
                        draggable={!!(isEditing && onMoveTeam && safeTeams.length > 1)}
                        onDragStart={(e) => handleTeamDragStart(e, stats.team.id, group.name)}
                        onDragEnd={handleDragEnd}
                        className={`border-b border-slate-700 ${isEditing && onMoveTeam && safeTeams.length > 1 ? 'cursor-move' : ''} ${draggedItem?.type === 'team' && draggedItem.id === stats.team.id ? 'opacity-50' : ''}`}
                      >
                        <td className="p-2 font-semibold text-slate-400">{index + 1}</td>
                        <td className="p-2 flex items-center gap-2 text-sky-300 font-medium">
                            <img src={stats.team.logoUrl} alt={stats.team.name} className="w-5 h-5 rounded-full object-cover"/>
                            <span className="truncate" title={stats.team.name}>{stats.team.name}</span>
                        </td>
                        <td className="p-2 text-center text-slate-300">{stats.played}</td>
                        <td className="p-2 text-center text-slate-300">{stats.wins}</td>
                        <td className="p-2 text-center text-slate-300">{stats.draws}</td>
                        <td className="p-2 text-center text-slate-300">{stats.losses}</td>
                        <td className="p-2 text-center text-slate-300">{stats.goalDifference > 0 ? '+' : ''}{stats.goalDifference}</td>
                        <td className="p-2 text-center font-bold text-white">{stats.points}</td>
                        {isEditing && safeGroups.length > 1 && (
                            <td className="p-2 sm:hidden">
                                <button onClick={() => handleMobileMoveClick(stats.team.id, stats.team.name, group.name)} className="bg-sky-600 text-white text-xs px-2 py-1 rounded">移動</button>
                            </td>
                        )}
                      </tr>
                  ))}
                </tbody>
              </table>
              {safeTeams.length === 0 && <p className="py-8 text-center text-slate-400">このグループにはまだチームがいません。</p>}
            </div>
          
            {safeMatches.length > 0 && (
               <div className="mt-6">
                  <h5 className="text-md font-semibold text-sky-400 mb-3 border-t border-slate-700 pt-4">試合日程</h5>
                  <div className="space-y-3">
                      {safeMatches.map((match, index) => {
                          const isOurMatch = managedTeamId && (match.team1Id === managedTeamId || match.team2Id === managedTeamId);
                          return (
                          <div 
                              key={match.id} 
                              draggable={!!(isEditing && onReorderMatches)}
                              onDragStart={(e) => handleMatchDragStart(e, group.name, index)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleMatchDrop(e, group.name, index)}
                              className={`grid grid-cols-[1fr_auto_1fr] md:grid-cols-[1fr_auto_1fr_auto] gap-x-2 sm:gap-x-3 items-center bg-slate-700/50 p-2 rounded-md transition-opacity ${isEditing && onReorderMatches ? 'cursor-move' : ''} ${draggedItem?.type === 'match' && draggedItem.id === `match-${index}` && draggedItem.groupName === group.name ? 'opacity-30' : 'opacity-100'}`}
                           >
                              <div className="flex items-center gap-2 justify-end text-right text-slate-200 truncate pr-1">
                                  <span>{findTeamName(safeTeams, match.team1Id)}</span>
                                  <img src={findTeamLogo(safeTeams, match.team1Id)} alt="" className="w-5 h-5 rounded-full hidden sm:inline"/>
                              </div>
                              
                              <div className="flex flex-col items-center justify-center">
                                {isEditing && onUpdateMatchTime ? (
                                    <input
                                        type="time"
                                        value={match.startTime || ''}
                                        onChange={e => onUpdateMatchTime(group.name, match.id, e.target.value)}
                                        className="bg-slate-800/80 border border-slate-500 rounded-sm text-sky-300 font-bold text-sm text-center w-24 mb-1"
                                    />
                                ) : (
                                    match.startTime && <span className="text-sm text-amber-300 font-semibold">{match.startTime}</span>
                                )}
                                <div className="flex items-center justify-center gap-1 font-bold text-lg">
                                    {match.played ? (
                                      <>
                                          <span className="text-white">{match.team1Score}</span>
                                          <span className="text-slate-400">-</span>
                                          <span className="text-white">{match.team2Score}</span>
                                      </>
                                    ) : (
                                      <span className="text-slate-400">vs</span>
                                    )}
                                </div>
                              </div>
                              
                               <div className="flex items-center gap-2 text-left text-slate-200 truncate pl-1">
                                  <img src={findTeamLogo(safeTeams, match.team2Id)} alt="" className="w-5 h-5 rounded-full hidden sm:inline"/>
                                  <span>{findTeamName(safeTeams, match.team2Id)}</span>
                              </div>
                              
                              <div className="col-span-3 md:col-span-1 flex justify-center items-center gap-2 mt-2 md:mt-0">
                                 {isEditing && onUpdateCourt ? (
                                      <div className="flex items-center gap-1">
                                        <label htmlFor={`court-${match.id}`} className="text-xs text-slate-400">コート:</label>
                                        <input id={`court-${match.id}`} type="number" title="コート番号" value={match.court || ''} onChange={e => onUpdateCourt(group.name, match.id, parseInt(e.target.value) || 1)} className="w-10 h-6 text-center bg-slate-800/80 border border-slate-500 rounded-sm text-sky-300"/>
                                      </div>
                                 ) : (
                                      match.court && <span className="text-xs text-cyan-400 font-semibold">(コート: {match.court})</span>
                                 )}

                                  {isOurMatch && !isEditing && onRecordScore && (
                                      <button 
                                        onClick={() => onRecordScore(match.id)}
                                        className="text-xs font-medium py-1 px-3 rounded-md transition bg-purple-600 hover:bg-purple-700 text-white"
                                      >
                                        得点記録
                                      </button>
                                  )}
                                  {onResultClick && !isEditing ? (
                                      <button 
                                        onClick={() => onResultClick(group.name, match)}
                                        className={`text-xs font-medium py-1 px-3 rounded-md transition ${match.played ? 'bg-emerald-800 text-emerald-300' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                      >
                                        {match.played ? '結果修正' : '結果入力'}
                                      </button>
                                  ) : (
                                      match.played && !isEditing && <span className="text-xs text-emerald-400 font-semibold px-2">済</span>
                                  )}
                              </div>
                          </div>
                      )})}
                  </div>
               </div>
            )}
          </div>
        )})}
      </div>
    </div>
  );
};

export default LeagueTableView;