import { Component, type ReactNode } from "react"
import { AlertTriangle, ArrowLeft } from "lucide-react"

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen px-3.5 bg-second">
                    <div className="flex flex-col items-center text-center max-w-sm">
                        <div className="w-16 h-16 rounded-full bg-wrong/10 flex items-center justify-center mb-5">
                            <AlertTriangle className="h-8 w-8 text-wrong" />
                        </div>
                        <h1 className="text-2xl font-bold text-darks mb-2">Terjadi Kesalahan</h1>
                        <p className="text-sm text-tinted mb-2 leading-relaxed">
                            Aplikasi mengalami error yang tidak terduga.
                        </p>
                        {this.state.error && (
                            <p className="text-xs text-tinted/70 mb-8 font-mono break-all">
                                {this.state.error.message}
                            </p>
                        )}
                        <div className="flex gap-3">
                            <a
                                href="/"
                                className="btn rounded-full bg-darks text-base border-none hover:opacity-90 transition-opacity"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Kembali ke Beranda
                            </a>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
