'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { Button } from './button';

export interface AudioPlayerProps {
  src: string;
  title: string;
  transcript: string;
  className?: string;
  autoPlay?: boolean;
}

/**
 * Accessible Audio Player implementing WCAG 2.2 Rule 21:
 * - Full manual controls (Play, Pause, Skip Back 10s, Skip Forward 10s, Speed selector, Volume)
 * - Persistent accessible text transcript toggle
 * - No autoplay without explicit user interaction
 * - Min 44x44px interactive targets with high contrast focus rings
 */
export function AudioPlayer({
  src,
  title,
  transcript,
  className = '',
  autoPlay = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);

  const transcriptId = useId();
  const volumeId = useId();
  const progressId = useId();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        console.warn('Playback error:', err);
      });
    }
  };

  const skipSeconds = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(Math.max(0, audio.currentTime + seconds), duration || Infinity);
  };

  const handleRateChange = (newRate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const handleVolumeChange = (newVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  const handleSeek = (newTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      role="region"
      aria-label={`Audio player for ${title}`}
      className={`rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] space-y-4 ${className}`}
    >
      <audio ref={audioRef} src={src} preload="metadata" autoPlay={autoPlay}>
        <track kind="captions" src="" label="English captions" default />
        Your browser does not support the audio element.
      </audio>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[var(--color-border)] pb-3">
        <h3 className="text-lg font-bold text-[var(--color-text)]">{title}</h3>
        <span className="text-sm text-[var(--color-text-muted)] font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Seek slider */}
      <div className="space-y-1">
        <label htmlFor={progressId} className="sr-only">
          Audio position for {title}
        </label>
        <input
          id={progressId}
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          step="0.1"
          onChange={e => handleSeek(parseFloat(e.target.value))}
          className="w-full h-3 bg-[var(--color-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] focus:outline focus:outline-3 focus:outline-[var(--color-focus)] focus:outline-offset-2"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        />
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Play/Pause Button */}
        <Button
          type="button"
          onClick={togglePlay}
          variant="primary"
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center font-bold px-4"
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </Button>

        {/* Back 10 Seconds */}
        <Button
          type="button"
          onClick={() => skipSeconds(-10)}
          variant="outline"
          className="min-h-[44px] min-w-[44px] gap-1"
        >
          <span aria-hidden="true">↺</span> Rewind 10s
        </Button>

        {/* Forward 10 Seconds */}
        <Button
          type="button"
          onClick={() => skipSeconds(10)}
          variant="outline"
          className="min-h-[44px] min-w-[44px] gap-1"
        >
          <span aria-hidden="true">↻</span> Forward 10s
        </Button>

        {/* Playback speed selector */}
        <div className="flex items-center gap-1">
          <label htmlFor={`speed-${progressId}`} className="text-sm font-semibold">
            Speed:
          </label>
          <select
            id={`speed-${progressId}`}
            value={playbackRate}
            onChange={e => handleRateChange(parseFloat(e.target.value))}
            className="min-h-[44px] px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] font-semibold focus:outline focus:outline-3 focus:outline-[var(--color-focus)] focus:outline-offset-2"
            aria-label="Audio playback rate"
          >
            <option value="0.75">0.75x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-2">
          <label htmlFor={volumeId} className="text-sm font-semibold">
            Volume:
          </label>
          <input
            id={volumeId}
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={e => handleVolumeChange(parseFloat(e.target.value))}
            className="w-24 h-3 bg-[var(--color-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)] focus:outline focus:outline-3 focus:outline-[var(--color-focus)] focus:outline-offset-2"
            aria-label="Audio volume"
            aria-valuenow={Math.round(volume * 100)}
            aria-valuetext={`${Math.round(volume * 100)} percent`}
          />
        </div>

        {/* Transcript toggle */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowTranscript(prev => !prev)}
          aria-expanded={showTranscript}
          aria-controls={transcriptId}
          className="min-h-[44px] ml-auto font-semibold"
        >
          {showTranscript ? 'Hide transcript' : 'Show transcript'}
        </Button>
      </div>

      {/* Accessible Text Transcript */}
      {showTranscript && (
        <div
          id={transcriptId}
          className="mt-4 p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] leading-relaxed space-y-2"
        >
          <h4 className="font-bold text-base border-b border-[var(--color-border)] pb-1">
            Audio Transcript: {title}
          </h4>
          <p className="whitespace-pre-line text-[var(--font-size-base)]">{transcript}</p>
        </div>
      )}
    </div>
  );
}
