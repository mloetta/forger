import { EventEmitter } from 'events'

export class Collector<Type> extends EventEmitter {
  onCollect(callback: (item: Type) => unknown): void {
    this.on('collect', callback)
  }

  collect(item: Type): void {
    this.emit('collect', item)
  }
}