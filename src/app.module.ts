import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SteamModule } from './steam/steam.module';
import { ConfigModule } from '@nestjs/config';
import { WtfModule } from './asf/asf.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the ConfigModule available globally
    }),
    SteamModule,
    WtfModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
