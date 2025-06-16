import { Module, Global } from '@nestjs/common';
import { WtfService } from './wtf.service';
import { WtfController } from './wtf.controller';
import { LoggerModule } from 'src/logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [WtfService],
  controllers: [WtfController],
  exports: [WtfService],
})
export class WtfModule {}
