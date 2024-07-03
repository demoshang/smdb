// eslint-disable-next-line test/no-import-node-test
import test from 'node:test';

import assert from 'node:assert';
import type { Collection, SubsetMongoUrl } from '../src';
import { SubsetMongo } from '../src';
import { assertThrowsAsync, pick } from './util';

const urlList = [
  'mongodb://admin:password@localhost:27017,localhost:27027,localhost:27037/test?authSource=admin',
  'memory',
  'memory://',
  'dir://./.tmp',
] as const;

async function runTest(url: SubsetMongoUrl) {
  let personCollection!: Collection<{
    name?: string;
    age?: number;
    gender?: string;
    hobbies?: string[];
  }>;

  const smdb = new SubsetMongo(url);

  const isMongodb = url.startsWith('mongodb://');

  await test(url, async (t) => {
    t.before(async () => {
      personCollection = await smdb.collection('person');
    });

    t.after(async () => {
      await personCollection.drop();
      await smdb.disconnect();
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
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

      const doc = await personCollection.findOne({ name: name3 });
      const { _id, ...tmp } = doc || {};
      assert.deepEqual(tmp, { name: name3, age: 20, tmp: 'tmp' });
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
        name: {
          $in: ['name', 'name1'],
        },
      });
      assert.strictEqual(nu, 1);

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
