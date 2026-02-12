/**
 * Universal Player Engine Hook
 * 
 * Core engine for multi-format video streaming with intelligent fallback,
 * error recovery, and performance optimization.
 * 
 * Supports:
 * - HLS (HTTP Live Streaming) via HLS.js or native
 * - MSE/MP4 (Media Source Extensions)
 * - WebRTC (Real-time Communication)
 * 
 * Features:
 * - Automatic format detection and selection
 * - Intelligent fallback mechanism
 * - Exponential backoff retry logic
 * - Network quality adaptation
 * - Memory leak prevention
 * - Performance monitoring
 * 
 * @author RAF NET CCTV System
 * @version 2.0.0
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
    detectStreamFormat, 
    getOptimalPlayer, 
    getStreamPriority, 
    StreamFormat 
} from '../utils/streamFormatDetector';
import { LoadingStage, createStreamError } from '../utils/streamLoaderTypes';
import { preloadHls } from '../utils/preloadManager';
import { getHLSConfig } from '../utils/hlsConfig';
import { getDeviceCapabilities } from '../utils/deviceDetector';

/**
 * Player state enum
 */
const PlayerStatus = {
    IDLE: 'idle',
    LOADING: 'loading',
    BUFFERING: 'buffering',
    PLAYING: 'playing',
    PAUSED: 'paused',
    ERROR: 'error',
    ENDED: 'ended'
};

/**
 * Universal Player Engine Hook
 * 
 * @param {Object} params - Hook parameters
 * @param {React.RefObject} params.videoRef - Video element ref
 * @param {Object} params.streams - Available stream URLs
 * @param {Object} params.config - Player configuration
 * @param {Function} [params.onError] - Error callback
 * @param {Function} [params.onPlaying] - Playing callback
 * @param {Function} [params.onMetrics] - Metrics callback
 * @returns {Object} Player engine state and controls
 */
