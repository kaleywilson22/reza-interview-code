export const createPromiseFactory = (
  toExecute: (...args: any[]) => any,
  timeout: number
) => {
  return async function () {
    return new Promise<void | never>((resolve) => {
      setTimeout(async () => {
        await toExecute();
        resolve();
      }, timeout);
    });
  };
};

export const executeSequentially = async (
  promiseFactories: (() => Promise<void>)[]
) => {
  for (const p of promiseFactories) {
    await p();
  }
};
