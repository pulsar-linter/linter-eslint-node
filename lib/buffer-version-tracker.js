'use babel';

import { CompositeDisposable } from 'atom';

class BufferVersionTracker {
  static BUFFERS = new WeakMap();

  static forBuffer (buffer) {
    return this.BUFFERS.get(buffer) ?? new BufferVersionTracker(buffer);
  }

  subscriptions = new CompositeDisposable();

  constructor(buffer) {
    BufferVersionTracker.BUFFERS.set(buffer, this);
    this.version = 0;
    this.subscriptions.add(
      buffer.onDidChange(() => this.incrementBufferVersion()),
      buffer.onDidDestroy(() => this.dispose())
    );
  }

  incrementBufferVersion () {
    this.version++;
  }

  dispose () {
    this.subscriptions.dispose();
  }
}

export default BufferVersionTracker;
