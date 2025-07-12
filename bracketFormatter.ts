
// utils/bracketFormatter.ts
import { TournamentBracket } from '../types';

/**
 * Formats tournament bracket data into a readable text message for chat.
 * @param bracket The tournament bracket data.
 * @returns A formatted string summary of the bracket.
 */
export const formatBracketForChat = (bracket: TournamentBracket): string => {
    let message = `【トーナメント表: ${bracket.name}】\n\n`;

    bracket.rounds.forEach(round => {
        message += `▼ ${round.name}\n`;
        if (round.matches.length === 0) {
            message += "試合がありません。\n";
        } else {
            round.matches.forEach(match => {
                const team1Name = match.team1?.name || match.placeholderTeam1Text || '未定';
                const team2Name = match.team2?.name || match.placeholderTeam2Text || '未定';
                
                let scoreText = '';
                if(match.isDecided && typeof match.team1Score === 'number' && typeof match.team2Score === 'number') {
                    scoreText = ` [${match.team1Score} - ${match.team2Score}]`;
                }

                message += `・ ${team1Name} vs ${team2Name}${scoreText}\n`;
            });
        }
        message += '\n';
    });

    return message;
};