class MatchSummaryDto {
  MatchID: string;
  StartTimestamp: string;
  EndTimestamp: string;
  MapName: string;
  GameMode: string;
  MatchDuration: string;
  WinningTeam: number;
  FinalScore: object;
  ServerRegion: string;
}

class PlayerResultsDto {
  PlayerID: string;
  TeamID: number;
  Kills: number;
  Assists: number;
  Deaths: number;
  FirstBlood: number;
  LastAlive: number;
  Score: number;
  ObjectiveCompletions: number;
  DamageDealt: number;
  DamageTaken: number;
  Headshots: number;
  ShotsFired: number;
  ShotsHit: number;
  TimePlayed: string;
  RoundsWon: number;
  RoundsLost: number;
  MatchOutcome: string;
  XPEarned: number;
}

export class AddMatchSummaryDto {
  MatchSummary: MatchSummaryDto;
  PlayerResults: PlayerResultsDto[];
}
