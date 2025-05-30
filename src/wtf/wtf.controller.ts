import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WtfService } from '../wtf/wtf.service';
import { AddMatchSummaryDto } from './dto/match.summary.dto';
import { AddPlayerDto } from './dto/player.dto';
import {
  ApiTags,
  ApiBody,
  ApiQuery,
  ApiOperation,
  ApiExcludeEndpoint,
  ApiHeader,
} from '@nestjs/swagger';
import * as util from 'util';
import { MatchMakingSummaryDto } from './dto/match.making.dto';
import { SteamGuard } from 'src/steam/steam.guard';

@ApiTags('wtf') // Swagger group name
@Controller('wtf')
@ApiHeader({
  name: 'ticket',
  description: 'Steam session ticket',
  required: true,
})
@UseGuards(SteamGuard)
export class WtfController {
  constructor(private readonly WtfService: WtfService) {}

  @Post('/matchSummary')
  @ApiOperation({
    summary:
      'Add match summary with player results and weapon statistics. This also updates player stats.',
    description: 'The player specific data is referenced by EpicID',
  })
  @ApiBody({
    type: AddMatchSummaryDto,
    description: 'Add a new match summary with player results',
  })
  async addMatchSummary(@Body() addMatchSummaryDto: AddMatchSummaryDto) {
    console.log(
      'add match summary called',
      util.inspect(addMatchSummaryDto, { depth: null, colors: true }),
    );
    const res = await this.WtfService.addMatchSummary(addMatchSummaryDto);
    console.log('add match summary response', res);
    return res;
  }

  @Post('/matchMakingSummary')
  @ApiOperation({
    summary: 'Add match making summary',
    description:
      'This is used to log the match making process. It is not used to update player stats.',
  })
  @ApiBody({
    type: MatchMakingSummaryDto,
    description: 'Add a new match making summary',
  })
  async addMatchMakingSummary(
    @Body() addMatchMakingSummaryDto: MatchMakingSummaryDto,
  ) {
    console.log(
      'add match making summary called',
      util.inspect(addMatchMakingSummaryDto, { depth: null, colors: true }),
    );
    const res = await this.WtfService.addMatchMakingSummary(
      addMatchMakingSummaryDto,
    );
    console.log('add match making summary response', res);
    return res;
  }

  @Post('/player')
  @ApiOperation({
    summary:
      'Add or update a player referrenced by SteamID, EpicID or both. This also logs a row in LoginHistory.',
    description:
      'If there is a player with the same SteamID or EpicID, it will be updated. Otherwise, a new player will be created. A row in LoginHistory will also be created. If neither a SteamID or EpicID is provided, an error will be thrown.',
  })
  @ApiBody({
    type: AddPlayerDto,
    description: 'Add or update a player by SteamID or EpicID',
  })
  async addPlayer(@Body() addPlayerDto: AddPlayerDto) {
    console.log('add player called', addPlayerDto);
    return await this.WtfService.addPlayer(addPlayerDto);
  }

  @Get('/player')
  @ApiOperation({
    summary: 'Get player details by EpicID, SteamID',
    description:
      'Use only one of the query parameters (`epicID`, `steamID`) to fetch player details. Providing more than one will result in an error.',
  })
  @ApiQuery({
    name: 'epicID',
    required: false,
    description: 'EpicID of the player (e.g. 00026a04f664427ca9d30a4f2a56d8cb)',
    example: '00026a04f664427ca9d30a4f2a56d8cb',
  })
  @ApiQuery({
    name: 'steamID',
    required: false,
    description: 'SteamID of the player (e.g. 76561198012345678)',
    example: '76561198012345678',
  })
  async getPlayer(
    @Query('epicID') epicID?: string,
    @Query('steamID') steamID?: string,
  ) {
    if (epicID && steamID) {
      throw new BadRequestException(
        'Only one of epicID or steamID can be provided.',
      );
    }

    if (epicID) return await this.WtfService.getPlayerEpic(epicID);
    if (steamID) return await this.WtfService.getPlayerSteam(steamID);

    throw new BadRequestException('You must provide either epicID or steamID.');
  }

