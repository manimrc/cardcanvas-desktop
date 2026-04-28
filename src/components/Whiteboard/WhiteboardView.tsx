'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Check, Loader2 } from 'lucide-react';

// Excalidraw must be loaded client-side only (no SSR)
const ExcalidrawWrapper = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => {
    const { Excalidraw } = mod;

    // eslint-disable-next-line react/display-name
    return function ExcalidrawComponent(props: {
      initialData: { elements: readonly any[]; appState: Record<string, any> } | null;
      onChangeRef: React.MutableRefObject<((elements: readonly any[], appState: Record<string, any>) => void) | null>;
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

export default function WhiteboardView({ isLightMode }: { isLightMode?: boolean }) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [initialData, setInitialData] = useState<{ elements: readonly any[]; appState: Record<string, any> } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef<((elements: readonly any[], appState: Record<string, any>) => void) | null>(null);

  const saveContent = useCallback(async (elements: readonly any[], appState: Record<string, any>) => {
    setSaveStatus('saving');
    try {
      await fetch('/api/whiteboard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: JSON.stringify({ elements, appState: { viewBackgroundColor: appState.viewBackgroundColor } }),
        }),
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save whiteboard:', err);
      setSaveStatus('idle');
    }
  }, []);

  // Set up the onChange handler with debounced save
  useEffect(() => {
    onChangeRef.current = (elements, appState) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void saveContent(elements, appState);
      }, 2000);
    };
  }, [saveContent]);

  // Load whiteboard content on mount
  useEffect(() => {
    if (loaded) return;
    fetch('/api/whiteboard')
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          try {
            const parsed = JSON.parse(data.content);
            if (parsed.elements) {
              setInitialData({
                elements: parsed.elements,
                appState: parsed.appState || {},
              });
            }
          } catch {
            // Content is old HTML format — start fresh
            setInitialData({ elements: [], appState: {} });
          }
        }
        setLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load whiteboard:', err);
        setLoaded(true);
      });
  }, [loaded]);

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
      <div className="whiteboard-save-badge">
        {saveStatus === 'saving' && <><Loader2 size={13} className="whiteboard-spinner" /> Saving…</>}
        {saveStatus === 'saved' && <><Check size={13} /> Saved</>}
      </div>
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
