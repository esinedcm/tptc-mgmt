import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

const ResizableImageNodeView = (props: any) => {
  const { node, updateAttributes, selected } = props;
  const imageRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [initialWidth, setInitialWidth] = useState(0);
  const [initialMouseX, setInitialMouseX] = useState(0);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setInitialMouseX(e.clientX);
    if (imageRef.current) {
      setInitialWidth(imageRef.current.offsetWidth);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const dx = e.clientX - initialMouseX;
      // If aligned right, movement to the right decreases width? Let's keep it simple: just drag to right increases size.
      const newWidth = Math.max(50, initialWidth + dx); // min width 50px
      updateAttributes({ width: newWidth });
    },
    [isResizing, initialMouseX, initialWidth, updateAttributes]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const align = node.attrs.align || 'center';
  
  let alignmentClass = 'mx-auto block mb-4'; // default center
  if (align === 'left') alignmentClass = 'float-left mr-4 mb-4';
  if (align === 'right') alignmentClass = 'float-right ml-4 mb-4';

  return (
    <NodeViewWrapper
      className={`relative ${alignmentClass} group clear-none`}
      style={{ width: node.attrs.width ? `${node.attrs.width}px` : 'auto' }}
    >
      <div className={`relative ${selected ? 'ring-2 ring-primary-500' : ''}`}>
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          title={node.attrs.title || ''}
          className="w-full h-auto block rounded"
        />

        {selected && (
          <>
            {/* Drag Handle */}
            <div
              onMouseDown={startResize}
              className="absolute bottom-0 right-0 w-4 h-4 bg-primary-500 border-2 border-white rounded-full cursor-se-resize transform translate-x-1/2 translate-y-1/2 z-10"
            />
            
            {/* Formatting Toolbar */}
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white shadow-md border border-gray-200 rounded p-1 flex gap-1 z-20">
              <button
                onClick={() => updateAttributes({ align: 'left' })}
                className={`p-1 rounded ${align === 'left' ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Align Left"
              >
                <AlignLeft size={16} />
              </button>
              <button
                onClick={() => updateAttributes({ align: 'center' })}
                className={`p-1 rounded ${align === 'center' ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Align Center"
              >
                <AlignCenter size={16} />
              </button>
              <button
                onClick={() => updateAttributes({ align: 'right' })}
                className={`p-1 rounded ${align === 'right' ? 'bg-gray-200 text-primary-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Align Right"
              >
                <AlignRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const CustomImage = Node.create({
  name: 'customImage',

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      align: {
        default: 'center', // left, center, right
      },
      width: {
        default: null,
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    let className = 'mx-auto block mb-4';
    if (HTMLAttributes.align === 'left') className = 'float-left mr-4 mb-4';
    if (HTMLAttributes.align === 'right') className = 'float-right ml-4 mb-4';

    // We output standard HTML so it renders correctly outside the editor
    return ['img', mergeAttributes(HTMLAttributes, { 
      class: className,
      style: HTMLAttributes.width ? `width: ${HTMLAttributes.width}px` : undefined 
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
  
});
