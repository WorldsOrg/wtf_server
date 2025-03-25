import { ApiProperty } from '@nestjs/swagger';

export class MatchSummaryDto {
  @ApiProperty()
  MatchID: string;

  @ApiProperty()
  StartTimestamp: string;

  @ApiProperty()
  EndTimestamp: string;

  @ApiProperty()
  MapName: string;

  @ApiProperty()
  GameMode: string;

  @ApiProperty()
  MatchDuration: string;

  @ApiProperty()
  WinningTeam: number;

  @ApiProperty({ type: Object }) // If you know the structure, use a proper class
  FinalScore: object;

  @ApiProperty()
  ServerRegion: string;
}

export class PlayerResultsDto {
  @ApiProperty()
  EpicID: string;

  @ApiProperty()
  TeamID: number;

  @ApiProperty()
  Kills: number;

  @ApiProperty()
  Assists: number;

  @ApiProperty()
  Deaths: number;

  @ApiProperty()
  FirstBlood: number;

  @ApiProperty()
  LastAlive: number;

  @ApiProperty()
  Score: number;

  @ApiProperty()
  ObjectiveCompletions: number;

  @ApiProperty()
  DamageDealt: number;

  @ApiProperty()
  DamageTaken: number;

  @ApiProperty()
  Headshots: number;

  @ApiProperty()
  ShotsFired: number;

  @ApiProperty()
  ShotsHit: number;

  @ApiProperty()
  TimePlayed: string;

  @ApiProperty()
  RoundsWon: number;

  @ApiProperty()
  RoundsLost: number;

  @ApiProperty()
  MatchOutcome: string;

  @ApiProperty()
  XPEarned: number;
}

export class AddMatchSummaryDto {
  @ApiProperty({ type: MatchSummaryDto })
  MatchSummary: MatchSummaryDto;

  @ApiProperty({ type: [PlayerResultsDto] })
  PlayerResults: PlayerResultsDto[];
}

export class PlayerStatisticsDto {
  @ApiProperty()
  PlayerID: string;

  @ApiProperty()
  EpicID: string;

  @ApiProperty()
  TeamID: number;

  @ApiProperty()
  Kills: number;

  @ApiProperty()
  Assists: number;

  @ApiProperty()
  Deaths: number;

  @ApiProperty()
  FirstBlood: number;

  @ApiProperty()
  LastAlive: number;

  @ApiProperty()
  Score: number;

  @ApiProperty()
  ObjectiveCompletions: number;

  @ApiProperty()
  DamageDealt: number;

  @ApiProperty()
  DamageTaken: number;

  @ApiProperty()
  Headshots: number;

  @ApiProperty()
  ShotsFired: number;

  @ApiProperty()
  ShotsHit: number;

  @ApiProperty()
  TimePlayed: string;

  @ApiProperty()
  RoundsWon: number;

  @ApiProperty()
  RoundsLost: number;

  @ApiProperty()
  MatchOutcome: string;

  @ApiProperty()
  XPEarned: number;

  @ApiProperty()
  MatchID: string;
}
