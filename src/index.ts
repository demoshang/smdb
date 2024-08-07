import { type Client, type DataStoreOptions, type MongoClientOptions, Mongodb, Nedb } from './client';
import { Collection } from './collection';

type SubsetMongoUrl = 'memory' | `memory://` | `dir://${string}` | `mongodb://${string}`;

class SubsetMongo {
  private client: Client;

  constructor(url: SubsetMongoUrl = 'memory', options: (MongoClientOptions | DataStoreOptions) & { timestamp?: boolean } = {}) {
    if (url.startsWith('mongodb://')) {
      this.client = new Mongodb(url, options);
    } else {
      this.client = new Nedb(url, options);
    }
  }

  public async disconnect() {
    return this.client.disconnect();
  }

  public collection(name: string, options?: any) {
    return this.client.getCollection(name, options);
  }
}

export { SubsetMongo, Collection, SubsetMongoUrl };
