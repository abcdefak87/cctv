export class EventEmitter {
  private events = new Map<string, Function[]>();

  on(event: string, callback: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }

  removeAllListeners(): void {
    this.events.clear();
  }
}

export class NetworkMonitor {
  private bandwidth = 0;
  private connection: any;
  private intervalId?: number;

  start(): void {
    this.connection = (navigator as any).connection;
    this.updateBandwidth();
    this.intervalId = window.setInterval(() => this.updateBandwidth(), 10000);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  getBandwidth(): number {
    return this.bandwidth;
  }

  private updateBandwidth(): void {
    if (this.connection?.downlink) {
      this.bandwidth = this.connection.downlink * 1000000; // Convert to bps
    } else {
      // Fallback estimation
      this.bandwidth = 5000000; // 5 Mbps default
    }
  }
}

export class Logger {
  constructor(private context: string) {}

  debug(message: string, ...args: any[]): void {
    if (import.meta.env.DEV) {
      console.debug(`[${this.context}] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    console.info(`[${this.context}] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.context}] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[${this.context}] ${message}`, ...args);
  }
}