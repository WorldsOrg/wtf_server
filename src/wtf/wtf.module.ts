import { Module, Global } from '@nestjs/common';
import { WtfService } from './wtf.service';
import { WtfController } from './wtf.controller';

@Global()
@Module({
  imports: [],
  providers: [WtfService],
  controllers: [WtfController],
  exports: [WtfService],
})
export class WtfModule {}
