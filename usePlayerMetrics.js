/**
 * Player Metrics Hook
 * 
 * Comprehensive performance monitoring and metrics collection for video players.
 * Tracks playback quality, network performance, and user experience metrics.
 * 
 * Features:
 * - Real-time performance monitoring
 * - Buffer health tracking
 * - Frame drop detection
 * - Bandwidth estimation
 * - Latency measurement
 * - Quality adaptation metrics
 * - Memory usage tracking
 * 
 * @author RAF NET CCTV System
 * @version 2.0.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Player Metrics Hook
 * 
 * @param {Object} params - Hook parameters
 * @param {React.RefObject} params.videoRef - Video element ref
 * @param {Object} params.playerState - Current player state
 * @param {Object} params.networkQuality - Network quality info
 * @param {Function} [params.onMetrics] - Metrics callback
 * @param {number} [params.interval=1000] - Metrics collection interval in ms
 * @returns {Object} Current metrics and controls
 */
export function usePlayerMetrics({
    videoRef,
    playerState,
    networkQuality,
    onMetrics,
    interval = 1000
}) {
    const metricsIntervalRef = useRef(null);
    const startTimeRef = useRef(null);
    const lastMetricsRef = useRef(null);
    const performanceObserverRef = useRef(null);
    
    // Metrics state
    const [metrics, setMetrics] = useState({
        // Playback metrics
        currentTime: 0,
        duration: 0,
        bufferedRanges: [],
        bufferHealth: 0,
        bufferLength: 0,
        
        // Quality metrics
        videoWidth: 0,
        videoHeight: 0,
        droppedFrames: 0,
        totalFrames: 0,
        frameRate: 0,
        
        // Network metrics
        bandwidth: 0,
        latency: 0,
        downloadSpeed: 0,
        
        // Performance metrics
        loadTime: 0,
        timeToFirstFrame: 0,
        rebufferCount: 0,
        rebufferTime: 0,
        
        // System metrics
        memoryUsage: 0,
        cpuUsage: 0,
        
        // User experience metrics
        qualityChanges: 0,
        stallCount: 0,
        averageQuality: 0
    });
    
    /**
     * Get video playback quality metrics
     * @returns {Object} Quality metrics
     */
    const getVideoQualityMetrics = useCallback(() => {
        const video = videoRef.current;
        if (!video) return {};
        
        const quality = video.getVideoPlaybackQuality?.();
        
        return {
            droppedFrames: quality?.droppedVideoFrames || 0,
            totalFrames: quality?.totalVideoFrames || 0,
            corruptedFrames: quality?.corruptedVideoFrames || 0,
            creationTime: quality?.creationTime || 0
        };
    }, [videoRef]);
    
    /**
     * Get buffer health metrics
     * @returns {Object} Buffer metrics
     */
    const getBufferMetrics = useCallback(() => {
        const video = videoRef.current;
        if (!video || !video.buffered) return {};
        
        const buffered = video.buffered;
        const currentTime = video.currentTime;
        const ranges = [];
        let bufferHealth = 0;
        let totalBuffered = 0;
        
        // Collect all buffered ranges
        for (let i = 0; i < buffered.length; i++) {
            const start = buffered.start(i);
            const end = buffered.end(i);
            ranges.push({ start, end, length: end - start });
            totalBuffered += end - start;
            
            // Calculate buffer health (time ahead of current position)
            if (start <= currentTime && end > currentTime) {
                bufferHealth = end - currentTime;
            }
        }
        
        return {
            bufferedRanges: ranges,
            bufferHealth,
            bufferLength: totalBuffered,
            bufferRatio: video.duration ? totalBuffered / video.duration : 0
        };
    }, [videoRef]);
    
    /**
     * Get network performance metrics
     * @returns {Object} Network metrics
     */
    const getNetworkMetrics = useCallback(() => {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        return {
            effectiveType: connection?.effectiveType || 'unknown',
            downlink: connection?.downlink || 0,
            rtt: connection?.rtt || 0,
            saveData: connection?.saveData || false
        };
    }, []);
    
    /**
     * Get memory usage metrics
     * @returns {Object} Memory metrics
     */
    const getMemoryMetrics = useCallback(() => {
        if (!performance.memory) return {};
        
        return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            memoryUsage: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
        };
    }, []);
    
    /**
     * Calculate frame rate
     * @param {Object} currentQuality - Current quality metrics
     * @param {Object} lastQuality - Previous quality metrics
     * @param {number} timeDelta - Time difference in seconds
     * @returns {number} Frame rate in FPS
     */
    const calculateFrameRate = useCallback((currentQuality, lastQuality, timeDelta) => {
        if (!lastQuality || timeDelta === 0) return 0;
        
        const frameDelta = currentQuality.totalFrames - lastQuality.totalFrames;
        return frameDelta / timeDelta;
    }, []);
    
    /**
     * Collect comprehensive metrics
     * @returns {Object} Complete metrics object
     */
    const collectMetrics = useCallback(() => {
        const video = videoRef.current;
        if (!video) return metrics;
        
        const now = performance.now();
        const qualityMetrics = getVideoQualityMetrics();
        const bufferMetrics = getBufferMetrics();
        const networkMetrics = getNetworkMetrics();
        const memoryMetrics = getMemoryMetrics();
        
        // Calculate time-based metrics
        const timeDelta = lastMetricsRef.current ? 
            (now - lastMetricsRef.current.timestamp) / 1000 : 0;
        
        const frameRate = lastMetricsRef.current ? 
            calculateFrameRate(qualityMetrics, lastMetricsRef.current.quality, timeDelta) : 0;
        
        // Calculate load time
        const loadTime = startTimeRef.current ? now - startTimeRef.current : 0;
        
        // Detect rebuffering
        const isBuffering = video.readyState < 3 && !video.paused;
        const rebufferCount = lastMetricsRef.current?.rebufferCount || 0;
        const rebufferTime = lastMetricsRef.current?.rebufferTime || 0;
        
        const newMetrics = {
            // Playback metrics
            currentTime: video.currentTime,
            duration: video.duration || 0,
            playbackRate: video.playbackRate,
            volume: video.volume,
            muted: video.muted,
            paused: video.paused,
            ended: video.ended,
            readyState: video.readyState,
            
            // Buffer metrics
            ...bufferMetrics,
            
            // Quality metrics
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            frameRate,
            ...qualityMetrics,
            
            // Network metrics
            bandwidth: networkMetrics.downlink * 1000, // Convert to kbps
            latency: networkMetrics.rtt,
            effectiveType: networkMetrics.effectiveType,
            saveData: networkMetrics.saveData,
            
            // Performance metrics
            loadTime,
            timeToFirstFrame: qualityMetrics.totalFrames > 0 && !lastMetricsRef.current?.timeToFirstFrame ? 
                loadTime : lastMetricsRef.current?.timeToFirstFrame || 0,
            rebufferCount: isBuffering && !lastMetricsRef.current?.isBuffering ? 
                rebufferCount + 1 : rebufferCount,
            rebufferTime: isBuffering ? rebufferTime + timeDelta : rebufferTime,
            isBuffering,
            
            // System metrics
            ...memoryMetrics,
            
            // User experience metrics
            qualityChanges: lastMetricsRef.current?.qualityChanges || 0,
            stallCount: lastMetricsRef.current?.stallCount || 0,
            averageQuality: video.videoHeight || 0,
            
            // Metadata
            timestamp: now,
            playerState: playerState.status,
            networkQuality: networkQuality?.quality || 'unknown'
        };
        
        // Store for next calculation
        lastMetricsRef.current = {
            ...newMetrics,
            quality: qualityMetrics,
            isBuffering
        };
        
        return newMetrics;
    }, [videoRef, metrics, getVideoQualityMetrics, getBufferMetrics, 
        getNetworkMetrics, getMemoryMetrics, calculateFrameRate, playerState, networkQuality]);
    
    /**
     * Start metrics collection
     */
    const startCollection = useCallback(() => {
        if (metricsIntervalRef.current) return;
        
        startTimeRef.current = performance.now();
        
        metricsIntervalRef.current = setInterval(() => {
            const newMetrics = collectMetrics();
            setMetrics(newMetrics);
            onMetrics?.(newMetrics);
        }, interval);
        
        // Set up Performance Observer for more detailed metrics
        if ('PerformanceObserver' in window) {
            try {
                performanceObserverRef.current = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.entryType === 'measure' && entry.name.includes('video')) {
                            // Handle video-related performance entries
                            console.debug('Video performance entry:', entry);
                        }
                    });
                });
                
                performanceObserverRef.current.observe({ 
                    entryTypes: ['measure', 'navigation', 'resource'] 
                });
            } catch (err) {
                console.warn('Performance Observer not supported:', err);
            }
        }
    }, [collectMetrics, onMetrics, interval]);
    
    /**
     * Stop metrics collection
     */
    const stopCollection = useCallback(() => {
        if (metricsIntervalRef.current) {
            clearInterval(metricsIntervalRef.current);
            metricsIntervalRef.current = null;
        }
        
        if (performanceObserverRef.current) {
            performanceObserverRef.current.disconnect();
            performanceObserverRef.current = null;
        }
        
        startTimeRef.current = null;
        lastMetricsRef.current = null;
    }, []);
    
    /**
     * Reset metrics
     */
    const resetMetrics = useCallback(() => {
        stopCollection();
        setMetrics({
            currentTime: 0,
            duration: 0,
            bufferedRanges: [],
            bufferHealth: 0,
            bufferLength: 0,
            videoWidth: 0,
            videoHeight: 0,
            droppedFrames: 0,
            totalFrames: 0,
            frameRate: 0,
            bandwidth: 0,
            latency: 0,
            downloadSpeed: 0,
            loadTime: 0,
            timeToFirstFrame: 0,
            rebufferCount: 0,
            rebufferTime: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            qualityChanges: 0,
            stallCount: 0,
            averageQuality: 0
        });
        lastMetricsRef.current = null;
    }, [stopCollection]);
    
    /**
     * Get performance score (0-100)
     * @returns {number} Performance score
     */
    const getPerformanceScore = useCallback(() => {
        const {
            droppedFrames,
            totalFrames,
            rebufferCount,
            rebufferTime,
            bufferHealth,
            frameRate
        } = metrics;
        
        let score = 100;
        
        // Penalize dropped frames
        if (totalFrames > 0) {
            const dropRate = droppedFrames / totalFrames;
            score -= dropRate * 30;
        }
        
        // Penalize rebuffering
        score -= rebufferCount * 10;
        score -= Math.min(rebufferTime * 2, 20);
        
        // Reward good buffer health
        if (bufferHealth < 2) score -= 10;
        else if (bufferHealth > 10) score += 5;
        
        // Penalize low frame rate
        if (frameRate > 0 && frameRate < 24) {
            score -= (24 - frameRate) * 2;
        }
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }, [metrics]);
    
    // Start/stop collection based on player state
    useEffect(() => {
        if (playerState.status === 'playing') {
            startCollection();
        } else {
            stopCollection();
        }
        
        return stopCollection;
    }, [playerState.status, startCollection, stopCollection]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCollection();
        };
    }, [stopCollection]);
    
    return {
        metrics,
        performanceScore: getPerformanceScore(),
        startCollection,
        stopCollection,
        resetMetrics,
        isCollecting: !!metricsIntervalRef.current
    };
}