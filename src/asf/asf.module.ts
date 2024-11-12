import { Module, Global } from '@nestjs/common';
import { AsfService } from './asf.service';
import { AsfController } from './asf.controller';

@Global()
@Module({
  providers: [AsfService],
  controllers: [AsfController],
  exports: [AsfService],
})
export class AsfModule {}
