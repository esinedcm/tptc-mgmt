'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, Link as LinkIcon, Unlink, Table as TableIcon,
  Trash2, Plus, Minus
} from 'lucide-react';
import { useEffect } from 'react';

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  onEditorReady?: (editor: Editor) => void;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt('Enter URL');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-300 bg-gray-50 rounded-t-md">
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
        className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
        className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
        className={`p-1.5 rounded ${editor.isActive('strike') ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-gray-300 mx-1"></div>

      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
        className={`p-1.5 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
        className={`p-1.5 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
        className={`p-1.5 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-gray-300 mx-1"></div>

      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
        className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
        className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-gray-300 mx-1"></div>

      <button
        onClick={(e) => { e.preventDefault(); toggleLink(); }}
        className={`p-1.5 rounded ${editor.isActive('link') ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-200'}`}
        title="Link"
      >
        <LinkIcon className="w-4 h-4" />
      </button>
      {editor.isActive('link') && (
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().unsetLink().run(); }}
          className="p-1.5 rounded text-gray-600 hover:bg-gray-200"
          title="Unlink"
        >
          <Unlink className="w-4 h-4" />
        </button>
      )}

      <div className="w-px h-4 bg-gray-300 mx-1"></div>

      <button
        onClick={(e) => { e.preventDefault(); editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }}
        className="p-1.5 rounded text-gray-600 hover:bg-gray-200 flex items-center gap-1 text-xs font-medium"
        title="Insert Table"
      >
        <TableIcon className="w-4 h-4" /> Table
      </button>
      
      {editor.isActive('table') && (
        <div className="flex items-center gap-1 bg-gray-200 rounded p-0.5 ml-1">
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }} className="p-1 rounded hover:bg-white text-gray-600 text-xs" title="Add Column"><Plus className="w-3 h-3"/> Col</button>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }} className="p-1 rounded hover:bg-white text-gray-600 text-xs" title="Delete Column"><Minus className="w-3 h-3"/> Col</button>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }} className="p-1 rounded hover:bg-white text-gray-600 text-xs" title="Add Row"><Plus className="w-3 h-3"/> Row</button>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }} className="p-1 rounded hover:bg-white text-gray-600 text-xs" title="Delete Row"><Minus className="w-3 h-3"/> Row</button>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }} className="p-1 rounded hover:bg-red-100 text-red-600" title="Delete Table"><Trash2 className="w-3 h-3"/></button>
        </div>
      )}
    </div>
  );
};

export default function TipTapEditor({ value, onChange, onEditorReady }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 underline cursor-pointer',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full border border-gray-300 my-4',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2 bg-gray-100 font-bold text-left',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2',
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4 bg-white',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Handle external value changes (like when a different template is selected)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
