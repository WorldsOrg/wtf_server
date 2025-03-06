import { Controller, Get } from '@nestjs/common';
import { WtfService } from '../wtf/wtf.service';

@Controller('asf')
export class WtfController {
  constructor(private readonly WtfService: WtfService) {}

  @Get('/')
  async get() {}
}
