// src/asf/asf.service.ts
import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class AsfService {
  private readonly asf_apis: string[];
  private readonly asf_passwords: string[];
  private readonly axiosInstances: AxiosInstance[];

  constructor() {
    this.asf_apis = process.env.ASF_APIS.split(',');
    this.asf_passwords = process.env.ASF_PASSWORDS.split(',');
    this.axiosInstances = this.createAxiosInstances();
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
    } catch (error) {
      console.error(`Error stopping ${botNames}:`, error.message);
      throw new Error('Failed to stop bot');
    }
  }

  async startBots(asfIndex: number, botNames: string): Promise<void> {
    try {
      await this.axiosInstances[asfIndex].post(`/Bot/${botNames}/Start`);
    } catch (error) {
      console.error(`Error starting ${botNames}:`, error.message);
      throw new Error('Failed to start bot');
    }
  }
}
