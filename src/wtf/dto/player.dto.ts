import { ApiProperty } from '@nestjs/swagger';

export class AddPlayerDto {
  @ApiProperty({ required: true })
  Username: string;

  @ApiProperty({ required: false })
  Region?: string;

  @ApiProperty({ required: true })
  GameVersion: string;

  @ApiProperty({ required: false })
  SteamID?: string;

  @ApiProperty({ required: false })
  EpicID?: string;
}
