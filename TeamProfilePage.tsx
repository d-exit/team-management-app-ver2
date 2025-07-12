// components/TeamProfilePage.tsx
// This component displays the detailed profile of a selected team.
import React, { useMemo } from 'react';
import { Team } from '../types';

// Define props for the TeamProfilePage component
interface TeamProfilePageProps {
  team: Team;
  onBack: () => void;
  allTeams: Team[];
}

// Helper component for displaying individual stat items
const StatItem: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className }) => (
  <div className={`mb-3 ${className}`}>
    <p className="text-sm text-slate-400">{label}</p>
    <p className="text-lg text-sky-300">{value}</p>
  </div>
);

const RankItem: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className }) => (
  <div className={`flex justify-between items-baseline mb-2 ${className}`}>
    <p className="text-sm text-slate-400 truncate" title={label}>{label}</p>
    <p className="text-base font-bold text-sky-300 whitespace-nowrap">{value}</p>
  </div>
);

const TeamProfilePage: React.FC<TeamProfilePageProps> = ({ team, onBack, allTeams }) => {

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


  return (
    // Main container for the profile page with background and padding
    <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl relative">
      {/* Back button positioned at the top right */}
      <button
        onClick={onBack}
        className="absolute top-4 right-4 bg-slate-700 hover:bg-slate-600 text-sky-300 font-semibold py-2 px-4 rounded-lg transition duration-150"
      >
        &larr; 戻る
      </button>

      {/* Team Header Section */}
      <div className="flex flex-col sm:flex-row items-center mb-8 pb-6 border-b border-slate-700">
        {/* Team Logo */}
        <img 
          src={team.logoUrl} 
          alt={`${team.name} ロゴ`} 
          className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover mr-0 sm:mr-8 mb-4 sm:mb-0 border-4 border-sky-500 shadow-lg"
        />
        {/* Team Name and Coach */}
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-sky-400 mb-1">{team.name}</h2>
          <p className="text-lg text-slate-300">コーチ: {team.coachName}</p>
          {/* Team Website URL (if available) */}
          {team.websiteUrl && (
            <a 
              href={team.websiteUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-cyan-400 hover:text-cyan-300 transition duration-150 inline-block mt-1"
            >
              公式ウェブサイト &rarr;
            </a>
          )}
        </div>
      </div>

      {/* Team Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-8">
        {/* Left column for general info */}
        <div className="lg:col-span-1">
          <h3 className="text-2xl font-semibold text-sky-300 mb-4">チーム情報</h3>
          <StatItem label="レベル" value={team.level} />
          <StatItem label="レーティング" value={team.rating} className="text-emerald-400" />
        </div>
        
        <div className="lg:col-span-1">
             <h3 className="text-2xl font-semibold text-sky-300 mb-4">ランキング</h3>
             <div className="bg-slate-700/50 p-4 rounded-lg space-y-2">
                 <RankItem label="総合順位" value={overallRank} />
                 <RankItem label={`${team.prefecture || '都道府県'}内順位`} value={prefectureRank} />
                 <RankItem label={`${team.ageCategory || 'カテゴリ'}内順位`} value={ageCategoryRank} />
             </div>
        </div>

        {/* Right column for description */}
        <div className="md:col-span-2 lg:col-span-1">
           <h3 className="text-2xl font-semibold text-sky-300 mb-4">チーム紹介</h3>
           <p className="text-slate-300 leading-relaxed whitespace-pre-line">{team.description || '紹介文がありません。'}</p>
        </div>
      </div>

    </div>
  );
};

export default TeamProfilePage;