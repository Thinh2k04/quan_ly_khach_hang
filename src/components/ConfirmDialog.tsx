import { useEffect } from 'react'

type ConfirmDialogProps = {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Đồng ý',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onCancel()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !isLoading && onCancel()}>
      <div
        className="modal confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog__content">
          <h3 id="confirm-dialog-title">{title}</h3>
          <p id="confirm-dialog-message">{message}</p>
        </div>

        <div className="confirm-dialog__actions">
          <button className="report-button confirm-dialog__cancel" type="button" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </button>
          <button className="delete-button confirm-dialog__confirm" type="button" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}