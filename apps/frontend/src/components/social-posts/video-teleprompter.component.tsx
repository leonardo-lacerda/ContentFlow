'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@gitroom/react/form/button';
import {
  X,
  Play,
  Pause,
  Maximize,
  Minimize,
  Gauge,
  Type,
  HelpCircle,
} from 'lucide-react';
import type { VideoProject, VideoScene } from './video-scripts.types';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const FONT_SIZE_KEY = 'video-teleprompter-font-size';
const SPEED_KEY = 'video-teleprompter-wpm';

const DEFAULT_WPM = 150;
const MIN_WPM = 80;
const MAX_WPM = 300;
const MIN_FONT = 16;
const MAX_FONT = 56;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getSceneText(scene: VideoScene): string {
  return scene.voiceoverText || scene.headline || scene.body || '';
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function VideoTeleprompter({
  project,
  onClose,
}: {
  project: VideoProject;
  onClose: () => void;
}) {
  const script = project.script;
  const scenes: VideoScene[] = script?.scenes || [];

  /* -- State ------------------------------------------------------- */

  const [sceneIndex, setSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SPEED_KEY);
      return stored ? Number(stored) : DEFAULT_WPM;
    }
    return DEFAULT_WPM;
  });
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(FONT_SIZE_KEY);
      return stored ? Number(stored) : 28;
    }
    return 28;
  });
  const [isLandscape, setIsLandscape] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sceneCountdown, setSceneCountdown] = useState(0);
  const [globalElapsed, setGlobalElapsed] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sceneTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const globalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollAnimRef = useRef<number | null>(null);

  const scene = scenes[sceneIndex];
  const totalScenes = scenes.length;
  const totalDuration = scenes.reduce((acc, s) => acc + (s.durationSec || 0), 0);

  /* -- Persist settings -------------------------------------------- */

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem(SPEED_KEY, String(wpm));
  }, [wpm]);

  /* -- Scene countdown --------------------------------------------- */

  useEffect(() => {
    if (!scene) return;
    setSceneCountdown(scene.durationSec || 5);

    if (sceneTimerRef.current) clearInterval(sceneTimerRef.current);
    if (isPlaying) {
      sceneTimerRef.current = setInterval(() => {
        setSceneCountdown((prev) => {
          if (prev <= 1) {
            // Auto-advance
            setSceneIndex((idx) => Math.min(idx + 1, totalScenes - 1));
            return scenes[Math.min(sceneIndex + 1, totalScenes - 1)]?.durationSec || 5;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (sceneTimerRef.current) clearInterval(sceneTimerRef.current);
    };
  }, [sceneIndex, isPlaying, scene?.durationSec]);

  /* -- Global timer ------------------------------------------------ */

  useEffect(() => {
    if (isPlaying) {
      globalTimerRef.current = setInterval(() => {
        setGlobalElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    }
    return () => {
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    };
  }, [isPlaying]);

  /* -- Auto-scroll ------------------------------------------------- */

  useEffect(() => {
    if (!scrollRef.current || !isPlaying || !scene) return;

    const container = scrollRef.current;
    const textHeight = container.scrollHeight - container.clientHeight;
    if (textHeight <= 0) return;

    const avgCharsPerWord = 5;
    const pxPerChar = fontSize * 0.6;
    const pxPerSecond = (wpm * avgCharsPerWord * pxPerChar) / 60;
    const totalScrollTime = textHeight / pxPerSecond;
    const duration = scene.durationSec || 5;
    const speed = textHeight / (duration * 60); // px per frame at 60fps

    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      container.scrollTop += speed * delta * 60;

      if (container.scrollTop < container.scrollHeight - container.clientHeight) {
        scrollAnimRef.current = requestAnimationFrame(animate);
      }
    };

    container.scrollTop = 0;
    scrollAnimRef.current = requestAnimationFrame(animate);

    return () => {
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
    };
  }, [sceneIndex, isPlaying, fontSize, wpm, scene?.durationSec]);

  /* -- Keyboard shortcuts ------------------------------------------ */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying((p) => !p);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setSceneIndex((i) => Math.min(i + 1, totalScenes - 1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setSceneIndex((i) => Math.max(i - 1, 0));
          break;
        case '+':
        case '=':
          e.preventDefault();
          setWpm((w) => Math.min(w + 10, MAX_WPM));
          break;
        case '-':
          e.preventDefault();
          setWpm((w) => Math.max(w - 10, MIN_WPM));
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case '?':
          e.preventDefault();
          setShowHelp((h) => !h);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [totalScenes, onClose]);

  /* -- Fullscreen -------------------------------------------------- */

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not supported or blocked
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* -- Reset on scene change --------------------------------------- */

  const goToScene = (idx: number) => {
    setSceneIndex(idx);
    setSceneCountdown(scenes[idx]?.durationSec || 5);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  /* -- Scene progress ---------------------------------------------- */

  const sceneProgress = scene
    ? 1 - sceneCountdown / (scene.durationSec || 5)
    : 0;
  const overallProgress =
    totalDuration > 0
      ? (scenes.slice(0, sceneIndex).reduce((a, s) => a + (s.durationSec || 0), 0) +
          (scene ? (scene.durationSec || 5) * sceneProgress : 0)) /
        totalDuration
      : 0;

  /* -- Render ------------------------------------------------------ */

  if (!scene) return null;

  const line = getSceneText(scene);

  return (
    <div className="fixed inset-0 z-[80] bg-black text-white flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/60">
            Cena {sceneIndex + 1}/{totalScenes}
          </span>
          <span className="text-white/40">·</span>
          <span className="text-white/80 font-mono">
            {formatTime(sceneCountdown)}
          </span>
          <span className="text-white/40">·</span>
          <span className="text-white/40 font-mono text-xs">
            {formatTime(globalElapsed)} / {formatTime(totalDuration)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelp((h) => !h)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bars */}
      <div className="shrink-0">
        {/* Overall progress */}
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${overallProgress * 100}%` }}
          />
        </div>
        {/* Scene progress */}
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-white/30 transition-all duration-1000"
            style={{ width: `${sceneProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Help overlay */}
      {showHelp ? (
        <div className="absolute inset-0 z-10 bg-black/90 flex items-center justify-center p-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 max-w-md space-y-3">
            <h3 className="text-lg font-bold mb-4">Atalhos de teclado</h3>
            {[
              ['Space', 'Play / Pause'],
              ['←  →', 'Cena anterior / próxima'],
              ['+  -', 'Aumentar / diminuir velocidade'],
              ['F', 'Tela cheia'],
              ['?', 'Mostrar / ocultar ajuda'],
              ['Esc', 'Fechar teleprompter'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center gap-3 text-sm">
                <kbd className="px-2 py-0.5 bg-white/10 rounded text-white/80 font-mono text-xs min-w-[60px] text-center">
                  {key}
                </kbd>
                <span className="text-white/60">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex items-center justify-center px-8"
        style={{
          scrollBehavior: isPlaying ? 'auto' : 'smooth',
        }}
      >
        <p
          className="text-center leading-relaxed max-w-2xl whitespace-pre-wrap"
          style={{ fontSize: `${fontSize}px` }}
        >
          {line}
        </p>
      </div>

      {/* Visual notes */}
      {scene.motionNotes ? (
        <div className="px-6 py-1.5 text-center text-xs text-white/30 border-t border-white/5 shrink-0">
          Visual: {scene.motionNotes}
        </div>
      ) : null}

      {/* Control bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-white/10 shrink-0">
        {/* Play / Pause */}
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>

        {/* Speed */}
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-white/40" />
          <input
            type="range"
            min={MIN_WPM}
            max={MAX_WPM}
            step={10}
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="w-24 accent-white/60"
          />
          <span className="text-xs text-white/50 font-mono w-12">
            {wpm} wpm
          </span>
        </div>

        {/* Font size */}
        <div className="flex items-center gap-2">
          <Type className="w-3.5 h-3.5 text-white/40" />
          <input
            type="range"
            min={MIN_FONT}
            max={MAX_FONT}
            step={2}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-20 accent-white/60"
          />
          <span className="text-xs text-white/50 font-mono w-8">
            {fontSize}
          </span>
        </div>

        <div className="flex-1" />

        {/* Scene dots */}
        <div className="flex items-center gap-1">
          {scenes.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToScene(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === sceneIndex ? 'bg-white' : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        <div className="flex-1" />

        {/* Orientation toggle */}
        <button
          type="button"
          onClick={() => setIsLandscape((l) => !l)}
          className={`px-2 py-1 rounded text-[10px] font-mono border ${
            isLandscape
              ? 'border-white/30 text-white/70'
              : 'border-white/10 text-white/30'
          } hover:bg-white/10`}
        >
          {isLandscape ? '16:9' : '9:16'}
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80"
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
