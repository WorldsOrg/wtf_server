import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { WtfModule } from './wtf/wtf.module';
import { SteamModule } from './steam/steam.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the ConfigModule available globally
    }),
    WtfModule,
    SteamModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
