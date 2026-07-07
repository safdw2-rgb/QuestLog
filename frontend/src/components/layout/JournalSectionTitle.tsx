import type { ReactNode } from "react";

interface JournalSectionTitleProps {
  children: ReactNode;
  id?: string;
  as?: "h2" | "h3";
  className?: string;
}

export function JournalSectionTitle({
  children,
  id,
  as: Tag = "h2",
  className = "",
}: JournalSectionTitleProps) {
  const sizeClass =
    Tag === "h2" ? "text-2xl" : "text-lg";

  return (
    <div className={`journal-section-heading ${className}`}>
      <Tag
        id={id}
        className={`journal-section-title font-display ${sizeClass} font-semibold text-[#5c2c16]`}
      >
        {children}
      </Tag>
      <div
        className="journal-section-rule mt-1.5 h-px w-full border-b border-dashed border-[#5c2c16]/30"
        aria-hidden
      />
    </div>
  );
}
