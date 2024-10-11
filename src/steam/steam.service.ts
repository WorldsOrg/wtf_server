// src/steam/steam.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class SteamService {
  private readonly lootboxTemplateId = '1003';
  private readonly awardTime = 30;

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
      console.error('Error fetching if account is playing on steam:', error);
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
      console.error('Error fetching number of farming rewards time:', error);
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
      console.error('Error fetching farming time:', error);
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

  async rewardLootBox(steamId: string) {
    const itemdefidParams = {};
    itemdefidParams[`itemdefid[0]`] = this.lootboxTemplateId;

    try {
      const response = await this.httpService.post(
        '/IInventoryService/AddItem/v1',
        {},
        {
          params: { steamid: steamId, ...itemdefidParams, notify: true },
        },
      );
      return response;
    } catch (error) {
      console.error('Error rewarding loot box:', error);
      throw new Error('Failed to reward loot box');
    }
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
      console.error('Error fetching play time data:', error);
      throw new Error('Failed to fetch play time data');
    }
  }

  async isRewardTime(steamId: string) {
    const totalFarmingTime = await this.getTotalFarmingTime(steamId);
    const numFarmingRewards = await this.getNumFarmingRewards(steamId);
    const timeToNextReward = this.awardTime * (numFarmingRewards + 1);
    if (timeToNextReward <= totalFarmingTime) {
      return true;
    } else {
      return false;
    }
  }

  async updateFarmingTimes(steamId: string) {
    try {
      const currentFarmingTime = await this.getCurrentFarmingTime(steamId);
      const totalFarmingTime = await this.getTotalFarmingTime(steamId);
      const currentPlayTime = await this.getPlayTimeData(steamId);
      console.log('currentPlayTime:', currentPlayTime);
      console.log('currentFarmingTime:', currentFarmingTime);
      console.log('totalFarmingTime:', totalFarmingTime);

      // No need to update if no play time
      if (currentPlayTime == 0) {
        return;
      }

      await this.setCurrentFarmingTime(steamId, currentPlayTime);
      await this.setTotalFarmingTime(
        steamId,
        totalFarmingTime + currentPlayTime - currentFarmingTime,
      );
    } catch (error) {
      console.error(
        `Error updating farming times for steamId ${steamId}:`,
        error,
      );
      throw new Error('Failed to update farming times');
    }
  }

  @Cron('*/1 * * * *')
  async update() {
    console.log('Updating farming times...');
    const steamId = '76561199556121254';
    const isPlaying = await this.getIsPlaying(steamId);
    console.log('isPlaying:', !isPlaying);
    if (!isPlaying) {
      await this.updateFarmingTimes(steamId);
      // if (await this.isRewardTime(steamId)) {
      //   await this.rewardLootBox(steamId);
      //   await this.setNumFarmingRewards(
      //     steamId,
      //     (await this.getNumFarmingRewards(steamId)) + 1,
      //   );
      // }
    }
  }
}
