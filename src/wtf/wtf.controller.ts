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
import { MatchMakingSummaryDto } from './dto/match.making.dto';
import { LoggerService } from 'src/logger/logger.service';
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
  constructor(
    private readonly WtfService: WtfService,
    private readonly logger: LoggerService,
  ) {}

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
    this.logger.log('addMatchSummary called', addMatchSummaryDto, 'Match');
    const res = await this.WtfService.addMatchSummary(addMatchSummaryDto);
    this.logger.log('addMatchSummary response', res, 'Match');
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
    this.logger.log(
      'addMatchMakingSummary called',
      addMatchMakingSummaryDto,
      'MatchMaking',
    );

    const res = await this.WtfService.addMatchMakingSummary(
      addMatchMakingSummaryDto,
    );

    this.logger.log('addMatchMakingSummary response', res, 'MatchMaking');
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
    this.logger.log('addPlayer called', addPlayerDto, 'Player');

    const result = await this.WtfService.addPlayer(addPlayerDto);

    this.logger.log('addPlayer response', result, 'Player');

    return result;
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
    this.logger.log('getPlayer called', { epicID, steamID }, 'Player');

    if (epicID && steamID) {
      this.logger.warn(
        'Both epicID and steamID were provided',
        { epicID, steamID },
        'Player',
      );
      throw new BadRequestException(
        'Only one of epicID or steamID can be provided.',
      );
    }

    if (epicID) {
      const result = await this.WtfService.getPlayerEpic(epicID);
      this.logger.log('getPlayer response (epicID)', result, 'Player');
      return result;
    }

    if (steamID) {
      const result = await this.WtfService.getPlayerSteam(steamID);
      this.logger.log('getPlayer response (steamID)', result, 'Player');
      return result;
    }

    this.logger.warn('Neither epicID nor steamID provided', {}, 'Player');
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
    this.logger.log(
      'getPlayerStats query received',
      { epicID, steamID, ids },
      'Stats',
    );

    const provided = [epicID, steamID, ids].filter(Boolean);

    if (provided.length === 0) {
      const msg = 'You must provide one of epicID, steamID, or ids.';
      this.logger.warn(msg, {}, 'Stats');
      throw new BadRequestException(msg);
    }

    if (provided.length > 1) {
      const msg = 'Only one of epicID, steamID, or ids can be provided.';
      this.logger.warn(msg, { epicID, steamID, ids }, 'Stats');
      throw new BadRequestException(msg);
    }

    if (epicID) {
      this.logger.log('Fetching stats by EpicID', epicID, 'Stats');
      const res = await this.WtfService.getPlayerStatsByEpicID(epicID);
      this.logger.log('getPlayerStats response', res, 'Stats');
      return res;
    }

    if (steamID) {
      this.logger.log('Fetching stats by SteamID', steamID, 'Stats');
      const res = await this.WtfService.getPlayerStatsBySteamID(steamID);
      this.logger.log('getPlayerStats response', res, 'Stats');
      return res;
    }

    if (ids) {
      this.logger.log('Fetching stats for multiple EpicIDs', ids, 'Stats');
      const res = await this.WtfService.getPlayerStats(ids);
      this.logger.log('getPlayerStats response', res, 'Stats');
      return res;
    }
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
    this.logger.log(
      'Client performance log received',
      performanceLog,
      'Performance',
    );

    const result = await this.WtfService.addPerformaceLog(
      performanceLog,
      'wtf_client_logs',
    );

    this.logger.log('Client performance log saved', result, 'Performance');

    return result;
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
    this.logger.log(
      'Server performance log received',
      performanceLog,
      'Performance',
    );

    const result = await this.WtfService.addPerformaceLog(
      performanceLog,
      'wtf_server_logs',
    );

    this.logger.log('Server performance log saved', result, 'Performance');

    return result;
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