  @Get('/playerStats')
  @ApiOperation({
    summary: 'Get player stats by EpicID, SteamID, or a list of EpicIDs',
    description:
      'Use only one of the query parameters (`epicID`, `steamID`, or `ids`) to fetch player statistics. Providing more than one will result in an error.',
  })
  @ApiQuery({
    name: 'epicID',
    required: false,
    description: 'EpicID of the player (e.g. 00026a04f664427ca9d30a4f2a56d8cb)',
    example: '00026a04f664427ca9d30a4f2a56d8cb',
  })
  @ApiQuery({
    name: 'steamID',
    required: false,
    description: 'SteamID of the player (e.g. 76561198012345678)',
    example: '76561198012345678',
  })
  @ApiQuery({
    name: 'ids',
    required: false,
    description:
      'Comma-separated list of EpicIDs (e.g. 00026a04...,00000000000000000000000000000001)',
    example:
      '00026a04f664427ca9d30a4f2a56d8cb,00000000000000000000000000000001',
  })
  async getPlayerStats(
    @Query('epicID') epicID?: string,
    @Query('steamID') steamID?: string,
    @Query('ids') ids?: string,
  ) {
    const provided = [epicID, steamID, ids].filter(Boolean);

    if (provided.length === 0) {
      throw new BadRequestException(
        'You must provide one of epicID, steamID, or ids.',
      );
    }

    if (provided.length > 1) {
      throw new BadRequestException(
        'Only one of epicID, steamID, or ids can be provided.',
      );
    }

    if (epicID) return await this.WtfService.getPlayerStatsByEpicID(epicID);
    if (steamID) return await this.WtfService.getPlayerStatsBySteamID(steamID);
    if (ids) return await this.WtfService.getPlayerStats(ids);
  }

  @Post('/clientPerformanceLogs')
  @ApiOperation({
    summary: 'Add client performance logs',
    description: 'Logs are stored in the database and can be queried later.',
  })
  @ApiBody({
    type: Object,
    description: 'Performance logs for a match',
  })
  async addClientPerformanceLogs(@Body() performanceLog: object) {
    console.log('performance logs called', performanceLog);
    return await this.WtfService.addPerformaceLog(
      performanceLog,
      'wtf_client_logs',
    );
  }

  @Post('/serverPerformanceLogs')
  @ApiOperation({
    summary: 'Add server performance logs',
    description: 'Logs are stored in the database and can be queried later.',
  })
  @ApiBody({
    type: Object,
    description: 'Performance logs for a match',
  })
  async addServerPerformanceLogs(@Body() performanceLog: object) {
    console.log('performance logs called', performanceLog);
    return await this.WtfService.addPerformaceLog(
      performanceLog,
      'wtf_server_logs',
    );
  }

  @Get('/gameData')
  @ApiOperation({
    summary: 'Get game data from the remote config tables',
  })
  async getGameData() {
    return await this.WtfService.getGameData();
  }

  @Get('/token')
  @ApiOperation({
    summary: 'Get token',
  })
  async getToken() {
    return await this.WtfService.token();
  }

  @Post('/levelProgression')
  @ApiExcludeEndpoint()
  async updateLevelProgression() {
    return await this.WtfService.updateLevelProgression();
  }

  @Post('/xpRewards')
  @ApiExcludeEndpoint()
  async updateXpRewards() {
    return await this.WtfService.updateXpRewards();
  }

  @Post('/devs')
  @ApiExcludeEndpoint()
  async updateDevPlayers() {
    return await this.WtfService.updateDevPlayers();
  }

  @Post('/weapons')
  @ApiExcludeEndpoint()
  async updateWeapons() {
    return await this.WtfService.loadWeaponStats();
  }
}
