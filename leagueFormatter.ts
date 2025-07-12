
// utils/leagueFormatter.ts
import { LeagueTable } from '../types';

/**
 * Formats league table data into a readable text message for chat.
 * @param league The league table data.
 * @returns A formatted string summary of the league standings.
 */
export const formatLeagueForChat = (league: LeagueTable): string => {
    let message = `【リーグ順位表: ${league.name}】\n\n`;

    league.groups.forEach(group => {
        message += `▼ ${group.name}\n`;
        const sortedTeams = [...group.teams].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
        
        if (sortedTeams.length === 0) {
            message += "チームがいません。\n";
        } else {
            sortedTeams.forEach((stats, index) => {
                message += `${index + 1}. ${stats.team.name} (勝点:${stats.points}, 得失:${stats.goalDifference > 0 ? '+' : ''}${stats.goalDifference})\n`;
            });
        }
        message += '\n';
    });

    return message;
};