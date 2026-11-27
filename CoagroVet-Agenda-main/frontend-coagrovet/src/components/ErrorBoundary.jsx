import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-full place-items-center bg-surface p-6">
        <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-lg font-extrabold text-navy-700">Algo salió mal al cargar la página</h1>
          <p className="mt-2 text-sm text-muted">Copia este mensaje y envíamelo para corregirlo:</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-surface p-3 text-xs text-red-700">
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      </div>
    )
  }
}