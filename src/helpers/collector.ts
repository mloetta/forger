import { EventEmitter } from 'events'
import type { Interaction } from '../types/types'

export class Collector extends EventEmitter {
  onCollect(callback: (item: Interaction) => unknown): void {
    this.on('collect', callback)
  }

  collect(item: Interaction): void {
    this.emit('collect', item)
  }
}