'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Card } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Image as ImageIcon, Highlighter, X, Undo, Redo
} from 'lucide-react';

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
  card: Card;
  onSave: (card: Partial<Card>) => void;
  onClose: () => void;
}

export default function RichTextEditor({ card, onSave, onClose }: Props) {
  const [title, setTitle] = useState(card.title);
  const [color, setColor] = useState(card.color);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [url, setUrl] = useState(card.url || '');
  const [tagsInput, setTagsInput] = useState((card.tags || []).join(', '));
  const [isEditing, setIsEditing] = useState(!card.url && (card.type === 'pdf' || card.type === 'image'));

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start typing...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: card.content || '',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'tiptap' },
    },
  });

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
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleSave, onClose]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [isEditing, editor]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cardId', card.id);
    
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.id) {
        setUrl(`/api/upload?id=${data.id}`);
      }
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

  if (!isEditing && (card.type === 'pdf' || card.type === 'image') && url) {
    const textContent = editor?.getText().trim() || '';
    return (
      <div className="modal-overlay" onClick={onClose} style={{ padding: 0 }}>
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: 16, right: 16, zIndex: 100, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.7 }}
          >
            <X size={20} />
          </button>
          
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {card.type === 'pdf' ? (
              <iframe src={`${url}#toolbar=0`} style={{ width: '100%', height: '100%', border: 'none' }} title={title} />
            ) : (
              <img src={url} alt={title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            )}
          </div>

          {textContent && (
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 16px', borderRadius: 8, maxWidth: '80%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 14 }}>
              {textContent}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="editor-modal" onClick={e => e.stopPropagation()}>
        <div className="editor-modal-header">
          {isEditing ? (
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Card title..."
            />
          ) : (
            <div style={{ flex: 1, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title || 'Untitled'}
            </div>
          )}
          <div className="editor-top-actions">
            {isEditing ? (
              <>
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
              </>
            ) : (
              <button className="editor-top-action-btn" onClick={() => setIsEditing(true)}>Edit Card</button>
            )}
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
