import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WtfService } from '../wtf/wtf.service';
import { AddMatchSummaryDto } from './dto/match.summary.dto';
import { AddPlayerDto } from './dto/player.dto';
import { ApiTags, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('wtf') // Swagger group name
@Controller('wtf')
export class WtfController {
  constructor(private readonly WtfService: WtfService) {}

  @Post('/matchSummary')
  @ApiBody({
    type: AddMatchSummaryDto,
    description: 'Add a new match summary with player results',
  })
  async addMatchSummary(@Body() addMatchSummaryDto: AddMatchSummaryDto) {
    console.log('add match summary called', addMatchSummaryDto);
    const res = await this.WtfService.addMatchSummary(addMatchSummaryDto);
    console.log('add match summary response', res);
    return res;
  }

  @Post('/player')
  @ApiBody({
    type: AddPlayerDto,
    description: 'Add or update a player by SteamID or EpicID',
  })
  async addPlayer(@Body() addPlayerDto: AddPlayerDto) {
    console.log('add player called', addPlayerDto);
    return await this.WtfService.addPlayer(addPlayerDto);
  }

  @Get('/player/:playerID')
  @ApiParam({
    name: 'playerID',
    required: true,
    description: 'Unique PlayerID (e.g. 00026a04f664427ca9d30a4f2a56d8cb)',
    example: '00026a04f664427ca9d30a4f2a56d8cb',
    type: String,
  })
  async getPlayer(@Param('playerID') playerID: string) {
    return await this.WtfService.getPlayer(playerID);
  }

  @Get('/gameData')
  async getGameData() {
    return await this.WtfService.getGameData();
  }

  @Get('/playerStats')
  @ApiQuery({
    name: 'ids',
    required: true,
    description:
      'Comma-separated list of PlayerIDs (e.g. 00026a04f664427ca9d30a4f2a56d8cb,00000000000000000000000000000001)',
    type: String,
    example:
      '00026a04f664427ca9d30a4f2a56d8cb,00000000000000000000000000000001',
  })
  async getPlayerStats(@Query('ids') ids: string) {
    return await this.WtfService.getPlayerStats(ids);
  }

  @Get('/playerStats/:steamID')
  @ApiParam({
    name: 'steamID',
    required: true,
    description: 'SteamID of the player (e.g. 76561198012345678)',
    example: '76561198012345678',
    type: String,
  })
  async getPlayerStatsBySteamID(@Param('steamID') steamID: string) {
    return await this.WtfService.getPlayerStatsBySteamID(steamID);
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
