import type { Document } from '../collection';

import type { Client } from './client';
import { resolve as pathResolve } from 'node:path';
import { NedbCollection } from '../collection/nedb';

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
  autocompactionInterval?: number;
}

function urlToPath(url: string) {
  return url.replace(/^dir:\/\//, '');
}

function getCollectionPath(dbDir: string, collectionName: string) {
  return `${pathResolve(dbDir, collectionName)}.nedb`;
}

async function createOriginCollection(
  Datastore: any,
  collectionName: string,
  dbDir: string,
  {
    timestampData = true,
    autocompactionInterval = 30 * 60 * 1000,
    ...opts
  }: { timestampData?: boolean } & DataStoreOptions = {},
) {
  let db;
  if (dbDir === 'memory' || dbDir === 'memory://') {
    db = new Datastore({ ...opts, inMemoryOnly: true, timestampData });
  } else {
    const collectionPath = getCollectionPath(dbDir, collectionName);
    db = new Datastore({ ...opts, filename: collectionPath, timestampData });

    db.compactDatafile();
    db.setAutocompactionInterval(autocompactionInterval);
  }

  await db.loadDatabaseAsync();
  return db;
}

class Nedb implements Client {
  private collections: {
    [key: string]: NedbCollection<any>;
  } = {};

  private dbDir: string;

  constructor(
    private Datastore: any,
    url: string,
    private opts?: DataStoreOptions & { timestamp?: boolean },
  ) {
    this.dbDir = urlToPath(url);
  }

  public async disconnect() {
    await Promise.all(
      Object.values(this.collections).map(async (collection) => {
        await collection.disconnect();
      }),
    );
  }

  public getCollection<T extends Document>(
    name: string,
    opts?: DataStoreOptions,
  ): NedbCollection<T> {
    if (!this.collections[name]) {
      this.collections[name] = new NedbCollection<T>(
        this.getOriginCollection(name, opts),
      );
    }

    return this.collections[name];
  }

  private async getOriginCollection(name: string, opts?: DataStoreOptions) {
    const originCollection = await createOriginCollection(
      this.Datastore,
      name,
      this.dbDir,
      {
        ...this.opts,
        ...opts,
        timestampData: this.opts?.timestamp ?? false,
      },
    );

    return originCollection;
  }
}

export { DataStoreOptions, Nedb };
