import { StreamFormat, StreamConfig, IStreamPlayer, IStreamService } from './types';
import { StreamDetector } from './detector';
import { HLSPlayer } from './players/hls';
import { WebRTCPlayer } from './players/webrtc';
import { NativePlayer } from './players/native';
import { NetworkMonitor } from './network';
import { Logger } from './logger';

export class StreamingService implements IStreamService {
  private networkMonitor = new NetworkMonitor();
  private logger = new Logger('StreamingService');
  private activeStreams = new Map<string, IStreamPlayer>();

  constructor() {
    this.networkMonitor.start();
  }

  async createStream(config: StreamConfig): Promise<IStreamPlayer> {
    const urls = await this.getStreamUrls(config.cameraId);
    const player = await this.createPlayerWithFallback(urls, config);
    
    this.activeStreams.set(config.cameraId, player);
    this.setupPlayerMonitoring(player, config.cameraId);
    
    return player;
  }

  async getHealthStatus(cameraId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/cameras/${cameraId}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  getBandwidthEstimate(): number {
    return this.networkMonitor.getBandwidth();
  }

  destroy(): void {
    this.activeStreams.forEach(player => player.destroy());
    this.activeStreams.clear();
    this.networkMonitor.stop();
  }

  private async getStreamUrls(cameraId: string): Promise<Record<StreamFormat, string>> {
    const baseUrl = import.meta.env.VITE_API_URL;
    return {
      [StreamFormat.HLS]: `${baseUrl}/hls/${cameraId}/index.m3u8`,
      [StreamFormat.WEBRTC]: `${baseUrl}/webrtc/${cameraId}`,
      [StreamFormat.NATIVE]: `${baseUrl}/stream/${cameraId}`
    };
  }

  private async createPlayerWithFallback(
    urls: Record<StreamFormat, string>, 
    config: StreamConfig
  ): Promise<IStreamPlayer> {
    const video = document.createElement('video');
    const formats = this.getPriorityFormats(config.formats);

    for (const format of formats) {
      try {
        const player = this.createPlayer(format, video);
        await player.load(urls[format]);
        this.logger.info(`Created ${format} player for camera ${config.cameraId}`);
        return player;
      } catch (error) {
        this.logger.warn(`Failed to create ${format} player:`, error);
      }
    }

    throw new Error('No compatible player found');
  }

  private createPlayer(format: StreamFormat, video: HTMLVideoElement): IStreamPlayer {
    switch (format) {
      case StreamFormat.HLS: return new HLSPlayer(video);
      case StreamFormat.WEBRTC: return new WebRTCPlayer(video);
      case StreamFormat.NATIVE: return new NativePlayer(video);
      default: throw new Error(`Unsupported format: ${format}`);
    }
  }

  private getPriorityFormats(requested: StreamFormat[]): StreamFormat[] {
    const bandwidth = this.getBandwidthEstimate();
    const supported = StreamDetector.getSupportedFormats();
    const available = requested.filter(f => supported.includes(f));

    // Prioritize based on network conditions
    if (bandwidth > 5000000) { // 5 Mbps
      return available.sort((a, b) => {
        const priority = { [StreamFormat.WEBRTC]: 3, [StreamFormat.HLS]: 2, [StreamFormat.NATIVE]: 1 };
        return priority[b] - priority[a];
      });
    }

    return available.sort((a, b) => {
      const priority = { [StreamFormat.HLS]: 3, [StreamFormat.NATIVE]: 2, [StreamFormat.WEBRTC]: 1 };
      return priority[b] - priority[a];
    });
  }

  private setupPlayerMonitoring(player: IStreamPlayer, cameraId: string): void {
    player.on('error', (error) => {
      this.logger.error(`Stream error for camera ${cameraId}:`, error);
    });

    player.on('stateChange', (state) => {
      this.logger.debug(`Camera ${cameraId} state: ${state}`);
    });

    // Collect metrics every 5 seconds
    setInterval(() => {
      const metrics = player.getMetrics();
      this.logger.debug(`Camera ${cameraId} metrics:`, metrics);
    }, 5000);
  }
}