/**
 * Enhanced Stream Format Detector & Player Selector
 * Enterprise-grade multi-format streaming support with intelligent detection
 * Supports: HLS, MSE/MP4, WebRTC, DASH with automatic fallback and optimization
 * 
 * @author RAF NET CCTV System
 * @version 2.0.0
 */

export const StreamFormat = {
    HLS: 'hls',
    MSE: 'mse',
    WEBRTC: 'webrtc',
    DASH: 'dash',
    NATIVE: 'native'
};

/**
 * Stream quality levels
 */
export const StreamQuality = {
    AUTO: 'auto',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
};

/**
 * Enhanced stream format detection with multiple indicators
 * @param {string} url - Stream URL
 * @returns {string|null} Detected format
 */
export function detectStreamFormat(url) {
    if (!url || typeof url !== 'string') return null;
    
    const urlLower = url.toLowerCase();
    
    // HLS detection
    if (urlLower.includes('.m3u8') || 
        urlLower.includes('/hls/') || 
        urlLower.includes('application/vnd.apple.mpegurl')) {
        return StreamFormat.HLS;
    }
    
    // MSE/MP4 detection
    if (urlLower.includes('.mp4') || 
        urlLower.includes('/mse/') || 
        urlLower.includes('/mp4/') ||
        urlLower.includes('video/mp4')) {
        return StreamFormat.MSE;
    }
    
    // WebRTC detection
    if (urlLower.includes('/webrtc/') || 
        urlLower.includes('webrtc') ||
        urlLower.includes('rtc://') ||
        urlLower.includes('/rtc/')) {
        return StreamFormat.WEBRTC;
    }
    
    // DASH detection
    if (urlLower.includes('.mpd') || 
        urlLower.includes('/dash/') ||
        urlLower.includes('application/dash+xml')) {
        return StreamFormat.DASH;
    }
    
    return StreamFormat.NATIVE;
}

/**
 * Comprehensive browser capability detection
 * @returns {Object} Browser support matrix
 */
export function getBrowserSupport() {
    const video = document.createElement('video');
    const audio = document.createElement('audio');
    
    // Basic format support
    const formatSupport = {
        hls: video.canPlayType('application/vnd.apple.mpegurl') !== '',
        mse: 'MediaSource' in window && MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"'),
        webrtc: 'RTCPeerConnection' in window,
        dash: 'MediaSource' in window,
        mp4: video.canPlayType('video/mp4') !== '',
        webm: video.canPlayType('video/webm') !== '',
        ogg: video.canPlayType('video/ogg') !== ''
    };
    
    // Codec support
    const codecSupport = {
        h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '',
        h265: video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') !== '',
        vp8: video.canPlayType('video/webm; codecs="vp8"') !== '',
        vp9: video.canPlayType('video/webm; codecs="vp9"') !== '',
        av1: video.canPlayType('video/mp4; codecs="av01.0.05M.08"') !== ''
    };
    
    // Audio codec support
    const audioSupport = {
        aac: audio.canPlayType('audio/mp4; codecs="mp4a.40.2"') !== '',
        opus: audio.canPlayType('audio/webm; codecs="opus"') !== '',
        vorbis: audio.canPlayType('audio/ogg; codecs="vorbis"') !== ''
    };
    
    // Advanced features
    const features = {
        pictureInPicture: 'pictureInPictureEnabled' in document,
        fullscreen: 'requestFullscreen' in video,
        autoplay: true, // Will be tested dynamically
        hardwareAcceleration: detectHardwareAcceleration(),
        adaptiveStreaming: formatSupport.mse || formatSupport.hls
    };
    
    return {
        formats: formatSupport,
        codecs: codecSupport,
        audio: audioSupport,
        features,
        userAgent: navigator.userAgent,
        isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
        isChrome: /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
        isFirefox: /Firefox/.test(navigator.userAgent),
        isEdge: /Edge/.test(navigator.userAgent)
    };
}

/**
 * Detect hardware acceleration support
 * @returns {boolean} Hardware acceleration available
 */
