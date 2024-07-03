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

function pick(obj: Record<string, any> | null, keys: string[]) {
  if (!obj) {
    return obj;
  }

  return Object.fromEntries(
    keys.map((key) => {
      return [key, obj[key]];
    }),
  );
}

export { assertThrowsAsync, pick };