export function useUniversalPlayerEngine({
    videoRef,
    streams,
    config = {},
    onError,
    onPlaying,
    onMetrics
}) {
    // Refs for cleanup
    const hlsRef = useRef(null);
    const webrtcRef = useRef(null);
    const abortControllerRef = useRef(null);
    const retryTimeoutRef = useRef(null);
    const metricsIntervalRef = useRef(null);
    
    // Device capabilities (cached)
    const deviceCapabilities = useMemo(() => getDeviceCapabilities(), []);
    
    // Stream priority list (cached)
    const streamPriority = useMemo(() => getStreamPriority(streams), [streams]);
    
    // State
    const [playerState, setPlayerState] = useState({
        status: PlayerStatus.IDLE,
        stage: LoadingStage.CONNECTING,
        retryCount: 0,
        isVisible: true
    });
    
    const [currentFormat, setCurrentFormat] = useState(null);
    const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState({
        loadTime: 0,
        bufferHealth: 0,
        droppedFrames: 0,
        bandwidth: 0,
        latency: 0
    });
    
    /**
     * Cleanup all resources
     */
    const cleanup = useCallback(() => {
        // Cancel pending requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        
        // Clear timeouts
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
        
        if (metricsIntervalRef.current) {
            clearInterval(metricsIntervalRef.current);
            metricsIntervalRef.current = null;
        }
        
        // Cleanup HLS
        if (hlsRef.current) {
            try {
                hlsRef.current.destroy();
            } catch (err) {
                console.warn('HLS cleanup error:', err);
            }
            hlsRef.current = null;
        }
        
        // Cleanup WebRTC
        if (webrtcRef.current) {
            try {
                webrtcRef.current.close();
            } catch (err) {
                console.warn('WebRTC cleanup error:', err);
            }
            webrtcRef.current = null;
        }
        
        // Cleanup video element
        if (videoRef.current) {
            const video = videoRef.current;
            video.pause();
            video.removeAttribute('src');
            video.load();
        }
    }, [videoRef]);
    
    /**
     * Calculate exponential backoff delay
     * @param {number} attempt - Retry attempt number
     * @returns {number} Delay in milliseconds
     */
    const getRetryDelay = useCallback((attempt) => {
        const baseDelay = 1000; // 1 second
        const maxDelay = 30000; // 30 seconds
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay;
        return delay + jitter;
    }, []);
    
    /**
     * Initialize HLS player
     * @param {string} streamUrl - HLS stream URL
     * @returns {Promise<boolean>} Success status
     */
    const initializeHLS = useCallback(async (streamUrl) => {
        try {
            const video = videoRef.current;
            if (!video) return false;
            
            // Check for native HLS support (Safari)
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = streamUrl;
                return true;
            }
            
            // Use HLS.js for other browsers
            const Hls = await preloadHls();
            if (!Hls.isSupported()) {
                throw new Error('HLS not supported');
            }
            
            const hlsConfig = getHLSConfig(deviceCapabilities.tier, {
                isMobile: deviceCapabilities.isMobile,
                mobileDeviceType: deviceCapabilities.mobileDeviceType
            });
            
            const hls = new Hls(hlsConfig);
            hlsRef.current = hls;
            
            // Set up event listeners
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setPlayerState(prev => ({ ...prev, stage: LoadingStage.BUFFERING }));
            });
            
            hls.on(Hls.Events.FRAG_BUFFERED, () => {
                setPlayerState(prev => ({ ...prev, stage: LoadingStage.STARTING }));
                
                video.play().then(() => {
                    setPlayerState(prev => ({ 
                        ...prev, 
                        status: PlayerStatus.PLAYING,
                        stage: LoadingStage.PLAYING,
                        retryCount: 0
                    }));
                    onPlaying?.();
                }).catch(err => {
                    console.error('HLS play error:', err);
                    throw err;
                });
            });
            
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    const errorType = data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'network' :
                                      data.type === Hls.ErrorTypes.MEDIA_ERROR ? 'media' : 'unknown';
                    
                    throw createStreamError({
                        type: errorType,
                        message: data.details || 'HLS error',
                        stage: playerState.stage,
                        deviceTier: deviceCapabilities.tier,
                        retryCount: playerState.retryCount
                    });
                }
            });
            
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            
            return true;
            
        } catch (err) {
            console.error('HLS initialization error:', err);
            return false;
        }
    }, [videoRef, deviceCapabilities, playerState.stage, playerState.retryCount, onPlaying]);
    
    /**
     * Initialize MSE/MP4 player
     * @param {string} streamUrl - MSE/MP4 stream URL
     * @returns {Promise<boolean>} Success status
     */
    const initializeMSE = useCallback(async (streamUrl) => {
        try {
            const video = videoRef.current;
            if (!video) return false;
            
            // Check MSE support
            if (!('MediaSource' in window)) {
                throw new Error('MSE not supported');
            }
            
            video.src = streamUrl;
            
            // Set up event listeners
            const handleLoadedMetadata = () => {
                setPlayerState(prev => ({ ...prev, stage: LoadingStage.BUFFERING }));
            };
            
            const handleCanPlay = () => {
                setPlayerState(prev => ({ ...prev, stage: LoadingStage.STARTING }));
                
                video.play().then(() => {
                    setPlayerState(prev => ({ 
                        ...prev, 
                        status: PlayerStatus.PLAYING,
                        stage: LoadingStage.PLAYING,
                        retryCount: 0
                    }));
                    onPlaying?.();
                }).catch(err => {
                    console.error('MSE play error:', err);
                    throw err;
                });
            };
            
            const handleError = () => {
                throw createStreamError({
                    type: 'media',
                    message: 'MSE playback error',
                    stage: playerState.stage,
                    deviceTier: deviceCapabilities.tier,
                    retryCount: playerState.retryCount
                });
            };
            
            video.addEventListener('loadedmetadata', handleLoadedMetadata);
            video.addEventListener('canplay', handleCanPlay);
            video.addEventListener('error', handleError);
            
            video.load();
            
            return true;
            
        } catch (err) {
            console.error('MSE initialization error:', err);
            return false;
        }
    }, [videoRef, deviceCapabilities, playerState.stage, playerState.retryCount, onPlaying]);
    
    /**
     * Initialize WebRTC player
     * @param {string} streamUrl - WebRTC stream URL
     * @returns {Promise<boolean>} Success status
     */
    const initializeWebRTC = useCallback(async (streamUrl) => {
        try {
            const video = videoRef.current;
            if (!video) return false;
            
            // Check WebRTC support
            if (!('RTCPeerConnection' in window)) {
                throw new Error('WebRTC not supported');
            }
            
            // Create peer connection
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            });
            
            webrtcRef.current = pc;
            
            // Set up event listeners
            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    video.srcObject = event.streams[0];
                    
                    video.play().then(() => {
                        setPlayerState(prev => ({ 
                            ...prev, 
                            status: PlayerStatus.PLAYING,
                            stage: LoadingStage.PLAYING,
                            retryCount: 0
                        }));
                        onPlaying?.();
                    }).catch(err => {
                        console.error('WebRTC play error:', err);
                        throw err;
                    });
                }
            };
            
            pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === 'failed') {
                    throw createStreamError({
                        type: 'network',
                        message: 'WebRTC connection failed',
                        stage: playerState.stage,
                        deviceTier: deviceCapabilities.tier,
                        retryCount: playerState.retryCount
                    });
                }
            };
            
            // Create offer and set up connection
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            // Send offer to server (implementation depends on signaling server)
            const response = await fetch(streamUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
                signal: abortControllerRef.current?.signal
            });
            
            if (!response.ok) {
                throw new Error(`WebRTC signaling failed: ${response.status}`);
            }
            
            const answer = await response.json();
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            
            return true;
            
        } catch (err) {
            console.error('WebRTC initialization error:', err);
            return false;
        }
    }, [videoRef, deviceCapabilities, playerState.stage, playerState.retryCount, onPlaying]);
    
    /**
     * Initialize player for current stream
     * @param {number} streamIndex - Index in stream priority list
     * @returns {Promise<boolean>} Success status
     */
    const initializePlayer = useCallback(async (streamIndex = 0) => {
        if (!streamPriority.length || streamIndex >= streamPriority.length) {
            return false;
        }
        
        const stream = streamPriority[streamIndex];
        setCurrentFormat(stream.format);
        setCurrentStreamIndex(streamIndex);
        
        setPlayerState(prev => ({ 
            ...prev, 
            status: PlayerStatus.LOADING,
            stage: LoadingStage.LOADING
        }));
        
        // Create abort controller for this attempt
        abortControllerRef.current = new AbortController();
        
        try {
            let success = false;
            
            switch (stream.format) {
                case StreamFormat.HLS:
                    success = await initializeHLS(stream.url);
                    break;
                case StreamFormat.MSE:
                    success = await initializeMSE(stream.url);
                    break;
                case StreamFormat.WEBRTC:
                    success = await initializeWebRTC(stream.url);
                    break;
                default:
                    throw new Error(`Unsupported format: ${stream.format}`);
            }
            
            return success;
            
        } catch (err) {
            console.error('Player initialization failed:', err);
            setError(err);
            setPlayerState(prev => ({ 
                ...prev, 
                status: PlayerStatus.ERROR,
                stage: LoadingStage.ERROR
            }));
            onError?.(err);
            return false;
        }
    }, [streamPriority, initializeHLS, initializeMSE, initializeWebRTC, onError]);
    
    /**
     * Retry with exponential backoff
     */
    const retryWithBackoff = useCallback(async () => {
        const retryCount = playerState.retryCount + 1;
        
        if (retryCount > config.retryAttempts) {
            // Try next format if available
            const nextIndex = currentStreamIndex + 1;
            if (nextIndex < streamPriority.length) {
                setPlayerState(prev => ({ ...prev, retryCount: 0 }));
                return initializePlayer(nextIndex);
            } else {
                // All formats exhausted
                setError(new Error('All stream formats failed'));
                setPlayerState(prev => ({ 
                    ...prev, 
                    status: PlayerStatus.ERROR,
                    stage: LoadingStage.ERROR
                }));
                return false;
            }
        }
        
        const delay = getRetryDelay(retryCount - 1);
        
        setPlayerState(prev => ({ ...prev, retryCount }));
        
        retryTimeoutRef.current = setTimeout(() => {
            cleanup();
            initializePlayer(currentStreamIndex);
        }, delay);
        
        return true;
    }, [playerState.retryCount, config.retryAttempts, currentStreamIndex, streamPriority.length, 
        getRetryDelay, cleanup, initializePlayer]);
    
    /**
     * Manual retry function
     */
    const retry = useCallback(() => {
        cleanup();
        setError(null);
        setPlayerState({
            status: PlayerStatus.IDLE,
            stage: LoadingStage.CONNECTING,
            retryCount: 0,
            isVisible: true
        });
        setCurrentStreamIndex(0);
        initializePlayer(0);
    }, [cleanup, initializePlayer]);
    
    /**
     * Switch to different format
     * @param {string} [targetFormat] - Target format to switch to
     */
    const switchFormat = useCallback((targetFormat) => {
        let targetIndex = currentStreamIndex + 1;
        
        if (targetFormat) {
            targetIndex = streamPriority.findIndex(stream => stream.format === targetFormat);
            if (targetIndex === -1) targetIndex = currentStreamIndex + 1;
        }
        
        if (targetIndex < streamPriority.length) {
            cleanup();
            setError(null);
            setPlayerState(prev => ({ ...prev, retryCount: 0 }));
            initializePlayer(targetIndex);
        }
    }, [currentStreamIndex, streamPriority, cleanup, initializePlayer]);
    
    /**
     * Start metrics collection
     */
    const startMetricsCollection = useCallback(() => {
        if (metricsIntervalRef.current) return;
        
        metricsIntervalRef.current = setInterval(() => {
            const video = videoRef.current;
            if (!video) return;
            
            const newMetrics = {
                loadTime: performance.now(),
                bufferHealth: video.buffered.length > 0 ? 
                    video.buffered.end(video.buffered.length - 1) - video.currentTime : 0,
                droppedFrames: video.getVideoPlaybackQuality?.()?.droppedVideoFrames || 0,
                bandwidth: hlsRef.current?.bandwidthEstimate || 0,
                latency: 0 // Will be calculated based on format
            };
            
            setMetrics(newMetrics);
            onMetrics?.(newMetrics);
        }, 1000);
    }, [videoRef, onMetrics]);
    
    /**
     * Stop metrics collection
     */
    const stopMetricsCollection = useCallback(() => {
        if (metricsIntervalRef.current) {
            clearInterval(metricsIntervalRef.current);
            metricsIntervalRef.current = null;
        }
    }, []);
    
    // Initialize player when streams change
    useEffect(() => {
        if (streamPriority.length > 0) {
            initializePlayer(0);
        }
        
        return cleanup;
    }, [streamPriority, initializePlayer, cleanup]);
    
    // Start/stop metrics based on playing state
    useEffect(() => {
        if (playerState.status === PlayerStatus.PLAYING) {
            startMetricsCollection();
        } else {
            stopMetricsCollection();
        }
        
        return stopMetricsCollection;
    }, [playerState.status, startMetricsCollection, stopMetricsCollection]);
    
    // Auto-retry on error
    useEffect(() => {
        if (playerState.status === PlayerStatus.ERROR && config.retryAttempts > 0) {
            retryWithBackoff();
        }
    }, [playerState.status, config.retryAttempts, retryWithBackoff]);
    
    return {
        playerState,
        currentFormat,
        error,
        metrics,
        retry,
        switchFormat,
        cleanup
    };
}