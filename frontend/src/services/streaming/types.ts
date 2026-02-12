export enum StreamFormat {
  HLS = 'hls',
  WEBRTC = 'webrtc',
  NATIVE = 'native'
}

export enum StreamQuality {
  AUTO = 'auto',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum StreamState {
  IDLE = 'idle',
  LOADING = 'loading',
  PLAYING = 'playing',
  BUFFERING = 'buffering',
  ERROR = 'error',
  ENDED = 'ended'
}

export interface StreamConfig {
  cameraId: string;
  formats: StreamFormat[];
  quality: StreamQuality;
  autoReconnect: boolean;
  maxRetries: number;
  timeout: number;
}

export interface StreamMetrics {
  bandwidth: number;
  latency: number;
  bufferHealth: number;
  droppedFrames: number;
  bitrate: number;
  resolution: string;
}

export interface StreamError {
  code: string;
  message: string;
  recoverable: boolean;
  timestamp: number;
}

export interface IStreamPlayer {
  load(url: string): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  destroy(): void;
  getMetrics(): StreamMetrics;
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}

export interface IStreamService {
  createStream(config: StreamConfig): Promise<IStreamPlayer>;
  getHealthStatus(cameraId: string): Promise<boolean>;
  getBandwidthEstimate(): number;
  destroy(): void;
}