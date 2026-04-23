export type CardType = 'richtext' | 'link' | 'image' | 'pdf' | 'article';

export interface Card {
  id: string;
  boardId: string;
  type: CardType;
  title: string;
  content: string;       // Rich text HTML content
  url?: string;
  tags?: string[];
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  folderId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FolderTreeItem extends Folder {
  children: FolderTreeItem[];
  boards: Board[];
}

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}
