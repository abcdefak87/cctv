/**
 * Universal Video Player - Enterprise Grade
 * 
 * Production-ready video streaming component supporting multiple formats:
 * - HLS (HTTP Live Streaming)
 * - MSE/MP4 (Media Source Extensions)
 * - WebRTC (Real-time Communication)
 * 
 * Features:
 * - Automatic format detection and optimal player selection
 * - Intelligent fallback mechanism (MSE -> HLS -> WebRTC)
 * - Advanced error recovery with exponential backoff
 * - Network quality adaptation
 * - Performance monitoring and metrics
 * - Memory leak prevention
 * - Graceful degradation
 * 
 * @author RAF NET CCTV System
 * @version 2.0.0
 * @since 2024-02-12
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useUniversalPlayerEngine } from '../hooks/useUniversalPlayerEngine';
import { usePlayerMetrics } from '../hooks/usePlayerMetrics';
import { useNetworkQuality } from '../hooks/useNetworkQuality';
import { StreamFormat } from '../utils/streamFormatDetector';
import { LoadingStage } from '../utils/streamLoaderTypes';

/**
 * @typedef {Object} StreamUrls
 * @property {string} [hls] - HLS stream URL (.m3u8)
 * @property {string} [mse] - MSE/MP4 stream URL
 * @property {string} [webrtc] - WebRTC stream URL
 */

/**
 * @typedef {Object} CameraInfo
 * @property {number} id - Camera ID
 * @property {string} name - Camera name
 * @property {string} [location] - Camera location
 * @property {boolean} [isOnline] - Camera online status
 */

/**
 * @typedef {Object} PlayerConfig
 * @property {boolean} [autoplay=true] - Auto-play video
 * @property {boolean} [muted=true] - Mute audio
 * @property {boolean} [controls=false] - Show native controls
 * @property {boolean} [enableZoom=false] - Enable zoom functionality
 * @property {boolean} [enableFullscreen=true] - Enable fullscreen
 * @property {number} [retryAttempts=3] - Max retry attempts
 * @property {number} [timeoutMs=30000] - Loading timeout in ms
 */

/**
 * Universal Video Player Component
 * 
 * @param {Object} props - Component props
 * @param {CameraInfo} props.camera - Camera information
 * @param {StreamUrls} props.streams - Available stream URLs
 * @param {PlayerConfig} [props.config] - Player configuration
 * @param {Function} [props.onExpand] - Expand callback
 * @param {Function} [props.onError] - Error callback
 * @param {Function} [props.onPlaying] - Playing callback
 * @param {Function} [props.onMetrics] - Metrics callback
 * @param {boolean} [props.isExpanded=false] - Expanded state
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element} Universal Video Player component
 */
