import { useState } from 'react'

type LoginPageProps = {
  onLogin: (username: string, password: string) => void
  isLoading?: boolean
}

export default function LoginPage({ onLogin, isLoading = false }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập')
      return
    }

    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu')
      return
    }

    onLogin(username, password)
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Quản lý Khách hàng</h1>
          <p>Đăng nhập để tiếp tục</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Tên đăng nhập</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              disabled={isLoading}
              autoFocus
            />
          </label>

          <label className="login-field">
            <span>Mật khẩu</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              disabled={isLoading}
            />
          </label>

          {error ? <div className="login-error">{error}</div> : null}

          <button
            className="login-button"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="login-footer">
          <p>Demo: bất kỳ tên đăng nhập và mật khẩu nào (tối thiểu 3 ký tự)</p>
        </div>
      </div>
    </div>
  )
}
