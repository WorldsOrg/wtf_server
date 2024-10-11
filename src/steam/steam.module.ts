import { Module, Global } from '@nestjs/common';
import { SteamService } from './steam.service';
import { SteamController } from './steam.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

@Global()
@Module({
  providers: [SteamService],
  controllers: [SteamController],
  exports: [SteamService],
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: 'https://partner.steam-api.com/',
        params: {
          key: configService.get('STEAM_API_KEY'),
          appid: configService.get('STEAM_APP_ID'),
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
  ],
})
export class SteamModule {}
