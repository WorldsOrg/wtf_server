// src/asf/asf.service.ts
import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Cron } from '@nestjs/schedule';
import { createClient } from '@supabase/supabase-js';

interface Bot {
  name: string;
  asfInstanceIndex: number;
}

@Injectable()
export class AsfService {
  private readonly asf_apis: string[];
  private readonly asf_passwords: string[];
  private readonly axiosInstances: AxiosInstance[];
  private bots: Bot[] = [];
  private running_bots: Bot[] = [];
  private disabled_bots: Bot[] = [];
  private previous_ccu: number = 0;
  private supabase;
  private supabase_events;
  private bot_multiplication_factor: number;

  constructor() {
    this.asf_apis = [
      'https://asf2-production.up.railway.app/Api',
      'https://asf3-production.up.railway.app/Api',
      'https://asf4-production.up.railway.app/Api',
      'https://asf5-production.up.railway.app/Api',
      'https://asf7-production.up.railway.app/Api',
      'https://asf8-production.up.railway.app/Api',
      'https://asf9-production.up.railway.app/Api',
      'https://asf10-production.up.railway.app/Api',
    ];
    this.asf_passwords = ['hi', 'hi', 'hi', 'hi', 'hi', 'hi', 'hi', 'hi'];
    this.axiosInstances = this.createAxiosInstances();

    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
    );

    this.supabase_events = createClient(
      process.env.SUPABASE_EVENTS_URL,
      process.env.SUPABASE_EVENTS_ANON_KEY,
    );

    this.bot_multiplication_factor = Number(
      process.env.BOT_MULTIPLICATION_FACTOR,
    );

    (async () => {
      this.previous_ccu = await this.getCCU();
      console.log('Initial CCU:', this.previous_ccu);
    })();

