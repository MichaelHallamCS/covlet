import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Dropzone({
  accept,
  multiple,
  onFiles,
  children,
  disabled,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && ref.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-input bg-muted/40 px-6 py-10 text-center transition-colors hover:border-primary/60 hover:bg-primary-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        over && "border-primary bg-primary-soft",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      {children}
    </div>
  );
}
