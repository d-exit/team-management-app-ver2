// components/TeamManagementPage.tsx
// This component allows editing the user's primary team profile and viewing past match results.
import React, { useState, useCallback, useMemo } from 'react';
import { Team, Member, TeamLevel, PastMatchResult, Match, LeagueMatch, BracketMatch, MatchScoringEvent } from '../types';
import { deepClone } from '../utils/deepClone';

interface TeamManagementPageProps {
  team: Team; // The team to manage/edit
  onUpdateTeam: (updatedTeam: Team) => void;
  pastMatchResults: PastMatchResult[];
  allTeams: Team[];
  matches: Match[]; // To display scoring log
}

const InputField: React.FC<{label: string, name: string, value: string | undefined, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void, type?: string, required?: boolean, placeholder?: string, readOnly?: boolean, options?: {value: string, label: string}[] }> = 
  ({ label, name, value, onChange, type = "text", required = false, placeholder, readOnly = false, options }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
    {type === 'select' && options ? (
      <select id={name} name={name} value={value || ''} onChange={onChange} required={required} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2.5 focus:ring-sky-500 focus:border-sky-500" disabled={readOnly}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    ) : type === 'textarea' ? (
      <textarea id={name} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} rows={3} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2.5 focus:ring-sky-500 focus:border-sky-500" readOnly={readOnly}></textarea>
    ) : (
      <input type={type} id={name} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} required={required} readOnly={readOnly} className={`w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2.5 focus:ring-sky-500 focus:border-sky-500 ${readOnly ? 'text-slate-400 cursor-not-allowed' : ''}`} />
    )}
  </div>
);

const RankItem: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className }) => (
  <div className={`flex justify-between items-baseline mb-2 ${className}`}>
    <p className="text-sm text-slate-400">{label}</p>
    <p className="text-lg font-bold text-sky-300">{value}</p>
  </div>
);

