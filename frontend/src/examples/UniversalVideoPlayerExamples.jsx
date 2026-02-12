/**
 * Universal Video Player - Usage Examples
 * 
 * This file demonstrates how to use the enterprise-grade Universal Video Player
 * in various scenarios with different configurations and streaming formats.
 * 
 * @author RAF NET CCTV System
 * @version 2.0.0
 */

import React, { useState, useCallback } from 'react';
import UniversalVideoPlayer from '../components/UniversalVideoPlayer';

/**
 * Basic Usage Example
 * Simple implementation with minimal configuration
 */
export function BasicExample() {
    const camera = {
        id: 1,
        name: "Front Gate Camera",
        location: "Main Entrance, Building A"
    };
    
    const streams = {
        hls: "https://api-cctv.example.com/hls/camera1/playlist.m3u8",
        mse: "https://api-cctv.example.com/mse/camera1/stream.mp4",
        webrtc: "https://api-cctv.example.com/webrtc/camera1"
    };
    
    return (
        <div className="w-full h-96">
            <UniversalVideoPlayer
                camera={camera}
                streams={streams}
            />
        </div>
    );
}

/**
 * Advanced Configuration Example
 * Full configuration with all features enabled
 */
export function AdvancedExample() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [metrics, setMetrics] = useState(null);
    const [errors, setErrors] = useState([]);
    
    const camera = {
        id: 2,
        name: "Parking Lot Camera",
        location: "North Parking, Zone B",
        isOnline: true
    };
    
    const streams = {
        hls: "https://api-cctv.example.com/hls/camera2/playlist.m3u8",
        mse: "https://api-cctv.example.com/mse/camera2/stream.mp4",
        webrtc: "https://api-cctv.example.com/webrtc/camera2"
    };
    
    const config = {
        autoplay: true,
        muted: true,
        controls: false,
        enableZoom: true,
        enableFullscreen: true,
        retryAttempts: 5,
        timeoutMs: 45000
    };
    
    const handleExpand = useCallback(() => {
        setIsExpanded(true);
    }, []);
    
    const handleError = useCallback((error) => {
        console.error('Player error:', error);
        setErrors(prev => [...prev, {
            timestamp: new Date().toISOString(),
            message: error.message,
            type: error.type || 'unknown'
        }]);
    }, []);
    
    const handlePlaying = useCallback(() => {
        console.log('Video started playing');
        // Reset errors on successful playback
        setErrors([]);
    }, []);
    
    const handleMetrics = useCallback((newMetrics) => {
        setMetrics(newMetrics);
        
        // Log performance warnings
        if (newMetrics.performanceScore < 70) {
            console.warn('Low performance score:', newMetrics.performanceScore);
        }
        
        if (newMetrics.droppedFrames > 10) {
            console.warn('High dropped frame count:', newMetrics.droppedFrames);
        }
    }, []);
    
    return (
        <div className="space-y-4">
            <div className="w-full h-96">
                <UniversalVideoPlayer
                    camera={camera}
                    streams={streams}
                    config={config}
                    onExpand={handleExpand}
                    onError={handleError}
                    onPlaying={handlePlaying}
                    onMetrics={handleMetrics}
                    isExpanded={isExpanded}
                    className="border-2 border-gray-300 rounded-lg"
                />
            </div>
            
            {/* Metrics Display */}
            {metrics && (
                <div className="bg-gray-100 p-4 rounded-lg">
                    <h3 className="font-bold mb-2">Performance Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="font-medium">Quality:</span> {metrics.networkQuality}
                        </div>
                        <div>
                            <span className="font-medium">Format:</span> {metrics.format}
                        </div>
                        <div>
                            <span className="font-medium">Buffer Health:</span> {metrics.bufferHealth.toFixed(1)}s
                        </div>
                        <div>
                            <span className="font-medium">Dropped Frames:</span> {metrics.droppedFrames}
                        </div>
                        <div>
                            <span className="font-medium">Bandwidth:</span> {(metrics.bandwidth / 1000).toFixed(1)} Mbps
                        </div>
                        <div>
                            <span className="font-medium">Latency:</span> {metrics.latency}ms
                        </div>
                        <div>
                            <span className="font-medium">Performance:</span> {metrics.performanceScore}/100
                        </div>
                        <div>
                            <span className="font-medium">Memory:</span> {(metrics.memoryUsage * 100).toFixed(1)}%
                        </div>
                    </div>
                </div>
            )}
            
            {/* Error Display */}
            {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h3 className="font-bold text-red-800 mb-2">Recent Errors</h3>
                    <div className="space-y-2">
                        {errors.slice(-3).map((error, index) => (
                            <div key={index} className="text-sm text-red-700">
                                <span className="font-medium">{error.timestamp}:</span> {error.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Multi-Camera Grid Example
 * Demonstrates multiple players with shared state management
 */
export function MultiCameraExample() {
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [globalMetrics, setGlobalMetrics] = useState({});
    
    const cameras = [
        {
            id: 1,
            name: "Front Gate",
            location: "Main Entrance",
            streams: {
                hls: "https://api-cctv.example.com/hls/camera1/playlist.m3u8",
                mse: "https://api-cctv.example.com/mse/camera1/stream.mp4"
            }
        },
        {
            id: 2,
            name: "Parking Lot",
            location: "North Side",
            streams: {
                hls: "https://api-cctv.example.com/hls/camera2/playlist.m3u8",
                webrtc: "https://api-cctv.example.com/webrtc/camera2"
            }
        },
        {
            id: 3,
            name: "Loading Dock",
            location: "Warehouse",
            streams: {
                mse: "https://api-cctv.example.com/mse/camera3/stream.mp4",
                hls: "https://api-cctv.example.com/hls/camera3/playlist.m3u8"
            }
        },
        {
            id: 4,
            name: "Office Lobby",
            location: "Building B",
            streams: {
                webrtc: "https://api-cctv.example.com/webrtc/camera4",
                hls: "https://api-cctv.example.com/hls/camera4/playlist.m3u8"
            }
        }
    ];
    
    const handleCameraSelect = useCallback((camera) => {
        setSelectedCamera(camera);
    }, []);
    
    const handleMetrics = useCallback((cameraId, metrics) => {
        setGlobalMetrics(prev => ({
            ...prev,
            [cameraId]: metrics
        }));
    }, []);
    
    const config = {
        enableZoom: false,
        enableFullscreen: true,
        retryAttempts: 3,
        timeoutMs: 30000
    };
    
    return (
        <div className="space-y-6">
            {/* Camera Grid */}
            <div className="grid grid-cols-2 gap-4">
                {cameras.map((camera) => (
                    <div 
                        key={camera.id}
                        className={`relative cursor-pointer transition-all duration-200 ${
                            selectedCamera?.id === camera.id 
                                ? 'ring-4 ring-blue-500 scale-105' 
                                : 'hover:scale-102'
                        }`}
                        onClick={() => handleCameraSelect(camera)}
                    >
                        <div className="aspect-video">
                            <UniversalVideoPlayer
                                camera={camera}
                                streams={camera.streams}
                                config={config}
                                onMetrics={(metrics) => handleMetrics(camera.id, metrics)}
                                className="rounded-lg overflow-hidden"
                            />
                        </div>
                        
                        {/* Performance Indicator */}
                        {globalMetrics[camera.id] && (
                            <div className="absolute top-2 right-2">
                                <div className={`w-3 h-3 rounded-full ${
                                    globalMetrics[camera.id].performanceScore > 80 ? 'bg-green-500' :
                                    globalMetrics[camera.id].performanceScore > 60 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                }`} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {/* Selected Camera Details */}
            {selectedCamera && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">{selectedCamera.name}</h2>
                    <div className="aspect-video mb-4">
                        <UniversalVideoPlayer
                            camera={selectedCamera}
                            streams={selectedCamera.streams}
                            config={{
                                ...config,
                                enableZoom: true,
                                enableFullscreen: true
                            }}
                            onMetrics={(metrics) => handleMetrics(selectedCamera.id, metrics)}
                            className="rounded-lg overflow-hidden"
                        />
                    </div>
                    
                    {globalMetrics[selectedCamera.id] && (
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                                <div className="font-bold text-lg">
                                    {globalMetrics[selectedCamera.id].performanceScore}
                                </div>
                                <div className="text-gray-600">Performance Score</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg">
                                    {globalMetrics[selectedCamera.id].format?.toUpperCase()}
                                </div>
                                <div className="text-gray-600">Stream Format</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg">
                                    {globalMetrics[selectedCamera.id].networkQuality}
                                </div>
                                <div className="text-gray-600">Network Quality</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Custom Configuration Example
 * Shows how to create custom configurations for different use cases
 */
export function CustomConfigExample() {
    // Low-bandwidth configuration
    const lowBandwidthConfig = {
        autoplay: false,
        muted: true,
        controls: true,
        enableZoom: false,
        enableFullscreen: true,
        retryAttempts: 2,
        timeoutMs: 60000
    };
    
    // High-performance configuration
    const highPerformanceConfig = {
        autoplay: true,
        muted: true,
        controls: false,
        enableZoom: true,
        enableFullscreen: true,
        retryAttempts: 5,
        timeoutMs: 15000
    };
    
    // Mobile-optimized configuration
    const mobileConfig = {
        autoplay: true,
        muted: true,
        controls: false,
        enableZoom: false,
        enableFullscreen: false,
        retryAttempts: 3,
        timeoutMs: 30000
    };
    
    const camera = {
        id: 1,
        name: "Demo Camera",
        location: "Test Location"
    };
    
    const streams = {
        hls: "https://api-cctv.example.com/hls/demo/playlist.m3u8",
        mse: "https://api-cctv.example.com/mse/demo/stream.mp4"
    };
    
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold mb-4">Low Bandwidth Configuration</h3>
                <div className="w-full h-64">
                    <UniversalVideoPlayer
                        camera={camera}
                        streams={streams}
                        config={lowBandwidthConfig}
                    />
                </div>
            </div>
            
            <div>
                <h3 className="text-lg font-bold mb-4">High Performance Configuration</h3>
                <div className="w-full h-64">
                    <UniversalVideoPlayer
                        camera={camera}
                        streams={streams}
                        config={highPerformanceConfig}
                    />
                </div>
            </div>
            
            <div>
                <h3 className="text-lg font-bold mb-4">Mobile Optimized Configuration</h3>
                <div className="w-full h-64">
                    <UniversalVideoPlayer
                        camera={camera}
                        streams={streams}
                        config={mobileConfig}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Error Handling Example
 * Demonstrates comprehensive error handling and recovery
 */
export function ErrorHandlingExample() {
    const [errorLog, setErrorLog] = useState([]);
    const [retryCount, setRetryCount] = useState(0);
    
    const camera = {
        id: 999,
        name: "Test Camera (Unreliable)",
        location: "Error Testing"
    };
    
    // Intentionally problematic streams for testing
    const streams = {
        hls: "https://invalid-url.example.com/hls/test.m3u8",
        mse: "https://invalid-url.example.com/mse/test.mp4",
        webrtc: "https://invalid-url.example.com/webrtc/test"
    };
    
    const handleError = useCallback((error) => {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message,
            type: error.type || 'unknown',
            stage: error.stage || 'unknown',
            retryCount: error.retryCount || 0
        };
        
        setErrorLog(prev => [errorEntry, ...prev.slice(0, 9)]); // Keep last 10 errors
        setRetryCount(error.retryCount || 0);
    }, []);
    
    const config = {
        retryAttempts: 3,
        timeoutMs: 10000 // Short timeout for demo
    };
    
    return (
        <div className="space-y-6">
            <div className="w-full h-64">
                <UniversalVideoPlayer
                    camera={camera}
                    streams={streams}
                    config={config}
                    onError={handleError}
                />
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Error Recovery Status</h3>
                <p className="text-sm text-gray-600 mb-4">
                    This example uses invalid URLs to demonstrate error handling and recovery mechanisms.
                </p>
                <div className="text-sm">
                    <strong>Current Retry Count:</strong> {retryCount}
                </div>
            </div>
            
            {errorLog.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h3 className="font-bold text-red-800 mb-4">Error Log</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {errorLog.map((error, index) => (
                            <div key={index} className="text-sm border-b border-red-200 pb-2">
                                <div className="font-medium text-red-700">
                                    {new Date(error.timestamp).toLocaleTimeString()}
                                </div>
                                <div className="text-red-600">
                                    <strong>Type:</strong> {error.type} | 
                                    <strong> Stage:</strong> {error.stage} | 
                                    <strong> Retry:</strong> {error.retryCount}
                                </div>
                                <div className="text-red-800">{error.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default {
    BasicExample,
    AdvancedExample,
    MultiCameraExample,
    CustomConfigExample,
    ErrorHandlingExample
};