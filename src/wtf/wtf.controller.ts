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
import { MatchTelemetryDto } from './dto/match.telemetry.dto';

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
    const start = Date.now();
    const res = await this.WtfService.addMatchSummary(addMatchSummaryDto);
    const duration = Date.now() - start;

    this.logger.log('addMatchSummary', {
      durationMs: duration,
    });
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
    const start = Date.now();

    const res = await this.WtfService.addMatchMakingSummary(
      addMatchMakingSummaryDto,
    );

    const duration = Date.now() - start;

    this.logger.log('matchMakingSummary', {
      durationMs: duration,
    });
    return res;
  }

  @Post('/matchTelemetry')
  @ApiOperation({
    summary: 'Add match telemetry data',
    description: 'This is used to log match telemetry.',
  })
  @ApiBody({
    type: MatchTelemetryDto,
    description: 'Add a new match match telemetry summary',
  })
  async addMatchTelemetry(@Body() addMatchTelemetry: MatchTelemetryDto) {
    const start = Date.now();
    const res = await this.WtfService.addMatchTelemetry(addMatchTelemetry);
    const duration = Date.now() - start;

    this.logger.log('matchTelemetry', {
      durationMs: duration,
    });
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
    const start = Date.now();
    const result = await this.WtfService.addPlayer(addPlayerDto);
    const duration = Date.now() - start;

    this.logger.log('addPlayer', {
      durationMs: duration,
    });

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
    let res;
    const start = Date.now();

    if (epicID && steamID) {
      throw new BadRequestException(
        'Only one of epicID or steamID can be provided.',
      );
    }

    if (steamID || epicID) {
      if (epicID) {
        res = await this.WtfService.getPlayerEpic(epicID);
      }

      if (steamID) {
        res = await this.WtfService.getPlayerSteam(steamID);
      }
      const duration = Date.now() - start;

      this.logger.log('getPlayer', {
        durationMs: duration,
      });
      return res;
    }

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
    let res;
    const start = Date.now();

    const provided = [epicID, steamID, ids].filter(Boolean);

    if (provided.length === 0) {
      const msg = 'You must provide one of epicID, steamID, or ids.';
      throw new BadRequestException(msg);
    }

    if (provided.length > 1) {
      const msg = 'Only one of epicID, steamID, or ids can be provided.';
      throw new BadRequestException(msg);
    }

    if (epicID) {
      res = await this.WtfService.getPlayerStatsByEpicID(epicID);
    }

    if (steamID) {
      res = await this.WtfService.getPlayerStatsBySteamID(steamID);
    }

    if (ids) {
      res = await this.WtfService.getPlayerStats(ids);
    }
    const duration = Date.now() - start;

    this.logger.log('getPlayerStats', {
      durationMs: duration,
    });
    return res;
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
    const start = Date.now();

    const result = await this.WtfService.addPerformaceLog(
      performanceLog,
      'wtf_client_logs',
    );

    const duration = Date.now() - start;

    this.logger.log('clientPerformanceLogs', {
      durationMs: duration,
    });

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
    const start = Date.now();

    const result = await this.WtfService.addPerformaceLog(
      performanceLog,
      'wtf_server_logs',
    );

    const duration = Date.now() - start;

    this.logger.log('serverPerformanceLogs', {
      durationMs: duration,
    });

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
