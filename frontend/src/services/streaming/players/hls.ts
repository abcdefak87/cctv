import Hls from 'hls.js';
import { IStreamPlayer, StreamMetrics, StreamState } from './types';
import { EventEmitter } from './utils';

export class HLSPlayer extends EventEmitter implements IStreamPlayer {
  private hls: Hls | null = null;
  private video: HTMLVideoElement;
  private metrics: StreamMetrics = {
    bandwidth: 0,
    latency: 0,
    bufferHealth: 0,
    droppedFrames: 0,
    bitrate: 0,
    resolution: '0x0'
  };

  constructor(video: HTMLVideoElement) {
    super();
    this.video = video;
    this.setupVideoEvents();
  }

  async load(url: string): Promise<void> {
    if (!Hls.isSupported()) throw new Error('HLS not supported');
    
    this.hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90
    });

    this.setupHLSEvents();
    this.hls.loadSource(url);
    this.hls.attachMedia(this.video);
  }

  async play(): Promise<void> {
    await this.video.play();
  }

  pause(): void {
    this.video.pause();
  }

  destroy(): void {
    this.hls?.destroy();
    this.removeAllListeners();
  }

  getMetrics(): StreamMetrics {
    if (this.hls) {
      const stats = this.hls.stats;
      this.metrics.bandwidth = stats.bandwidth || 0;
      this.metrics.bufferHealth = this.video.buffered.length > 0 ? 
        this.video.buffered.end(0) - this.video.currentTime : 0;
    }
    return { ...this.metrics };
  }

  private setupHLSEvents(): void {
    if (!this.hls) return;

    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      this.emit('ready');
    });

    this.hls.on(Hls.Events.ERROR, (_, data) => {
      this.emit('error', {
        code: data.type,
        message: data.details,
        recoverable: data.fatal !== true,
        timestamp: Date.now()
      });
    });
  }

  private setupVideoEvents(): void {
    this.video.addEventListener('loadstart', () => this.emit('stateChange', StreamState.LOADING));
    this.video.addEventListener('playing', () => this.emit('stateChange', StreamState.PLAYING));
    this.video.addEventListener('waiting', () => this.emit('stateChange', StreamState.BUFFERING));
  }
}