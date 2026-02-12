/**
 * Network Quality Hook
 * 
 * Real-time network quality monitoring and adaptive streaming optimization.
 * Provides intelligent quality adaptation based on network conditions.
 * 
 * Features:
 * - Real-time bandwidth monitoring
 * - Connection stability tracking
 * - Quality recommendation engine
 * - Network change detection
 * - Adaptive bitrate suggestions
 * 
 * @author RAF NET CCTV System
 * @version 2.0.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Network quality levels
 */
export const NetworkQuality = {
    EXCELLENT: 'excellent',
    GOOD: 'good',
    FAIR: 'fair',
    POOR: 'poor',
    OFFLINE: 'offline'
};

/**
 * Quality thresholds (in Mbps)
 */
const QUALITY_THRESHOLDS = {
    [NetworkQuality.EXCELLENT]: 10,
    [NetworkQuality.GOOD]: 5,
    [NetworkQuality.FAIR]: 2,
    [NetworkQuality.POOR]: 0.5
};

/**
 * Network Quality Hook
 * 
 * @param {Object} params - Hook parameters
 * @param {Function} [params.onQualityChange] - Quality change callback
 * @param {Function} [params.onNetworkChange] - Network change callback
 * @param {number} [params.interval=5000] - Monitoring interval in ms
 * @param {number} [params.stabilityWindow=10] - Stability calculation window
 * @returns {Object} Network quality state and controls
 */
