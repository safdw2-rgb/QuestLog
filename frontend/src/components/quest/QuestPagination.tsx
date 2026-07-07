interface QuestPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function QuestPagination({
  page,
  totalPages,
  onPageChange,
}: QuestPaginationProps) {
  const pages = buildPageNumbers(page, totalPages);

  return (
    <nav
      className="quest-pagination mt-4 mb-2 flex flex-wrap items-center justify-center gap-1.5"
      aria-label="Страницы квестов"
    >
      <button
        type="button"
        className="quest-pagination-button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        Назад
      </button>

      {pages.map((item, index) =>
        item === "…" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-1 text-sm text-ink-muted"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={`quest-pagination-button ${
              item === page ? "quest-pagination-button-active" : ""
            }`}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className="quest-pagination-button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Вперёд
      </button>
    </nav>
  );
}

function buildPageNumbers(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: Array<number | "…"> = [1];
  if (current > 3) {
    pages.push("…");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push("…");
  }
  pages.push(total);
  return pages;
}
