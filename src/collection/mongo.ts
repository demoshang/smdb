import type { Collection } from 'mongodb';

import { Collection as AbstractCollection } from './collection';
import type {
  CreateIndexesOptions,
  Document,
  Filter,
  FindOptions,
  IndexSpecification,
  OptionalUnlessRequiredId,
  UpdateFilter,
  UpdateOptions,
} from './interface';

class MongoCollection<T extends Document = Document> extends AbstractCollection<T> {
  constructor(private collection: Collection<T>, private timestamp?: boolean) {
    super();
  }

  public async insertOne(doc: OptionalUnlessRequiredId<T>) {
    return this.collection.insertOne(this.appendCreateTimestamp(doc));
  }

  public async insertMany(docs: OptionalUnlessRequiredId<T>[]) {
    return this.collection.insertMany(
      docs.map((v) => {
        return this.appendCreateTimestamp(v);
      }),
    );
  }

  public async deleteOne(filter: Filter<T>) {
    return this.collection.deleteOne(filter);
  }

  public async deleteMany(filter: Filter<T>) {
    return this.collection.deleteMany(filter);
  }

  public async updateOne(
    filter: Filter<T>,
    document: UpdateFilter<T>,
    options?: UpdateOptions,
  ) {
    return this.collection.updateOne(filter, this.appendUpdateTimestamp(document), options);
  }

  public async updateMany(
    filter: Filter<T>,
    document: UpdateFilter<T>,
    options?: UpdateOptions,
  ) {
    return this.collection.updateMany(filter, this.appendUpdateTimestamp(document), options);
  }

  public async findOne(query: Filter<T>, options?: FindOptions) {
    return this.collection.findOne(query, options);
  }

  public async find(query: Filter<T>, options?: FindOptions) {
    const cursor = this.collection.find(query, options);
    return cursor.toArray();
  }

  public async countDocuments(query?: Filter<T>) {
    return this.collection.countDocuments(query);
  }

  public async createIndex(
    fieldOrSpec: IndexSpecification,
    options?: CreateIndexesOptions,
  ) {
    return this.collection.createIndex(fieldOrSpec, options);
  }

  public async dropIndex(indexName: string) {
    await this.collection.dropIndex(indexName);
  }

  public async listIndexes() {
    return this.collection.listIndexes().toArray();
  }

  public async drop() {
    return this.collection.drop();
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

    if (!is$) {
      return {
        updatedAt: date,
        ...doc,
      };
    }

    if (keys.includes('$set') && keys.includes('$setOnInsert')) {
      return {
        $set: {
          updatedAt: date,
          ...doc.$set,
        },
        $setOnInsert: {
          createdAt: date,
          updatedAt: date,
          ...doc.$setOnInsert,
        },
        ...doc,
      };
    } else if (keys.includes('$set')) {
      return {
        $set: {
          updatedAt: date,
          ...doc.$set,
        },
        $setOnInsert: {
          createdAt: date,
          updatedAt: date,
        },
        ...doc,
      };
    } else {
      return {
        updatedAt: date,
        $setOnInsert: {
          createdAt: date,
          updatedAt: date,
        },
        ...doc,
      };
    }
  }
}

export { MongoCollection };
