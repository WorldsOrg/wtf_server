import { Body, Controller, Post } from '@nestjs/common';
import { WtfService } from '../wtf/wtf.service';
import { AddMatchSummaryDto } from './dto/match.summary.dto';
import { AddPlayerDto } from './dto/player.dto';

@Controller('wtf')
export class WtfController {
  constructor(private readonly WtfService: WtfService) {}

  @Post('/matchSummary')
  async addMatchSummary(@Body() addMatchSummaryDto: AddMatchSummaryDto) {
    console.log('add match summary called');
    return await this.WtfService.addMatchSummary(addMatchSummaryDto);
  }

  @Post('/player')
  async addPlayer(@Body() addPlayerDto: AddPlayerDto) {
    console.log('add player called');
    return await this.WtfService.addPlayer(addPlayerDto);
  }
}
