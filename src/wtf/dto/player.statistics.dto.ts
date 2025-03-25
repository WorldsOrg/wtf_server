export interface MatchPlayerStatsInput {
  Kills: number;
  Assists: number;
  FirstBlood: number;
  LastAlive: number;
  RoundsWon: number;
  MatchOutcome: string;
}

export interface TotalPlayerStatsInput {
  TotalKills: number;
  TotalAssists: number;
  TotalFirstBloods: number;
  TotalLastAlive: number;
  TotalRoundsWon: number;
  TotalMatches: number;
  MatchesWon: number;
}
