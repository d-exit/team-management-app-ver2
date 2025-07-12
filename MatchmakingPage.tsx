// components/MatchmakingPage.tsx
import React, { useState, useMemo } from 'react';
import { Team, TeamLevel, MatchmakingFilters } from '../types';

interface MatchmakingPageProps {
  allTeams: Team[]; // All teams available for matchmaking (excluding user's own team)
  onFollowTeam: (teamToFollow: Team) => void;
  followedTeamIds: string[];
  onSelectTeam: (team: Team) => void; // To view profile
}

const prefectures = ['東京都', '大阪府', '福岡県', '北海道', '神奈川県' /* ... */];
const teamLevels = Object.values(TeamLevel);
const ageCategories: Team['ageCategory'][] = ["U-10", "U-12", "U-15", "一般"];

const MatchmakingPage: React.FC<MatchmakingPageProps> = ({ allTeams, onFollowTeam, followedTeamIds, onSelectTeam }) => {
  const [filters, setFilters] = useState<MatchmakingFilters>({
    prefecture: [],
    level: [],
    ageCategory: [],
  });
  const [availableDateFilter, setAvailableDateFilter] = useState('');


  const handleMultiSelectChange = (filterName: keyof MatchmakingFilters, value: string) => {
    setFilters(prev => {
      const currentValues = (prev[filterName] as string[] | undefined) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [filterName]: newValues };
    });
  };
  
  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    setFilters(prev => ({...prev, [name]: value ? parseInt(value) : undefined}));
  };

  const recommendedTeams = useMemo(() => {
    return allTeams.filter(team => {
      const prefectureMatch = filters.prefecture && filters.prefecture.length > 0 ? filters.prefecture.includes(team.prefecture || '') : true;
      const levelMatch = filters.level && filters.level.length > 0 ? filters.level.includes(team.level) : true;
      const ageMatch = filters.ageCategory && filters.ageCategory.length > 0 ? filters.ageCategory.includes(team.ageCategory || '一般') : true;
      const ratingMinMatch = filters.ratingMin ? team.rating >= filters.ratingMin : true;
      const ratingMaxMatch = filters.ratingMax ? team.rating <= filters.ratingMax : true;
      const availableDateMatch = availableDateFilter ? (team.availableSlotsText === '空き' || team.availableSlotsText === '週末のみ空き') : true;

      return prefectureMatch && levelMatch && ageMatch && ratingMinMatch && ratingMaxMatch && availableDateMatch;
    });
  }, [allTeams, filters, availableDateFilter]);
  
  const FilterTag: React.FC<{label: string; value: string | undefined; onRemove?: () => void; compact?: boolean}> = ({label, value, onRemove, compact = false}) => {
    if (!value) return null;
    return (
        <span className={`inline-flex items-center ${compact ? 'text-xs px-1.5 py-0.5' : 'text-xs sm:text-sm px-2.5 py-1'} bg-sky-700 text-sky-200 font-medium rounded-full`}>
            {label}: {value}
            {onRemove && (
                <button onClick={onRemove} className={`ml-1 ${compact ? 'text-xs' : 'text-sm'} text-sky-300 hover:text-sky-100`}>&times;</button>
            )}
        </span>
    );
  };


  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-semibold text-sky-300">マッチング検索</h2>

      <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-300 mb-1.5">都道府県</h4>
            <div className="space-y-0.5 max-h-28 sm:max-h-32 overflow-y-auto pr-1">
              {prefectures.map(pref => (
                <label key={pref} className="flex items-center space-x-1.5 cursor-pointer text-xs sm:text-sm hover:bg-slate-700 p-0.5 sm:p-1 rounded">
                  <input type="checkbox" checked={(filters.prefecture || []).includes(pref)} onChange={() => handleMultiSelectChange('prefecture', pref)}
                    className="form-checkbox h-3.5 w-3.5 sm:h-4 sm:w-4 bg-slate-600 border-slate-500 text-sky-500 focus:ring-sky-500" />
                  <span>{pref}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-300 mb-1.5">レベル</h4>
             <div className="space-y-0.5 max-h-28 sm:max-h-32 overflow-y-auto pr-1">
              {teamLevels.map(level => (
                <label key={level} className="flex items-center space-x-1.5 cursor-pointer text-xs sm:text-sm hover:bg-slate-700 p-0.5 sm:p-1 rounded">
                  <input type="checkbox" checked={(filters.level || []).includes(level)} onChange={() => handleMultiSelectChange('level', level)}
                    className="form-checkbox h-3.5 w-3.5 sm:h-4 sm:w-4 bg-slate-600 border-slate-500 text-sky-500 focus:ring-sky-500" />
                  <span>{level}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-300 mb-1.5">年齢カテゴリ</h4>
             <div className="space-y-0.5 max-h-28 sm:max-h-32 overflow-y-auto pr-1">
              {ageCategories.map(age => (
                <label key={age} className="flex items-center space-x-1.5 cursor-pointer text-xs sm:text-sm hover:bg-slate-700 p-0.5 sm:p-1 rounded">
                  <input type="checkbox" checked={(filters.ageCategory || []).includes(age)} onChange={() => handleMultiSelectChange('ageCategory', age)}
                    className="form-checkbox h-3.5 w-3.5 sm:h-4 sm:w-4 bg-slate-600 border-slate-500 text-sky-500 focus:ring-sky-500" />
                  <span>{age}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2 md:col-span-1">
            <h4 className="text-sm sm:text-base font-semibold text-slate-300 mb-1.5">レーティング</h4>
            <div className="flex gap-1.5 items-center">
              <input type="number" name="ratingMin" placeholder="最小" value={filters.ratingMin || ''} onChange={handleRatingChange} className="w-1/2 bg-slate-700 p-1.5 rounded-md border border-slate-600 text-xs sm:text-sm" />
              <span className="text-xs sm:text-sm">～</span>
              <input type="number" name="ratingMax" placeholder="最大" value={filters.ratingMax || ''} onChange={handleRatingChange} className="w-1/2 bg-slate-700 p-1.5 rounded-md border border-slate-600 text-xs sm:text-sm" />
            </div>
          </div>
          
           <div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-300 mb-1.5">空き日程</h4>
            <input type="date" value={availableDateFilter} onChange={(e) => setAvailableDateFilter(e.target.value)}
                className="w-full bg-slate-700 p-1.5 rounded-md border border-slate-600 text-slate-400 text-xs sm:text-sm" />
            <p className="text-xs text-slate-500 mt-0.5">チームの「空き」状況で簡易検索</p>
          </div>
        </div>
      </div>
      
        <div className="my-3 space-x-1.5 space-y-1.5">
            {(filters.prefecture || []).map(p => <FilterTag key={p} label="県" value={p} onRemove={() => handleMultiSelectChange('prefecture', p)} compact />)}
            {(filters.level || []).map(l => <FilterTag key={l} label="Lv" value={l.substring(0,2)} onRemove={() => handleMultiSelectChange('level', l)} compact />)}
            {(filters.ageCategory || []).map(a => <FilterTag key={a} label="年" value={a} onRemove={() => handleMultiSelectChange('ageCategory', a)} compact />)}
            {filters.ratingMin && <FilterTag label="minR" value={String(filters.ratingMin)} onRemove={() => setFilters(f => ({...f, ratingMin: undefined}))} compact />}
            {filters.ratingMax && <FilterTag label="maxR" value={String(filters.ratingMax)} onRemove={() => setFilters(f => ({...f, ratingMax: undefined}))} compact />}
            {availableDateFilter && <FilterTag label="日" value={availableDateFilter.substring(5)} onRemove={() => setAvailableDateFilter('')} compact />}
        </div>


      <h3 className="text-xl sm:text-2xl font-semibold text-sky-300 mt-6">おすすめチーム ({recommendedTeams.length}件)</h3>
      {recommendedTeams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {recommendedTeams.map(team => (
            <div key={team.id} className="bg-slate-800 rounded-lg shadow-xl overflow-hidden flex flex-col">
              <div className="h-20 sm:h-24 w-full overflow-hidden cursor-pointer" onClick={() => onSelectTeam(team)}>
                <img src={team.logoUrl} alt={`${team.name} ロゴ`} className="w-full h-full object-cover" />
              </div>
              <div className="p-2 sm:p-2.5 flex flex-col flex-grow">
                <h4 className="text-sm sm:text-base font-semibold text-sky-400 mb-1 truncate cursor-pointer hover:underline" onClick={() => onSelectTeam(team)}>{team.name}</h4>
                
                <div className="mb-1.5 sm:mb-2 space-x-1 space-y-1 flex flex-wrap">
                    <FilterTag label="県" value={team.prefecture?.substring(0,2)} compact />
                    <FilterTag label="Lv" value={team.level.substring(0,2)} compact />
                    <FilterTag label="年" value={team.ageCategory} compact />
                    <FilterTag label="R" value={String(team.rating)} compact />
                    <FilterTag label="空" value={team.availableSlotsText} compact />
                </div>
                
                <button 
                  onClick={() => onFollowTeam(team)}
                  disabled={followedTeamIds.includes(team.id)}
                  className={`w-full text-xs font-medium py-2 px-2.5 rounded-md transition mt-auto 
                              ${followedTeamIds.includes(team.id) 
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-700 text-white'}`}
                >
                  {followedTeamIds.includes(team.id) ? 'フォロー済み' : 'フォローする'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-slate-400 text-lg sm:text-xl py-8 sm:py-10">条件に合うチームが見つかりませんでした。</p>
      )}
    </div>
  );
};

export default MatchmakingPage;