
// utils/guidelineFormatter.ts
import { TournamentInfoFormData, TournamentBracket, LeagueTable } from '../types';
import { formatBracketForChat } from './bracketFormatter';
import { formatLeagueForChat } from './leagueFormatter';

/**
 * Formats tournament guideline data into a readable text message for chat.
 * @param data The tournament information form data.
 * @returns A formatted string summary of the guideline.
 */
export const formatGuidelineForChat = (data: TournamentInfoFormData): string => {
    let message = `【大会要項のお知らせ】\n\n`;
    message += `■ 大会名\n${data.eventName || '未設定'}\n\n`;
    
    message += `■ 開催日時\n`;
    message += `日付: ${data.eventDateTime.eventDate || '未定'}\n`;
    message += `時間: ${data.eventDateTime.startTime || '未定'} 〜 ${data.eventDateTime.endTime || '未定'}\n\n`;

    message += `■ 会場\n`;
    message += `${data.venueInfo.facilityName || '未定'}\n`;
    message += `(${data.venueInfo.address || '住所未定'})\n\n`;
    
    message += `詳細な要項は別途ご確認ください。`;

    return message;
};


/**
 * Formats tournament guideline data along with fixtures into a single message.
 * @param data The tournament information form data.
 * @param bracket Optional tournament bracket data.
 * @param league Optional league table data.
 * @returns A formatted string summary of the guideline and fixtures.
 */
export const formatGuidelineWithFixturesForChat = (
    data: TournamentInfoFormData,
    bracket?: TournamentBracket,
    league?: LeagueTable
): string => {
    let message = formatGuidelineForChat(data);
    
    if (bracket) {
        message += '\n\n------------------------\n\n';
        message += formatBracketForChat(bracket);
    } else if (league?.groups.some(g => g.teams.length > 0)) {
        message += '\n\n------------------------\n\n';
        message += formatLeagueForChat(league);
    }
    
    return message;
};
