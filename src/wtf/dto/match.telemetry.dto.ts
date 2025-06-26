import { ApiProperty } from '@nestjs/swagger';

export class MatchTelemetryDto {
  @ApiProperty()
  MatchId: string;

  @ApiProperty()
  TelemetryEvents: object;
}
