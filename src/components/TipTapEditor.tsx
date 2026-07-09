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
  Trash2, Plus, Minus, Image as ImageIcon
} from 'lucide-react';
import { CustomImage } from './CustomImageExtension';
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
        onClick={(e) => {
          e.preventDefault();
          const url = window.prompt('Enter image URL');
          if (url) {
            editor.chain().focus().insertContent({
              type: 'customImage',
              attrs: { src: url, align: 'center' }
            }).run();
          }
        }}
        className="p-1.5 rounded text-gray-600 hover:bg-gray-200"
        title="Insert Image"
      >
        <ImageIcon className="w-4 h-4" />
      </button>

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
      CustomImage,
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
        class: 'focus:outline-none min-h-[300px] p-4 bg-white text-gray-700 ' +
               '[&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:mt-6 [&_h1]:mb-4 ' +
               '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3 ' +
               '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 ' +
               '[&_p]:leading-relaxed [&_p]:mb-4 ' +
               '[&_a]:text-primary-600 hover:[&_a]:underline ' +
               '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 ' +
               '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 ' +
               '[&_li]:mb-1 ' +
               '[&_blockquote]:border-l-4 [&_blockquote]:border-primary-500 [&_blockquote]:pl-4 [&_blockquote]:italic ' +
               '[&_strong]:text-gray-900 [&_strong]:font-bold ' +
               '[&_table]:w-full [&_table]:mb-6 [&_table]:border-collapse [&_table]:table-fixed ' +
               '[&_th]:border [&_th]:border-gray-200 [&_th]:p-3 [&_th]:bg-gray-50 [&_th]:text-left [&_th]:font-semibold ' +
               '[&_td]:border [&_td]:border-gray-200 [&_td]:p-3 ' +
               '[&_td:first-child]:font-bold [&_td:first-child]:w-1/3 ' +
               '[&_th:first-child]:w-1/3',
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
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
