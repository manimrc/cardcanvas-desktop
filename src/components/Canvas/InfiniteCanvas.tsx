'use client';
import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Card } from '@/types';
import CanvasCard from './CanvasCard';
import ContextMenu from '../ContextMenu';
import { findNonOverlappingPosition } from '@/lib/collision';

export type InfiniteCanvasHandle = {
  getScrollContainer: () => HTMLDivElement | null;
  getViewportPosition: () => { x: number; y: number };
};

interface Props {
  cards: Card[];
  boardId: string;
  onUpdateCard: (card: Partial<Card>) => void;
  onCreateCard: (type: string, x: number, y: number) => void;
  onDeleteCard: (id: string) => void;
  onEditCard: (card: Card) => void;
  readOnly?: boolean;
  canvasInnerWidth?: number;
  canvasInnerHeight?: number;
  boardNameMap?: Record<string, string>;
  getRestoredScroll?: (boardId: string) => { left: number; top: number } | undefined;
  onPersistScroll?: (boardId: string, left: number, top: number) => void;
}

const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, Props>(function InfiniteCanvas(
  {
    cards,
    boardId,
    onUpdateCard,
    onCreateCard,
    onDeleteCard,
    onEditCard,
    readOnly = false,
    canvasInnerWidth,
    canvasInnerHeight,
    boardNameMap,
    getRestoredScroll,
    onPersistScroll,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; cardId?: string } | null>(null);

  useImperativeHandle(ref, () => ({
    getScrollContainer: () => containerRef.current,
    getViewportPosition: () => {
      const el = containerRef.current;
      if (!el) return { x: 40, y: 40 };
      return {
        x: el.scrollLeft + 40,
        y: el.scrollTop + 40,
      };
    },
  }));

  const innerW = canvasInnerWidth ?? '150vw';
  const innerH = canvasInnerHeight ?? '300vh';

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !boardId) return;
    const saved = getRestoredScroll?.(boardId);
    el.scrollLeft = saved?.left ?? 0;
    el.scrollTop = saved?.top ?? 0;
  }, [boardId, getRestoredScroll]);

  useEffect(() => {
    const id = boardId;
    return () => {
      const el = containerRef.current;
      if (el && id && onPersistScroll) {
        onPersistScroll(id, el.scrollLeft, el.scrollTop);
      }
    };
  }, [boardId, onPersistScroll]);

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (readOnly) return;
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [readOnly]
  );

  const handleCardContextMenu = useCallback((e: React.MouseEvent, cardId: string) => {
    setContextMenu({ x: e.clientX, y: e.clientY, cardId });
  }, []);

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: screenX - rect.left + (containerRef.current?.scrollLeft || 0),
      y: screenY - rect.top + (containerRef.current?.scrollTop || 0),
    };
  }, []);

  /** During drag — no collision, just move */
  const handleMove = useCallback(
    (id: string, x: number, y: number) => {
      if (readOnly) return;
      onUpdateCard({ id, x, y });
    },
    [onUpdateCard, readOnly]
  );

  /** On drop — resolve collisions */
  const handleDrop = useCallback(
    (id: string, x: number, y: number) => {
      if (readOnly) return;
      const card = cards.find(c => c.id === id);
      if (!card) { onUpdateCard({ id, x, y }); return; }
      const resolved = findNonOverlappingPosition(id, x, y, card.width, card.height, cards);
      onUpdateCard({ id, x: resolved.x, y: resolved.y });
    },
    [onUpdateCard, readOnly, cards]
  );

  const handleColorChange = useCallback(
    (id: string, color: string) => {
      onUpdateCard({ id, color });
    },
    [onUpdateCard]
  );

  const handleResize = useCallback(
    (id: string, width: number, height: number) => {
      if (readOnly) return;
      onUpdateCard({ id, width, height });
    },
    [onUpdateCard, readOnly]
  );

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return;
      const target = e.target as HTMLElement;
      if (
        target !== containerRef.current &&
        !target.classList.contains('canvas-inner') &&
        !target.classList.contains('canvas-grid')
      ) {
        return;
      }
      const pos = screenToCanvas(e.clientX, e.clientY);
      onCreateCard('richtext', pos.x, pos.y);
    },
    [onCreateCard, readOnly, screenToCanvas]
  );

  const canvasMenuItems =
    contextMenu && !contextMenu.cardId && !readOnly
      ? [
          {
            label: 'New Rich Text Card',
            icon: '📝',
            onClick: () => {
              const p = screenToCanvas(contextMenu.x, contextMenu.y);
              onCreateCard('richtext', p.x, p.y);
            },
          },
          {
            label: 'New Link Card',
            icon: '🔗',
            onClick: () => {
              const p = screenToCanvas(contextMenu.x, contextMenu.y);
              onCreateCard('link', p.x, p.y);
            },
          },
          {
            label: 'New Image Card',
            icon: '🖼️',
            onClick: () => {
              const p = screenToCanvas(contextMenu.x, contextMenu.y);
              onCreateCard('image', p.x, p.y);
            },
          },
          {
            label: 'New PDF Card',
            icon: '📄',
            onClick: () => {
              const p = screenToCanvas(contextMenu.x, contextMenu.y);
              onCreateCard('pdf', p.x, p.y);
            },
          },
          {
            label: 'New Article Card',
            icon: '📰',
            onClick: () => {
              const p = screenToCanvas(contextMenu.x, contextMenu.y);
              onCreateCard('article', p.x, p.y);
            },
          },
        ]
      : [];

  const maxZ = useMemo(() => cards.length ? Math.max(...cards.map(c => c.zIndex)) : 0, [cards]);

  const cardMenuItems = contextMenu?.cardId
    ? readOnly
      ? [
          {
            label: 'Edit Card',
            icon: '✏️',
            onClick: () => {
              const c = cards.find(x => x.id === contextMenu.cardId);
              if (c) onEditCard(c);
            },
          },
          { divider: true, label: '', onClick: () => {} },
          {
            label: 'Delete Card',
            icon: '🗑️',
            danger: true,
            onClick: () => {
              if (contextMenu.cardId) onDeleteCard(contextMenu.cardId);
            },
          },
        ]
      : [
          {
            label: 'Edit Card',
            icon: '✏️',
            onClick: () => {
              const c = cards.find(x => x.id === contextMenu.cardId);
              if (c) onEditCard(c);
            },
          },
          {
            label: 'Bring to Front',
            icon: '⬆️',
            onClick: () => {
              onUpdateCard({ id: contextMenu.cardId!, zIndex: maxZ + 1 });
            },
          },
          {
            label: 'Send to Back',
            icon: '⬇️',
            onClick: () => {
              onUpdateCard({ id: contextMenu.cardId!, zIndex: 0 });
            },
          },
          { divider: true, label: '', onClick: () => {} },
          {
            label: 'Delete Card',
            icon: '🗑️',
            danger: true,
            onClick: () => {
              if (contextMenu.cardId) onDeleteCard(contextMenu.cardId);
            },
          },
        ]
    : [];

  return (
    <>
      <div
        ref={containerRef}
        className="canvas-container"
        style={{ overflow: 'auto', position: 'relative', flex: 1, backgroundColor: 'var(--bg-primary)' }}
        onContextMenu={handleCanvasContextMenu}
        onDoubleClick={handleCanvasDoubleClick}
        onClick={e => {
          const target = e.target as HTMLElement;
          if (
            target === containerRef.current ||
            target.classList.contains('canvas-inner') ||
            target.classList.contains('canvas-grid')
          ) {
            setSelectedCardId(null);
          }
        }}
      >
        <div
          className="canvas-inner"
          style={{
            width: typeof innerW === 'number' ? `${innerW}px` : innerW,
            height: typeof innerH === 'number' ? `${innerH}px` : innerH,
            position: 'relative',
          }}
        >
          <div
            className="canvas-grid"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          />
          {cards.map(card => (
            <CanvasCard
              key={card.id}
              card={card}
              scale={1}
              selected={card.id === selectedCardId}
              onSelect={() => setSelectedCardId(card.id)}
              onDoubleClick={() => onEditCard(card)}
              onMove={handleMove}
              onDrop={handleDrop}
              onResize={handleResize}
              onContextMenu={e => handleCardContextMenu(e, card.id)}
              onColorChange={handleColorChange}
              readOnly={readOnly}
              boardLabel={boardNameMap?.[card.boardId]}
              scrollContainerRef={containerRef}
            />
          ))}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.cardId ? cardMenuItems : canvasMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
});

export default InfiniteCanvas;
