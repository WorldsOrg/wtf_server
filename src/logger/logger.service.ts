import { Injectable, Logger } from '@nestjs/common';
import * as util from 'util';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger('WTF');

  log(message: string, data?: any, label?: string) {
    const header = label ? `[${label}]` : '';
    if (data !== undefined) {
      const inspected = util.inspect(data, { depth: null, colors: false });
      this.logger.log(`${header} ${message}\n${inspected}`);
    } else {
      this.logger.log(`${header} ${message}`);
    }
  }

  warn(message: string, data?: any, label?: string) {
    const header = label ? `[${label}]` : '';
    const inspected = data
      ? `\n${util.inspect(data, { depth: null, colors: false })}`
      : '';
    this.logger.warn(`${header} ${message}${inspected}`);
  }

  error(message: string, trace?: any, label?: string) {
    const header = label ? `[${label}]` : '';
    const inspected = trace
      ? `\n${util.inspect(trace, { depth: null, colors: false })}`
      : '';
    this.logger.error(`${header} ${message}${inspected}`);
  }
}
