import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { WtfModule } from './wtf/wtf.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the ConfigModule available globally
    }),
    WtfModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
