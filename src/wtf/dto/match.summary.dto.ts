import { ApiProperty, OmitType } from '@nestjs/swagger';

// ----- Base -----
export class BasePlayerStatsDto {
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

// ----- Match Summary -----
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

  @ApiProperty({ type: Object }) // Replace with class if FinalScore has structure
  FinalScore: object;

  @ApiProperty()
  ServerRegion: string;
}

// ----- Weapon Stats -----
export class PlayerWeaponStatsDto {
  @ApiProperty()
  WeaponID: number;

  @ApiProperty()
  ShotsFired: number;

  @ApiProperty()
  ShotsHit: number;

  @ApiProperty()
  Kills: number;

  @ApiProperty()
  Headshots: number;

  @ApiProperty()
  DamageDealt: number;

  @ApiProperty()
  TimeUsed: number;

  @ApiProperty()
  Reloads: number;

  @ApiProperty()
  AmmoUsed: number;

  @ApiProperty()
  KillAssists: number;

  @ApiProperty()
  DeathsWhileUsing: number;

  @ApiProperty()
  Multikills: number;

  @ApiProperty()
  WeaponSwapCount: number;
}

export class PlayerWeaponMatchStatsDto extends PlayerWeaponStatsDto {
  @ApiProperty()
  MatchID: string;

  @ApiProperty()
  EpicID: string;
}

// ----- Player Results (from client) -----
export class PlayerResultsDto extends BasePlayerStatsDto {
  @ApiProperty()
  EpicID: string;

  @ApiProperty({ type: [PlayerWeaponStatsDto], required: false })
  PlayerWeaponStats?: PlayerWeaponStatsDto[];
}

// ----- Internally Resolved Player -----
export class ResolvedPlayerDto extends PlayerResultsDto {
  PlayerID: string;
  MatchID: string;
}

// ----- Incoming Request Body -----
export class AddMatchSummaryDto {
  @ApiProperty({ type: MatchSummaryDto })
  MatchSummary: MatchSummaryDto;

  @ApiProperty({ type: [PlayerResultsDto] })
  PlayerResults: PlayerResultsDto[];
}

// ----- Player Statistics Table Insert -----
export class PlayerStatisticsDto extends BasePlayerStatsDto {
  @ApiProperty()
  PlayerID: string;

  @ApiProperty()
  EpicID: string;

  @ApiProperty()
  MatchID: string;
}

// ----- PlayerSpecificMatchSummary Insert -----
export class PlayerMatchStatisticsDto extends OmitType(PlayerStatisticsDto, [
  'PlayerID',
] as const) {}