function detectHardwareAcceleration() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) return false;
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            return !renderer.toLowerCase().includes('software');
        }
        
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Get optimal player configuration for stream format and device
 * @param {string} streamUrl - Stream URL
 * @param {Object} [networkQuality] - Network quality info
 * @param {Object} [deviceCapabilities] - Device capabilities
 * @returns {Object} Player configuration
 */
export function getOptimalPlayer(streamUrl, networkQuality = null, deviceCapabilities = null) {
    const format = detectStreamFormat(streamUrl);
    const support = getBrowserSupport();
    
    // Default configuration
    const baseConfig = {
        autoplay: true,
        muted: true,
        playsInline: true,
        preload: 'metadata',
        crossOrigin: 'anonymous'
    };
    
    // MSE/MP4 - Highest compatibility, good performance
    if (format === StreamFormat.MSE && support.formats.mse) {
        return {
            type: 'native',
            format: StreamFormat.MSE,
            url: streamUrl,
            priority: 1,
            config: {
                ...baseConfig,
                preload: 'auto'
            }
        };
    }
    
    // HLS - Use native on Safari, HLS.js elsewhere
    if (format === StreamFormat.HLS) {
        if (support.isSafari && support.formats.hls) {
            return {
                type: 'native',
                format: StreamFormat.HLS,
                url: streamUrl,
                priority: 2,
                config: baseConfig
            };
        } else if (support.formats.mse) {
            return {
                type: 'hlsjs',
                format: StreamFormat.HLS,
                url: streamUrl,
                priority: 3,
                config: {
                    ...baseConfig,
                    // HLS.js specific optimizations
                    enableWorker: !support.isMobile,
                    lowLatencyMode: networkQuality?.quality === 'excellent'
                }
            };
        }
    }
    
    // WebRTC - Lowest latency for good connections
    if (format === StreamFormat.WEBRTC && support.formats.webrtc) {
        const isGoodConnection = networkQuality?.quality === 'excellent' || 
                                networkQuality?.quality === 'good';
        
        return {
            type: 'webrtc',
            format: StreamFormat.WEBRTC,
            url: streamUrl,
            priority: isGoodConnection ? 1 : 4,
            config: {
                ...baseConfig,
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ],
                iceCandidatePoolSize: 10
            }
        };
    }
    
    // DASH - Future support
    if (format === StreamFormat.DASH && support.formats.dash) {
        return {
            type: 'dashjs',
            format: StreamFormat.DASH,
            url: streamUrl,
            priority: 5,
            config: baseConfig
        };
    }
    
    // Fallback to native
    return {
        type: 'native',
        format: StreamFormat.NATIVE,
        url: streamUrl,
        priority: 10,
        config: baseConfig
    };
}

/**
 * Get intelligent stream priority order based on network and device
 * @param {Object} streams - Available stream URLs
 * @param {Object} [networkQuality] - Network quality info
 * @param {Object} [deviceCapabilities] - Device capabilities
 * @returns {Array} Prioritized stream list
 */
export function getStreamPriority(streams, networkQuality = null, deviceCapabilities = null) {
    const priority = [];
    const support = getBrowserSupport();
    
    // Normalize stream object keys
    const normalizedStreams = {
        hls: streams.hls || streams.hls_url || streams.hlsUrl,
        mse: streams.mse || streams.mse_url || streams.mseUrl || streams.mp4,
        webrtc: streams.webrtc || streams.webrtc_url || streams.webrtcUrl,
        dash: streams.dash || streams.dash_url || streams.dashUrl
    };
    
    // Create stream entries with priorities
    const streamEntries = [];
    
    Object.entries(normalizedStreams).forEach(([key, url]) => {
        if (!url) return;
        
        const format = key === 'hls' ? StreamFormat.HLS :
                      key === 'mse' ? StreamFormat.MSE :
                      key === 'webrtc' ? StreamFormat.WEBRTC :
                      key === 'dash' ? StreamFormat.DASH : StreamFormat.NATIVE;
        
        const player = getOptimalPlayer(url, networkQuality, deviceCapabilities);
        
        streamEntries.push({
            url,
            format,
            name: format.toUpperCase(),
            type: player.type,
            priority: player.priority,
            config: player.config,
            supported: isFormatSupported(format, support)
        });
    });
    
    // Sort by priority and filter supported formats
    return streamEntries
        .filter(entry => entry.supported)
        .sort((a, b) => a.priority - b.priority);
}

