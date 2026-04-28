'use client';
import type { Card } from '@/types';
import CanvasCard from './CanvasCard';
import ContextMenu from '../ContextMenu';
import { useCallback, useState } from 'react';

interface Props {
  cards: Card[];
  boardNameMap: Record<string, string>;
  onDeleteCard: (id: string) => void;
  onEditCard: (card: Card) => void;
}

export default function TagGridView({ cards, boardNameMap, onDeleteCard, onEditCard }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; cardId?: string } | null>(null);

  const handleCardContextMenu = useCallback((e: React.MouseEvent, cardId: string) => {
    setContextMenu({ x: e.clientX, y: e.clientY, cardId });
  }, []);

  const cardMenuItems = contextMenu?.cardId
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
    : [];

  const noop = () => {};

  return (
    <>
      <div
        className="tag-board-scroll"
        onClick={e => {
          if ((e.target as HTMLElement).closest('.card')) return;
          setSelectedCardId(null);
        }}
      >
        <div className="tag-board-grid">
          {cards.map(card => (
            <div key={card.id} className="tag-board-cell">
              <CanvasCard
                card={card}
                scale={1}
                selected={card.id === selectedCardId}
                onSelect={() => setSelectedCardId(card.id)}
                onDoubleClick={() => onEditCard(card)}
                onMove={noop}
                onDrop={noop}
                onResize={noop}
                onContextMenu={e => handleCardContextMenu(e, card.id)}
                onColorChange={noop}
                readOnly
                uniformGrid
                boardLabel={boardNameMap[card.boardId]}
              />
            </div>
          ))}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={cardMenuItems} onClose={() => setContextMenu(null)} />
      )}
    </>
  );
}
