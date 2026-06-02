// ============================================================
// IDA World WebSocket 连接
// 实时世界事件流 + 自动重连
// ============================================================

export type WSEventHandler = (event: MessageEvent) => void;

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

export class WorldWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Set<WSEventHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private disposed = false;

  constructor(worldId: string, url: string = WS_BASE) {
    this.url = `${url}?world_id=${worldId}`;
  }

  /** 建立 WebSocket 连接 */
  connect() {
    if (this.disposed) return;
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WS] Connected to world stream');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      this.handlers.forEach((handler) => handler(event));
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }

  /** 断开连接并停止重连 */
  disconnect() {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.handlers.clear();
  }

  /** 注册事件处理器，返回取消注册函数 */
  onEvent(handler: WSEventHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** 向服务端发送消息 */
  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /** 获取当前连接状态 */
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /** 是否已连接 */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** 指数退避重连 */
  private scheduleReconnect() {
    if (this.disposed) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WS] Max reconnect attempts reached, giving up');
      return;
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}