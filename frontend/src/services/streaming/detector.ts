import { StreamFormat } from './types';

export class StreamDetector {
  static detectFormat(url: string): StreamFormat {
    if (url.includes('.m3u8') || url.includes('/hls/')) return StreamFormat.HLS;
    if (url.includes('webrtc') || url.includes(':8555')) return StreamFormat.WEBRTC;
    return StreamFormat.NATIVE;
  }

  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static getSupportedFormats(): StreamFormat[] {
    const formats: StreamFormat[] = [];
    
    // Check HLS support
    if (this.isHLSSupported()) formats.push(StreamFormat.HLS);
    
    // Check WebRTC support
    if (this.isWebRTCSupported()) formats.push(StreamFormat.WEBRTC);
    
    // Native always supported
    formats.push(StreamFormat.NATIVE);
    
    return formats;
  }

  private static isHLSSupported(): boolean {
    const video = document.createElement('video');
    return !!(video.canPlayType('application/vnd.apple.mpegurl') || 
             video.canPlayType('audio/mpegurl'));
  }

  private static isWebRTCSupported(): boolean {
    return !!(window.RTCPeerConnection || window.webkitRTCPeerConnection);
  }
}