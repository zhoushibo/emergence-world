/**
 * 3D 场景错误边界 — 防止单个 GLB 加载失败导致整个场景白屏
 */
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SceneErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('[SceneErrorBoundary] 3D 场景错误:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-[#050510] text-gray-400">
          <div className="text-4xl mb-4">🌍</div>
          <h2 className="text-lg font-semibold text-gray-300 mb-2">3D 场景加载失败</h2>
          <p className="text-sm text-gray-500 mb-4 max-w-md text-center">
            场景渲染遇到问题，请刷新页面重试。
          </p>
          <p className="text-xs text-gray-600 font-mono">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-cyan-600/30 text-cyan-300 rounded-lg border border-cyan-500/30 hover:bg-cyan-600/50 transition-colors text-sm"
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
