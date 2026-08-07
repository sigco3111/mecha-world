// GDD §35.0 前端侧 —— WS 单例：连接/心跳/重连/降级事件
import type { ClientMsg, ServerMsg } from "@nexus/shared";

export type { ClientMsg, ServerMsg };

export interface AiClientOptions {
  url: string; // ws://host:8787/ws?fp=xxx
  onMessage: (msg: ServerMsg) => void;
  onFallback: (reason: string) => void;
  onOpen?: () => void;
}

export interface AiClient {
  send: (m: ClientMsg) => void;
  close: () => void;
  isOpen: () => boolean;
}

const RECONNECT_DELAYS = [500, 1000, 2000]; // §38.3 指数退避 ×3（约 3.5s 内判定降级）
const CONNECT_TIMEOUT = 2000; // 单次握手超时，避免 refused 连接挂起拖慢降级判定

export function connect(opts: AiClientOptions): AiClient {
  let ws: WebSocket | null = null;
  let attempts = 0;
  let closedByUser = false;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let connectTimer: ReturnType<typeof setTimeout> | null = null;

  const setup = () => {
    ws = new WebSocket(opts.url);
    // 握手超时：超时后主动关闭，走 onclose 的重连/降级流程
    connectTimer = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.CONNECTING) ws.close();
    }, CONNECT_TIMEOUT);
    ws.onopen = () => {
      if (connectTimer) clearTimeout(connectTimer);
      attempts = 0;
      opts.onOpen?.();
      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) sendRaw({ type: "ping" });
      }, 15_000);
    };
    ws.onmessage = (ev) => {
      try {
        opts.onMessage(JSON.parse(ev.data as string) as ServerMsg);
      } catch {
        /* 非 JSON 帧忽略 */
      }
    };
    ws.onclose = () => {
      if (connectTimer) clearTimeout(connectTimer);
      if (pingTimer) clearInterval(pingTimer);
      if (closedByUser) return;
      if (attempts < RECONNECT_DELAYS.length) {
        const delay = RECONNECT_DELAYS[attempts++];
        setTimeout(setup, delay);
      } else {
        opts.onFallback("disconnect");
      }
    };
    ws.onerror = () => {
      /* onclose 会跟进处理 */
    };
  };

  const sendRaw = (m: ClientMsg) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  };

  // 先做 HTTP 健康探测：服务器不可达时立即降级，避免 WS 握手挂起拖慢判定
  const httpBase = opts.url.replace(/^ws(s?):/, "http$1:").replace(/\/ws\?.*$/, "");
  fetch(`${httpBase}/health`, { signal: AbortSignal.timeout(1500) })
    .then((r) => {
      if (closedByUser) return;
      if (r.ok) setup();
      else opts.onFallback("unhealthy");
    })
    .catch(() => {
      if (!closedByUser) opts.onFallback("unreachable");
    });

  return {
    send: sendRaw,
    close: () => {
      closedByUser = true;
      ws?.close();
    },
    isOpen: () => ws?.readyState === WebSocket.OPEN,
  };
}

/** 设备指纹：随机 id 持久化（GDD §35.1 简化版） */
export function getPlayerFp(): string {
  const KEY = "nexus_fp";
  let fp = localStorage.getItem(KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(KEY, fp);
  }
  return fp;
}

export function getAiServerUrl(): string {
  const base = (import.meta as { env?: Record<string, string> }).env?.VITE_AI_SERVER_URL ?? "ws://127.0.0.1:8787";
  return `${base}/ws?fp=${encodeURIComponent(getPlayerFp())}`;
}
