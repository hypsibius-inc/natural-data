import { Logger as FaaSLogger } from 'faas-js-runtime';
import { LogLevel, Logger } from '@slack/bolt';

export class SlackLogger implements Logger {
  private name: string;
  private level: LogLevel;
  constructor(private _logger: FaaSLogger) {
    this.name = 'SlackEvents';
    this.level = LogLevel.DEBUG;
  }
  format(msg: any): string {
    return `${this.name}> ${msg}`;
  }
  debug(...msg: any[]): void {
    if (this.level === LogLevel.DEBUG) {
      return this._logger.debug(this.format(msg));
    }
  }
  info(...msg: any[]): void {
    if (this.level in [LogLevel.DEBUG, LogLevel.INFO]) {
      return this._logger.info(this.format(msg));
    }
  }
  warn(...msg: any[]): void {
    if (this.level in [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN]) {
      return this._logger.warn(this.format(msg));
    }
  }
  error(...msg: any[]): void {
    return this._logger.error(this.format(msg));
  }
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  getLevel(): LogLevel {
    return this.level;
  }
  setName(name: string): void {
    this.name = name;
  }
}
