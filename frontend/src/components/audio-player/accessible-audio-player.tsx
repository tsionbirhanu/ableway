"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, FastForward, Volume2 } from "lucide-react";
import { ScreenReaderOnly } from "../a11y/screen-reader-only";

interface AccessibleAudioPlayerProps {
  title: string;
  audioSrc?: string;
  transcript: string;
}

export function AccessibleAudioPlayer({ title, audioSrc, transcript }: AccessibleAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const rewind10 = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };

  const forward10 = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
  };

  const changeRate = (rate: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <div
      role="region"
      aria-label={`Audio player for ${title}`}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl space-y-4"
    >
      {audioSrc && (
        <audio ref={audioRef} src={audioSrc} preload="metadata">
          <track kind="captions" src="" label="Lesson captions" default />
        </audio>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          <h2 className="font-semibold text-lg text-white">{title}</h2>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded font-mono">
          {Math.floor(currentTime)}s / {Math.floor(duration)}s
        </span>
      </div>

      {/* Primary Audio Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 py-2">
        <button
          type="button"
          onClick={rewind10}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
          aria-label="Rewind 10 seconds"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
          <ScreenReaderOnly>Rewind 10 seconds</ScreenReaderOnly>
        </button>

        <button
          type="button"
          onClick={togglePlay}
          className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg transition focus:outline-none focus:ring-4 focus:ring-emerald-300 cursor-pointer"
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? (
            <Pause className="h-7 w-7" aria-hidden="true" />
          ) : (
            <Play className="h-7 w-7 translate-x-0.5" aria-hidden="true" />
          )}
          <ScreenReaderOnly>{isPlaying ? "Pause" : "Play"}</ScreenReaderOnly>
        </button>

        <button
          type="button"
          onClick={forward10}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full transition focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
          aria-label="Forward 10 seconds"
        >
          <FastForward className="h-5 w-5" aria-hidden="true" />
          <ScreenReaderOnly>Forward 10 seconds</ScreenReaderOnly>
        </button>
      </div>

      {/* Speed Controls (0.75x, 1x, 1.25x, 1.5x) */}
      <div className="flex items-center justify-center gap-2 text-xs">
        <span className="text-slate-400 mr-1">Speed:</span>
        {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={() => changeRate(rate)}
            aria-pressed={playbackRate === rate}
            className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
              playbackRate === rate
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {rate}x
          </button>
        ))}
      </div>

      {/* Synchronized Accessible Transcript */}
      <div className="border-t border-slate-800 pt-4 mt-2">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Lesson Transcript</h3>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Full lesson text transcript"
          className="bg-slate-950 p-4 rounded-xl text-slate-200 text-sm leading-relaxed max-h-48 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <p>{transcript}</p>
        </div>
      </div>
    </div>
  );
}

