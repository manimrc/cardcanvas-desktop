'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '@/components/AuthContext';
import type { AppState, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

type WhiteboardScene = ExcalidrawInitialDataState;

interface WhiteboardData {
  elements: string;
  appState: string;
}

// Excalidraw must be loaded client-side only (no SSR)
const ExcalidrawWrapper = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => {
    const { Excalidraw } = mod;

    return function ExcalidrawComponent(props: {
      initialData: WhiteboardScene | null;
      onChangeRef: React.MutableRefObject<((elements: readonly ExcalidrawElement[], appState: AppState) => void) | null>;
      theme: string;
    }) {
      return (
        <Excalidraw
          initialData={props.initialData || undefined}
          onChange={(elements, appState) => {
            props.onChangeRef.current?.(elements, appState);
          }}
          theme={props.theme as 'light' | 'dark'}
          UIOptions={{
            canvasActions: {
              loadScene: false,
            },
          }}
        />
      );
    };
  }),
  { ssr: false, loading: () => <div className="whiteboard-loading">Loading whiteboard…</div> }
);

// Import Excalidraw CSS
import '@excalidraw/excalidraw/index.css';

export default function WhiteboardView({ isLightMode, boardId = 'global' }: { isLightMode?: boolean; boardId?: string }) {
  const { user } = useAuth();
  const [initialData, setInitialData] = useState<WhiteboardScene | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef<((elements: readonly ExcalidrawElement[], appState: AppState) => void) | null>(null);

  const saveContent = useCallback(async (elements: readonly ExcalidrawElement[], appState: AppState) => {
    if (!user) return;
    try {
      await invoke('update_whiteboard', {
        userId: user.id,
        boardId,
        elements: JSON.stringify(elements),
        appState: JSON.stringify({ viewBackgroundColor: appState.viewBackgroundColor }),
      });
    } catch (err) {
      console.error('Failed to save whiteboard:', err);
    }
  }, [user, boardId]);

  // Set up the onChange handler with debounced save
  useEffect(() => {
    onChangeRef.current = (elements, appState) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void saveContent(elements, appState);
      }, 2000);
    };
  }, [saveContent]);

  // Load whiteboard content whenever the active board changes.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoaded(false);
    setInitialData(null);
    
    invoke<WhiteboardData>('get_whiteboard', { userId: user.id, boardId })
      .then(data => {
        if (cancelled) return;
        try {
          const elements = JSON.parse(data.elements || '[]') as readonly ExcalidrawElement[];
          const appState = JSON.parse(data.appState || '{}') as ExcalidrawInitialDataState['appState'];
          setInitialData({ elements, appState });
        } catch {
          setInitialData({ elements: [], appState: {} });
        }
        setLoaded(true);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to load whiteboard:', err);
        setInitialData({ elements: [], appState: {} });
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, boardId]);

  // Keyboard shortcut: Cmd+S
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        // Trigger immediate save by clearing debounce and calling save
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (!loaded) {
    return (
      <div className="whiteboard-view">
        <div className="whiteboard-loading">Loading whiteboard…</div>
      </div>
    );
  }

  return (
    <div className="whiteboard-view">
      <div className="excalidraw-container">
        <ExcalidrawWrapper
          initialData={initialData}
          onChangeRef={onChangeRef}
          theme={isLightMode ? 'light' : 'dark'}
        />
      </div>
    </div>
  );
}
