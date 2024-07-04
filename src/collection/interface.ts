import type { AlternativeType, FilterOperators, FindOperators, InferIdType, MatchKeysAndValues, OneOrMore, OnlyFieldsOfType, PullOperator, PushOperator, RootFilterOperators, SetFields, WithId } from 'mongodb';

export type Document = Parameters<FindOperators['replaceOne']>['0'];

export type { DeleteResult, InsertManyResult, InsertOneResult, OptionalUnlessRequiredId, WithId } from 'mongodb';

export declare type Condition<T> = AlternativeType<T> | Pick<FilterOperators<AlternativeType<T>>, '$eq' | '$exists' | '$gt' | '$gte' | '$in' | '$lt' | '$lte' | '$ne' | '$nin' | '$not' | '$elemMatch' | '$size'>;

export declare type Filter<TSchema> = {
  [P in keyof WithId<TSchema>]?: Condition<WithId<TSchema>[P]>;
} & Omit<RootFilterOperators<WithId<TSchema>>, '$text' | '$comment' | '$nor'>;

export declare type IntegerType = number | bigint;

export declare type NumericType = IntegerType;

//  Update
export interface UpdateFilter<TSchema> {
  $inc?: OnlyFieldsOfType<TSchema, NumericType | undefined>;
  $min?: MatchKeysAndValues<TSchema>;
  $max?: MatchKeysAndValues<TSchema>;
  $mul?: OnlyFieldsOfType<TSchema, NumericType | undefined>;
  $set?: MatchKeysAndValues<TSchema>;
  $setOnInsert?: MatchKeysAndValues<TSchema>;
  $unset?: OnlyFieldsOfType<TSchema, any, '' | true | 1>;
  $addToSet?: SetFields<TSchema>;
  $pop?: OnlyFieldsOfType<TSchema, ReadonlyArray<any>, 1 | -1>;
  $pull?: PullOperator<TSchema>;
  $push?: PushOperator<TSchema>;
}

export interface UpdateOptions {
  upsert: boolean;
}

export declare interface UpdateResult<TSchema> {
  acknowledged: boolean;
  /** The number of documents that matched the filter */
  matchedCount: number;
  /** The number of documents that were modified */
  // modifiedCount: number;
  /** The number of documents that were upserted */
  // upsertedCount: number;
  /** The identifier of the inserted document if an upsert took place */
  upsertedId: InferIdType<TSchema> | null | string;
}

// INDEX
export declare type IndexDirection = -1 | 1;

export declare type IndexSpecification = OneOrMore<string | [string, IndexDirection] | {
  [key: string]: IndexDirection;
} | Map<string, IndexDirection>>;

export interface CreateIndexesOptions {
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
}

export interface ListIndexesResult {
  v: number;
  key: Record<string, number>;
  name: string;
}

// FIND
export declare interface FindOptions {
  limit?: number;
  sort?: Sort;
  projection?: Document;
  skip?: number;
}

export declare type SortDirection = 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending';

export declare type Sort = string | Exclude<SortDirection, {
  $meta: string;
}> | string[] | {
  [key: string]: SortDirection;
} | Map<string, SortDirection> | [string, SortDirection][] | [string, SortDirection];
// FIND
