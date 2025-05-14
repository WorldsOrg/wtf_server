import { ApiProperty } from '@nestjs/swagger';

export class PerformanceLogsDto {
  @ApiProperty({ required: true })
  Logs: object;
}
