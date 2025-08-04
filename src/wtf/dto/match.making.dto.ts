import { ApiProperty } from '@nestjs/swagger';

export class MatchMakingSummaryDto {
  @ApiProperty()
  StartTimestamp: string;

  @ApiProperty()
  EndTimestamp: string;

  @ApiProperty()
  EpicID: string;

  @ApiProperty()
  GameMode: string;

  @ApiProperty()
  MMDuration: string;

  @ApiProperty()
  MMCancelled: boolean;
}

export class MatchMakingLogsDto {
  @ApiProperty()
  SteamID: string;

  @ApiProperty()
  UserRegion: string;

  @ApiProperty()
  StepName: string;

  @ApiProperty()
  CurrentStatus: string;

  @ApiProperty()
  CurrentDetail: string;

  @ApiProperty()
  CurrentProgress: number;

  @ApiProperty()
  TimeQueued: string;
}
