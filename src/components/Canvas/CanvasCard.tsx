'use client';
import { Card as CardType } from '@/types';
import { useRef, useState, useCallback } from 'react';
import { Maximize2, MoreHorizontal } from 'lucide-react';

const TYPE_EMOJI: Record<string, string> = {
  richtext: '📝', link: '🔗', image: '🖼️', pdf: '📄', article: '📰',
};

const CARD_COLORS = [
  { name: 'Yellow', value: '#FFF9C4' },
  { name: 'Blue', value: '#BBDEFB' },
  { name: 'Green', value: '#C8E6C9' },
  { name: 'Pink', value: '#F8BBD0' },
  { name: 'Purple', value: '#E1BEE7' },
  { name: 'Orange', value: '#FFE0B2' },
  { name: 'White', value: '#FFFFFF' },
];

interface Props {
  card: CardType;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onDrop: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onColorChange: (id: string, color: string) => void;
  readOnly?: boolean;
  boardLabel?: string;
  /** Fill a CSS grid cell (tags mode); ignores canvas x/y/width/height */
  uniformGrid?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function CanvasCard({
  card,
  scale,
  selected,
  onSelect,
  onDoubleClick,
  onMove,
  onDrop,
  onResize,
  onContextMenu,
  onColorChange,
  readOnly = false,
  boardLabel,
  uniformGrid = false,
  scrollContainerRef,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) {
      e.stopPropagation();
      onSelect();
      return;
    }
    if (
      (e.target as HTMLElement).closest('.card-menu-btn') ||
      (e.target as HTMLElement).closest('.card-resize-handle') ||
      (e.target as HTMLElement).closest('.card-color-strip')
    ) return;
    e.stopPropagation();
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = card.x;
    const origY = card.y;
    const container = scrollContainerRef?.current;
    const origScrollLeft = container?.scrollLeft || 0;
    const origScrollTop = container?.scrollTop || 0;
    let lastClientX = e.clientX;
    let lastClientY = e.clientY;
    let animFrameId: number | null = null;
    let hasMoved = false;

    setDragging(true);

    const EDGE_ZONE = 60;
    const SPEED_FAST = 12;
    const SPEED_SLOW = 4;
    const snap = (v: number) => Math.round(v / 30) * 30;

    const getCardPos = () => {
      const dx = (lastClientX - startX) / scale;
      const dy = (lastClientY - startY) / scale;
      const scrollDx = (container?.scrollLeft || 0) - origScrollLeft;
      const scrollDy = (container?.scrollTop || 0) - origScrollTop;
      return {
        x: snap(origX + dx + scrollDx),
        y: snap(origY + dy + scrollDy),
      };
    };

    const autoScrollTick = () => {
      if (!container) { animFrameId = requestAnimationFrame(autoScrollTick); return; }
      const rect = container.getBoundingClientRect();
      let velX = 0, velY = 0;

      if (lastClientX > rect.right - EDGE_ZONE) {
        velX = lastClientX > rect.right - 30 ? SPEED_FAST : SPEED_SLOW;
      } else if (lastClientX < rect.left + EDGE_ZONE) {
        velX = lastClientX < rect.left + 30 ? -SPEED_FAST : -SPEED_SLOW;
      }
      if (lastClientY > rect.bottom - EDGE_ZONE) {
        velY = lastClientY > rect.bottom - 30 ? SPEED_FAST : SPEED_SLOW;
      } else if (lastClientY < rect.top + EDGE_ZONE) {
        velY = lastClientY < rect.top + 30 ? -SPEED_FAST : -SPEED_SLOW;
      }

      if (velX !== 0 || velY !== 0) {
        container.scrollLeft += velX;
        container.scrollTop += velY;
        const pos = getCardPos();
        onMove(card.id, pos.x, pos.y);
      }
      animFrameId = requestAnimationFrame(autoScrollTick);
    };

    animFrameId = requestAnimationFrame(autoScrollTick);

    const handleMove = (ev: MouseEvent) => {
      hasMoved = true;
      lastClientX = ev.clientX;
      lastClientY = ev.clientY;
      const pos = getCardPos();
      onMove(card.id, pos.x, pos.y);
    };

    const handleUp = () => {
      setDragging(false);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (hasMoved) {
        const pos = getCardPos();
        onDrop(card.id, pos.x, pos.y);
      }
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [card.id, card.x, card.y, scale, onMove, onDrop, onSelect, readOnly, scrollContainerRef]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = card.width;
    const origH = card.height;

    const handleMove = (ev: MouseEvent) => {
      const dw = (ev.clientX - startX) / scale;
      const dh = (ev.clientY - startY) / scale;
      const snap = (v: number) => Math.round(v / 30) * 30;
      onResize(card.id, Math.max(180, snap(origW + dw)), Math.max(120, snap(origH + dh)));
    };
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [card.id, card.width, card.height, scale, onResize]);

  const renderBody = () => {
    switch (card.type) {
      case 'link':
        return (
          <div className="card-link-preview">
            <div className="card-body" dangerouslySetInnerHTML={{ __html: card.content || '<p>Link card</p>' }} />
            {card.url && <div className="card-link-url">🔗 {card.url}</div>}
          </div>
        );
      case 'image':
        return (
          <div className="card-image-container">
            {card.url ? <img src={card.url} alt={card.title} /> : <div className="card-body" dangerouslySetInnerHTML={{ __html: card.content }} />}
          </div>
        );
      case 'pdf':
        return (
          <div className="card-pdf-container" style={{ padding: 0, overflow: 'hidden' }}>
            {card.url ? (
              <iframe
                src={`${card.url}#toolbar=0&navpanes=0&scrollbar=0`}
                style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                title={card.title}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                <div className="card-pdf-icon">📄</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>{card.title || 'PDF Document'}</div>
              </div>
            )}
          </div>
        );
      case 'article':
        return <div className="card-body" dangerouslySetInnerHTML={{ __html: card.content }} />;
      default:
        return <div className="card-body" dangerouslySetInnerHTML={{ __html: card.content }} />;
    }
  };

  const posStyle = uniformGrid
    ? {
        position: 'relative' as const,
        left: 'auto',
        top: 'auto',
        width: '100%',
        height: '100%',
        zIndex: card.zIndex,
        minHeight: 0,
        backgroundColor: card.color,
      }
    : {
        left: card.x,
        top: card.y,
        width: card.width,
        height: card.height,
        zIndex: card.zIndex,
        backgroundColor: card.color,
      };

  return (
    <div
      ref={cardRef}
      className={`card${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}${readOnly ? ' card-readonly' : ''}${uniformGrid ? ' card-uniform-grid' : ''}`}
      data-type={card.type}
      style={posStyle}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e); }}
    >
      <div className="card-header">
        <span className="card-type-icon">{TYPE_EMOJI[card.type] || '📝'}</span>
        <span className="card-title">{card.title || 'Untitled'}</span>
        <button className="card-menu-btn" onClick={(e) => { e.stopPropagation(); onDoubleClick(); }} title="Expand/Edit">
          <Maximize2 size={14} />
        </button>
        <button className="card-menu-btn" onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}>
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Quick color palette — visible on card hover */}
      {!readOnly && (
        <div className="card-color-strip">
          {CARD_COLORS.map(c => (
            <button
              key={c.value}
              className={`card-color-dot${card.color === c.value ? ' active' : ''}`}
              style={{ background: c.value }}
              onClick={(e) => { e.stopPropagation(); onColorChange(card.id, c.value); }}
              title={c.name}
            />
          ))}
        </div>
      )}

      {renderBody()}
      {boardLabel ? <div className="card-board-foot">{boardLabel}</div> : null}
      {!readOnly ? (
        <div className="card-resize-handle" onMouseDown={handleResizeMouseDown}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M14 14L8 14L14 8Z" fill="rgba(0,0,0,0.2)" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}
