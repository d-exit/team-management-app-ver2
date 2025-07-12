
// utils/pdfFormatters.ts
import { TournamentBracket, LeagueTable } from '../types';

const escapeHTML = (unsafe: string): string => {
    if (typeof unsafe !== 'string') return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

export const formatBracketForPdf = (bracket: TournamentBracket): string => {
    let html = `<h2 class="fixture-title">トーナメント表: ${escapeHTML(bracket.name)}</h2>`;
    html += `<div class="bracket-container">`;

    bracket.rounds.forEach(round => {
        html += `<div class="bracket-round">`;
        html += `<h3 class="bracket-round-title">${escapeHTML(round.name)}</h3>`;
        round.matches.forEach(match => {
            const team1Name = match.team1?.name || match.placeholderTeam1Text || '未定';
            const team2Name = match.team2?.name || match.placeholderTeam2Text || '未定';
            const team1Score = typeof match.team1Score === 'number' ? match.team1Score : '-';
            const team2Score = typeof match.team2Score === 'number' ? match.team2Score : '-';
            
            html += `<div class="bracket-match">`;
            html += `<div class="match-teams"><div class="team">${escapeHTML(team1Name)}</div><div class="score">${team1Score}</div></div>`;
            html += `<div class="match-teams"><div class="team">${escapeHTML(team2Name)}</div><div class="score">${team2Score}</div></div>`;
            html += `</div>`;
        });
        html += `</div>`;
    });

    html += `</div>`;
    return html;
};


export const formatLeagueForPdf = (league: LeagueTable): string => {
    let html = `<h2 class="fixture-title">リーグ表: ${escapeHTML(league.name)}</h2>`;

    league.groups.forEach(group => {
        html += `<h3 class="league-group-title">${escapeHTML(group.name)}</h3>`;
        html += `<table class="league-table">`;
        html += `<thead><tr><th>#</th><th>チーム</th><th>試</th><th>勝</th><th>分</th><th>敗</th><th>得失</th><th>点</th></tr></thead>`;
        html += `<tbody>`;
        
        const sortedTeams = [...group.teams].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
        
        sortedTeams.forEach((stats, index) => {
            html += `<tr>
                        <td>${index + 1}</td>
                        <td class="team-name-cell">${escapeHTML(stats.team.name)}</td>
                        <td>${stats.played}</td>
                        <td>${stats.wins}</td>
                        <td>${stats.draws}</td>
                        <td>${stats.losses}</td>
                        <td>${stats.goalDifference > 0 ? '+' : ''}${stats.goalDifference}</td>
                        <td>${stats.points}</td>
                     </tr>`;
        });

        html += `</tbody></table>`;
    });

    return html;
};
