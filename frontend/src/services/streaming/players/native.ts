import { IStreamPlayer, StreamMetrics, StreamState } from '../types';
import { EventEmitter } from '../utils';

export class NativePlayer extends EventEmitter implements IStreamPlayer {
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
    this.setupEvents();
  }

  async load(url: string): Promise<void> {
    this.video.src = url;
    this.video.load();
  }

  async play(): Promise<void> {
    await this.video.play();
  }

  pause(): void {
    this.video.pause();
  }

  destroy(): void {
    this.video.src = '';
    this.removeAllListeners();
  }

  getMetrics(): StreamMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  private setupEvents(): void {
    this.video.addEventListener('loadstart', () => this.emit('stateChange', StreamState.LOADING));
    this.video.addEventListener('canplay', () => this.emit('ready'));
    this.video.addEventListener('playing', () => this.emit('stateChange', StreamState.PLAYING));
    this.video.addEventListener('waiting', () => this.emit('stateChange', StreamState.BUFFERING));
    this.video.addEventListener('error', () => {
      this.emit('error', {
        code: 'NATIVE_PLAYBACK_ERROR',
        message: 'Native video playback failed',
        recoverable: true,
        timestamp: Date.now()
      });
    });
  }

  private updateMetrics(): void {
    if (this.video.buffered.length > 0) {
      this.metrics.bufferHealth = this.video.buffered.end(0) - this.video.currentTime;
    }
    
    if (this.video.videoWidth && this.video.videoHeight) {
      this.metrics.resolution = `${this.video.videoWidth}x${this.video.videoHeight}`;
    }
  }
}