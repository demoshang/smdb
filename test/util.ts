import assert from 'node:assert';

async function assertThrowsAsync(fn: Function, regExp: RegExp) {
  let f = () => {};
  try {
    await fn();
  } catch (e) {
    f = () => {
      throw e;
    };
  } finally {
    assert.throws(f, regExp);
  }
}

export { assertThrowsAsync };