/**
 * Check if format is supported by browser
 * @param {string} format - Stream format
 * @param {Object} support - Browser support info
 * @returns {boolean} Format supported
 */
function isFormatSupported(format, support) {
    switch (format) {
        case StreamFormat.HLS:
            return support.formats.hls || support.formats.mse;
        case StreamFormat.MSE:
            return support.formats.mse && support.formats.mp4;
        case StreamFormat.WEBRTC:
            return support.formats.webrtc;
        case StreamFormat.DASH:
            return support.formats.dash;
        default:
            return true;
    }
}

/**
 * Create adaptive player configuration based on network and device
 * @param {string} format - Stream format
 * @param {Object} networkQuality - Network quality info
 * @param {Object} deviceCapabilities - Device capabilities
 * @returns {Object} Adaptive configuration
 */
export function createAdaptiveConfig(format, networkQuality, deviceCapabilities) {
    const baseConfig = {
        autoplay: true,
        muted: true,
        playsInline: true,
        crossOrigin: 'anonymous'
    };
    
    // Network-based optimizations
    const networkOptimizations = {};
    if (networkQuality) {
        switch (networkQuality.quality) {
            case 'excellent':
                networkOptimizations.preload = 'auto';
                networkOptimizations.bufferSize = 10;
                break;
            case 'good':
                networkOptimizations.preload = 'metadata';
                networkOptimizations.bufferSize = 20;
                break;
            case 'fair':
                networkOptimizations.preload = 'none';
                networkOptimizations.bufferSize = 30;
                break;
            case 'poor':
                networkOptimizations.preload = 'none';
                networkOptimizations.bufferSize = 60;
                networkOptimizations.lowQualityMode = true;
                break;
        }
    }
    
    // Device-based optimizations
    const deviceOptimizations = {};
    if (deviceCapabilities) {
        if (deviceCapabilities.isMobile) {
            deviceOptimizations.playsInline = true;
            deviceOptimizations.disablePictureInPicture = true;
        }
        
        if (deviceCapabilities.tier === 'low') {
            deviceOptimizations.hardwareAcceleration = false;
            deviceOptimizations.maxResolution = '720p';
        }
    }
    
    // Format-specific optimizations
    const formatOptimizations = {};
    switch (format) {
        case StreamFormat.HLS:
            formatOptimizations.enableWorker = !deviceCapabilities?.isMobile;
            formatOptimizations.lowLatencyMode = networkQuality?.quality === 'excellent';
            break;
        case StreamFormat.WEBRTC:
            formatOptimizations.iceServers = [
                { urls: 'stun:stun.l.google.com:19302' }
            ];
            break;
        case StreamFormat.MSE:
            formatOptimizations.enableSourceBuffers = true;
            break;
    }
    
    return {
        ...baseConfig,
        ...networkOptimizations,
        ...deviceOptimizations,
        ...formatOptimizations
    };
}

/**
 * Get format-specific error recovery strategies
 * @param {string} format - Stream format
 * @returns {Object} Recovery strategies
 */
export function getRecoveryStrategies(format) {
    const strategies = {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
        fallbackFormats: []
    };
    
    switch (format) {
        case StreamFormat.WEBRTC:
            strategies.maxRetries = 2;
            strategies.retryDelay = 500;
            strategies.fallbackFormats = [StreamFormat.MSE, StreamFormat.HLS];
            break;
        case StreamFormat.MSE:
            strategies.maxRetries = 3;
            strategies.fallbackFormats = [StreamFormat.HLS];
            break;
        case StreamFormat.HLS:
            strategies.maxRetries = 5;
            strategies.retryDelay = 2000;
            strategies.fallbackFormats = [StreamFormat.MSE];
            break;
    }
    
    return strategies;
}