    (async () => {
      await this.initializeBotArray();
    })();
  }

  private async getCCU(): Promise<number> {
    try {
      let allData = [];
      let from = 0;
      const limit = 1000;
      let data, error;

      // need to paginate because supabase-js has a limit of 1000 rows per query
      do {
        const { data: batchData, error: batchError } = await this.supabase
          .from('wtf_steam_users')
          .select('steam_id')
          .eq('playing', true)
          .range(from, from + limit - 1);

        if (batchError) {
          throw batchError;
        }

        allData = allData.concat(batchData);
        from += limit;
        data = batchData;
        error = batchError;
      } while (data.length === limit);
      if (allData.length > 0) {
        return allData.length;
      } else if (error) {
        console.error('Error fetching CCU:', error.message);
        return 0;
      }
    } catch (error) {
      console.error('Error fetching CCU:', error.message);
      return 0;
    }
  }

  private createAxiosInstances(): AxiosInstance[] {
    const instances: AxiosInstance[] = [];

    for (let i = 0; i < this.asf_apis.length; i++) {
      const apiUrl = this.asf_apis[i];
      const password = this.asf_passwords[i];

      const instance = axios.create({
        baseURL: apiUrl,
        headers: {
          'Content-Type': 'application/json',
          Authentication: password,
        },
      });

      instances.push(instance);
    }

    return instances;
  }

  private shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private async initializeBotArray() {
    for (let i = 0; i < this.axiosInstances.length; i++) {
      const botNames = await this.getBotNames(i);
      const botNameArray = botNames.split(',');
      botNameArray.forEach((name) =>
        this.bots.push({ name, asfInstanceIndex: i }),
      );
      botNameArray.forEach((name) =>
        this.disabled_bots.push({ name, asfInstanceIndex: i }),
      );
    }

    // Shuffle the bots array to ensure random distribution
    this.bots = this.shuffleArray(this.bots);

    // Start half of the bots and stop the other half
    const halfBots = Math.floor(this.bots.length / 2);
    const botsToStart = this.bots.slice(0, halfBots);
    const botsToStop = this.bots.slice(halfBots);

    const botsByInstanceToStart: { [key: number]: string[] } = {};
    const botsByInstanceToStop: { [key: number]: string[] } = {};

    botsToStart.forEach((bot) => {
      if (!botsByInstanceToStart[bot.asfInstanceIndex]) {
        botsByInstanceToStart[bot.asfInstanceIndex] = [];
      }
      botsByInstanceToStart[bot.asfInstanceIndex].push(bot.name);
    });

    botsToStop.forEach((bot) => {
      if (!botsByInstanceToStop[bot.asfInstanceIndex]) {
        botsByInstanceToStop[bot.asfInstanceIndex] = [];
      }
      botsByInstanceToStop[bot.asfInstanceIndex].push(bot.name);
    });

    for (const instanceIndex in botsByInstanceToStart) {
      const botNames = botsByInstanceToStart[instanceIndex].join(',');
      await this.startBots(Number(instanceIndex), botNames);
    }

    for (const instanceIndex in botsByInstanceToStop) {
      const botNames = botsByInstanceToStop[instanceIndex].join(',');
      await this.stopBots(Number(instanceIndex), botNames);
    }
  }

  async getBotStatus(asfIndex: number): Promise<string> {
    try {
      const response = await this.axiosInstances[asfIndex].get('/ASF');
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching ${this.asf_apis[asfIndex]} status:`,
        error.message,
      );
      throw new Error('Failed to fetch bot status');
    }
  }

  private extractBotNames(result: string): string {
    const botNamePattern = /<([^>]+)>/g;
    const botNames = [];
    let match;

    while ((match = botNamePattern.exec(result)) !== null) {
      botNames.push(match[1]);
    }

    return botNames.join(',');
  }

  /*
   * This function fetches the bot names from ASF and returns them as a comma-separated string.
   */
  async getBotNames(asfIndex: number): Promise<string> {
    try {
      const response = await this.axiosInstances[asfIndex].post('/Command', {
        Command: 'status ASF',
      });
      const result = response.data.Result;
      const botNames = this.extractBotNames(result);
      return botNames;
    } catch (error) {
      console.error(
        `Error fetching bot names for ${this.asf_apis[asfIndex]}:`,
        error.message,
      );
      throw new Error('Failed to fetch bot names');
    }
  }

  async stopBots(asfIndex: number, botNames: string): Promise<void> {
    try {
      await this.axiosInstances[asfIndex].post(`/Bot/${botNames}/Stop`);
      botNames.split(',').forEach((botName) => {
        const bot = this.bots.find(
          (b) => b.name === botName && b.asfInstanceIndex === asfIndex,
        );
        if (bot) {
          this.updateBotStatus(bot, 'stop');
        }
      });
    } catch (error) {
      console.error(`Error stopping ${botNames}:`, error.message);
      throw new Error('Failed to stop bot');
    }
  }

  async startBots(asfIndex: number, botNames: string): Promise<void> {
    try {
      await this.axiosInstances[asfIndex].post(`/Bot/${botNames}/Start`);
      botNames.split(',').forEach((botName) => {
        const bot = this.bots.find(
          (b) => b.name === botName && b.asfInstanceIndex === asfIndex,
        );
        if (bot) {
          this.updateBotStatus(bot, 'start');
        }
      });
    } catch (error) {
      console.error(`Error starting ${botNames}:`, error.message);
      throw new Error('Failed to start bot');
    }
  }

  private updateBotStatus(bot: Bot, action: 'start' | 'stop'): void {
    if (action === 'start') {
      if (!this.running_bots.some((b) => b.name === bot.name)) {
        this.running_bots.push(bot);
      }
      this.disabled_bots = this.disabled_bots.filter(
        (b) => b.name !== bot.name,
      );
    } else if (action === 'stop') {
      if (!this.disabled_bots.some((b) => b.name === bot.name)) {
        this.disabled_bots.push(bot);
      }
      this.running_bots = this.running_bots.filter((b) => b.name !== bot.name);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  @Cron('*/15 * * * *') // Every 15 minutes
  async handleBotManagement() {
    console.log('Managing bots');

    const maxBots = 600; // Total bots available

    // Determine the target percentage of active bots
    let botsToStart,
      botsToStop = 0;

    const ccu = await this.getCCU();
    const ccuDiff = ccu - this.previous_ccu;
    console.log('Previous CCU:', this.previous_ccu);
    console.log('CCU:', ccu);
    console.log('CCU Diff:', ccuDiff);
    try {
      this.supabase_events.from('ccu_history').insert({ ccu: ccu });
    } catch (error) {
      console.error(
        'Error inserting CCU into ccu_history table:',
        error.message,
      );
    }
    this.previous_ccu = ccu;
    if (ccu > 0 && ccuDiff > 0) {
      botsToStart = ccuDiff * this.bot_multiplication_factor;
      if (botsToStart + this.running_bots.length > maxBots) {
        botsToStart = maxBots - this.running_bots.length;
      }
    } else if (ccu > 0 && ccuDiff < 0) {
      botsToStop = Math.abs(ccuDiff) * this.bot_multiplication_factor;
    }

    const interval = (15 * 60 * 1000) / (botsToStart + botsToStop || 1);

    try {
      // Gradually start bots
      for (let i = 0; i < botsToStart; i++) {
        const bot =
          this.disabled_bots[
            Math.floor(Math.random() * this.disabled_bots.length)
          ];
        if (bot) {
          await this.startBots(bot.asfInstanceIndex, bot.name);
        }
        await this.delay(interval);
      }

      // Gradually stop bots
      for (let i = 0; i < botsToStop; i++) {
        const bot =
          this.running_bots[
            Math.floor(Math.random() * this.running_bots.length)
          ];
        if (bot) {
          await this.stopBots(bot.asfInstanceIndex, bot.name);
        }
        await this.delay(interval);
      }

      // Log final counts
      console.log('Updated Bot Counts:');
      console.log('Running:', this.running_bots.length);
      console.log('Disabled:', this.disabled_bots.length);
    } catch (error) {
      console.error('Error managing bots:', error.message);
    }
  }
}
