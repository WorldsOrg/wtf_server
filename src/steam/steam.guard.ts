import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

export interface UserRequest extends Request {
  user: {
    steamId: string;
  };
}

@Injectable()
export class SteamGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<UserRequest>();
    const authorization = req.headers['Authorization'];

    if (!authorization) {
      return false;
    }

    const [type, token] = authorization.toString().split(' ');
    if (type !== 'Bearer') {
      return false;
    }


    return true;
  }
}
