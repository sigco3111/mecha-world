// GDD §8.12 —— 统一 KV 后端：Redis 可用则用 ioredis，否则进程内 Map 兜底。
// 设计支柱 5：任何 AI 故障都不允许让游戏玩不下去。
//
// 统一接口 KvBackend 供四层记忆 / 限流 / 成本熔断共用。
// 探测：index.ts 启动时 await initKv() 一次；探测未完成期间 getKv() 返回内存兜底。

interface Expirable {
  expireAt?: number;
}

/** 通用过期清理（懒回收，每次读写相关 key 时调用） */
function pruneExpired<K, V extends Expirable>(map: Map<K, V>): void {
  const now = Date.now();
  for (const [k, v] of map) {
    if (v.expireAt !== undefined && v.expireAt <= now) map.delete(k);
  }
}

export interface KvBackend {
  readonly name: string;
  readonly ready: boolean;
  get(key: string): Promise<string | null>;
  /** ttlSec > 0 时设置过期（秒） */
  set(key: string, value: string, ttlSec?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** 读取整个 hash（不存在返回 {}） */
  hGetAll(key: string): Promise<Record<string, string>>;
  /** 合并写入 hash 字段；ttlSec 仅在首次或刷新时应用 */
  hSet(key: string, fields: Record<string, string>, ttlSec?: number): Promise<void>;
  /** 计数器自增；首次自增时若提供 ttlSec 则设置过期 */
  incr(key: string, ttlSec?: number): Promise<number>;
  ping(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// 内存实现（兜底 + 单元测试用）
// ---------------------------------------------------------------------------
class MemoryBackend implements KvBackend {
  readonly name = "memory";
  ready = true;

  private kv = new Map<string, Expirable & { value: string }>();
  private hashes = new Map<string, Expirable & { fields: Record<string, string> }>();
  private counters = new Map<string, Expirable & { value: number }>();

  async get(key: string): Promise<string | null> {
    pruneExpired(this.kv);
    return this.kv.get(key)?.value ?? null;
  }
  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    this.kv.set(key, {
      value,
      expireAt: ttlSec && ttlSec > 0 ? Date.now() + ttlSec * 1000 : undefined,
    });
  }
  async del(key: string): Promise<void> {
    this.kv.delete(key);
    this.hashes.delete(key);
    this.counters.delete(key);
  }
  async hGetAll(key: string): Promise<Record<string, string>> {
    pruneExpired(this.hashes);
    const entry = this.hashes.get(key);
    return entry ? { ...entry.fields } : {};
  }
  async hSet(key: string, fields: Record<string, string>, ttlSec?: number): Promise<void> {
    if (Object.keys(fields).length === 0) return;
    const existing = this.hashes.get(key);
    const expireAt =
      ttlSec && ttlSec > 0 ? Date.now() + ttlSec * 1000 : existing?.expireAt;
    this.hashes.set(key, {
      fields: { ...(existing?.fields ?? {}), ...fields },
      expireAt,
    });
  }
  async incr(key: string, ttlSec?: number): Promise<number> {
    pruneExpired(this.counters);
    const entry = this.counters.get(key) ?? { value: 0 };
    entry.value += 1;
    if (ttlSec && ttlSec > 0 && entry.expireAt === undefined) {
      entry.expireAt = Date.now() + ttlSec * 1000;
    }
    this.counters.set(key, entry);
    return entry.value;
  }
  async ping(): Promise<boolean> {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Redis 实现（ioredis 动态加载；包未安装或连接失败则不启用）
// ---------------------------------------------------------------------------
class RedisBackend implements KvBackend {
  readonly name: string;
  ready = false;
  // redis client 类型用 any：ioredis 为可选依赖，避免类型耦合
  private readonly redis: {
    get(k: string): Promise<string | null>;
    set(k: string, v: string, mode?: string, ttl?: number): Promise<unknown>;
    del(...k: string[]): Promise<number>;
    hgetall(k: string): Promise<Record<string, string>>;
    hset(k: string, obj: Record<string, string>): Promise<number>;
    expire(k: string, s: number): Promise<number>;
    incr(k: string): Promise<number>;
    ping(): Promise<string>;
    on(ev: string, cb: () => void): unknown;
    connect(): Promise<void>;
    disconnect(): void;
  };

  constructor(redis: RedisBackend["redis"]) {
    this.redis = redis;
    this.name = "redis";
    this.redis.on("ready", () => {
      this.ready = true;
    });
    this.redis.on("error", () => {
      this.ready = false;
    });
    this.redis
      .ping()
      .then((r) => {
        this.ready = r === "PONG";
      })
      .catch(() => {
        this.ready = false;
      });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }
  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    try {
      if (ttlSec && ttlSec > 0) await this.redis.set(key, value, "EX", ttlSec);
      else await this.redis.set(key, value);
    } catch {
      /* 静默：调用方仍可读内存兜底（若已混用） */
    }
  }
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      /* ignore */
    }
  }
  async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.redis.hgetall(key);
    } catch {
      return {};
    }
  }
  async hSet(key: string, fields: Record<string, string>, ttlSec?: number): Promise<void> {
    if (Object.keys(fields).length === 0) return;
    try {
      await this.redis.hset(key, fields);
      if (ttlSec && ttlSec > 0) await this.redis.expire(key, ttlSec);
    } catch {
      /* ignore */
    }
  }
  async incr(key: string, ttlSec?: number): Promise<number> {
    try {
      const n = await this.redis.incr(key);
      if (ttlSec && ttlSec > 0 && n === 1) await this.redis.expire(key, ttlSec);
      return n;
    } catch {
      return 0;
    }
  }
  async ping(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === "PONG";
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// 工厂 + 单例探测
// ---------------------------------------------------------------------------
let _backend: KvBackend = new MemoryBackend();
let _initPromise: Promise<void> | null = null;

/** 取当前后端（探测未完成时返回内存兜底，保证可用） */
export function getKv(): KvBackend {
  return _backend;
}

/** index.ts 启动时调用一次：探测 Redis，连通则切换为 RedisBackend */
export function initKv(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const url = process.env.REDIS_URL;
    if (!url) return; // 无配置 → 保持内存兜底
    try {
      // 动态 import：用变量名避免 TS 静态解析（ioredis 为可选依赖，未安装时不报 TS2307）
      const moduleName: string = "ioredis";
      const mod = (await import(moduleName)).default as unknown as {
        new (url: string, opts: Record<string, unknown>): RedisBackend["redis"];
      };
      const redis = new mod(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
        enableOfflineQueue: false,
        retryStrategy: (times: number) => (times > 2 ? null : Math.min(times * 200, 1000)),
        lazyConnect: true,
      });
      await new Promise<void>((resolve, reject) => {
        redis.connect().then(resolve).catch(reject);
        setTimeout(() => reject(new Error("redis connect timeout")), 1500);
      });
      const pong = await redis.ping().catch(() => "");
      if (pong === "PONG") {
        _backend = new RedisBackend(redis);
      } else {
        redis.disconnect();
      }
    } catch {
      /* ioredis 未安装 / 连接失败：保持内存兜底（合规降级） */
    }
  })();
  return _initPromise;
}

/** 测试钩子：强制使用内存后端并重置状态 */
export function __resetForTest(backend?: KvBackend): void {
  _backend = backend ?? new MemoryBackend();
  _initPromise = null;
}
