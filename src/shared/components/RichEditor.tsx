"use client";

import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

const TOOLBAR_BUTTON_CLASS =
  "flex h-8 min-w-8 flex-none items-center justify-center rounded-control px-2 text-[13px] font-medium text-muted hover:bg-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-40";
const TOOLBAR_BUTTON_ACTIVE_CLASS = "bg-raised text-accent";

type ToolbarAction = {
  label: string;
  title: string;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

const TOOLBAR_GROUPS: ToolbarAction[][] = [
  [
    {
      label: "B",
      title: "Bold",
      isActive: (editor) => editor.isActive("bold"),
      run: (editor) => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "I",
      title: "Italic",
      isActive: (editor) => editor.isActive("italic"),
      run: (editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "S",
      title: "Strikethrough",
      isActive: (editor) => editor.isActive("strike"),
      run: (editor) => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "</>",
      title: "Inline code",
      isActive: (editor) => editor.isActive("code"),
      run: (editor) => editor.chain().focus().toggleCode().run(),
    },
  ],
  [
    {
      label: "H1",
      title: "Heading 1",
      isActive: (editor) => editor.isActive("heading", { level: 1 }),
      run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "H2",
      title: "Heading 2",
      isActive: (editor) => editor.isActive("heading", { level: 2 }),
      run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
  ],
  [
    {
      label: "•⁠—",
      title: "Bullet list",
      isActive: (editor) => editor.isActive("bulletList"),
      run: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "1.",
      title: "Numbered list",
      isActive: (editor) => editor.isActive("orderedList"),
      run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "❝",
      title: "Quote",
      isActive: (editor) => editor.isActive("blockquote"),
      run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
  ],
];

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="mb-2 flex items-center gap-1 overflow-x-auto rounded-control border border-control bg-surface p-1"
    >
      {TOOLBAR_GROUPS.map((group, groupIndex) => (
        <div key={groupIndex} className="flex flex-none items-center gap-0.5">
          {groupIndex > 0 && <span className="mx-0.5 h-5 w-px flex-none bg-rule" />}
          {group.map((action) => (
            <button
              key={action.title}
              type="button"
              title={action.title}
              aria-label={action.title}
              aria-pressed={action.isActive(editor)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => action.run(editor)}
              className={`${TOOLBAR_BUTTON_CLASS} ${action.isActive(editor) ? TOOLBAR_BUTTON_ACTIVE_CLASS : ""}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function RichEditor({
  content,
  editable = true,
  onChange,
}: {
  content: JSONContent;
  editable?: boolean;
  onChange?: (value: { json: JSONContent; text: string }) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-40 text-[15px] leading-relaxed text-text focus:outline-none " +
          "[&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 " +
          "[&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold " +
          "[&_blockquote]:border-l-2 [&_blockquote]:border-control [&_blockquote]:pl-3 [&_blockquote]:text-muted " +
          "[&_code]:rounded [&_code]:bg-raised [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm",
      },
    },
    onUpdate({ editor }) {
      onChange?.({ json: editor.getJSON(), text: editor.getText() });
    },
  });

  // editable can change after mount (e.g. access level resolves async) — TipTap
  // doesn't pick that up from the prop alone.
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return (
    <div>
      {/* Without this, StarterKit's formatting (bold/italic/headings/lists)
          only shows through keyboard shortcuts and Markdown-style typing —
          nothing on screen signals this is a rich editor, not plain text. */}
      {editor && editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
