'use client';
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX } from 'lucide-react';
import { api } from '@/lib/api';

interface Props {
  url: string;
  thumbnailUrl: string;
  cardId: string;
  onUpdateThumbnail: (url: string) => void;
  title: string;
}

export default function VideoPlayer({ url, thumbnailUrl, cardId, onUpdateThumbnail, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(!thumbnailUrl);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (thumbnailUrl || !url) return;

    let cancelled = false;
    async function captureFrame() {
      setIsGeneratingThumbnail(true);
      try {
        const video = document.createElement('video');
        video.src = url;
        video.crossOrigin = 'anonymous';
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;

        const onSeeked = async () => {
          if (cancelled) return;
          try {
            const canvas = document.createElement('canvas');
            const targetWidth = 400;
            const aspect = video.videoHeight / video.videoWidth;
            canvas.width = targetWidth;
            canvas.height = targetWidth * (isNaN(aspect) ? 0.5625 : aspect);

            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              canvas.toBlob(async (blob) => {
                if (blob && !cancelled) {
                  const file = new File([blob], `thumb_${cardId}.jpg`, { type: 'image/jpeg' });
                  try {
                    const result = await api.media.upload(file);
                    if (!cancelled) {
                      onUpdateThumbnail(result.url);
                      setIsGeneratingThumbnail(false);
                    }
                  } catch (err) {
                    console.error('Failed to upload thumbnail:', err);
                    setIsGeneratingThumbnail(false);
                  }
                }
              }, 'image/jpeg', 0.85);
            }
          } catch (err) {
            console.error('Canvas capture failed:', err);
            setIsGeneratingThumbnail(false);
          }
        };

        const onLoadedData = () => {
          video.currentTime = 0.5; // Seek to 0.5s for a good frame
        };

        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('seeked', onSeeked);

        // Cleanup
        return () => {
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('seeked', onSeeked);
        };
      } catch (err) {
        console.error('Thumbnail generation failed:', err);
        setIsGeneratingThumbnail(false);
      }
    }

    void captureFrame();
    return () => {
      cancelled = true;
    };
  }, [url, thumbnailUrl, cardId, onUpdateThumbnail]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    const onLoadedMetadata = () => {
      setDuration(video.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('ended', onEnded);
    };
  }, [isPlaying]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(err => console.warn('Playback failed:', err));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.currentTime = val;
    setCurrentTime(val);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      void video.requestFullscreen();
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div 
      className="video-player-container" 
      onMouseDown={e => e.stopPropagation()}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {!isPlaying && thumbnailUrl && (
        <div className="video-thumbnail-overlay" onClick={togglePlay}>
          <img src={thumbnailUrl} alt={title} className="video-thumbnail-img" />
          <div className="video-play-overlay-btn">
            <Play size={28} fill="currentColor" />
          </div>
        </div>
      )}

      {isGeneratingThumbnail && (
        <div className="video-thumbnail-loading">
          <span className="auth-spinner" style={{ width: 20, height: 20 }} />
          <span>Generating thumbnail...</span>
        </div>
      )}

      {(isPlaying || !thumbnailUrl) && (
        <video 
          ref={videoRef} 
          src={url} 
          preload="metadata" 
          crossOrigin="anonymous"
          onClick={togglePlay}
          className="video-element"
        />
      )}

      {(isPlaying || !thumbnailUrl) && (showControls || !isPlaying) && (
        <div className="video-player-controls-overlay">
          <div className="video-player-progress-bar">
            <input
              type="range"
              className="video-player-seek-slider"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
            />
          </div>
          <div className="video-player-buttons">
            <div className="video-left-buttons">
              <button type="button" className="video-control-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              </button>
              <span className="video-time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="video-right-buttons">
              <button type="button" className="video-control-btn" onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button type="button" className="video-control-btn" onClick={handleFullscreen} aria-label="Fullscreen">
                <Maximize size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
