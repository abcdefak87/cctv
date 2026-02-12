import { useEffect, useRef, useState } from 'react';
import { getStreamingService } from '../services/streaming';
import { StreamConfig, StreamState, IStreamPlayer, StreamMetrics } from '../services/streaming/types';

export function useStream(config: StreamConfig) {
  const [state, setState] = useState<StreamState>(StreamState.IDLE);
  const [metrics, setMetrics] = useState<StreamMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<IStreamPlayer | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let mounted = true;

    async function initStream() {
      if (!videoRef.current) return;

      try {
        setState(StreamState.LOADING);
        const service = getStreamingService();
        const player = await service.createStream(config);
        
        if (!mounted) {
          player.destroy();
          return;
        }

        playerRef.current = player;

        // Setup event listeners
        player.on('stateChange', setState);
        player.on('error', (err: any) => setError(err.message));
        player.on('ready', () => setError(null));

        // Start metrics collection
        const metricsInterval = setInterval(() => {
          if (mounted && playerRef.current) {
            setMetrics(playerRef.current.getMetrics());
          }
        }, 1000);

        return () => clearInterval(metricsInterval);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Stream initialization failed');
          setState(StreamState.ERROR);
        }
      }
    }

    initStream();

    return () => {
      mounted = false;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [config.cameraId]);

  const play = async () => {
    if (playerRef.current) {
      await playerRef.current.play();
    }
  };

  const pause = () => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
  };

  return {
    videoRef,
    state,
    metrics,
    error,
    play,
    pause
  };
}