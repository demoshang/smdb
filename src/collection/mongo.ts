import type {
  MCollection as Collection,
  CreateIndexesOptions,
  Document,
  Filter,
  FindOptions,
  IndexSpecification,
  OptionalUnlessRequiredId,
  UpdateFilter,
  UpdateOptions,
} from '../lib-types/interface';

import { Collection as AbstractCollection } from './collection';

class MongoCollection<T extends Document = Document> extends AbstractCollection<T> {
  constructor(private collection: Promise< Collection<T>>, private timestamp?: boolean) {
    super();
  }

  public async insertOne(doc: OptionalUnlessRequiredId<T>) {
    const collection = await this.collection;
    return collection.insertOne(this.appendCreateTimestamp(doc));
  }

  public async insertMany(docs: OptionalUnlessRequiredId<T>[]) {
    const collection = await this.collection;
    return collection.insertMany(
      docs.map((v) => {
        return this.appendCreateTimestamp(v);
      }),
    );
  }

  public async deleteOne(filter: Filter<T>) {
    const collection = await this.collection;
    return collection.deleteOne(filter);
  }

  public async deleteMany(filter: Filter<T>) {
    const collection = await this.collection;
    return collection.deleteMany(filter);
  }

  public async updateOne(
    filter: Filter<T>,
    document: UpdateFilter<T>,
    options?: UpdateOptions,
  ) {
    const collection = await this.collection;
    return collection.updateOne(filter, this.appendUpdateTimestamp(document), options);
  }

  public async updateMany(
    filter: Filter<T>,
    document: UpdateFilter<T>,
    options?: UpdateOptions,
  ) {
    const collection = await this.collection;
    return collection.updateMany(filter, this.appendUpdateTimestamp(document), options);
  }

  public async findOne(query: Filter<T>, options?: FindOptions) {
    const collection = await this.collection;
    return collection.findOne(query, options);
  }

  public async find(query: Filter<T>, options?: FindOptions) {
    const collection = await this.collection;
    const cursor = collection.find(query, options);
    return cursor.toArray();
  }

  public async countDocuments(query?: Filter<T>) {
    const collection = await this.collection;
    return collection.countDocuments(query);
  }

  public async createIndex(
    fieldOrSpec: IndexSpecification,
    options?: CreateIndexesOptions,
  ) {
    const collection = await this.collection;
    return collection.createIndex(fieldOrSpec, options);
  }

  public async dropIndex(indexName: string) {
    const collection = await this.collection;
    await collection.dropIndex(indexName);
  }

  public async listIndexes() {
    const collection = await this.collection;
    return collection.listIndexes().toArray();
  }

  public async drop() {
    const collection = await this.collection;
    return collection.drop();
  }

  private appendCreateTimestamp(doc: any) {
    if (!this.timestamp) {
      return doc;
    }

    const date = new Date();
    return {
      createdAt: date,
      updatedAt: date,
      ...doc,
    };
  }

  private appendUpdateTimestamp(doc: any) {
    if (!this.timestamp) {
      return doc;
    }

    const keys = Object.keys(doc);
    const is$ = keys.filter((k) => {
      return k.startsWith('$');
    });

    const date = new Date();

    if (!is$.length) {
      return {
        updatedAt: date,
        ...doc,
      };
    }

    if (keys.includes('$set') && keys.includes('$setOnInsert')) {
      return {
        ...doc,
        $set: {
          updatedAt: date,
          ...doc.$set,
        },
        $setOnInsert: {
          createdAt: date,
          ...doc.$setOnInsert,
        },
      };
    } else if (keys.includes('$set')) {
      return {
        ...doc,
        $set: {
          updatedAt: date,
          ...doc.$set,
        },
        $setOnInsert: {
          createdAt: date,
        },
      };
    } else {
      return {
        ...doc,
        $set: {
          updatedAt: date,
        },
        $setOnInsert: {
          createdAt: date,
        },
      };
    }
  }
}

export { MongoCollection };
