import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

export const RequestContext = {
  run<T>(store: RequestContextStore, callback: () => T): T {
    return storage.run(store, callback);
  },

  get requestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
};
