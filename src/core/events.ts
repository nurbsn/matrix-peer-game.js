export type EventHandler<T = any> = (data: T) => void;

export class TypedEventEmitter<Events extends Record<string, any>> {
  private listeners: { [K in keyof Events]?: Set<EventHandler<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event]!.add(handler);
    return this;
  }

  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this {
    if (this.listeners[event]) {
      this.listeners[event]!.delete(handler);
      if (this.listeners[event]!.size === 0) {
        delete this.listeners[event];
      }
    }
    return this;
  }

  once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this {
    const onceWrapper: EventHandler<Events[K]> = (data: Events[K]) => {
      this.off(event, onceWrapper);
      handler(data);
    };
    this.on(event, onceWrapper);
    return this;
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): boolean {
    const handlers = this.listeners[event];
    if (!handlers || handlers.size === 0) {
      return false;
    }
    // Iterate over a copy in case handlers modify the set
    for (const handler of Array.from(handlers)) {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in event handler for "${String(event)}":`, err);
      }
    }
    return true;
  }

  removeAllListeners(event?: keyof Events): this {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
    return this;
  }

  listenerCount(event: keyof Events): number {
    return this.listeners[event]?.size ?? 0;
  }
}
