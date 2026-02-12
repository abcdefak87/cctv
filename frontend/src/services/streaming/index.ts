export { StreamingService } from './service';
export { StreamDetector } from './detector';
export * from './types';

// Singleton instance for global use
let streamingServiceInstance: StreamingService | null = null;

export function getStreamingService(): StreamingService {
  if (!streamingServiceInstance) {
    streamingServiceInstance = new StreamingService();
  }
  return streamingServiceInstance;
}

export function destroyStreamingService(): void {
  if (streamingServiceInstance) {
    streamingServiceInstance.destroy();
    streamingServiceInstance = null;
  }
}