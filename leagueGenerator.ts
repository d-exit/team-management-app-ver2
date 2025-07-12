// utils/leagueGenerator.ts
import { Team, LeagueTeamStats, LeagueGroup, LeagueTable, LeagueMatch } from '../types';

/**
 * Helper to add minutes to a time string (HH:mm) and return a new time string.
 * @param time The initial time string, e.g., "10:00".
 * @param minutes The number of minutes to add.
 * @returns The new time string, e.g., "10:25".
 */
export const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins, 0, 0);
    date.setMinutes(date.getMinutes() + minutes);
    const newHours = date.getHours().toString().padStart(2, '0');
    const newMins = date.getMinutes().toString().padStart(2, '0');
    return `${newHours}:${newMins}`;
};

/**
 * Generates all unique round-robin pairings for a given set of teams.
 * @param teamStats Array of team statistics objects.
 * @returns An array of LeagueMatch objects representing the fixtures.
 */
export const generateFixturesForGroup = (teamStats: LeagueTeamStats[]): LeagueMatch[] => {
  const fixtures: LeagueMatch[] = [];
  if (teamStats.length < 2) {
    return fixtures;
  }

  for (let i = 0; i < teamStats.length; i++) {
    for (let j = i + 1; j < teamStats.length; j++) {
      const team1 = teamStats[i].team;
      const team2 = teamStats[j].team;
      fixtures.push({
        id: `fixture-${team1.id}-vs-${team2.id}-${Date.now()}${Math.random()}`,
        team1Id: team1.id,
        team2Id: team2.id,
        played: false,
      });
    }
  }
  return fixtures;
};

/**
 * Sorts teams within groups and returns the top N teams from each group.
 * @param league The league table containing groups and team stats.
 * @param teamsPerGroup The number of top teams to select from each group.
 * @returns An array of Team objects that are advancing.
 */
export const getAdvancingTeams = (league: LeagueTable, teamsPerGroup: number): Team[] => {
    const advancingTeams: Team[] = [];
    league.groups.forEach(group => {
        const sortedTeams = [...group.teams].sort((a, b) => 
            b.points - a.points || 
            b.goalDifference - a.goalDifference || 
            b.goalsFor - a.goalsFor
        );
        const advancingStats = sortedTeams.slice(0, teamsPerGroup);
        advancingTeams.push(...advancingStats.map(stat => stat.team));
    });
    return advancingTeams;
};


/**
 * Generates a league table structure, including all match fixtures with calculated start times.
 * @param teams Array of participating teams.
 * @param numGroups Number of groups to distribute teams into.
 * @param numberOfCourts Number of courts available.
 * @param eventStartTime The overall start time for the event (e.g., "10:00").
 * @param matchDurationInMinutes The duration of a single match.
 * @param restTimeInMinutes The rest time between matches on the same court.
 * @returns A LeagueTable object or null if input is invalid.
 */
export const generateLeagueTable = (
  teams: Team[],
  numGroups: number,
  numberOfCourts: number = 1,
  eventStartTime?: string,
  matchDurationInMinutes?: number,
  restTimeInMinutes?: number
): LeagueTable | null => {
  if (teams.length < 2 || numGroups < 1 || numGroups > teams.length) {
    console.error("Invalid input for generating league table.");
    return null;
  }

  // 1. Initialize groups
  const groups: LeagueGroup[] = Array.from({ length: numGroups }, (_, i) => ({
    name: numGroups > 1 ? `グループ ${String.fromCharCode(65 + i)}` : 'リーグ戦',
    teams: [],
    matches: [],
  }));

  // 2. Distribute teams into groups (round-robin)
  teams.forEach((team, index) => {
    const groupIndex = index % numGroups;
    const teamStats: LeagueTeamStats = {
      team,
      played: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
    };
    groups[groupIndex].teams.push(teamStats);
  });
  
  // 3. Generate fixtures for each group
  groups.forEach(group => {
    group.matches = generateFixturesForGroup(group.teams);
  });
  
  // 4. Schedule all matches across all groups
  if (eventStartTime && typeof matchDurationInMinutes === 'number' && typeof restTimeInMinutes === 'number') {
    const allMatches = groups.flatMap(g => g.matches);
    const courtNextAvailableTime: string[] = Array(numberOfCourts).fill(eventStartTime);
    const totalTimePerMatchSlot = matchDurationInMinutes + restTimeInMinutes;

    allMatches.forEach(match => {
        let earliestCourtIndex = 0;
        // Find the court that is free the earliest
        for (let i = 1; i < courtNextAvailableTime.length; i++) {
            if (courtNextAvailableTime[i] < courtNextAvailableTime[earliestCourtIndex]) {
                earliestCourtIndex = i;
            }
        }
        
        // Assign the match to this court and update the court's next available time
        match.startTime = courtNextAvailableTime[earliestCourtIndex];
        match.court = earliestCourtIndex + 1;
        courtNextAvailableTime[earliestCourtIndex] = addMinutesToTime(match.startTime, totalTimePerMatchSlot);
    });

    // Sort matches within each group by start time
    groups.forEach(group => {
        group.matches.sort((a,b) => {
            if (a.startTime && b.startTime) {
                return a.startTime.localeCompare(b.startTime);
            }
            return 0;
        });
    });
  }

  return {
    id: `league-${Date.now()}`,
    name: 'リーグ戦',
    groups,
  };
};
