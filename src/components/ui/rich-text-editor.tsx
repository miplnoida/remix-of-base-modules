import * as React from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  minHeight?: number;
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link", "blockquote"],
    ["clean"],
  ],
};

/**
 * Reusable rich text editor backed by Quill. Use for any free-text body —
 * Text Blocks, disclaimers, AI prefixes, letter bodies, etc. — so every
 * editor in the app shares the same toolbar and HTML output format.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  readOnly,
  minHeight = 180,
}: Props) {
  return (
    <div className={cn("bg-background rounded border", className)} style={{ ["--rte-min" as any]: `${minHeight}px` }}>
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        modules={modules}
      />
      <style>{`.ql-editor{min-height:${minHeight}px;}`}</style>
    </div>
  );
}
