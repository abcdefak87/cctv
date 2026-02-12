import { IStreamPlayer, StreamMetrics, StreamState } from '../types';
import { EventEmitter } from '../utils';

export class WebRTCPlayer extends EventEmitter implements IStreamPlayer {
  private pc: RTCPeerConnection | null = null;
  private video: HTMLVideoElement;
  private ws: WebSocket | null = null;
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
  }

  async load(url: string): Promise<void> {
    const wsUrl = url.replace('http', 'ws');
    this.ws = new WebSocket(wsUrl);
    
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.setupPeerConnection();
    this.setupWebSocket();
  }

  async play(): Promise<void> {
    await this.video.play();
  }

  pause(): void {
    this.video.pause();
  }

  destroy(): void {
    this.ws?.close();
    this.pc?.close();
    this.removeAllListeners();
  }

  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  private setupPeerConnection(): void {
    if (!this.pc) return;

    this.pc.ontrack = (event) => {
      this.video.srcObject = event.streams[0];
      this.emit('ready');
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.ws) {
        this.ws.send(JSON.stringify({
          type: 'candidate',
          candidate: event.candidate
        }));
      }
    };
  }

  private setupWebSocket(): void {
    if (!this.ws) return;

    this.ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'offer' && this.pc) {
        await this.pc.setRemoteDescription(data);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.ws?.send(JSON.stringify(answer));
      }
    };

    this.ws.onerror = () => {
      this.emit('error', {
        code: 'WEBRTC_CONNECTION_FAILED',
        message: 'WebRTC connection failed',
        recoverable: true,
        timestamp: Date.now()
      });
    };
  }
}