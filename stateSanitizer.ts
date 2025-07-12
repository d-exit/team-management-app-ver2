// utils/stateSanitizer.ts
import { Match, LeagueGroup } from '../types';
import { deepClone } from './deepClone';

/**
 * Proactively sanitizes and heals the match state. It performs a deep clone
 * and ensures that every LeagueGroup object has a valid `matches` array,
 * creating an empty one if it's missing. It also filters out any null or
 * undefined entries from the groups array itself.
 * This provides a robust defense against data corruption.
 * @param matches The array of Match objects to sanitize.
 * @returns A sanitized, deep-cloned array of Match objects.
 */
export const sanitizeMatchesState = (matches: Match[]): Match[] => {
  if (!matches) return [];
  
  // Start with a deep clone to ensure immutability.
  const sanitizedMatches = deepClone(matches);

  for (const match of sanitizedMatches) {
    if (match?.leagueCompetitionData) {
      const competition = match.leagueCompetitionData;
      
      const sanitizeGroupArray = (groups: LeagueGroup[] | undefined): LeagueGroup[] => {
        if (!Array.isArray(groups)) {
            return []; // Return an empty array if groups is not an array, preventing downstream errors.
        }

        // Filter out null/undefined groups, then "heal" the remaining valid ones.
        return groups
          .filter(g => g) // Remove any null or undefined values from the array itself.
          .map(group => {
            // For each valid group, ensure its `matches` property is a valid array.
            if (!Array.isArray(group.matches)) {
                 console.warn(
                    `STATE SANITIZER: Healed malformed LeagueGroup (ID: ${match.id}, Group: ${group.name}). Missing 'matches' array.`
                 );
                 group.matches = []; // Heal the object by creating the missing array.
            }
            return group;
        });
      };
      
      if (competition.preliminaryRound) {
        competition.preliminaryRound.groups = sanitizeGroupArray(competition.preliminaryRound.groups);
      }
      
      if (competition.finalRoundLeague) {
        competition.finalRoundLeague.groups = sanitizeGroupArray(competition.finalRoundLeague.groups);
      }
    }
  }

  return sanitizedMatches;
};
