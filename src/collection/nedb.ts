import type Nedb from '@s4p/nedb';
import { Collection } from './collection';
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

class NedbCollection<T extends Document> extends Collection<T> {
  constructor(private collection: Nedb) {
    super();
  }

  public async insertOne(doc: OptionalUnlessRequiredId<T>) {
    const newDoc = await this.collection.insertAsync(doc);

    return {
      acknowledged: true,
      insertedId: newDoc._id,
    };
  }

  public async insertMany(docs: OptionalUnlessRequiredId<T>[]) {
    const list = await this.collection.insertAsync(docs);

    return {
      acknowledged: true,
      insertedCount: list.length,
      insertedIds: list.map(({ _id }) => {
        return _id;
      }),
    };
  }

  public async deleteOne(filter: Filter<T>) {
    const numRemoved = await this.collection.removeAsync(filter, {
      multi: false,
    });
    return {
      acknowledged: true,
      deletedCount: numRemoved,
    };
  }

  public async deleteMany(filter: Filter<T>) {
    const numRemoved = await this.collection.removeAsync(filter, {
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
    const { numAffected, upsert, affectedDocuments }
      = await this.collection.updateAsync(filter, document, {
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
    const { numAffected, upsert, affectedDocuments }
      = await this.collection.updateAsync(filter, document, {
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
    let cursor = this.collection.findAsync(query);

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
    const count = await this.collection.countAsync(query);

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

    await this.collection.ensureIndexAsync({
      fieldName,
      ...options,
    });

    return [...fieldName].sort().join(',');
  }

  public async dropIndex(indexName: string) {
    await this.collection.removeIndexAsync(indexName);
  }

  public async drop() {
    await this.collection.dropDatabaseAsync();
    await this.collection.loadDatabaseAsync();
    return true;
  }
}

export { NedbCollection };
