import { ApiProperty } from '@nestjs/swagger';

export class AddPlayerDto {
  @ApiProperty()
  PlayerID: string;

  @ApiProperty()
  Username: string;

  @ApiProperty()
  Region: string;

  @ApiProperty()
  GameVersion: string;

  @ApiProperty()
  SteamID: string;

  @ApiProperty()
  Type: string;
}
