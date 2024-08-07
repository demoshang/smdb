import type {
  CreateIndexesOptions,
  DeleteResult,
  Filter,
  FindOptions,
  IndexSpecification,
  InsertManyResult,
  InsertOneResult,
  ListIndexesResult,
  OptionalUnlessRequiredId,
  UpdateFilter,
  UpdateOptions,
  UpdateResult,
  WithId,
} from '../lib-types/interface';

abstract class Collection<T> {
  public abstract insertOne(doc: OptionalUnlessRequiredId<T>): Promise<InsertOneResult>;
  public abstract insertMany(docs: OptionalUnlessRequiredId<T>[]): Promise<InsertManyResult>;

  public abstract deleteOne(filter: Filter<T>): Promise<DeleteResult>;
  public abstract deleteMany(filter: Filter<T>): Promise<DeleteResult>;

  public abstract updateOne(
    filter: Filter<T>,
    document: UpdateFilter<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult<T>>;
  public abstract updateMany(
    filter: Filter<T>,
    document: UpdateFilter<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult<T>>;

  public abstract findOne(query: Filter<T>, options?: FindOptions): Promise<(T & { _id?: any }) | null>;
  public abstract find(query: Filter<T>, options?: FindOptions): Promise<WithId<T>[]>;

  public abstract countDocuments(query?: Filter<T>): Promise<number>;

  public abstract createIndex(
    fieldOrSpec: IndexSpecification,
    options?: CreateIndexesOptions,
  ): Promise<string>;
  public abstract dropIndex(indexName: string): Promise<void>;
  public abstract listIndexes(): Promise<ListIndexesResult[]>;

  public abstract drop(): Promise<boolean>;
}

export { Collection };
