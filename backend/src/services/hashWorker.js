// Worker du pool bcrypt (services/hashPool.js).
const { parentPort } = require('worker_threads');
const bcrypt = require('bcryptjs');

parentPort.on('message', async ({ id, op, a, b }) => {
  try {
    const result = op === 'compare' ? await bcrypt.compare(a, b) : await bcrypt.hash(a, b);
    parentPort.postMessage({ id, result });
  } catch (err) {
    parentPort.postMessage({ id, error: err.message });
  }
});