const TeamManagementPage: React.FC<TeamManagementPageProps> = ({ team, onUpdateTeam, pastMatchResults, allTeams, matches }) => {
  const [editableTeam, setEditableTeam] = useState<Team>(() => deepClone(team));
  const [logoPreview, setLogoPreview] = useState<string | null>(team.logoUrl);
  const [editMode, setEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { prefectureRank, ageCategoryRank, overallRank } = useMemo(() => {
    const calculateRank = (teamsToRank: Team[], currentTeamId: string) => {
        const sorted = [...teamsToRank].sort((a, b) => b.rating - a.rating);
        const rank = sorted.findIndex(t => t.id === currentTeamId) + 1;
        return rank > 0 ? `${rank}位 / ${sorted.length}チーム中` : 'ランク外';
    };

    const overall = calculateRank(allTeams, team.id);
    
    const prefectureTeams = team.prefecture ? allTeams.filter(t => t.prefecture === team.prefecture) : [];
    const prefecture = team.prefecture ? calculateRank(prefectureTeams, team.id) : '未設定';

    const ageCategoryTeams = team.ageCategory ? allTeams.filter(t => t.ageCategory === team.ageCategory) : [];
    const ageCategory = team.ageCategory ? calculateRank(ageCategoryTeams, team.id) : '未設定';

    return {
        prefectureRank: prefecture,
        ageCategoryRank: ageCategory,
        overallRank: overall,
    };
  }, [allTeams, team]);

  const scoringLog = useMemo(() => {
    const allEvents: Array<{
      match: Match,
      subMatch?: LeagueMatch | BracketMatch,
      event: MatchScoringEvent & { opponentName?: string }
    }> = [];

    if (!matches) return [];

    matches.forEach(match => {
      // Only check matches our team is in
      const isParticipant = match.ourTeamId === team.id || 
                            match.opponentTeamId === team.id ||
                            match.bracketData?.teams.some(t => t.id === team.id) ||
                            match.leagueCompetitionData?.preliminaryRound.groups.some(g => g.teams.some(ts => ts.team.id === team.id));

      if (!isParticipant) return;

      const getOpponentName = (subMatch?: LeagueMatch | BracketMatch): string => {
        if (!subMatch) { // Training match case
          const opponentId = match.ourTeamId === team.id ? match.opponentTeamId : match.ourTeamId;
          return match.opponentTeamName || allTeams.find(t => t.id === opponentId)?.name || '不明';
        }
        if ('team1Id' in subMatch) { // LeagueMatch
          const opponentId = subMatch.team1Id === team.id ? subMatch.team2Id : subMatch.team1Id;
          return allTeams.find(t => t.id === opponentId)?.name || '不明';
        }
        if ('team1' in subMatch) { // BracketMatch
          if (!subMatch.team1 || !subMatch.team2) return '未定';
          const opponent = subMatch.team1.id === team.id ? subMatch.team2 : subMatch.team1;
          return opponent.name || '不明';
        }
        return '不明';
      };

      (match.scoringEvents || []).forEach(event => {
        // Only show events for our team
        if (event.teamId === team.id) {
          let subMatch: LeagueMatch | BracketMatch | undefined;
          if (event.subMatchId) {
            if (match.leagueCompetitionData) {
              subMatch = match.leagueCompetitionData.preliminaryRound.groups.flatMap(g => g.matches).find(m => m.id === event.subMatchId)
                      || match.leagueCompetitionData.finalRoundLeague?.groups.flatMap(g => g.matches).find(m => m.id === event.subMatchId);
            }
            if (!subMatch && (match.bracketData || match.leagueCompetitionData?.finalRoundTournament)) {
              const bracket = match.bracketData || match.leagueCompetitionData!.finalRoundTournament;
              subMatch = bracket?.rounds.flatMap(r => r.matches).find(m => m.id === event.subMatchId);
            }
          }

          allEvents.push({
            match,
            subMatch,
            event: {
              ...event,
              opponentName: getOpponentName(subMatch)
            }
          });
        }
      });
    });

    return allEvents.sort((a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime());
  }, [matches, team.id, allTeams]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableTeam(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const handleFileChange = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setLogoPreview(result);
            setEditableTeam(prev => ({ ...prev, logoUrl: result }));
        };
        reader.readAsDataURL(file);
    } else {
        alert('画像ファイルを選択してください。');
    }
  };
  
  const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
          setIsDragging(true);
      } else if (e.type === 'dragleave') {
          setIsDragging(false);
      }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileChange(e.dataTransfer.files[0]);
      }
  };


  const handleMemberChange = useCallback((index: number, field: keyof Member, value: string | number) => {
    setEditableTeam(prev => {
      const newMembers = [...prev.members];
      (newMembers[index] as any)[field] = field === 'jerseyNumber' ? Number(value) : value;
      return { ...prev, members: newMembers };
    });
  }, []);

  const addMember = useCallback(() => {
    setEditableTeam(prev => ({
      ...prev,
      members: [...prev.members, { id: `new-${Date.now()}`, name: '', jerseyNumber: 0, position: '' }]
    }));
  }, []);

  const removeMember = useCallback((index: number) => {
    setEditableTeam(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTeam(editableTeam);
    setEditMode(false); 
    alert('チーム情報が更新されました。');
  };
  
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditableTeam(deepClone(team));
    setLogoPreview(team.logoUrl);
  };
  
  const teamLevelOptions = Object.values(TeamLevel).map(level => ({ value: level, label: level }));
  const ageCategoryOptions: { value: string; label: string }[] = [
    { value: '', label: '未設定' },
    ...["U-10", "U-12", "U-15", "一般"].map(cat => ({ value: cat, label: cat }))
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-sky-300">自チーム管理</h2>
        {!editMode && (
             <button onClick={() => { setEditableTeam(deepClone(team)); setLogoPreview(team.logoUrl); setEditMode(true); }} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition">
            プロフィール編集
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
          <div className="md:col-span-2">
            <h3 className="text-xl font-semibold text-sky-400 mb-4">基本情報</h3>
            <InputField label="チーム名" name="name" value={editableTeam.name} onChange={handleChange} required readOnly={!editMode} />
            <InputField label="コーチ名" name="coachName" value={editableTeam.coachName} onChange={handleChange} required readOnly={!editMode} />
            <InputField label="HP URL" name="websiteUrl" value={editableTeam.websiteUrl} onChange={handleChange} type="url" placeholder="https://example.com" readOnly={!editMode} />
            <InputField label="レベル" name="level" value={editableTeam.level} onChange={handleChange} type="select" options={teamLevelOptions} required readOnly={!editMode}/>
            <InputField label="年齢カテゴリ" name="ageCategory" value={editableTeam.ageCategory} onChange={handleChange} type="select" options={ageCategoryOptions} readOnly={!editMode} />
            <InputField label="都道府県" name="prefecture" value={editableTeam.prefecture} onChange={handleChange} placeholder="例: 東京都" readOnly={!editMode} />
          </div>
          
          <div className="md:col-span-1">
             <h3 className="text-xl font-semibold text-sky-400 mb-4">ロゴ</h3>
             {editMode ? (
                 <label 
                     htmlFor="logo-upload"
                     className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-slate-700/50 hover:bg-slate-700 transition-colors ${isDragging ? 'border-sky-400' : 'border-slate-600'}`}
                     onDragEnter={handleDragEvents}
                     onDragOver={handleDragEvents}
                     onDragLeave={handleDragEvents}
                     onDrop={handleDrop}
                 >
                     {logoPreview ? (
                         <img src={logoPreview} alt="ロゴプレビュー" className="object-contain h-full w-full rounded-lg" />
                     ) : (
                         <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                             <svg className="w-8 h-8 mb-4 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                             <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">クリック</span>またはドラッグ&ドロップ</p>
                             <p className="text-xs text-slate-500">PNG, JPG, GIF</p>
                         </div>
                     )}
                     <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
                 </label>
             ) : (
                 <div className="w-full h-40 flex items-center justify-center">
                    <img src={team.logoUrl} alt={`${team.name} ロゴ`} className="max-w-full max-h-full object-contain rounded-lg"/>
                 </div>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <h3 className="text-xl font-semibold text-sky-400 mb-4">ステータス</h3>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                  <RankItem label="総合順位" value={overallRank} />
                  <RankItem label={`${team.prefecture || '都道府県'}内順位`} value={prefectureRank} />
                  <RankItem label={`${team.ageCategory || 'カテゴリ'}内順位`} value={ageCategoryRank} />
                  <RankItem label="レーティング" value={editableTeam.rating} />
              </div>
            </div>
            <div>
              <InputField label="チーム紹介" name="description" value={editableTeam.description} onChange={handleChange} type="textarea" placeholder="チームの紹介文を入力..." readOnly={!editMode} />
            </div>
        </div>


        {editMode && (
          <div className="pt-6 border-t border-slate-700">
            <h3 className="text-xl font-semibold text-sky-400 mb-4">メンバー一覧</h3>
            {editableTeam.members.map((member, index) => (
              <div key={member.id || index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3 p-3 border border-slate-700 rounded-md items-center">
                <input type="text" placeholder="名前" value={member.name} onChange={(e) => handleMemberChange(index, 'name', e.target.value)} className="bg-slate-700 p-2 rounded-md" />
                <input type="number" placeholder="背番号" value={member.jerseyNumber} onChange={(e) => handleMemberChange(index, 'jerseyNumber', e.target.value)} className="bg-slate-700 p-2 rounded-md" />
                <input type="text" placeholder="ポジション" value={member.position} onChange={(e) => handleMemberChange(index, 'position', e.target.value)} className="bg-slate-700 p-2 rounded-md" />
                <button type="button" onClick={() => removeMember(index)} className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-md text-sm">削除</button>
              </div>
            ))}
            <button type="button" onClick={addMember} className="mt-2 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md">
              メンバーを追加 +
            </button>
          </div>
        )}
        
        {editMode && (
          <div className="flex justify-end gap-4 pt-6 border-t border-slate-700">
            <button type="button" onClick={handleCancelEdit} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-6 rounded-lg">
              キャンセル
            </button>
            <button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg">
              保存する
            </button>
          </div>
        )}
      </form>
      {!editMode && team.members.length > 0 && (
         <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl">
            <h3 className="text-xl font-semibold text-sky-400 mb-4">登録メンバー</h3>
             <ul className="list-disc list-inside space-y-2 text-slate-300">
                {team.members.map(member => (
                    <li key={member.id}>
                        <span className="font-semibold text-sky-300">背番号 {member.jerseyNumber}:</span> {member.name} ({member.position})
                    </li>
                ))}
            </ul>
         </div>
      )}

      {/* Scoring Log Section */}
      <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl">
          <h3 className="text-xl font-semibold text-sky-400 mb-4">得点記録一覧</h3>
          {scoringLog.length > 0 ? (
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-600">
                          <tr>
                              <th className="p-2">日付</th>
                              <th className="p-2">大会/試合名</th>
                              <th className="p-2">vs</th>
                              <th className="p-2">時間</th>
                              <th className="p-2">得点者</th>
                              <th className="p-2">アシスト</th>
                          </tr>
                      </thead>
                      <tbody>
                          {scoringLog.map(({match, event}, index) => (
                              <tr key={`${match.id}-${index}`} className="border-b border-slate-700">
                                  <td className="p-2 text-slate-400">{match.date}</td>
                                  <td className="p-2 text-slate-300">{match.location}</td>
                                  <td className="p-2 text-slate-300">{event.opponentName}</td>
                                  <td className="p-2 text-slate-300">{event.period} {event.minute}分</td>
                                  <td className="p-2 font-semibold text-sky-300">{event.scorerName}</td>
                                  <td className="p-2 text-slate-400">{event.assistName || '-'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          ) : (
              <p className="text-slate-400">まだ得点記録はありません。</p>
          )}
      </div>

    </div>
  );
};

export default TeamManagementPage;