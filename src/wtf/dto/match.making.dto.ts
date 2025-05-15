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
