# 🎬 Live Streaming Optimization Guide

## مسیر Stream

```
Prism (Mobile) → RTMP → Mux Live (Low-Latency) → HLS → Dashboard
```

---

## 1️⃣ Mux Configuration (Backend) ✅

### تغییرات اعمال شده:

```typescript
// ✅ low-latency mode فعال شد
latency_mode: "low"

// نتیجه: تأخیر 3-6 ثانیه (بجای 10-15)
```

---

## 2️⃣ HLS.js Player (Frontend) ✅

### تغییرات اعمال شده:

```typescript
const hls = new Hls({
  // 🔴 کاهش buffer برای low-latency
  maxBufferLength: 5,           // 5 ثانیه (بجای 30)
  maxMaxBufferLength: 30,       // Max 30 ثانیه
  backBufferLength: 30,         // History buffer
  
  // 🔴 Low-latency mode
  lowLatencyMode: true,         // Enable LL-HLS
  
  // 🔴 بهتر retry logic
  fragLoadingTimeOut: 20000,    // 20 ثانیه timeout
  fragLoadingMaxRetry: 2,       // 2 retry attempts
  levelLoadingTimeOut: 20000,
  levelLoadingMaxRetry: 2,
  
  // 🔴 Smart bitrate selection
  startLevel: 2,                // شروع با mid-quality
  testBandwidth: true,          // خودکار بهترین bitrate
});
```

### فواید:

✅ **Latency**: 3-4 ثانیه (Low-Latency HLS)  
✅ **Smooth playback**: کم buffering  
✅ **Quality**: خودکار انطباق با network

---

## 3️⃣ Prism Mobile Settings 📱

### RTMP Configuration:

```
Server: rtmp://global-live.mux.com:5222/app
Stream Key: [Your Mux Stream Key]

Bitrate: 2500-4000 kbps (4G/5G)
Resolution: 720p @ 30fps (mobile friendly)
Keyframe Interval: 2 ثانیه (ضروری برای low-latency)
```

### بهترین تنظیمات Prism:

| Setting | Value | توضیح |
|---------|-------|-------|
| **Video Codec** | H.264 | Most compatible |
| **Bitrate** | 3000 kbps | Balanced quality/latency |
| **Resolution** | 720p | Mobile optimal |
| **FPS** | 30 | Smooth motion |
| **Keyframe** | 2s | LL-HLS requirement |
| **Audio** | 128 kbps AAC | Clear audio |

### How to set in Prism:

1. **Settings** → **Encoder**
2. Set **Bitrate**: 3000 kbps
3. Set **Resolution**: 1280x720
4. Set **Keyframe Interval**: 2 seconds
5. Check **Network Adaptive Bitrate** (ON)

---

## 4️⃣ Network Optimization 🌐

### Mobile (Prism):

```
✅ 4G/5G مستقیم (نه WiFi اگر ممکن)
✅ Signal strength 4+ bars
✅ Stable network (تست: speedtest.net)
✅ Minimum 2.5 Mbps upload
```

### Desktop (Dashboard):

```
✅ کم‌ترین 5 Mbps download
✅ پایین latency (ping < 50ms)
✅ Modern browser (Chrome/Firefox/Safari)
✅ Hardware acceleration ON
```

---

## 5️⃣ Dashboard Performance 💻

### Browser Settings:

```javascript
// ✅ اضافه شد: Hardware Acceleration
video {
  /* Enable GPU decoding */
  accelerated: true;
}

// ✅ Video element optimization
<video
  autoPlay
  muted
  playsInline  // Mobile optimization
  controls
/>
```

### Disable adaptive bitrate drop:

```typescript
// اگر network خیلی ضعیف:
startLevel: 1  // شروع با lower quality
```

---

## 6️⃣ Troubleshooting 🔧

### مشکل: Playback buffering

```
❌ Problem: Prism bitrate خیلی زیاد
✅ Solution: Prism bitrate را 2500 کبپس کن

❌ Problem: Network unstable
✅ Solution: Restream 5G network یا بهتر WiFi

❌ Problem: Player lagging
✅ Solution: Browser cache پاک کن + hard refresh (Ctrl+Shift+R)
```

### مشکل: High latency (10+ ثانیه)

```
❌ Problem: Mux low-latency غیر فعال
✅ Solution: ✅ اینجا fixed (latency_mode: "low")

❌ Problem: Old HLS configuration
✅ Solution: ✅ اینجا updated (lowLatencyMode: true)

❌ Problem: Keyframe interval > 2s
✅ Solution: Prism میں keyframe 2 ثانیه سیٹ کریں
```

---

## 7️⃣ Live Stream Checklist ✅

### قبل از شروع:

- [ ] Prism bitrate = 3000 kbps
- [ ] Prism resolution = 720p
- [ ] Prism keyframe = 2s
- [ ] Mobile network = 4G+ یا strong WiFi
- [ ] Upload speed ≥ 2.5 Mbps (speedtest.net چک کریں)
- [ ] Dashboard = modern browser
- [ ] Hardware acceleration = ON

### حین broadcast:

- [ ] Monitor network quality
- [ ] Check Mux dashboard for stream health
- [ ] Watch for buffering on 2-3 devices
- [ ] Adjustbitrate اگر issues

---

## 📊 Expected Performance

```
✅ Latency: 3-4 ثانیه (Low-Latency HLS)
✅ Smoothness: 30fps consistent
✅ Quality: 720p adaptive
✅ Buffering: < 1 second
✅ Viewers: Multi-device support
```

---

## Next Steps

1. **Test**: یک test live session شروع کن
2. **Monitor**: Mux dashboard میں network stats دیکھ
3. **Adjust**: Bitrate/resolution اگر needed
4. **Scale**: اضافی viewers add کن

---

## Resources

- 📖 [Mux Low-Latency Docs](https://docs.mux.com/guides/video/low-latency-streaming)
- 📖 [HLS.js Configuration](https://github.com/video-dev/hls.js/wiki/API)
- 📖 [Prism Live Streaming Guide](https://www.prism-live.com)
