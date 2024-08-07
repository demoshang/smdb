import { type Client, type DataStoreOptions, type MongoClientOptions, Mongodb, Nedb } from './client';
import { Collection } from './collection';

type SubsetMongoUrl = 'memory' | `memory://` | `dir://${string}` | `mongodb://${string}`;

declare class MongoDriver {
  constructor(url: string, opts: any);
  connect: (url: string, opts?: any) => Promise<any>;
  close: () => void;
  db: () => any;
}

declare class NedbDriver {
  constructor(url: string, opts: any);
}

class SubsetMongo {
  private client?: Client;

  constructor(private Driver: MongoDriver | NedbDriver, url?: SubsetMongoUrl, options?: (MongoClientOptions | DataStoreOptions) & { timestamp?: boolean }) {
    if (url) {
      this.connect(url, options);
    }
  }

  public connect(url: SubsetMongoUrl = 'memory', options: (MongoClientOptions | DataStoreOptions) & { timestamp?: boolean } = {}) {
    if ('connect' in this.Driver) {
      if (url.startsWith('mongodb://')) {
        this.client = new Mongodb(this.Driver, url, options);
      } else {
        throw new Error('driver is not mongodb');
      }
    } else {
      this.client = new Nedb(this.Driver, url, options);
    }
  }

  public async disconnect() {
    if (!this.client) {
      return;
    }
    return this.client.disconnect();
  }

  public collection(name: string, options?: any) {
    if (!this.client) {
      throw new Error('no connect');
    }

    return this.client.getCollection(name, options);
  }
}

export { SubsetMongo, Collection, SubsetMongoUrl };
