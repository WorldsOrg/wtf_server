import { HttpService } from '@nestjs/axios';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { SteamAuthResponse } from './dto/steam.dto';

export interface UserRequest extends Request {
  user: {
    steamId: string;
  };
}

@Injectable()
export class SteamGuard implements CanActivate {
  constructor(private readonly httpService: HttpService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<UserRequest>();
    const ticket = req.headers['ticket'];

    const result = await this.validateSteamUser(ticket as string);

    if (result) {
      return true;
    } else {
      return false;
    }
  }

  async validateSteamUser(ticket: string): Promise<{ steamId: string } | null> {
    const authRequest = this.httpService.get<SteamAuthResponse>(
      'ISteamUserAuth/AuthenticateUserTicket/v1',
      {
        params: {
          ticket,
          identity: 'worldsbase-api',
        },
      },
    );

    try {
      const {
        data: {
          response: { error, params },
        },
      } = await firstValueFrom(authRequest);

      if (!params || params.result !== 'OK' || error) return null;
      if (params.vacbanned || params.publisherbanned) return null;

      return { steamId: params.steamid };
    } catch (e) {
      console.error(e);
      return null;
    }
  }
}
