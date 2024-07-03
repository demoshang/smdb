import { resolve as pathResolve } from 'node:path';
import Datastore from '@s4p/nedb';

import { NedbCollection } from '../collection/nedb';
import type { Document } from '../collection';
import type { Client } from './client';
import { type Deferred, defer } from '@/utils/promise';

interface DataStoreOptions {
  inMemoryOnly?: boolean;
  autoload?: boolean;
  onload?: (error: Error | null) => any;
  beforeDeserialization?: (line: string) => string;
  afterSerialization?: (line: string) => string;
  corruptAlertThreshold?: number;
  compareStrings?: (a: string, b: string) => number;
  modes?: { fileMode: number; dirMode: number };
  testSerializationHooks?: boolean;
}

function urlToPath(url: string) {
  return url.replace(/^dir:\/\//, '');
}

function getCollectionPath(dbDir: string, collectionName: string) {
  return `${pathResolve(dbDir, collectionName)}.nedb`;
}

async function createOriginCollection(
  collectionName: string,
  dbDir: string,
  { timestampData = true }: { timestampData?: boolean } = {},
) {
  let db: Datastore;
  if (dbDir === 'memory' || dbDir === 'memory://') {
    db = new Datastore({ inMemoryOnly: true, timestampData });
  } else {
    const collectionPath = getCollectionPath(dbDir, collectionName);
    db = new Datastore({ filename: collectionPath, timestampData });
  }

  await db.loadDatabaseAsync();
  return db;
}

class Nedb implements Client {
  private collections: {
    [key: string]: Deferred<NedbCollection<any>>;
  } = {};

  private dbDir: string;

  constructor(url: string, private opts?: DataStoreOptions & { timestamp?: boolean }) {
    this.dbDir = urlToPath(url);
  }

  public async disconnect() {}

  public async getCollection<T extends Document>(name: string, opts?: DataStoreOptions): Promise<NedbCollection<T>> {
    if (this.collections[name]) {
      return this.collections[name].promise;
    }

    const deferred = defer<NedbCollection<T>>();
    this.collections[name] = deferred;

    try {
      const originCollection = await createOriginCollection(name, this.dbDir, {
        ...this.opts,
        ...opts,
        timestampData: this.opts?.timestamp ?? false,
      });
      const collection = new NedbCollection<T>(originCollection);
      deferred.resolve(collection);
    } catch (e) {
      deferred.reject(e);
    }

    return deferred.promise;
  }
}

export { Nedb, DataStoreOptions };
