// src/asf/asf.service.ts
import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Cron } from '@nestjs/schedule';

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

  constructor() {
    this.asf_apis = ['https://asf-bots-production.up.railway.app/Api'];
    this.asf_passwords = ['hi'];
    this.axiosInstances = this.createAxiosInstances();

    (async () => {
      await this.initializeBotArray();
    })();
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

  private getRandomDelay(): number {
    return Math.floor(Math.random() * 5000) + 1000; // Random delay between 1 and 5 seconds
  }

  @Cron('*/1 * * * *') // Every 10 seconds for demonstration purposes
  async handleBotManagement() {
    console.log('Managing bots');
    const peakHours = [7, 13, 18]; // Peak hours
    const dipHours = [1, 11, 21]; // Dip hours
    const currentHour = new Date().getHours();

    let scalingFactor = 1; // Default scaling factor

    if (peakHours.includes(currentHour)) {
      scalingFactor = 3; // Higher scaling factor during peak hours
    } else if (dipHours.includes(currentHour)) {
      scalingFactor = 0.5; // Lower scaling factor during dip hours
    }

    const botsToStart = Math.ceil(
      (this.disabled_bots.length * scalingFactor) / 10,
    ); // Adjust the number of bots to start
    const botsToStop = Math.ceil(
      (this.running_bots.length * (1 - scalingFactor)) / 10,
    ); // Adjust the number of bots to stop

    console.log(botsToStart, botsToStop);

    if (scalingFactor >= 1) {
      // Start more bots during peak hours
      const botsByInstance: { [key: number]: string[] } = {};
      for (let i = 0; i < botsToStart; i++) {
        const bot =
          this.disabled_bots[
            Math.floor(Math.random() * this.disabled_bots.length)
          ];
        if (!botsByInstance[bot.asfInstanceIndex]) {
          botsByInstance[bot.asfInstanceIndex] = [];
        }
        botsByInstance[bot.asfInstanceIndex].push(bot.name);
      }
      for (const instanceIndex in botsByInstance) {
        const botNames = botsByInstance[instanceIndex].join(',');
        await this.startBots(Number(instanceIndex), botNames);
        await this.delay(this.getRandomDelay());
      }
    } else {
      // Stop some bots during off-peak hours
      const botsByInstance: { [key: number]: string[] } = {};
      for (let i = 0; i < botsToStop; i++) {
        const bot =
          this.running_bots[
            Math.floor(Math.random() * this.running_bots.length)
          ];
        if (!botsByInstance[bot.asfInstanceIndex]) {
          botsByInstance[bot.asfInstanceIndex] = [];
        }
        botsByInstance[bot.asfInstanceIndex].push(bot.name);
      }
      for (const instanceIndex in botsByInstance) {
        const botNames = botsByInstance[instanceIndex].join(',');
        await this.stopBots(Number(instanceIndex), botNames);
        await this.delay(this.getRandomDelay());
      }
    }
    console.log('disabled :', this.disabled_bots.length);
    console.log('running :', this.running_bots.length);
  }
}
