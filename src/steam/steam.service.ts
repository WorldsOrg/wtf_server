// src/steam/steam.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { Cron } from '@nestjs/schedule';
import { catchError, lastValueFrom } from 'rxjs';

@Injectable()
export class SteamService {
  private readonly lootboxTemplateId = '1003';
  private readonly awardTime: number = Number(process.env.AWARD_TIME);

  constructor(private readonly httpService: HttpService) {}

  private api = axios.create({
    baseURL: process.env.API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.X_API_KEY,
    },
  });

  async getIsPlaying(steamId: string): Promise<number> {
    try {
      const query = `SELECT playing
        FROM wtf_steam_users
        WHERE steam_id = '${steamId}';
      `;
      const data = await this.api.post('table/executeselectquery', {
        query,
      });
      return Number(data.data[0].playing);
    } catch (error) {
      console.error(
        'Error fetching if account is playing on steam:',
        error.message,
      );
      throw new Error('Failed to fetch if account is playing on steam');
    }
  }

  async getNumFarmingRewards(steamId: string): Promise<number> {
    try {
      const query = `SELECT farming_rewards
        FROM wtf_steam_users
        WHERE steam_id = '${steamId}';
      `;
      const data = await this.api.post('table/executeselectquery', {
        query,
      });
      return Number(data.data[0].farming_rewards);
    } catch (error) {
      console.error(
        'Error fetching number of farming rewards time:',
        error.message,
      );
      throw new Error('Failed to fetch number of farming rewards time');
    }
  }

  async setNumFarmingRewards(steamId: string, farmingRewards: number) {
    try {
      const data = await this.api.put(`/table/updatedata`, {
        tableName: 'wtf_steam_users',
        data: {
          farming_rewards: farmingRewards.toString(),
        },
        condition: `steam_id='${steamId}'`,
      });
      return data.status;
    } catch (error) {
      console.error('Error updating number of farming rewards:', error.message);
      throw new Error('Failed to update number of farming rewards');
    }
  }

  async getCurrentFarmingTime(steamId: string): Promise<number> {
    try {
      const query = `SELECT farming_time
        FROM wtf_steam_users
        WHERE steam_id = '${steamId}';
      `;
      const data = await this.api.post('table/executeselectquery', {
        query,
      });
      return Number(data.data[0].farming_time);
    } catch (error) {
      console.error('Error fetching farming time:', error);
      throw new Error('Failed to fetch farming time');
    }
  }

  async getTotalFarmingTime(steamId: string): Promise<number> {
    try {
      const query = `SELECT total_farming_time
        FROM wtf_steam_users
        WHERE steam_id = '${steamId}';
      `;
      const data = await this.api.post('table/executeselectquery', {
        query,
      });
      return Number(data.data[0].total_farming_time);
    } catch (error) {
      console.error('Error fetching farming time:', error.message);
      throw new Error('Failed to fetch farming time');
    }
  }

  async setCurrentFarmingTime(steamId: string, currentFarmingTime: number) {
    try {
      const data = await this.api.put(`/table/updatedata`, {
        tableName: 'wtf_steam_users',
        data: {
          farming_time: currentFarmingTime.toString(),
        },
        condition: `steam_id='${steamId}'`,
      });
      return data.status;
    } catch (error) {
      console.error('Error updating farming time:', error.message);
      throw new Error('Failed to update farming time');
    }
  }

  async setTotalFarmingTime(steamId: string, totalFarmingTime: number) {
    try {
      const data = await this.api.put('/table/updatedata', {
        data: { total_farming_time: totalFarmingTime.toString() },
        tableName: 'wtf_steam_users',
        condition: `steam_id='${steamId}'`,
      });
      return data.status;
    } catch (error) {
      console.error('Error updating total farming time:', error.message);
      throw new Error('Failed to update total farming time');
    }
  }

  async getSteamIds() {
    try {
      const query = `SELECT steam_id
        FROM wtf_steam_users
        WHERE LENGTH(steam_id) = 17;
      `;
      const data = await this.api.post('table/executeselectquery', {
        query,
      });
      return data.data.map((row) => row.steam_id);
    } catch (error) {
      console.error('Error fetching steam ids:', error.message);
      throw new Error('Failed to fetch steam ids');
    }
  }

  async rewardLootBox(steamId: string) {
    const itemdefidParams = {};
    itemdefidParams[`itemdefid[0]`] = this.lootboxTemplateId;

    const request = this.httpService
      .post(
        '/IInventoryService/AddItem/v1',
        {},
        {
          params: { steamid: steamId, ...itemdefidParams, notify: true },
        },
      )
      .pipe(
        catchError(() => {
          throw new InternalServerErrorException(
            'Error when fetching steam API',
          );
        }),
      );
    const response = await lastValueFrom(request);
    return response.data;
  }

  async getPlayTimeData(steamId: string) {
    try {
      const { data } = await this.httpService.axiosRef.get(
        '/IPlayerService/GetSingleGamePlaytime/v1',
        {
          params: { steamid: steamId },
        },
      );
      return data.response.playtime_current_session;
    } catch (error) {
      console.error('Error fetching play time data:', error.message);
      throw new Error('Failed to fetch play time data');
    }
  }

  async isRewardTime(steamId: string) {
    try {
      const totalFarmingTime = await this.getTotalFarmingTime(steamId);
      const numFarmingRewards = await this.getNumFarmingRewards(steamId);
      const timeToNextReward = this.awardTime * (numFarmingRewards + 1);
      if (timeToNextReward <= totalFarmingTime) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error checking if reward time:', error.message);
      throw new Error('Failed to check if reward time');
    }
  }

  async updateFarmingTimes(steamId: string) {
    try {
      const currentFarmingTime = await this.getCurrentFarmingTime(steamId);
      const currentPlayTime = await this.getPlayTimeData(steamId);

      // No need to update if no play time
      if (currentPlayTime == 0) {
        if (currentFarmingTime != 0) {
          await this.setCurrentFarmingTime(steamId, 0);
        }
        return;
      }
      console.log(`${steamId} current play time:`, currentPlayTime);
      const totalFarmingTime = await this.getTotalFarmingTime(steamId);

      await this.setCurrentFarmingTime(steamId, currentPlayTime);
      await this.setTotalFarmingTime(
        steamId,
        totalFarmingTime + currentPlayTime - currentFarmingTime,
      );
    } catch (error) {
      console.error(
        `Error updating farming times for steamId ${steamId}:`,
        error.message,
      );
      throw new Error('Failed to update farming times');
    }
  }

  // run every 30 minutes
  @Cron('*/30 * * * *')
  async update() {
    console.log('Running farming cron job');
    const steamIds = await this.getSteamIds();
    for (const steamId of steamIds) {
      try {
        const isPlaying = await this.getIsPlaying(steamId);
        if (!isPlaying) {
          await this.updateFarmingTimes(steamId);
          if (await this.isRewardTime(steamId)) {
            console.log('Rewarding loot box for steamId:', steamId);
            await this.rewardLootBox(steamId);
            await this.setNumFarmingRewards(
              steamId,
              (await this.getNumFarmingRewards(steamId)) + 1,
            );
          }
        }
      } catch (error) {
        console.error(
          `Error updating farming times for steamId ${steamId}:`,
          error.message,
        );
      }
    }
    console.log('Finished farming cron job');
  }
}
