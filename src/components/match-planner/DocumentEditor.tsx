'use client';

import { useEffect, useRef } from 'react';
import {
  EditorContent,
  useEditor,
  type Editor,
  type JSONContent,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import FileHandler from '@tiptap/extension-file-handler';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { Placeholder } from '@tiptap/extensions';
import { EditorToolbar } from './EditorToolbar';

const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

interface DocumentEditorProps {
  documentId: string;
  initialContent: JSONContent | null;
  onEditorReady: (editor: Editor | null) => void;
  onUpdate: () => void;
  onFocusChange: (focused: boolean) => void;
}

function isTiptapDoc(content: unknown): content is JSONContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    (content as JSONContent).type === 'doc'
  );
}

function findImageBySrc(
  editor: Editor,
  src: string
): { pos: number; nodeSize: number } | null {
  let found: { pos: number; nodeSize: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === 'image' && node.attrs.src === src) {
      found = { pos, nodeSize: node.nodeSize };
      return false;
    }
    return true;
  });
  return found;
}

function replaceImageSrc(editor: Editor, fromSrc: string, toSrc: string) {
  const found = findImageBySrc(editor, fromSrc);
  if (!found) return;
  const node = editor.state.doc.nodeAt(found.pos);
  if (!node) return;
  const tr = editor.state.tr.setNodeMarkup(found.pos, undefined, {
    ...node.attrs,
    src: toSrc,
    alt: null,
  });
  editor.view.dispatch(tr);
}

function removeImage(editor: Editor, src: string) {
  const found = findImageBySrc(editor, src);
  if (!found) return;
  const tr = editor.state.tr.delete(found.pos, found.pos + found.nodeSize);
  editor.view.dispatch(tr);
}

async function uploadImage(
  editor: Editor,
  documentId: string,
  file: File,
  pos: number
) {
  const objectUrl = URL.createObjectURL(file);

  editor
    .chain()
    .insertContentAt(pos, {
      type: 'image',
      attrs: { src: objectUrl, alt: 'Uploading…' },
    })
    .focus()
    .run();

  try {
    const response = await fetch(
      `/api/upload?documentId=${encodeURIComponent(documentId)}`,
      {
        method: 'POST',
        headers: { 'content-type': file.type },
        body: file,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const { url } = (await response.json()) as { url: string };
    replaceImageSrc(editor, objectUrl, url);
  } catch (error) {
    console.error('Failed to upload image:', error);
    removeImage(editor, objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function DocumentEditor({
  documentId,
  initialContent,
  onEditorReady,
  onUpdate,
  onFocusChange,
}: DocumentEditorProps) {
  // Keep latest callbacks in refs so the editor isn't recreated on re-renders
  const onUpdateRef = useRef(onUpdate);
  const onFocusChangeRef = useRef(onFocusChange);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onFocusChangeRef.current = onFocusChange;
  }, [onUpdate, onFocusChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your match plan…',
      }),
      TextStyle,
      Color,
      Image,
      FileHandler.configure({
        allowedMimeTypes: ALLOWED_IMAGE_TYPES,
        onPaste: (pasteEditor, files) => {
          files.forEach(file => {
            void uploadImage(
              pasteEditor as Editor,
              documentId,
              file,
              pasteEditor.state.selection.anchor
            );
          });
        },
        onDrop: (dropEditor, files, pos) => {
          files.forEach(file => {
            void uploadImage(dropEditor as Editor, documentId, file, pos);
          });
        },
      }),
    ],
    content: isTiptapDoc(initialContent) ? initialContent : '',
    editorProps: {
      attributes: {
        class: 'prose-doc min-h-[60vh] px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: () => onUpdateRef.current(),
    onFocus: () => onFocusChangeRef.current(true),
    onBlur: () => onFocusChangeRef.current(false),
  });

  useEffect(() => {
    onEditorReady(editor);
    return () => onEditorReady(null);
  }, [editor, onEditorReady]);

  if (!editor) {
    return (
      <div className="bg-surface border-border min-h-[60vh] animate-pulse rounded-lg border" />
    );
  }

  return (
    <div className="bg-surface border-border rounded-lg border">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