const UniversalVideoPlayer = ({
    camera,
    streams,
    config = {},
    onExpand,
    onError,
    onPlaying,
    onMetrics,
    isExpanded = false,
    className = ''
}) => {
    // Refs
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    
    // State
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    // Default configuration
    const playerConfig = useMemo(() => ({
        autoplay: true,
        muted: true,
        controls: false,
        enableZoom: false,
        enableFullscreen: true,
        retryAttempts: 3,
        timeoutMs: 30000,
        ...config
    }), [config]);
    
    // Universal Player Engine Hook
    const {
        playerState,
        currentFormat,
        error,
        metrics: engineMetrics,
        retry,
        switchFormat,
        cleanup
    } = useUniversalPlayerEngine({
        videoRef,
        streams,
        config: playerConfig,
        onError,
        onPlaying
    });
    
    // Network Quality Hook
    const networkQuality = useNetworkQuality({
        onQualityChange: useCallback((quality) => {
            // Auto-switch format based on network quality
            if (quality === 'poor' && currentFormat === StreamFormat.WEBRTC) {
                switchFormat(StreamFormat.HLS);
            } else if (quality === 'excellent' && currentFormat === StreamFormat.HLS) {
                switchFormat(StreamFormat.WEBRTC);
            }
        }, [currentFormat, switchFormat])
    });
    
    // Player Metrics Hook
    const playerMetrics = usePlayerMetrics({
        videoRef,
        playerState,
        networkQuality,
        onMetrics: useCallback((metrics) => {
            onMetrics?.({
                ...metrics,
                ...engineMetrics,
                format: currentFormat,
                networkQuality: networkQuality.quality
            });
        }, [onMetrics, engineMetrics, currentFormat, networkQuality.quality])
    });
    
    // Fullscreen handling
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    
    /**
     * Toggle fullscreen mode
     * @param {Event} [e] - Event object
     */
    const toggleFullscreen = useCallback(async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        try {
            if (!document.fullscreenElement && containerRef.current) {
                await containerRef.current.requestFullscreen();
            } else if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.warn('Fullscreen toggle failed:', err);
        }
    }, []);
    
    /**
     * Handle zoom wheel event
     * @param {WheelEvent} e - Wheel event
     */
    const handleZoom = useCallback((e) => {
        if (!playerConfig.enableZoom) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const delta = e.deltaY * -0.001;
        const newZoom = Math.min(Math.max(1, zoom + delta), 5);
        setZoom(newZoom);
        
        if (newZoom === 1) {
            setPan({ x: 0, y: 0 });
        }
    }, [playerConfig.enableZoom, zoom]);
    
    /**
     * Handle pan start
     * @param {MouseEvent|TouchEvent} e - Event object
     */
    const handlePanStart = useCallback((e) => {
        if (!playerConfig.enableZoom || zoom <= 1) return;
        
        setIsDragging(true);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        setDragStart({
            x: clientX - pan.x,
            y: clientY - pan.y
        });
    }, [playerConfig.enableZoom, zoom, pan]);
    
    /**
     * Handle pan move
     * @param {MouseEvent|TouchEvent} e - Event object
     */
    const handlePanMove = useCallback((e) => {
        if (!isDragging || !playerConfig.enableZoom || zoom <= 1) return;
        
        e.preventDefault();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const newX = clientX - dragStart.x;
        const newY = clientY - dragStart.y;
        
        const bounds = 100 * (zoom - 1);
        const limitedX = Math.min(Math.max(newX, -bounds * 2), bounds * 2);
        const limitedY = Math.min(Math.max(newY, -bounds * 2), bounds * 2);
        
        setPan({ x: limitedX, y: limitedY });
    }, [isDragging, playerConfig.enableZoom, zoom, dragStart]);
    
    /**
     * Handle pan end
     */
    const handlePanEnd = useCallback(() => {
        setIsDragging(false);
    }, []);
    
    /**
     * Reset zoom and pan
     * @param {Event} [e] - Event object
     */
    const resetZoom = useCallback((e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);
    
    /**
     * Zoom in
     * @param {Event} [e] - Event object
     */
    const zoomIn = useCallback((e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setZoom(prev => Math.min(5, prev + 0.5));
    }, []);
    
    /**
     * Zoom out
     * @param {Event} [e] - Event object
     */
    const zoomOut = useCallback((e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const newZoom = Math.max(1, zoom - 0.5);
        setZoom(newZoom);
        if (newZoom === 1) setPan({ x: 0, y: 0 });
    }, [zoom]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);
    
    // Render loading state
    const renderLoadingState = () => (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <div className="text-center">
                <div className="relative w-12 h-12 mb-4 mx-auto">
                    <div className="absolute inset-0 border-2 border-gray-600 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-300 text-sm font-medium">
                    {playerState.stage === LoadingStage.CONNECTING && 'Connecting...'}
                    {playerState.stage === LoadingStage.LOADING && 'Loading stream...'}
                    {playerState.stage === LoadingStage.BUFFERING && 'Buffering...'}
                    {playerState.stage === LoadingStage.STARTING && 'Starting playback...'}
                </p>
                {playerState.retryCount > 0 && (
                    <p className="text-yellow-400 text-xs mt-2">
                        Retry {playerState.retryCount}/{playerConfig.retryAttempts}
                    </p>
                )}
            </div>
        </div>
    );
    
    // Render error state
    const renderErrorState = () => (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm">
            <div className="text-center max-w-sm px-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-red-400 font-semibold text-lg mb-2">Stream Unavailable</h3>
                <p className="text-gray-400 text-sm mb-4">{error?.message || 'Unable to load video stream'}</p>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={retry}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Retry Connection
                    </button>
                    {Object.keys(streams).length > 1 && (
                        <button
                            onClick={() => switchFormat()}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Try Different Format
                        </button>
                    )}
                </div>
                <div className="mt-4 text-xs text-gray-500">
                    Format: {currentFormat} | Quality: {networkQuality.quality}
                </div>
            </div>
        </div>
    );
    
    // Render controls overlay
    const renderControls = () => (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            
            {/* Camera info */}
            <div className="absolute top-4 left-4 right-16">
                <h3 className="text-white font-bold text-lg drop-shadow-lg truncate">
                    {camera.name}
                </h3>
                {camera.location && (
                    <p className="text-gray-300 text-sm drop-shadow-lg truncate">
                        {camera.location}
                    </p>
                )}
            </div>
            
            {/* Status indicator */}
            <div className="absolute top-4 right-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                    playerState.status === 'playing' 
                        ? 'bg-green-500/20 border-green-500/30 text-green-400'
                        : 'bg-red-500/20 border-red-500/30 text-red-400'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${
                        playerState.status === 'playing' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                    }`} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                        {playerState.status === 'playing' ? 'LIVE' : 'OFFLINE'}
                    </span>
                </div>
            </div>
            
            {/* Bottom controls */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                
                {/* Format indicator */}
                <div className="text-xs text-gray-400 bg-black/40 px-2 py-1 rounded">
                    {currentFormat?.toUpperCase()} | {networkQuality.quality}
                </div>
                
                {/* Control buttons */}
                <div className="flex items-center gap-2">
                    
                    {/* Zoom controls */}
                    {playerConfig.enableZoom && isExpanded && (
                        <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1">
                            <button
                                onClick={zoomOut}
                                className="p-2 hover:bg-white/20 text-white rounded transition-colors"
                                title="Zoom Out"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <span className="text-xs text-white/80 w-12 text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={zoomIn}
                                className="p-2 hover:bg-white/20 text-white rounded transition-colors"
                                title="Zoom In"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                            <button
                                onClick={resetZoom}
                                className="p-2 hover:bg-white/20 text-white rounded transition-colors"
                                title="Reset Zoom"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    )}
                    
                    {/* Fullscreen button */}
                    {playerConfig.enableFullscreen && (
                        <button
                            onClick={(!isExpanded && onExpand) ? onExpand : toggleFullscreen}
                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors border border-white/10"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
    
    return (
        <div
            ref={containerRef}
            className={`video-container group relative w-full h-full bg-black overflow-hidden rounded-xl select-none ${className}`}
            style={{ touchAction: zoom > 1 ? 'none' : 'auto' }}
            onWheel={handleZoom}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
            onTouchMove={handlePanMove}
            onTouchEnd={handlePanEnd}
        >
            {/* Video element */}
            <video
                ref={videoRef}
                className={`w-full h-full transition-transform duration-100 ease-out ${
                    isExpanded || isFullscreen ? 'object-contain' : 'object-cover'
                }`}
                style={{
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                    cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'inherit'
                }}
                autoPlay={playerConfig.autoplay}
                muted={playerConfig.muted}
                playsInline
                controls={playerConfig.controls}
                onMouseDown={handlePanStart}
                onTouchStart={handlePanStart}
            />
            
            {/* Overlays */}
            {renderControls()}
            
            {/* Loading state */}
            {(playerState.status === 'loading' || playerState.status === 'buffering') && renderLoadingState()}
            
            {/* Error state */}
            {playerState.status === 'error' && renderErrorState()}
        </div>
    );
};

export default UniversalVideoPlayer;