import type { Collection } from '../collection';

abstract class Client {
  public abstract disconnect(): Promise<void>;
  public abstract getCollection(name: string, opts?: any): Collection<any>;
}

export { Client };
