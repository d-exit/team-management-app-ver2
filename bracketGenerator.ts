
// utils/bracketGenerator.ts
import { Team, BracketTeam, BracketMatch, BracketRound, TournamentBracket } from '../types';

// Helper function to add minutes to a time string (HH:mm)
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
 * Generates a single-elimination tournament bracket with scheduling.
 * @param teams Array of participating teams.
 * @param seedTeamIds Array of team IDs to be treated as seeds. These teams get a bye.
 * @param numberOfCourts Number of courts available.
 * @param eventStartTime Optional start time for scheduling.
 * @param matchDurationInMinutes Optional duration for scheduling.
 * @param restTimeInMinutes Optional rest time for scheduling.
 * @returns TournamentBracket object or null if input is invalid.
 */
export const generateTournamentBracket = (
  teams: Team[],
  seedTeamIds: string[],
  numberOfCourts: number = 1,
  eventStartTime?: string,
  matchDurationInMinutes?: number,
  restTimeInMinutes?: number
): TournamentBracket | null => {
  if (teams.length < 2) {
    console.error("トーナメントには少なくとも2チーム必要です。");
    return null;
  }

  // 1. Determine bracket size (next power of 2)
  let bracketSize = 2;
  while (bracketSize < teams.length) {
    bracketSize *= 2;
  }
  const numRounds = Math.log2(bracketSize);
  const numByes = bracketSize - teams.length;
  
  // A check that should be handled by UI, but as a safeguard.
  if (seedTeamIds.length !== numByes && teams.length !== bracketSize) {
      console.error(`シードチームの数(${seedTeamIds.length})が、必要な不戦勝の数(${numByes})と一致しません。`);
      return null;
  }

  // 2. Build all rounds and matches structurally first
  const rounds: BracketRound[] = [];
  let numMatchesInRound = bracketSize / 2;
  for (let r = 0; r < numRounds; r++) {
    const roundNameMap: { [key: number]: string } = {
        [numRounds-1]: '決勝',
        [numRounds-2]: '準決勝',
        [numRounds-3]: '準々決勝',
    };
    const roundName = roundNameMap[r] || `ラウンド ${r + 1}`;
    
    const matchesInThisRound: BracketMatch[] = [];
    for (let m = 0; m < numMatchesInRound; m++) {
      matchesInThisRound.push({
        id: `r${r}m${m}`,
        roundIndex: r,
        matchIndexInRound: m,
        team1: null, team2: null, winner: null,
        isDecided: false, isPlayable: false,
      });
    }
    rounds.push({ name: roundName, matches: matchesInThisRound });
    numMatchesInRound /= 2;
  }
  
  // 3. Link subsequent matches
  for (let r = 0; r < numRounds - 1; r++) {
    for (let i = 0; i < rounds[r].matches.length; i++) {
      const currentMatch = rounds[r].matches[i];
      const nextMatchIndex = Math.floor(i / 2);
      const nextMatch = rounds[r + 1].matches[nextMatchIndex];
      currentMatch.nextMatchId = nextMatch.id;
      currentMatch.nextMatchSlot = i % 2 === 0 ? 'team1' : 'team2';
    }
  }

  // 4. Place teams into Round 1
  const unseededTeams = teams.filter(t => !seedTeamIds.includes(t.id));
  const seededTeams = teams.filter(t => seedTeamIds.includes(t.id));
  
  const teamsToPlaceInRound1 = [...unseededTeams];
  
  const round1Matches = rounds[0].matches;
  let teamCounter = 0;
  for (let i = 0; i < round1Matches.length; i++) {
    if (teamCounter < teamsToPlaceInRound1.length) {
        round1Matches[i].team1 = teamsToPlaceInRound1[teamCounter++];
    }
    if (teamCounter < teamsToPlaceInRound1.length) {
        round1Matches[i].team2 = teamsToPlaceInRound1[teamCounter++];
    }
  }

  // 5. Place seeded teams (who get a BYE) directly into Round 2
  if (rounds.length > 1) {
    const round2Matches = rounds[1].matches;
    let seedCounter = 0;
    // Distribute seeded teams into team2 slots of round 2 matches for visual balance
    for (let i = 0; i < round2Matches.length; i++) {
        if(seedCounter < seededTeams.length) {
             if(!round2Matches[i].team2){
                round2Matches[i].team2 = seededTeams[seedCounter++];
             }
        }
    }
  }

  // 6. Set placeholders and playability for all rounds
  for (let r = 0; r < numRounds; r++) {
    for (const match of rounds[r].matches) {
        const feederMatch1Index = match.matchIndexInRound * 2;
        const feederMatch2Index = match.matchIndexInRound * 2 + 1;
        const prevRound = rounds[r - 1];
        
        if (prevRound) {
            if (!match.team1) {
                const feederMatch = prevRound.matches[feederMatch1Index];
                match.placeholderTeam1Text = `(${feederMatch?.id} の勝者)`;
            }
            if (!match.team2) {
                const feederMatch = prevRound.matches[feederMatch2Index];
                match.placeholderTeam2Text = `(${feederMatch?.id} の勝者)`;
            }
        }
        match.isPlayable = !!(match.team1 && match.team2);
    }
  }

  // 7. Schedule all playable matches
  if (eventStartTime && typeof matchDurationInMinutes === 'number' && typeof restTimeInMinutes === 'number') {
    const courtNextAvailableTime: string[] = Array(numberOfCourts).fill(eventStartTime);
    const totalTimePerMatchSlot = matchDurationInMinutes + restTimeInMinutes;

    const allMatchesToSchedule = rounds.flatMap(r => r.matches)
        .filter(m => m.isPlayable && !m.isDecided) // Only schedule playable, undecided matches
        .sort((a,b) => a.roundIndex - b.roundIndex || a.matchIndexInRound - b.matchIndexInRound); // Process in order

    allMatchesToSchedule.forEach(match => {
        let earliestCourtIndex = 0;
        for (let i = 1; i < courtNextAvailableTime.length; i++) {
            if (courtNextAvailableTime[i] < courtNextAvailableTime[earliestCourtIndex]) {
                earliestCourtIndex = i;
            }
        }
        
        match.startTime = courtNextAvailableTime[earliestCourtIndex];
        match.court = earliestCourtIndex + 1;
        courtNextAvailableTime[earliestCourtIndex] = addMinutesToTime(match.startTime, totalTimePerMatchSlot);
    });
  }

  return {
    id: `bracket-${Date.now()}`,
    name: `${teams[0]?.name || 'トーナメント'}大会`,
    teams: teams,
    rounds: rounds,
  };
};
