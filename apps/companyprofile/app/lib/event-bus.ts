type Listener = (...args: unknown[]) => void

class EventBus {
  private listeners: Record<string, Listener[]> = {}

  on(event: string, fn: Listener) {
    this.listeners[event] = this.listeners[event] || []
    this.listeners[event].push(fn)
    return () => this.off(event, fn)
  }

  off(event: string, fn: Listener) {
    const fns = this.listeners[event]
    if (!fns) return
    this.listeners[event] = fns.filter((l) => l !== fn)
  }

  emit(event: string, ...args: unknown[]) {
    const fns = this.listeners[event]
    if (!fns) return
    fns.forEach((fn) => fn(...args))
  }
}

export const eventBus = new EventBus()
