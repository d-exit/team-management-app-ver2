// utils/leagueTableEditor.ts
// Helper functions for editing LeagueTable data, specifically for moving teams between groups.
import { LeagueTable, LeagueGroup, LeagueTeamStats, LeagueMatch, LeagueCompetition } from '../types';
import { generateFixturesForGroup } from './leagueGenerator';
import { deepClone } from './deepClone';

const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins, 0, 0);
    date.setMinutes(date.getMinutes() + minutes);
    const newHours = date.getHours().toString().padStart(2, '0');
    const newMins = date.getMinutes().toString().padStart(2, '0');
    return `${newHours}:${newMins}`;
};

/**
 * Moves a team from a source group to a target group within a LeagueTable.
 * This is a destructive operation for results, as it resets stats and regenerates matches for affected groups.
 * @param currentLeagueCompetition The entire competition object.
 * @param teamIdToMove The ID of the team to move.
 * @param sourceGroupName The name of the group the team is currently in.
 * @param targetGroupName The name of the group to move the team to.
 * @param numberOfCourts The total number of courts available for the competition.
 * @param eventStartTime The overall start time for the event.
 * @param matchDurationInMinutes The duration of a single match.
 * @param restTimeInMinutes The rest time between matches on the same court.
 * @returns A new LeagueCompetition object with the team moved, or null if the operation is invalid.
 */
