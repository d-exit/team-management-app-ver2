// utils/validation.ts
import { Match, LeagueGroup } from '../types';

/**
 * Validates the integrity of the matches state, specifically checking for
 * the existence of the `matches` array in all league groups. This acts as a
 * gatekeeper to prevent corrupted state from being set.
 * @param matches The array of Match objects to validate.
 * @returns `true` if the state is valid, `false` otherwise.
 */
export const validateMatchesState = (matches: Match[]): boolean => {
  for (const match of matches) {
    if (match.leagueCompetitionData) {
      const competition = match.leagueCompetitionData;
      
      const allGroups: (LeagueGroup | undefined)[] = [];
      if (competition.preliminaryRound && competition.preliminaryRound.groups) {
        allGroups.push(...competition.preliminaryRound.groups);
      }
      if (competition.finalRoundLeague && competition.finalRoundLeague.groups) {
        allGroups.push(...competition.finalRoundLeague.groups);
      }

      for (const group of allGroups) {
        // This is the core check that was failing. A group object must exist and must have a `matches` array.
        if (!group || !Array.isArray(group.matches)) {
          console.error(
            'STATE VALIDATION FAILED: A LeagueGroup object is missing its `matches` property or is malformed.',
            { matchId: match.id, groupName: group?.name, invalidGroupObject: group }
          );
          // Found an invalid group, stop and report failure immediately.
          return false;
        }
      }
    }
  }
  // If we get here, all groups in all matches were valid.
  return true;
};
