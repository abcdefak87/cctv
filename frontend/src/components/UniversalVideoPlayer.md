# Universal Video Player - Enterprise Grade

A production-ready, enterprise-grade video streaming component that supports multiple streaming formats with intelligent fallback, advanced error recovery, and comprehensive performance monitoring.

## 🚀 Features

### Core Streaming Support
- **HLS (HTTP Live Streaming)** - Via HLS.js or native Safari support
- **MSE/MP4 (Media Source Extensions)** - Direct MP4 streaming with MSE
- **WebRTC** - Ultra-low latency real-time streaming
- **DASH** - Future support for MPEG-DASH (planned)

### Intelligent Adaptation
- **Automatic Format Detection** - Detects optimal format from URL patterns
- **Smart Fallback Mechanism** - MSE → HLS → WebRTC priority with network-based adjustment
- **Network Quality Adaptation** - Real-time quality adjustment based on connection
- **Device-Specific Optimization** - Tailored configurations for mobile/desktop

### Advanced Error Recovery
- **Exponential Backoff Retry** - Intelligent retry with increasing delays
- **Multi-Format Fallback** - Automatic switching between available formats
- **Network Restoration Detection** - Auto-reconnect when network is restored
- **Graceful Degradation** - Maintains functionality under poor conditions

### Performance Monitoring
- **Real-time Metrics Collection** - Buffer health, frame drops, bandwidth, latency
- **Performance Scoring** - 0-100 performance score with detailed breakdown
- **Memory Leak Prevention** - Comprehensive resource cleanup
- **Hardware Acceleration Detection** - Optimizes for available hardware

### User Experience
- **Zoom & Pan Support** - Mouse/touch zoom with smooth panning
- **Fullscreen Support** - Native fullscreen with proper event handling
- **Loading State Management** - Progressive loading feedback with stage indicators
- **Responsive Design** - Works seamlessly across all device sizes

## 📦 Installation

```bash
# Install the component and its dependencies
npm install hls.js

# The component uses React hooks and requires React 16.8+
```

## 🎯 Quick Start

### Basic Usage

```jsx
import UniversalVideoPlayer from './components/UniversalVideoPlayer';

function App() {
  const camera = {
    id: 1,
    name: "Front Gate Camera",
    location: "Main Entrance"
  };
  
  const streams = {
    hls: "https://example.com/hls/camera1/playlist.m3u8",
    mse: "https://example.com/mse/camera1/stream.mp4",
    webrtc: "https://example.com/webrtc/camera1"
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
```

### Advanced Configuration

```jsx
import UniversalVideoPlayer from './components/UniversalVideoPlayer';

function AdvancedPlayer() {
  const [metrics, setMetrics] = useState(null);
  
  const config = {
    autoplay: true,
    muted: true,
    enableZoom: true,
    enableFullscreen: true,
    retryAttempts: 5,
    timeoutMs: 30000
  };
  
  const handleError = (error) => {
    console.error('Player error:', error);
    // Custom error handling
  };
  
  const handleMetrics = (newMetrics) => {
    setMetrics(newMetrics);
    // Performance monitoring
  };
  
  return (
    <UniversalVideoPlayer
      camera={camera}
      streams={streams}
      config={config}
      onError={handleError}
      onMetrics={handleMetrics}
      onPlaying={() => console.log('Started playing')}
    />
  );
}
```

## 📋 API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `camera` | `CameraInfo` | **Required** | Camera information object |
| `streams` | `StreamUrls` | **Required** | Available stream URLs |
| `config` | `PlayerConfig` | `{}` | Player configuration options |
| `onExpand` | `Function` | `undefined` | Expand button callback |
| `onError` | `Function` | `undefined` | Error event callback |
| `onPlaying` | `Function` | `undefined` | Playing event callback |
| `onMetrics` | `Function` | `undefined` | Metrics update callback |
| `isExpanded` | `boolean` | `false` | Expanded state |
| `className` | `string` | `''` | Additional CSS classes |

### Type Definitions

#### CameraInfo
```typescript
interface CameraInfo {
  id: number;           // Camera ID
  name: string;         // Camera name
  location?: string;    // Camera location
  isOnline?: boolean;   // Online status
}
```

#### StreamUrls
```typescript
interface StreamUrls {
  hls?: string;         // HLS stream URL (.m3u8)
  mse?: string;         // MSE/MP4 stream URL
  webrtc?: string;      // WebRTC stream URL
  dash?: string;        // DASH stream URL (future)
}
```

#### PlayerConfig
```typescript
interface PlayerConfig {
  autoplay?: boolean;       // Auto-play video (default: true)
  muted?: boolean;          // Mute audio (default: true)
  controls?: boolean;       // Show native controls (default: false)
  enableZoom?: boolean;     // Enable zoom functionality (default: false)
  enableFullscreen?: boolean; // Enable fullscreen (default: true)
  retryAttempts?: number;   // Max retry attempts (default: 3)
  timeoutMs?: number;       // Loading timeout in ms (default: 30000)
}
```

## 🔧 Configuration Examples

### Low Bandwidth Configuration
```jsx
const lowBandwidthConfig = {
  autoplay: false,
  retryAttempts: 2,
  timeoutMs: 60000
};
```

### High Performance Configuration
```jsx
const highPerformanceConfig = {
  autoplay: true,
  enableZoom: true,
  retryAttempts: 5,
  timeoutMs: 15000
};
```

