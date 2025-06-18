import { ApiProperty } from '@nestjs/swagger';

export class MatchTelemetryDto {
  @ApiProperty()
  MatchID: string;

  @ApiProperty()
  data_json: object;
}
