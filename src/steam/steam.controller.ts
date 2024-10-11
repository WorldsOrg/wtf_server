import { Controller, Get } from '@nestjs/common';
import { SteamService } from '../steam/steam.service';

@Controller('steam')
export class SteamController {
  constructor(private readonly steamService: SteamService) {}

  @Get('/')
  async get() {
    const response =
      await this.steamService.getPlayTimeData('76561199556121254');
    return response;
  }
}
