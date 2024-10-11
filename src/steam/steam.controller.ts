import { Controller, Get } from '@nestjs/common';
import { SteamService } from '../steam/steam.service';

@Controller('steam')
export class SteamController {
  constructor(private readonly steamService: SteamService) {}

  @Get('/')
  get() {
    return 'hi';
  }
}
