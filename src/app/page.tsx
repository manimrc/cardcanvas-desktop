'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, Board, Folder } from '@/types';
import Sidebar, { type SidebarView } from '@/components/Sidebar/Sidebar';
import Toolbar from '@/components/Toolbar/Toolbar';
import InfiniteCanvas, { type InfiniteCanvasHandle } from '@/components/Canvas/InfiniteCanvas';
import TagGridView from '@/components/Canvas/TagGridView';
import RichTextEditor from '@/components/Editor/RichTextEditor';
import PDFViewer from '@/components/PDFViewer';
import AddMediaModal from '@/components/AddMediaModal';
import WhiteboardView from '@/components/Whiteboard/WhiteboardView';
import { collectGlobalTagEntries, cardMatchesSelectedTags } from '@/lib/hashtags';
import { inferMediaType } from '@/lib/mediaType';
import { findNonOverlappingPosition } from '@/lib/collision';

export default function Home() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>('workspaces');
  const [selectedTagKeys, setSelectedTagKeys] = useState<string[]>([]);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [pdfCard, setPdfCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const workspaceScrollRef = useRef<Record<string, { left: number; top: number }>>({});
  const workspaceCanvasRef = useRef<InfiniteCanvasHandle>(null);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

  const fetchAllCards = useCallback(async () => {
    try {
      const res = await fetch('/api/cards?all=1');
      const data = await res.json();
      setAllCards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch all cards:', err);
    }
  }, []);

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch('/api/folders');
      const data = await res.json();
      setFolders(data.folders || []);
      setBoards(data.boards || []);
      if (!activeBoardId && data.boards?.length > 0) {
        setActiveBoardId(data.boards[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch tree:', err);
    }
    setLoading(false);
  }, [activeBoardId]);

  const fetchCards = useCallback(async () => {
    if (!activeBoardId) {
      setCards([]);
      return;
    }
    try {
      const res = await fetch(`/api/cards?boardId=${activeBoardId}`);
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
      const board = boards.find(b => b.id === activeBoardId);
      setActiveBoard(board || null);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    }
  }, [activeBoardId, boards]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);
  useEffect(() => {
    fetchCards();
  }, [fetchCards]);
  useEffect(() => {
    void fetchAllCards();
  }, [fetchAllCards]);
  useEffect(() => {
    if (sidebarView === 'tags') void fetchAllCards();
  }, [sidebarView, fetchAllCards]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  }, []);

  const globalTagEntries = useMemo(() => collectGlobalTagEntries(allCards), [allCards]);

  const boardNameMap = useMemo(() => Object.fromEntries(boards.map(b => [b.id, b.name])), [boards]);

  const getWorkspaceScroll = useCallback(
    (id: string) => workspaceScrollRef.current[id],
    []
  );

  const persistWorkspaceScroll = useCallback((id: string, left: number, top: number) => {
    workspaceScrollRef.current[id] = { left, top };
  }, []);

  const matchesSearch = useCallback(
    (c: Card) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.title || '').toLowerCase().includes(q) || (c.content || '').toLowerCase().includes(q)
      );
    },
    [searchQuery]
  );

  const filteredWorkspaceCards = useMemo(
    () => cards.filter(c => matchesSearch(c)),
    [cards, matchesSearch]
  );

  const filteredTagCards = useMemo(
    () => allCards.filter(c => matchesSearch(c) && cardMatchesSelectedTags(c, selectedTagKeys)),
    [allCards, matchesSearch, selectedTagKeys]
  );

  /** Get a position in the top-left of the visible viewport, collision-free */
  const getViewportSpot = useCallback((width = 280, height = 200) => {
    const vp = workspaceCanvasRef.current?.getViewportPosition();
    const baseX = vp?.x ?? 120;
    const baseY = vp?.y ?? 120;
    const snap = (v: number) => Math.round(v / 30) * 30;
    const pos = findNonOverlappingPosition('__new__', snap(baseX), snap(baseY), width, height, cards);
    return pos;
  }, [cards]);

  const toggleTagKey = useCallback((key: string) => {
    setSelectedTagKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  const createCard = useCallback(async (type: string, x: number, y: number, url?: string) => {
    if (!activeBoardId) return;
    const snap = (v: number) => Math.round(v / 30) * 30;
    const snappedX = snap(x);
    const snappedY = snap(y);

    const defaults: Record<string, Partial<Card>> = {
      richtext: { title: 'New Note', content: '<p>Start typing...</p>', color: '#FFF9C4' },
      link: { title: 'New Link', content: '<p>Paste a URL here</p>', color: '#BBDEFB' },
      image: { title: 'New Image', content: '<p>Add an image URL</p>', color: '#C8E6C9' },
      pdf: { title: 'PDF Document', content: '', color: '#FFE0B2' },
      article: { title: 'Clipped Article', content: '<p>Paste article content...</p>', color: '#E1BEE7' },
    };
    const d = defaults[type] || defaults.richtext;
    if (url) d.url = url;

    // Resolve collisions for the new card
    const w = d.width ?? 280;
    const h = d.height ?? 200;
    const resolved = findNonOverlappingPosition('__new__', snappedX, snappedY, w, h, cards);

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: activeBoardId, type, x: resolved.x, y: resolved.y, ...d }),
      });
      const card = await res.json();
      setCards(prev => [...prev, card]);
      setAllCards(prev => [...prev, card]);
    } catch (err) {
      console.error('Failed to create card:', err);
    }
  }, [activeBoardId, cards]);

  const updateCard = useCallback(async (update: Partial<Card>) => {
    setCards(prev => prev.map(c => (c.id === update.id ? { ...c, ...update } : c)));
    setAllCards(prev => prev.map(c => (c.id === update.id ? { ...c, ...update } : c)));
    try {
      await fetch('/api/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
    } catch (err) {
      console.error('Failed to update card:', err);
    }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    setAllCards(prev => prev.filter(c => c.id !== id));
    try {
      await fetch(`/api/cards?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  }, []);

  const createFolder = useCallback(async (parentId: string | null) => {
    try {
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, name: 'New Folder' }),
      });
      fetchTree();
    } catch (err) {
      console.error(err);
    }
  }, [fetchTree]);

  const deleteFolder = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/folders?id=${id}`, { method: 'DELETE' });
        fetchTree();
      } catch (err) {
        console.error(err);
      }
    },
    [fetchTree]
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      try {
        await fetch('/api/folders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, name }),
        });
        fetchTree();
      } catch (err) {
        console.error(err);
      }
    },
    [fetchTree]
  );

  const createBoard = useCallback(
    async (folderId: string) => {
      try {
        const res = await fetch('/api/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId, name: 'Untitled Board' }),
        });
        const board = await res.json();
        await fetchTree();
        setActiveBoardId(board.id);
      } catch (err) {
        console.error(err);
      }
    },
    [fetchTree]
  );

  const deleteBoard = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/boards?id=${id}`, { method: 'DELETE' });
        if (activeBoardId === id) setActiveBoardId(null);
        fetchTree();
        void fetchAllCards();
      } catch (err) {
        console.error(err);
      }
    },
    [activeBoardId, fetchTree, fetchAllCards]
  );

  const renameBoard = useCallback(
    async (id: string, name: string) => {
      try {
        await fetch('/api/boards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, name }),
        });
        fetchTree();
      } catch (err) {
        console.error(err);
      }
    },
    [fetchTree]
  );

  const handleBoardNameChange = useCallback(
    (name: string) => {
      if (activeBoardId) {
        setActiveBoard(prev => (prev ? { ...prev, name } : null));
        renameBoard(activeBoardId, name);
      }
    },
    [activeBoardId, renameBoard]
  );

  const exportBoardPng = useCallback(async () => {
    if (!activeBoardId) return;
    const host = workspaceCanvasRef.current?.getScrollContainer();
    if (!host) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(host, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor:
          getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#0f0f13',
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      const safe = (activeBoard?.name || 'board').replace(/[^\w\-]+/g, '_').slice(0, 60);
      a.download = `${safe || 'board'}.png`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [activeBoardId, activeBoard?.name]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Loading CardCanvas...</div>
        </div>
      </div>
    );
  }

  const isWhiteboard = sidebarView === 'whiteboard';
  const tagsToolbar = sidebarView === 'tags';

  return (
    <div className="app-layout">
      {!sidebarCollapsed && (
        <div className="sidebar-overlay" onClick={() => setSidebarCollapsed(true)} />
      )}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        view={sidebarView}
        onViewChange={setSidebarView}
        folders={folders}
        boards={boards}
        activeBoardId={activeBoardId}
        onSelectBoard={id => {
          setActiveBoardId(id);
          setSidebarView('workspaces');
        }}
        onCreateFolder={createFolder}
        onCreateBoard={createBoard}
        onDeleteFolder={deleteFolder}
        onDeleteBoard={deleteBoard}
        onRenameFolder={renameFolder}
        onRenameBoard={renameBoard}
        globalTagEntries={globalTagEntries}
        selectedTagKeys={selectedTagKeys}
        onToggleTagKey={toggleTagKey}
        onClearTagSelection={() => setSelectedTagKeys([])}
      />

      <div className="main-area">
        {!isWhiteboard && (
          <Toolbar
            mode={tagsToolbar ? 'tags' : 'workspace'}
            boardName={activeBoard?.name || ''}
            onBoardNameChange={handleBoardNameChange}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            onAddCard={type => {
              if (type === 'richtext') {
                const pos = getViewportSpot();
                createCard(type, pos.x, pos.y);
              } else {
                setMediaModalOpen(true);
              }
            }}
            onExport={tagsToolbar ? undefined : exportBoardPng}
            isLightMode={isLightMode}
            onToggleTheme={() => setIsLightMode(!isLightMode)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {isWhiteboard ? (
          <WhiteboardView isLightMode={isLightMode} />
        ) : sidebarView === 'tags' ? (
          <TagGridView
            cards={filteredTagCards}
            boardNameMap={boardNameMap}
            onDeleteCard={deleteCard}
            onEditCard={card => setEditingCard(card)}
          />
        ) : activeBoardId ? (
          <InfiniteCanvas
            ref={workspaceCanvasRef}
            cards={filteredWorkspaceCards}
            boardId={activeBoardId}
            getRestoredScroll={getWorkspaceScroll}
            onPersistScroll={persistWorkspaceScroll}
            onUpdateCard={updateCard}
            onCreateCard={createCard}
            onDeleteCard={deleteCard}
            onEditCard={card => setEditingCard(card)}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 48 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Select or create a board to get started</div>
          </div>
        )}
      </div>

      {editingCard && (
        <RichTextEditor card={editingCard} onSave={updateCard} onClose={() => setEditingCard(null)} />
      )}

      {pdfCard && pdfCard.url && (
        <PDFViewer url={pdfCard.url} title={pdfCard.title} onClose={() => setPdfCard(null)} />
      )}

      <AddMediaModal
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onConfirm={(u, mime) => {
          const pos = getViewportSpot();
          createCard(inferMediaType(u, mime), pos.x, pos.y, u);
        }}
      />
    </div>
  );
}
