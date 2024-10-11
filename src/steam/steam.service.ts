// src/steam/steam.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

export interface BackendWallet {
  address: string;
  user_id: string;
}

@Injectable()
export class SteamService {
  constructor(private readonly httpService: HttpService) {}
}
