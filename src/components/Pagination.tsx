type PaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const pages: number[] = []
  const maxVisible = 5
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return (
    <div className="pagination">
      <button
        className="pagination__btn"
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        &laquo; Trước
      </button>

      {start > 1 && (
        <>
          <button className="pagination__btn" type="button" onClick={() => onPageChange(1)}>
            1
          </button>
          {start > 2 && <span className="pagination__ellipsis">&hellip;</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          className={`pagination__btn${page === currentPage ? ' pagination__btn--active' : ''}`}
          type="button"
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="pagination__ellipsis">&hellip;</span>}
          <button className="pagination__btn" type="button" onClick={() => onPageChange(totalPages)}>
            {totalPages}
          </button>
        </>
      )}

      <button
        className="pagination__btn"
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Sau &raquo;
      </button>
    </div>
  )
}
