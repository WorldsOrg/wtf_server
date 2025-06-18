import { Injectable, Logger } from '@nestjs/common';
import * as util from 'util';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger('WTF');
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) await task();
    }

    this.isProcessing = false;
  }

  private enqueue(task: () => Promise<void>) {
    this.queue.push(task);
    this.processQueue();
  }

  log(message: string, data?: any, label?: string) {
    const header = label ? `[${label}]` : '';
    this.enqueue(async () => {
      const inspected = data
        ? '\n' + util.inspect(data, { depth: null, colors: false })
        : '';
      this.logger.log(`${header} ${message}${inspected}`);
    });
  }

  warn(message: string, data?: any, label?: string) {
    const header = label ? `[${label}]` : '';
    this.enqueue(async () => {
      const inspected = data
        ? '\n' + util.inspect(data, { depth: null, colors: false })
        : '';
      this.logger.warn(`${header} ${message}${inspected}`);
    });
  }

  error(message: string, trace?: any, label?: string) {
    const header = label ? `[${label}]` : '';
    this.enqueue(async () => {
      const inspected = trace
        ? '\n' + util.inspect(trace, { depth: null, colors: false })
        : '';
      this.logger.error(`${header} ${message}${inspected}`);
    });
  }
}
