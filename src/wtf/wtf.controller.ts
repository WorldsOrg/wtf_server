import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WtfService } from '../wtf/wtf.service';
import { AddMatchSummaryDto } from './dto/match.summary.dto';
import { AddPlayerDto } from './dto/player.dto';

@Controller('wtf')
export class WtfController {
  constructor(private readonly WtfService: WtfService) {}

  @Post('/matchSummary')
  async addMatchSummary(@Body() addMatchSummaryDto: AddMatchSummaryDto) {
    console.log('add match summary called', addMatchSummaryDto);
    const res = await this.WtfService.addMatchSummary(addMatchSummaryDto);
    console.log('add match summary response', res);
    return res;
  }

  @Post('/player')
  async addPlayer(@Body() addPlayerDto: AddPlayerDto) {
    console.log('add player called', addPlayerDto);
    return await this.WtfService.addPlayer(addPlayerDto);
  }

  @Get('/player/:playerID')
  async getPlayer(@Param('playerID') playerID: string) {
    return await this.WtfService.getPlayer(playerID);
  }

  @Get('/gameData')
  async getGameData() {
    return await this.WtfService.getGameData();
  }

  @Get('/playerStats')
  async getPlayerStats(@Query('ids') ids: string) {
    return await this.WtfService.getPlayerStats(ids);
  }

  @Post('/levelProgression')
  async updateLevelProgression() {
    return await this.WtfService.updateLevelProgression();
  }

  @Post('/xpRewards')
  async updateXpRewards() {
    return await this.WtfService.updateXpRewards();
  }

  @Post('/devs')
  async updateDevPlayers() {
    return await this.WtfService.updateDevPlayers();
  }
}