export function useNetworkQuality({
    onQualityChange,
    onNetworkChange,
    interval = 5000,
    stabilityWindow = 10
}) {
    const intervalRef = useRef(null);
    const measurementsRef = useRef([]);
    const lastQualityRef = useRef(null);
    const testImageRef = useRef(null);
    
    // State
    const [networkState, setNetworkState] = useState({
        quality: NetworkQuality.GOOD,
        bandwidth: 0,
        latency: 0,
        stability: 1.0,
        effectiveType: 'unknown',
        isOnline: navigator.onLine,
        lastUpdate: Date.now()
    });
    
    /**
     * Measure network latency using ping-like technique
     * @returns {Promise<number>} Latency in milliseconds
     */
    const measureLatency = useCallback(async () => {
        try {
            const start = performance.now();
            
            // Use a small image request to measure latency
            const response = await fetch('/api/ping', {
                method: 'HEAD',
                cache: 'no-cache',
                mode: 'cors'
            });
            
            const end = performance.now();
            
            if (response.ok) {
                return end - start;
            }
            
            return 0;
        } catch (err) {
            console.warn('Latency measurement failed:', err);
            return 0;
        }
    }, []);
    
    /**
     * Measure download speed using image download
     * @returns {Promise<number>} Speed in Mbps
     */
    const measureBandwidth = useCallback(async () => {
        try {
            // Use a test image of known size (approximately 100KB)
            const testUrl = '/api/speedtest?t=' + Date.now();
            const imageSize = 100 * 1024; // 100KB in bytes
            
            const start = performance.now();
            
            const response = await fetch(testUrl, {
                cache: 'no-cache',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error('Speed test request failed');
            }
            
            // Read the response to ensure full download
            await response.blob();
            
            const end = performance.now();
            const duration = (end - start) / 1000; // Convert to seconds
            
            if (duration > 0) {
                const bitsPerSecond = (imageSize * 8) / duration;
                const mbps = bitsPerSecond / (1024 * 1024);
                return Math.max(0, mbps);
            }
            
            return 0;
        } catch (err) {
            console.warn('Bandwidth measurement failed:', err);
            return 0;
        }
    }, []);
    
    /**
     * Get network information from browser APIs
     * @returns {Object} Network information
     */
    const getNetworkInfo = useCallback(() => {
        const connection = navigator.connection || 
                          navigator.mozConnection || 
                          navigator.webkitConnection;
        
        if (connection) {
            return {
                effectiveType: connection.effectiveType || 'unknown',
                downlink: connection.downlink || 0,
                rtt: connection.rtt || 0,
                saveData: connection.saveData || false
            };
        }
        
        return {
            effectiveType: 'unknown',
            downlink: 0,
            rtt: 0,
            saveData: false
        };
    }, []);
    
    /**
     * Calculate network stability based on recent measurements
     * @param {Array} measurements - Recent bandwidth measurements
     * @returns {number} Stability score (0-1)
     */
    const calculateStability = useCallback((measurements) => {
        if (measurements.length < 2) return 1.0;
        
        const values = measurements.map(m => m.bandwidth);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        if (mean === 0) return 0;
        
        const variance = values.reduce((sum, val) => {
            const diff = val - mean;
            return sum + (diff * diff);
        }, 0) / values.length;
        
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = standardDeviation / mean;
        
        // Convert coefficient of variation to stability score (0-1)
        // Lower variation = higher stability
        return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
    }, []);
    
    /**
     * Determine quality level based on bandwidth and stability
     * @param {number} bandwidth - Bandwidth in Mbps
     * @param {number} stability - Stability score (0-1)
     * @param {number} latency - Latency in ms
     * @returns {string} Quality level
     */
    const determineQuality = useCallback((bandwidth, stability, latency) => {
        // Offline check
        if (!navigator.onLine || bandwidth === 0) {
            return NetworkQuality.OFFLINE;
        }
        
        // Apply stability penalty
        const effectiveBandwidth = bandwidth * Math.max(0.3, stability);
        
        // Apply latency penalty for high latency
        const latencyPenalty = latency > 200 ? 0.8 : latency > 100 ? 0.9 : 1.0;
        const adjustedBandwidth = effectiveBandwidth * latencyPenalty;
        
        // Determine quality based on thresholds
        if (adjustedBandwidth >= QUALITY_THRESHOLDS[NetworkQuality.EXCELLENT]) {
            return NetworkQuality.EXCELLENT;
        } else if (adjustedBandwidth >= QUALITY_THRESHOLDS[NetworkQuality.GOOD]) {
            return NetworkQuality.GOOD;
        } else if (adjustedBandwidth >= QUALITY_THRESHOLDS[NetworkQuality.FAIR]) {
            return NetworkQuality.FAIR;
        } else {
            return NetworkQuality.POOR;
        }
    }, []);
    
    /**
     * Perform network quality measurement
     */
    const measureQuality = useCallback(async () => {
        try {
            const networkInfo = getNetworkInfo();
            
            // Use browser API data if available, otherwise measure
            let bandwidth = networkInfo.downlink;
            let latency = networkInfo.rtt;
            
            // Fallback to manual measurement if API data not available
            if (!bandwidth || !latency) {
                const [measuredBandwidth, measuredLatency] = await Promise.all([
                    measureBandwidth(),
                    measureLatency()
                ]);
                
                bandwidth = bandwidth || measuredBandwidth;
                latency = latency || measuredLatency;
            }
            
            // Store measurement
            const measurement = {
                timestamp: Date.now(),
                bandwidth,
                latency,
                effectiveType: networkInfo.effectiveType
            };
            
            measurementsRef.current.push(measurement);
            
            // Keep only recent measurements
            const cutoff = Date.now() - (stabilityWindow * interval);
            measurementsRef.current = measurementsRef.current.filter(
                m => m.timestamp > cutoff
            );
            
            // Calculate stability
            const stability = calculateStability(measurementsRef.current);
            
            // Determine quality
            const quality = determineQuality(bandwidth, stability, latency);
            
            const newState = {
                quality,
                bandwidth,
                latency,
                stability,
                effectiveType: networkInfo.effectiveType,
                isOnline: navigator.onLine,
                lastUpdate: Date.now()
            };
            
            setNetworkState(newState);
            
            // Trigger callbacks if quality changed
            if (lastQualityRef.current !== quality) {
                onQualityChange?.(quality, newState);
                lastQualityRef.current = quality;
            }
            
            onNetworkChange?.(newState);
            
        } catch (err) {
            console.error('Network quality measurement failed:', err);
            
            // Fallback to poor quality on error
            const fallbackState = {
                quality: NetworkQuality.POOR,
                bandwidth: 0,
                latency: 0,
                stability: 0,
                effectiveType: 'unknown',
                isOnline: navigator.onLine,
                lastUpdate: Date.now()
            };
            
            setNetworkState(fallbackState);
        }
    }, [getNetworkInfo, measureBandwidth, measureLatency, calculateStability, 
        determineQuality, onQualityChange, onNetworkChange, interval, stabilityWindow]);
    
    /**
     * Start quality monitoring
     */
    const startMonitoring = useCallback(() => {
        if (intervalRef.current) return;
        
        // Initial measurement
        measureQuality();
        
        // Set up periodic measurements
        intervalRef.current = setInterval(measureQuality, interval);
    }, [measureQuality, interval]);
    
    /**
     * Stop quality monitoring
     */
    const stopMonitoring = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);
    
    /**
     * Get quality recommendations for streaming
     * @returns {Object} Streaming recommendations
     */
    const getStreamingRecommendations = useCallback(() => {
        const { quality, bandwidth, stability, latency } = networkState;
        
        const recommendations = {
            maxBitrate: 0,
            preferredFormat: 'hls',
            bufferSize: 30,
            adaptiveStreaming: true
        };
        
        switch (quality) {
            case NetworkQuality.EXCELLENT:
                recommendations.maxBitrate = 8000; // 8 Mbps
                recommendations.preferredFormat = 'webrtc';
                recommendations.bufferSize = 10;
                break;
                
            case NetworkQuality.GOOD:
                recommendations.maxBitrate = 4000; // 4 Mbps
                recommendations.preferredFormat = 'mse';
                recommendations.bufferSize = 20;
                break;
                
            case NetworkQuality.FAIR:
                recommendations.maxBitrate = 2000; // 2 Mbps
                recommendations.preferredFormat = 'hls';
                recommendations.bufferSize = 30;
                break;
                
            case NetworkQuality.POOR:
                recommendations.maxBitrate = 500; // 500 kbps
                recommendations.preferredFormat = 'hls';
                recommendations.bufferSize = 60;
                recommendations.adaptiveStreaming = false;
                break;
                
            default:
                recommendations.maxBitrate = 1000; // 1 Mbps
                break;
        }
        
        // Adjust for stability
        if (stability < 0.7) {
            recommendations.bufferSize *= 1.5;
            recommendations.maxBitrate *= 0.8;
        }
        
        // Adjust for latency
        if (latency > 200) {
            recommendations.bufferSize *= 1.2;
        }
        
        return recommendations;
    }, [networkState]);
    
    /**
     * Force immediate quality check
     */
    const checkQuality = useCallback(() => {
        measureQuality();
    }, [measureQuality]);
    
    // Handle online/offline events
    useEffect(() => {
        const handleOnline = () => {
            setNetworkState(prev => ({ ...prev, isOnline: true }));
            measureQuality();
        };
        
        const handleOffline = () => {
            setNetworkState(prev => ({ 
                ...prev, 
                isOnline: false,
                quality: NetworkQuality.OFFLINE
            }));
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [measureQuality]);
    
    // Handle connection change events
    useEffect(() => {
        const connection = navigator.connection || 
                          navigator.mozConnection || 
                          navigator.webkitConnection;
        
        if (connection) {
            const handleConnectionChange = () => {
                measureQuality();
            };
            
            connection.addEventListener('change', handleConnectionChange);
            
            return () => {
                connection.removeEventListener('change', handleConnectionChange);
            };
        }
    }, [measureQuality]);
    
    // Start monitoring on mount
    useEffect(() => {
        startMonitoring();
        
        return () => {
            stopMonitoring();
        };
    }, [startMonitoring, stopMonitoring]);
    
    return {
        ...networkState,
        recommendations: getStreamingRecommendations(),
        startMonitoring,
        stopMonitoring,
        checkQuality,
        isMonitoring: !!intervalRef.current
    };
}