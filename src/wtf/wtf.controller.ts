import { Body, Controller, Post } from '@nestjs/common';
import { WtfService } from '../wtf/wtf.service';
import { AddMatchSummaryDto } from './dto/match.summary.dto';

@Controller('wtf')
export class WtfController {
  constructor(private readonly WtfService: WtfService) {}

  @Post('/matchSummary')
  async saveMatchSummary(@Body() addMatchSummaryDto: AddMatchSummaryDto) {
    // Handle the data here, for example, save it to the database
    return await this.WtfService.saveMatchSummary(addMatchSummaryDto);
  }
}
