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

  async getBotStatus(botIndex: number): Promise<string> {
    try {
      const response = await this.axiosInstances[botIndex].get('/ASF');
      return response.data;
    } catch (error) {
      console.error('Error fetching bot status:', error.message);
      throw new Error('Failed to fetch bot status');
    }
  }
}
