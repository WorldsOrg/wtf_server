import { Body, Controller, Post } from '@nestjs/common';
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
}