### Mobile Optimized Configuration
```jsx
const mobileConfig = {
  enableZoom: false,
  enableFullscreen: false,
  retryAttempts: 3
};
```

## 📊 Performance Monitoring

The player provides comprehensive performance metrics:

```jsx
const handleMetrics = (metrics) => {
  console.log('Performance Score:', metrics.performanceScore); // 0-100
  console.log('Buffer Health:', metrics.bufferHealth);         // seconds
  console.log('Dropped Frames:', metrics.droppedFrames);       // count
  console.log('Bandwidth:', metrics.bandwidth);               // kbps
  console.log('Latency:', metrics.latency);                   // ms
  console.log('Memory Usage:', metrics.memoryUsage);          // percentage
  console.log('Network Quality:', metrics.networkQuality);    // excellent/good/fair/poor
};
```

### Performance Score Calculation
- **100-90**: Excellent performance, no issues
- **89-80**: Good performance, minor issues
- **79-70**: Fair performance, some dropped frames or buffering
- **69-60**: Poor performance, frequent issues
- **<60**: Critical performance issues

## 🔄 Stream Format Priority

The player automatically selects the optimal format based on:

1. **Network Quality**
   - Excellent: WebRTC → MSE → HLS
   - Good: MSE → WebRTC → HLS  
   - Fair/Poor: HLS → MSE → WebRTC

2. **Browser Support**
   - Safari: Native HLS preferred
   - Chrome/Firefox: MSE preferred
   - All: HLS.js fallback

3. **Device Capabilities**
   - Mobile: HLS preferred for battery life
   - Desktop: MSE/WebRTC preferred for quality

## 🚨 Error Handling

### Error Types
- **Network Errors**: Connection issues, timeouts
- **Media Errors**: Codec issues, corrupted streams
- **Format Errors**: Unsupported formats
- **Timeout Errors**: Loading timeouts

### Recovery Strategies
1. **Exponential Backoff**: Increasing retry delays
2. **Format Switching**: Try alternative formats
3. **Quality Reduction**: Lower quality streams
4. **Manual Recovery**: User-initiated retry

### Error Callback
```jsx
const handleError = (error) => {
  console.error('Error details:', {
    type: error.type,           // 'network', 'media', 'timeout'
    message: error.message,     // Human-readable message
    stage: error.stage,         // Loading stage when error occurred
    retryCount: error.retryCount, // Current retry attempt
    deviceTier: error.deviceTier  // Device performance tier
  });
};
```

## 🎮 User Controls

### Zoom & Pan (when enabled)
- **Mouse Wheel**: Zoom in/out
- **Click & Drag**: Pan when zoomed
- **Touch Gestures**: Pinch to zoom, drag to pan
- **Control Buttons**: Zoom in, zoom out, reset

### Fullscreen
- **Button Click**: Toggle fullscreen
- **Keyboard**: ESC to exit fullscreen
- **Mobile**: Optimized for mobile fullscreen

## 🔧 Customization

### CSS Classes
The component uses Tailwind CSS classes but can be customized:

```jsx
<UniversalVideoPlayer
  className="custom-player border-4 border-blue-500"
  // ... other props
/>
```

### Custom Styling
```css
.custom-player {
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.custom-player .video-container {
  background: linear-gradient(45deg, #000, #333);
}
```

## 🧪 Testing

### Error Testing
```jsx
// Test with invalid URLs to verify error handling
const testStreams = {
  hls: "https://invalid-url.com/test.m3u8",
  mse: "https://invalid-url.com/test.mp4"
};
```

### Performance Testing
```jsx
// Monitor performance in different network conditions
const handleMetrics = (metrics) => {
  if (metrics.performanceScore < 70) {
    console.warn('Performance degradation detected');
  }
};
```

## 🔒 Security Considerations

- **CORS**: Ensure proper CORS headers on stream URLs
- **HTTPS**: Use HTTPS for all stream URLs in production
- **Authentication**: Implement token-based authentication for streams
- **Rate Limiting**: Implement server-side rate limiting

## 📱 Mobile Optimization

- **Touch Events**: Optimized touch handling for zoom/pan
- **Battery Life**: Intelligent format selection for battery conservation
- **Network Awareness**: Adapts to mobile network conditions
- **Responsive Design**: Works on all screen sizes

## 🚀 Performance Tips

1. **Preload Streams**: Use `preload="metadata"` for faster startup
2. **CDN Usage**: Serve streams from CDN for better performance
3. **Format Selection**: Provide multiple formats for optimal fallback
4. **Buffer Management**: Tune buffer sizes based on network quality
5. **Resource Cleanup**: Component handles automatic cleanup

## 🐛 Troubleshooting

### Common Issues

**Stream Won't Load**
- Check network connectivity
- Verify stream URL accessibility
- Check CORS headers
- Verify format support

**Poor Performance**
- Check network quality
- Monitor dropped frames
- Verify hardware acceleration
- Consider lower quality streams

**Memory Leaks**
- Component handles cleanup automatically
- Ensure proper unmounting
- Monitor memory usage metrics

### Debug Mode
```jsx
// Enable debug logging
const config = {
  debug: true,  // Enables console logging
  // ... other config
};
```

## 📄 License

This component is part of the RAF NET CCTV System and is proprietary software.

## 🤝 Contributing

For bug reports and feature requests, please contact the development team.

---

**Version**: 2.0.0  
**Last Updated**: February 2024  
**Compatibility**: React 16.8+, Modern Browsers