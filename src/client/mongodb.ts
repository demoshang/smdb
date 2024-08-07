import type { Document } from '../collection';
import { MongoCollection } from '../collection';
import type { CollectionOptions, MongoClientOptions } from '../lib-types/mongo-type';
import type { Client } from './client';
import { type Deferred, defer } from '@/utils/promise';

interface MClient {
  connect: (url: string, opts?: any) => Promise<any>;
  close: () => void;
  db: () => any;
}

class Mongodb implements Client {
  private collections: {
    [key: string]: Deferred<MongoCollection<any>>;
  } = {};

  private deferred: Deferred<MClient> = defer<MClient>();

  private timestamp?: boolean;

  constructor(private url: string, { timestamp, ...opts }: { timestamp?: boolean } & MongoClientOptions = {}) {
    this.timestamp = timestamp;

    (async () => {
      try {
        const { MongoClient } = await import('mongodb');
        const client = await MongoClient.connect(this.url, opts as any);

        this.deferred.resolve(client);
      } catch (e) {
        this.deferred.reject(e);
      }
    })().catch((e) => {
      this.deferred.reject(e);
    });
  }

  public async disconnect() {
    if (this.deferred) {
      const client = await this.deferred.promise;
      client.close();
    }
  }

  public async getCollection<T extends Document>(name: string, opts?: CollectionOptions) {
    if (this.collections[name]) {
      return this.collections[name].promise;
    }

    const deferred = defer<MongoCollection<T>>();
    this.collections[name] = deferred;

    try {
      const client = await this.deferred.promise;
      const originCollection = client.db().collection(name, opts);
      const collection = new MongoCollection<T>(originCollection as any, this.timestamp);
      deferred.resolve(collection);
    } catch (e) {
      deferred.reject(e);
    }

    return deferred.promise;
  }
}

export { CollectionOptions, MongoClientOptions, Mongodb };
