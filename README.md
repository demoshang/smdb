# SMDB

A subset of MongoDB's API (the most used operations) simple database, support mongo / memory / file driver

![npm version](https://img.shields.io/npm/v/@s4p/smdb)

## How to use

1. connet to db

   ```ts
   import { SubsetMongo } from '@s4p/smdb';

   // mongodb
   const smdb = new SubsetMongo('mongodb://localhost:27017/test', { timestamp: true });

   // memory
   const smdb = new SubsetMongo('memory');

   // dir (file storage)
   const smdb = new SubsetMongo('dir:///some/absolute/dir', { timestamp: true });

   // disconnect
   await smdb.disconnect();
   ```

2. create / get collection

   ```ts
   const personCollection = await smdb.collection('person');
   ```

3. `collection CRUD`

```ts
insertOne(doc: OptionalUnlessRequiredId<T>): Promise<InsertOneResult>;
insertMany(docs: OptionalUnlessRequiredId<T>[]): Promise<InsertManyResult>;

deleteOne(filter: Filter<T>): Promise<DeleteResult>;
deleteMany(filter: Filter<T>): Promise<DeleteResult>;

updateOne(
  filter: Filter<T>,
  document: UpdateFilter<T>,
  options?: UpdateOptions,
): Promise<UpdateResult<T>>;
updateMany(
  filter: Filter<T>,
  document: UpdateFilter<T>,
  options?: UpdateOptions,
): Promise<UpdateResult<T>>;

findOne(query: Filter<T>, options?: FindOptions): Promise<(T & { _id?: any }) | null>;
find(query: Filter<T>, options?: FindOptions): Promise<WithId<T>[]>;

countDocuments(query?: Filter<T>): Promise<number>;

createIndex(
  fieldOrSpec: IndexSpecification,
  options?: CreateIndexesOptions,
): Promise<string>;
dropIndex(indexName: string): Promise<void>;
listIndexes(): Promise<ListIndexesResult[]>;

drop(): Promise<boolean>;
```

## Thanks

[Nedb](https://github.com/seald/nedb)

## License

MIT
