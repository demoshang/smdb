// eslint-disable-next-line test/no-import-node-test
import test from 'node:test';

import assert from 'node:assert';
import type { Collection, SubsetMongoUrl } from '../src';
import { SubsetMongo } from '../src';
import { assertThrowsAsync, pick } from './util';

const urlList = [
  'mongodb://admin:password@localhost:27017/test?authSource=admin',
  'dir://./.tmp',
  'memory://',
  'memory',
] as const;

async function importNedb() {
  if (typeof window !== 'undefined') {
    await import('@s4p/nedb/browser-version/out/nedb.min.js');
    return (window as any).Nedb;
  } else {
    const { default: Datastore } = await import('@s4p/nedb');
    return Datastore;
  }
}

async function importMongodb() {
  const { MongoClient } = await import('mongodb');
  return MongoClient;
}

async function runTest(url: SubsetMongoUrl) {
  let personCollection!: Collection<{
    name?: string;
    age?: number;
    gender?: string;
    hobbies?: string[];

    createdAt?: Date;
    updatedAt?: Date;
  }>;

  const isMongodb = url.startsWith('mongodb://');

  const Driver = isMongodb ? await importMongodb() : await importNedb();
  const smdb = new SubsetMongo(Driver);
  smdb.connect(url, { timestamp: true });

  await test(url, async (t) => {
    t.before(() => {
      personCollection = smdb.collection('person');
    });

    t.after(async () => {
      await personCollection.drop();
      await smdb.disconnect();
    });

    t.beforeEach(async () => {
      await personCollection.deleteMany({});
    });

    await t.test('insertOne && findOne', async () => {
      const name = `insertOne ${Date.now()}`;

      const result = await personCollection.insertOne({
        name,
      });
      assert.ok(result.insertedId);

      const nu = await personCollection.countDocuments({ name });

      assert.strictEqual(nu, 1);

      const person = await personCollection.findOne({ name });
      assert.strictEqual(person?.name, name);
    });

    await t.test('insertMany && find', async () => {
      const name1 = `insert 1 ${Date.now()}`;
      const name2 = `insert 2 ${Date.now()}`;

      const result = await personCollection.insertMany([
        {
          name: name1,
        },
        {
          name: name2,
        },
      ]);
      assert.strictEqual(Object.keys(result.insertedIds).length, 2);

      const persons = await personCollection.find(
        {},
        { sort: { name: -1 }, skip: 0 },
      );
      const arr = persons.map(({ name }) => {
        return name;
      });

      assert.deepEqual([name2, name1], arr);
    });

    await t.test('countDocuments && updateOne && updateMany', async () => {
      const name1 = `insert 1 ${Date.now()}`;
      const name2 = `insert 2 ${Date.now()}`;
      const name3 = `insert 3 ${Date.now()}`;

      await personCollection.insertMany([
        {
          name: name1,
          age: 20,
        },
        {
          name: name2,
          age: 20,
        },
      ]);

      let nu = await personCollection.countDocuments({});
      assert.strictEqual(nu, 2);

      const updateManyResult = await personCollection.updateMany({ age: 20 }, { $set: { age: 50 } });
      assert.deepEqual(pick(updateManyResult, ['acknowledged', 'matchedCount', 'upsertedId']), { acknowledged: true, matchedCount: 2, upsertedId: null });
      nu = await personCollection.countDocuments({ age: 50 });
      assert.strictEqual(nu, 2);

      const updateResult = await personCollection.updateOne({ age: 50 }, { $set: { age: 20 } });
      assert.deepEqual(pick(updateResult, ['acknowledged', 'matchedCount', 'upsertedId']), { acknowledged: true, matchedCount: 1, upsertedId: null });

      nu = await personCollection.countDocuments({ age: 20 });
      assert.strictEqual(nu, 1);

      const upsertResult = await personCollection.updateOne(
        { name: name3 },
        { $set: { age: 20 }, $setOnInsert: { tmp: 'tmp' } },
        { upsert: true },
      );
      assert.ok(upsertResult.upsertedId);
      nu = await personCollection.countDocuments({ name: name3 });
      assert.strictEqual(nu, 1);

      const doc1 = await personCollection.findOne({ name: name3 });
      assert.deepEqual(pick(doc1, ['name', 'age', 'tmp']), { name: name3, age: 20, tmp: 'tmp' });
      assert.ok(doc1?.createdAt);
      assert.ok(doc1?.updatedAt);

      await new Promise((rs) => {
        setTimeout(rs, 5);
      });

      await personCollection.updateOne(
        { name: name3 },
        { $set: { age: 0 } },
      );

      const doc2 = await personCollection.findOne({ name: name3 });
      assert.deepEqual(pick(doc2, ['name', 'age', 'tmp']), { name: name3, age: 0, tmp: 'tmp' });
      assert.ok(doc2?.createdAt);
      assert.ok(doc2?.updatedAt);

      assert.ok(doc1.createdAt.getTime() === doc2.createdAt.getTime());
      assert.ok(doc1.updatedAt.getTime() < doc2.updatedAt.getTime());
    });

    await t.test('deleteOne && deleteMany', async () => {
      const name1 = `insert 1 ${Date.now()}`;
      const name2 = `insert 2 ${Date.now()}`;
      const name3 = `insert 3 ${Date.now()}`;

      await personCollection.insertMany([
        {
          name: name1,
          age: 20,
        },
        {
          name: name2,
          age: 20,
        },
        {
          name: name3,
          age: 20,
        },
      ]);

      let nu = await personCollection.countDocuments({});
      assert.strictEqual(nu, 3);

      let result = await personCollection.deleteOne({ age: 20 });
      assert.strictEqual(result.deletedCount, 1);
      nu = await personCollection.countDocuments({});
      assert.strictEqual(nu, 2);

      result = await personCollection.deleteMany({ age: 20 });
      assert.strictEqual(result.deletedCount, 2);
      nu = await personCollection.countDocuments({});
      assert.strictEqual(nu, 0);
    });

    await t.test('createIndex && dropIndex', async () => {
      await personCollection.createIndex('name', { unique: true });
      await personCollection.createIndex('age', { unique: true });

      await personCollection.insertOne({ name: 'name', age: 18 });

      await assertThrowsAsync(async () => {
        await personCollection.insertOne({ name: 'name' });
      }, /unique|duplicate/);

      await assertThrowsAsync(async () => {
        await personCollection.updateOne(
          { name: 'name2' },
          { $set: { age: 18 } },
          { upsert: true },
        );
      }, /unique|duplicate/);

      await personCollection.createIndex({ name: 1, age: 1 }, { unique: true });

      const indexList = await personCollection.listIndexes();

      if (isMongodb) {
        assert.deepEqual(['_id_', 'name_1', 'age_1', 'name_1_age_1'], indexList.map(({ name }) => {
          return name;
        }));
      } else {
        assert.deepEqual(['_id', 'name', 'age', 'age,name'], indexList.map(({ name }) => {
          return name;
        }));
      }

      isMongodb ? await personCollection.dropIndex('name_1') : await personCollection.dropIndex('name');
      await personCollection.insertOne({ name: 'name' });
    });

    await t.test('more $ action', async () => {
      await personCollection.insertOne({ name: 'name', age: 20 });

      let nu = await personCollection.countDocuments({ age: { $gte: 20 } });
      assert.strictEqual(nu, 1);

      nu = await personCollection.countDocuments({
        $and: [{ age: { $gte: 20 } }, { name: 'name' }],
      });
      assert.strictEqual(nu, 1);

      nu = await personCollection.countDocuments({
        name: /naM/i,
      });
      assert.strictEqual(nu, 1);

      nu = await personCollection.countDocuments({
        name: {
          $regex: 'naM',
          $options: 'i',
        },
      });
      assert.strictEqual(nu, 1);

      nu = await personCollection.countDocuments({
        age: {
          $mod: [19, 1],
        },
      });
      assert.strictEqual(nu, 1);

      nu = await personCollection.countDocuments({
        name: {
          $in: ['name', 'name1'],
        },
      });
      assert.strictEqual(nu, 1);

      nu = await personCollection.countDocuments({
        name: {
          $eq: 'name',
        },
      });
      assert.strictEqual(nu, 1);

      nu = await personCollection.countDocuments({
        sex: {
          $exists: true,
        },
      });
      assert.strictEqual(nu, 0);
      nu = await personCollection.countDocuments({
        name: {
          $exists: true,
        },
      });
      assert.strictEqual(nu, 1);

      const p1 = await personCollection.findOne({ name: 'name' });
      await new Promise((rs) => {
        setTimeout(rs, 5);
      });
      await personCollection.updateOne({ name: 'name' }, { $inc: { age: 1 } });
      const p2 = await personCollection.findOne({ name: 'name' });

      assert.ok((p1?.updatedAt || 0) < (p2?.updatedAt || 0));
      assert.strictEqual(p2?.age, 21);

      const p3 = await personCollection.findOne({ $where() {
        return (this.age === p2.age);
      } });
      assert.strictEqual(`${p2._id}`, `${p3?._id}`);

      await personCollection.updateOne({ name: 'name' }, { $mul: { age: 2 } });
      const p4 = await personCollection.findOne({ name: 'name' });
      assert.strictEqual(p4?.age, 42);

      await personCollection.updateOne(
        { name: 'name' },
        { $set: { hobbies: ['a', 'b'] } },
      );
      nu = await personCollection.countDocuments({
        hobbies: { $elemMatch: { $in: ['a'] } },
      });
      assert.strictEqual(nu, 1);

      await personCollection.updateOne(
        { name: 'name' },
        { $push: { hobbies: 'c' } },
      );
      let doc = await personCollection.findOne({ name: 'name' });
      assert.strictEqual(doc?.hobbies?.length, 3);

      await personCollection.updateOne(
        { name: 'name' },
        { $addToSet: { hobbies: 'a' } },
      );
      doc = await personCollection.findOne({ name: 'name' });
      assert.strictEqual(doc?.hobbies?.length, 3);

      await personCollection.updateOne(
        { name: 'name' },
        { $pull: { hobbies: 'a' } },
      );
      doc = await personCollection.findOne({ name: 'name' });
      assert.strictEqual(doc?.hobbies?.length, 2);

      await personCollection.updateOne(
        { name: 'name' },
        { $push: { hobbies: { $each: ['a', 'b'] } } },
      );
      doc = await personCollection.findOne({ name: 'name' });
      assert.strictEqual(doc?.hobbies?.length, 4);
    });
  });
}

(async () => {
  for (const url of urlList) {
    await runTest(url);
  }
})();
