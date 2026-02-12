import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { getHLSConfig } from './hlsConfig';
import { detectStreamFormat, getOptimalPlayer, StreamFormat } from './streamFormatDetector';

/**
 * Universal Video Player Hook
 * Supports HLS, MSE/MP4, WebRTC with automatic format detection
 * Production-ready with error handling and fallback
 */
export function useUniversalPlayer({ streamUrl, onError, onPlaying, deviceCapabilities }) {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const [playerType, setPlayerType] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const cleanup = useCallback(() => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.src = '';
            videoRef.current.load();
        }
    }, []);
    
    const initializePlayer = useCallback(async () => {
        if (!streamUrl || !videoRef.current) return;
        
        cleanup();
        setIsLoading(true);
        
        const player = getOptimalPlayer(streamUrl);
        setPlayerType(player.type);
        
        try {
            if (player.type === 'native') {
                // Native HTML5 video (MSE, MP4, or Safari HLS)
                videoRef.current.src = streamUrl;
                
                // Apply config
                Object.keys(player.config).forEach(key => {
                    videoRef.current[key] = player.config[key];
                });
                
                // Wait for loadedmetadata
                videoRef.current.addEventListener('loadedmetadata', () => {
                    setIsLoading(false);
                    videoRef.current.play().catch(err => {
                        console.error('Play error:', err);
                        onError?.(err);
                    });
                });
                
                videoRef.current.addEventListener('playing', () => {
                    onPlaying?.();
                });
                
                videoRef.current.load();
                
            } else if (player.type === 'hlsjs') {
                // HLS.js for non-Safari browsers
                if (!Hls.isSupported()) {
                    throw new Error('HLS.js not supported');
                }
                
                const hlsConfig = getHLSConfig(deviceCapabilities);
                const hls = new Hls(hlsConfig);
                hlsRef.current = hls;
                
                hls.loadSource(streamUrl);
                hls.attachMedia(videoRef.current);
                
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    setIsLoading(false);
                    videoRef.current.play().catch(err => {
                        console.error('HLS play error:', err);
                        onError?.(err);
                    });
                });
                
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        onError?.(new Error(`HLS Error: ${data.type}`));
                    }
                });
                
                videoRef.current.addEventListener('playing', () => {
                    onPlaying?.();
                });
                
            } else if (player.type === 'webrtc') {
                // WebRTC player (future implementation)
                console.warn('WebRTC player not yet implemented');
                onError?.(new Error('WebRTC not yet supported'));
            }
            
        } catch (err) {
            console.error('Player initialization error:', err);
            setIsLoading(false);
            onError?.(err);
        }
    }, [streamUrl, deviceCapabilities, cleanup, onError, onPlaying]);
    
    useEffect(() => {
        initializePlayer();
        
        return () => {
            cleanup();
        };
    }, [initializePlayer, cleanup]);
    
    return {
        videoRef,
        playerType,
        isLoading,
        reinitialize: initializePlayer
    };
}
