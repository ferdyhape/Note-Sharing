"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

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

  return <EditorContent editor={editor} />;
}
