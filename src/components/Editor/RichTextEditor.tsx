'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Card } from '@/types';
import { CARD_COLORS } from '@/lib/constants';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '@/components/AuthContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Image as ImageIcon, Highlighter, X, Undo, Redo,
  BookOpen, Minimize2, Table as TableIcon
} from 'lucide-react';

interface Props {
  card: Card;
  onSave: (card: Partial<Card>) => void;
  onClose: () => void;
}

export default function RichTextEditor({ card, onSave, onClose }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(card.title);
  const [color, setColor] = useState(card.color);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [url, setUrl] = useState(card.url || '');
  const [tagsInput, setTagsInput] = useState((card.tags || []).join(', '));
  const [isEditing, setIsEditing] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start typing...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true, allowTableNodeSelection: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: card.content || '',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'tiptap' },
    },
  });

  const toggleFocusMode = useCallback(() => {
    if (!focusMode) {
      // Enter focus mode: make editor read-only + browser fullscreen
      editor?.setEditable(false);
      overlayRef.current?.requestFullscreen?.().catch(() => {});
      setFocusMode(true);
    } else {
      // Exit focus mode: restore editing + exit browser fullscreen
      editor?.setEditable(true);
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      setFocusMode(false);
    }
  }, [focusMode, editor]);

  // Sync state when user exits fullscreen via Escape (browser native)
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && focusMode) {
        editor?.setEditable(true);
        setFocusMode(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [focusMode, editor]);

  const handleSave = useCallback(() => {
    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    onSave({
      id: card.id,
      title,
      content: editor?.getHTML() || '',
      color,
      url,
      tags: parsedTags,
    });
    onClose();
  }, [card.id, title, color, url, tagsInput, editor, onSave, onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (focusMode) {
          // Fullscreen exit is handled by fullscreenchange listener
          return;
        }
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleSave, onClose, focusMode]);



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(arrayBuffer));
      
      const newUrl: string = await invoke('upload_media', {
        userId: user.id,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        data
      });
      
      setUrl(newUrl);
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  const submitLink = () => {
    if (urlInput && editor) {
      editor.chain().focus().setLink({ href: urlInput }).run();
    }
    setShowLinkInput(false);
    setUrlInput('');
  };

  const submitImage = () => {
    if (urlInput && editor) {
      editor.chain().focus().setImage({ src: urlInput }).run();
    }
    setShowImageInput(false);
    setUrlInput('');
  };

  const openLinkPrompt = () => {
    setUrlInput('');
    setShowImageInput(false);
    setShowLinkInput(true);
  };

  const openImagePrompt = () => {
    setUrlInput('');
    setShowLinkInput(false);
    setShowImageInput(true);
  };

  if (!editor) return null;



  // ---- Focus / Zen reading mode ----
  if (focusMode) {
    return (
      <div ref={overlayRef} className="focus-mode-overlay">
        <div className="focus-mode-container">
          <div className="focus-mode-header">
            <h1 className="focus-mode-title">{title || 'Untitled'}</h1>
            <button
              type="button"
              className="focus-mode-exit-btn"
              onClick={toggleFocusMode}
              title="Exit focus mode"
            >
              <Minimize2 size={18} />
            </button>
          </div>
          <div className="focus-mode-content">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    );
  }

  // ---- Immersive Fullscreen Media Viewer ----
  if ((card.type === 'image' || card.type === 'pdf') && url) {
    return (
      <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.9)', zIndex: 100000 }} onClick={onClose}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 100001 }}
        >
          <X size={24} />
        </button>
        <div style={{ width: '90vw', height: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
          {card.type === 'pdf' ? (
            <iframe src={`${url}#view=FitH&pagemode=thumbs`} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff' }} title={title} />
          ) : (
            <img src={url} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={overlayRef} className="modal-overlay" onClick={onClose}>
      <div className="editor-modal" onClick={e => e.stopPropagation()}>
        <div className="editor-modal-header">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Card title..."
          />
          <div className="editor-top-actions">
            <div className="editor-top-color-picker">
              {CARD_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  className={`editor-top-color-dot${color === c.value ? ' active' : ''}`}
                  style={{ background: c.value }}
                  onClick={() => setColor(c.value)}
                  title={c.name}
                />
              ))}
            </div>
            <button className="editor-top-action-btn" onClick={handleSave}>Save Changes</button>
            <button
              className="editor-top-action-btn focus-mode-btn"
              onClick={toggleFocusMode}
              title="Focus mode — distraction-free reading (hides browser UI)"
            >
              <BookOpen size={14} /> Focus
            </button>
            <button className="editor-close-btn" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {isEditing && card.type !== 'richtext' && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {card.type === 'image' ? 'IMAGE URL' : card.type === 'pdf' ? 'PDF URL' : card.type === 'link' ? 'LINK URL' : 'SOURCE URL'}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="inline-input"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder={`https://... or upload a file`}
              />
              {(card.type === 'image' || card.type === 'pdf') && (
                <label className="editor-save-btn" style={{ cursor: 'pointer', padding: '6px 12px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}>
                  Upload
                  <input type="file" style={{ display: 'none' }} accept={card.type === 'image' ? 'image/*' : 'application/pdf'} onChange={handleFileUpload} />
                </label>
              )}
            </div>
          </div>
        )}

        {isEditing && (
          <div style={{ padding: '0 20px 12px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>TAGS (COMMA SEPARATED)</label>
            <input
              className="inline-input"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="e.g. urgent, research, draft"
            />
          </div>
        )}

        {isEditing && (
          <div className="editor-toolbar">
            <button className={`editor-toolbar-btn${editor.isActive('bold') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></button>
            <button className={`editor-toolbar-btn${editor.isActive('italic') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></button>
            <button className={`editor-toolbar-btn${editor.isActive('underline') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></button>
            <button className={`editor-toolbar-btn${editor.isActive('strike') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></button>
            <button className={`editor-toolbar-btn${editor.isActive('highlight') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={15} /></button>
            <div className="editor-toolbar-divider" />
            <button className={`editor-toolbar-btn${editor.isActive('heading', { level: 1 }) ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={15} /></button>
            <button className={`editor-toolbar-btn${editor.isActive('heading', { level: 2 }) ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></button>
            <button className={`editor-toolbar-btn${editor.isActive('heading', { level: 3 }) ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></button>
            <div className="editor-toolbar-divider" />
            <button className={`editor-toolbar-btn${editor.isActive('bulletList') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></button>
            <button className={`editor-toolbar-btn${editor.isActive('orderedList') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></button>
            <button className={`editor-toolbar-btn${editor.isActive('blockquote') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></button>
            <button className={`editor-toolbar-btn${editor.isActive('codeBlock') ? ' active' : ''}`} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code size={15} /></button>
            <div className="editor-toolbar-divider" />
            <button className={`editor-toolbar-btn${editor.isActive('link') ? ' active' : ''}`} onClick={openLinkPrompt}><LinkIcon size={15} /></button>
            <button className="editor-toolbar-btn" onClick={openImagePrompt}><ImageIcon size={15} /></button>
            <button className="editor-toolbar-btn" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table"><TableIcon size={15} /></button>
            <div className="editor-toolbar-divider" />
            <button className={`editor-toolbar-btn${editor.isActive({ textAlign: 'left' }) ? ' active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={15} /></button>
            <button className={`editor-toolbar-btn${editor.isActive({ textAlign: 'center' }) ? ' active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={15} /></button>
            <button className={`editor-toolbar-btn${editor.isActive({ textAlign: 'right' }) ? ' active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={15} /></button>
            <div className="editor-toolbar-divider" />
            <button className="editor-toolbar-btn" onClick={() => editor.chain().focus().undo().run()}><Undo size={15} /></button>
            <button className="editor-toolbar-btn" onClick={() => editor.chain().focus().redo().run()}><Redo size={15} /></button>
          </div>
        )}

        {isEditing && showLinkInput && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <input className="inline-input" placeholder="Enter URL..." value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitLink()} autoFocus />
            <button className="editor-save-btn" onClick={submitLink} style={{ padding: '4px 12px' }}>Apply</button>
            <button className="editor-close-btn" onClick={() => setShowLinkInput(false)}><X size={14}/></button>
          </div>
        )}
        {isEditing && showImageInput && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <input className="inline-input" placeholder="Enter image URL..." value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitImage()} autoFocus />
            <button className="editor-save-btn" onClick={submitImage} style={{ padding: '4px 12px' }}>Apply</button>
            <button className="editor-close-btn" onClick={() => setShowImageInput(false)}><X size={14}/></button>
          </div>
        )}

        <div className="editor-content" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <EditorContent editor={editor} />
        </div>

      </div>
    </div>
  );
}
