import type { CollectionOptions, MongoClientOptions } from 'mongodb';
import { MongoClient } from 'mongodb';

import type { Document } from '../collection';
import { MongoCollection } from '../collection';
import type { Client } from './client';
import { type Deferred, defer } from '@/utils/promise';

class Mongodb implements Client {
  private collections: {
    [key: string]: Deferred<MongoCollection<any>>;
  } = {};

  private deferred: Deferred<MongoClient> = defer<MongoClient>();

  private timestamp?: boolean;

  constructor(private url: string, { timestamp, ...opts }: { timestamp?: boolean } & MongoClientOptions = {}) {
    this.timestamp = timestamp;

    (async () => {
      try {
        const client = await MongoClient.connect(this.url, opts);

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

export { Mongodb, MongoClientOptions, CollectionOptions };
