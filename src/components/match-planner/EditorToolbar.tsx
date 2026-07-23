'use client';

import { useEditorState, type Editor } from '@tiptap/react';
import {
  FontBoldIcon,
  FontItalicIcon,
  Link2Icon,
  ListBulletIcon,
  ResetIcon,
  StrikethroughIcon,
} from '@radix-ui/react-icons';
import { clsx } from 'clsx';

interface EditorToolbarProps {
  editor: Editor;
}

// CS2 player colors — stored as CSS variables so text adapts to light/dark theme
const TEXT_COLORS = [
  { name: 'Blue', value: 'var(--color-cs-blue)' },
  { name: 'Green', value: 'var(--color-cs-green)' },
  { name: 'Orange', value: 'var(--color-cs-orange)' },
  { name: 'Purple', value: 'var(--color-cs-purple)' },
  { name: 'Yellow', value: 'var(--color-cs-yellow)' },
] as const;

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={clsx(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded text-sm font-medium',
        'transition-colors focus:outline-none',
        active
          ? 'bg-primary-bg text-primary'
          : 'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-40'
      )}
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="bg-border mx-1 h-5 w-px shrink-0" />;
}

// Tiptap's getAttributes() returns untyped attribute maps — narrow instead
// of asserting.
function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      link: e.isActive('link'),
      textColor: optionalString(e.getAttributes('textStyle').color),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const handleLink = () => {
    const previousUrl = optionalString(editor.getAttributes('link').href);
    const url = window.prompt('Link URL', previousUrl ?? 'https://');
    if (url === null) return;

    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url.trim() })
      .run();
  };

  return (
    <div className="border-border bg-surface sticky top-14 z-30 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b px-2 py-1.5">
      <ToolbarButton
        label="Bold"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <FontBoldIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <FontItalicIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <StrikethroughIcon className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Heading 1"
        active={state.h1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={state.h2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={state.h3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Bullet list"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListBulletIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>
      <ToolbarButton label="Link" active={state.link} onClick={handleLink}>
        <Link2Icon className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Default color"
        active={!state.textColor}
        onClick={() => editor.chain().focus().unsetColor().run()}
      >
        <span className="border-border-elevated bg-foreground h-4 w-4 rounded-full border" />
      </ToolbarButton>
      {TEXT_COLORS.map(color => (
        <ToolbarButton
          key={color.name}
          label={color.name}
          active={state.textColor === color.value}
          onClick={() => editor.chain().focus().setColor(color.value).run()}
        >
          <span
            className="border-border-elevated h-4 w-4 rounded-full border"
            style={{ backgroundColor: color.value }}
          />
        </ToolbarButton>
      ))}

      <ToolbarDivider />

      <ToolbarButton
        label="Undo"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <ResetIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <ResetIcon className="h-4 w-4 -scale-x-100" />
      </ToolbarButton>
    </div>
  );
}
