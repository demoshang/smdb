import type {
  CreateIndexesOptions,
  Document,
  Filter,
  FindOptions,
  IndexSpecification,
  NedbDatastore,
  OptionalUnlessRequiredId,
  UpdateFilter,
  UpdateOptions,
} from '../lib-types/interface';
import { Collection } from './collection';

class NedbCollection<T extends Document> extends Collection<T> {
  constructor(private collection: Promise<NedbDatastore>) {
    super();
  }

  public async insertOne(doc: OptionalUnlessRequiredId<T>) {
    const collection = await this.collection;
    const newDoc = await collection.insertAsync(doc);

    return {
      acknowledged: true,
      insertedId: newDoc._id,
    };
  }

  public async insertMany(docs: OptionalUnlessRequiredId<T>[]) {
    const collection = await this.collection;
    const list = await collection.insertAsync(docs);

    return {
      acknowledged: true,
      insertedCount: list.length,
      insertedIds: Object.fromEntries(list.map(({ _id }, index) => {
        return [`${index}`, _id];
      })),
    };
  }

  public async deleteOne(filter: Filter<T>) {
    const collection = await this.collection;
    const numRemoved = await collection.removeAsync(filter, {
      multi: false,
    });
    return {
      acknowledged: true,
      deletedCount: numRemoved,
    };
  }

  public async deleteMany(filter: Filter<T>) {
    const collection = await this.collection;
    const numRemoved = await collection.removeAsync(filter, {
      multi: true,
    });
    return {
      acknowledged: true,
      deletedCount: numRemoved,
    };
  }

  public async updateOne(
    filter: Filter<T>,
    document: UpdateFilter<T>,
    options?: UpdateOptions,
  ) {
    const collection = await this.collection;
    const { numAffected, upsert, affectedDocuments }
    = await collection.updateAsync(filter, document, {
      ...options,
      multi: false,
      returnUpdatedDocs: true,
    });

    return {
      acknowledged: true,
      matchedCount: numAffected,
      upsertedId: upsert ? affectedDocuments?._id || null : null,
    };
  }

  public async updateMany(
    filter: Filter<T>,
    document: UpdateFilter<T>,
    options?: UpdateOptions,
  ) {
    const collection = await this.collection;
    const { numAffected, upsert, affectedDocuments }
    = await collection.updateAsync(filter, document, {
      ...options,
      multi: true,
      returnUpdatedDocs: true,
    });

    return {
      acknowledged: true,
      matchedCount: numAffected,
      upsertedId: upsert
        ? affectedDocuments
          ?.map(({ _id }) => {
            return _id;
          })
          .join(',') ?? null
        : null,
    };
  }

  public async findOne(query: Filter<T>, options?: FindOptions) {
    const [doc] = await this.find(query, { ...options, limit: 1 });
    return doc;
  }

  public async find(
    query: Filter<T>,
    { projection, sort, skip, limit }: FindOptions = {},
  ) {
    const collection = await this.collection;
    let cursor = collection.findAsync(query);

    if (projection) {
      cursor.projection(projection);
    }

    if (sort) {
      cursor = cursor.sort(sort);
    }

    if (skip !== null && skip !== undefined) {
      cursor = cursor.skip(skip);
    }

    if (limit) {
      cursor = cursor.limit(limit);
    }

    const docs = await cursor;
    return docs as any[];
  }

  public async countDocuments(query: Filter<T>) {
    const collection = await this.collection;
    const count = await collection.countAsync(query);

    return count;
  }

  public async createIndex(
    fieldOrSpec: IndexSpecification,
    options?: CreateIndexesOptions,
  ) {
    let fieldName;

    if (typeof fieldOrSpec === 'string') {
      fieldName = [fieldOrSpec];
    } else if (Array.isArray(fieldOrSpec)) {
      fieldName = [fieldOrSpec[0]];
    } else {
      fieldName = Object.keys(fieldOrSpec);
    }

    const collection = await this.collection;
    await collection.ensureIndexAsync({
      fieldName,
      ...options,
    });

    return [...fieldName].sort().join(',');
  }

  public async dropIndex(indexName: string) {
    const collection = await this.collection;
    await collection.removeIndexAsync(indexName);
  }

  public async listIndexes() {
    const collection = await this.collection;
    const keys = await collection.getIndexesAsync();
    return keys.map((key) => {
      const arr = key.split(',');
      return {
        v: 0,
        key: Object.fromEntries(arr.map((item) => {
          return [item, 1];
        })),
        name: key,
      };
    });
  }

  public async drop() {
    const collection = await this.collection;

    await collection.dropDatabaseAsync();
    await collection.loadDatabaseAsync();
    return true;
  }
}

export { NedbCollection };
