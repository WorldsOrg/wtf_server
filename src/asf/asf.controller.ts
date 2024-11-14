import { Controller, Get } from '@nestjs/common';
import { AsfService } from '../asf/asf.service';

@Controller('asf')
export class AsfController {
  constructor(private readonly asfService: AsfService) {}

  @Get('/')
  async get() {
    return this.asfService.getBotNames(0);
  }
}
