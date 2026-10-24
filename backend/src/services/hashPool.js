/**
 * bcrypt hors du fil principal (etape E7).
 *
 * bcryptjs calcule en JavaScript sur le fil principal : quand une salle de 20 eleves se
 * connecte a la meme seconde, les 20 verifications de PIN (cout 12, ~200 ms chacune)
 * passent l'une apres l'autre et bloquent tout le serveur. Ce pool les repartit sur
 * plusieurs coeurs (worker_threads). Memes empreintes, meme cout : rien ne change pour
 * les PIN deja emis. En cas de probleme de worker, repli sur le fil principal.
 */
const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');
const bcrypt = require('bcryptjs');

const SIZE = Math.max(1, Math.min(4, (os.availableParallelism?.() || os.cpus().length) - 1));
const workers = [];
const pending = new Map();
let nextId = 0;
let disabled = false;

function spawn() {
  const w = new Worker(path.join(__dirname, 'hashWorker.js'));
  w.busy = 0;
  w.on('message', ({ id, result, error }) => {
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    w.busy -= 1;
    if (error) p.reject(new Error(error));
    else p.resolve(result);
  });
  w.on('error', () => { disabled = true; });
  w.unref();
  return w;
}

function run(op, a, b) {
  if (disabled) return op === 'compare' ? bcrypt.compare(a, b) : bcrypt.hash(a, b);
  if (workers.length < SIZE) workers.push(spawn());
  const w = workers.reduce((x, y) => (y.busy < x.busy ? y : x));
  const id = ++nextId;
  w.busy += 1;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, op, a, b });
  });
}

module.exports = {
  compare: (plain, hash) => run('compare', String(plain), String(hash)),
  hash: (plain, cost) => run('hash', String(plain), cost),
  POOL_SIZE: SIZE,
};