export const moveTeamBetweenGroups = (
  currentLeagueCompetition: LeagueCompetition,
  teamIdToMove: string,
  sourceGroupName: string,
  targetGroupName: string,
  numberOfCourts: number,
  eventStartTime?: string,
  matchDurationInMinutes?: number,
  restTimeInMinutes?: number
): LeagueCompetition | null => {
  if (!currentLeagueCompetition || !teamIdToMove || !sourceGroupName || !targetGroupName || numberOfCourts < 1) {
      console.error("Invalid arguments for moving team.", {currentLeagueCompetition, teamIdToMove, sourceGroupName, targetGroupName, numberOfCourts});
      return null;
  }
  if (sourceGroupName === targetGroupName) return currentLeagueCompetition; 

  // Use deep copy to ensure immutability, which is crucial for React state updates.
  const newCompetition: LeagueCompetition = deepClone(currentLeagueCompetition);
  const leagueTable = newCompetition.preliminaryRound;

  const sourceGroup = leagueTable.groups.find(g => g.name === sourceGroupName);
  const targetGroup = leagueTable.groups.find(g => g.name === targetGroupName);

  if (!sourceGroup || !targetGroup) {
      console.error("Source or target group not found for moving team.");
      return null;
  }

  const teamIndexInSourceGroup = sourceGroup.teams.findIndex(ts => ts.team.id === teamIdToMove);

  if (teamIndexInSourceGroup === -1) {
      console.error("Team to move not found in the source group.");
      return null;
  }
  
  // Move the team's stats object to the new group.
  const [teamStatsToMove] = sourceGroup.teams.splice(teamIndexInSourceGroup, 1);
  targetGroup.teams.push(teamStatsToMove);

  // Reset stats and regenerate matches for both affected groups
  [sourceGroup, targetGroup].forEach(group => {
      // Reset all team stats in the group to zero as standings are now invalid.
      group.teams.forEach(stats => {
          stats.played = 0;
          stats.wins = 0;
          stats.draws = 0;
          stats.losses = 0;
          stats.goalsFor = 0;
          stats.goalsAgainst = 0;
          stats.goalDifference = 0;
          stats.points = 0;
      });
      // Regenerate the match fixtures for the group with the new set of teams.
      group.matches = generateFixturesForGroup(group.teams);

      // Reschedule times for the updated groups
      if (eventStartTime && typeof matchDurationInMinutes === 'number' && typeof restTimeInMinutes === 'number') {
          const courtNextAvailableTime: string[] = Array(numberOfCourts).fill(eventStartTime);
          const totalTimeForSlot = matchDurationInMinutes + restTimeInMinutes;

          group.matches.forEach(match => {
              let earliestCourtIndex = 0;
              for (let i = 1; i < courtNextAvailableTime.length; i++) {
                  if (courtNextAvailableTime[i] < courtNextAvailableTime[earliestCourtIndex]) {
                      earliestCourtIndex = i;
                  }
              }
              match.startTime = courtNextAvailableTime[earliestCourtIndex];
              match.court = earliestCourtIndex + 1;
              courtNextAvailableTime[earliestCourtIndex] = addMinutesToTime(match.startTime, totalTimeForSlot);
          });
           group.matches.sort((a, b) => {
                if(a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                return (a.court || 0) - (b.court || 0);
            });
      }

      // Sort teams alphabetically for consistent initial display.
      group.teams.sort((a, b) => a.team.name.localeCompare(b.team.name, 'ja'));
  });

  return newCompetition;
};


/**
 * Recalculates all team statistics in a group based on all its match results.
 * This function is made robust to handle malformed group objects without crashing.
 * @param group The league group to recalculate.
 * @returns The same group object with updated team statistics.
 */
const recalculateAllStatsForGroup = (group: LeagueGroup): LeagueGroup => {
    if (!group) {
        console.error("recalculateAllStatsForGroup was called with a null or undefined group.");
        return group; 
    }
    
    // Defensive Healing: Ensure 'matches' property is a valid array to prevent crashes.
    if (!group.matches || !Array.isArray(group.matches)) {
        console.warn(`Group "${group.name}" was missing or had an invalid 'matches' array. Initializing to empty array to prevent crash.`);
        group.matches = [];
    }
    
    // 1. Reset all stats to zero
    group.teams.forEach(ts => {
        ts.played = 0;
        ts.wins = 0;
        ts.draws = 0;
        ts.losses = 0;
        ts.goalsFor = 0;
        ts.goalsAgainst = 0;
        ts.goalDifference = 0;
        ts.points = 0;
    });

    // 2. Iterate through all played matches and apply results
    group.matches.forEach(match => {
        if (!match.played || typeof match.team1Score !== 'number' || typeof match.team2Score !== 'number') {
            return; // Skip matches that are not played
        }

        const team1Stats = group.teams.find(t => t.team.id === match.team1Id);
        const team2Stats = group.teams.find(t => t.team.id === match.team2Id);

        if (!team1Stats || !team2Stats) return;

        team1Stats.played += 1;
        team2Stats.played += 1;
        team1Stats.goalsFor += match.team1Score;
        team1Stats.goalsAgainst += match.team2Score;
        team2Stats.goalsFor += match.team2Score;
        team2Stats.goalsAgainst += match.team1Score;
        team1Stats.goalDifference = team1Stats.goalsFor - team1Stats.goalsAgainst;
        team2Stats.goalDifference = team2Stats.goalsFor - team2Stats.goalsAgainst;
        
        if (match.team1Score > match.team2Score) { // Team 1 wins
            team1Stats.wins += 1;
            team1Stats.points += 3;
            team2Stats.losses += 1;
        } else if (match.team2Score > match.team1Score) { // Team 2 wins
            team2Stats.wins += 1;
            team2Stats.points += 3;
            team1Stats.losses += 1;
        } else { // Score is a draw
            if (match.winnerId) { // There's a winner from PK shootout etc.
                if (match.winnerId === team1Stats.team.id) {
                    team1Stats.wins += 1; 
                    team1Stats.points += 2; // PK win = 2 points
                    team2Stats.losses += 1;
                    team2Stats.points += 1; // PK loss = 1 point
                } else {
                    team2Stats.wins += 1;
                    team2Stats.points += 2;
                    team1Stats.losses += 1;
                    team1Stats.points += 1;
                }
            } else { // Standard draw
                team1Stats.draws += 1;
                team2Stats.draws += 1;
                team1Stats.points += 1;
                team2Stats.points += 1;
            }
        }
    });

    return group;
}

/**
 * Updates a league match with a new score and recalculates the statistics for the entire group.
 * This function is made robust to handle malformed group objects.
 * @param group The league group where the match took place.
 * @param updatedMatch The league match with new score information.
 * @returns A new LeagueGroup object with updated stats, or null if invalid.
 */
export const updateLeagueStatsAfterMatch = (
    group: LeagueGroup,
    updatedMatch: LeagueMatch
): LeagueGroup | null => {
    if (!group || !updatedMatch) {
        console.error("updateLeagueStatsAfterMatch called with invalid arguments.", { group, updatedMatch });
        return null;
    }

    const newGroup: LeagueGroup = deepClone(group);

    // Defensive Healing: Ensure the 'matches' array exists on the copied group.
    if (!newGroup.matches || !Array.isArray(newGroup.matches)) {
        console.warn(`Group "${newGroup.name}" had a missing 'matches' array during an update. Initializing to empty array.`);
        newGroup.matches = [];
    }

    const matchIndex = newGroup.matches.findIndex(m => m.id === updatedMatch.id);
    if (matchIndex === -1) {
        console.error("Match to update not found in group.", { matchId: updatedMatch.id, groupName: newGroup.name });
        return null;
    }
    
    // Update the specific match
    newGroup.matches[matchIndex] = updatedMatch;
    
    // Recalculate all stats from scratch to ensure consistency
    const fullyRecalculatedGroup = recalculateAllStatsForGroup(newGroup);

    return fullyRecalculatedGroup;
};
