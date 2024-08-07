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
    [key: string]: MongoCollection<any>;
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

  public getCollection<T extends Document>(name: string, opts?: CollectionOptions) {
    if (!this.collections[name]) {
      this.collections[name] = new MongoCollection<T>(this.getOriginCollection(name, opts), this.timestamp);
    }
    return this.collections[name];
  }

  private async getOriginCollection(name: string, opts?: CollectionOptions) {
    const client = await this.deferred.promise;
    const originCollection = client.db().collection(name, opts);
    return originCollection as any;
  }
}

export { CollectionOptions, MongoClientOptions, Mongodb };
