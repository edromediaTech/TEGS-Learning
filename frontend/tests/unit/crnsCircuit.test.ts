// Tests des calculs electriques des TP CRNS. Usage : node --test tests/unit/ (Node 24, types effaces).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactPower, current, exceedsRating, fr, heatLevel, steadyTemperature, stepTemperature } from '../../utils/crnsCircuit.ts';

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('P = U x I : ampoule de 60 W sous 230 V', () => {
  close(current(60, 230), 0.2609, 1e-4);
  close(current(3060, 230), 13.3043, 1e-4);
  assert.equal(current(60, 0), 0);
});

test('echauffement d\'un contact : P = R x I^2', () => {
  close(contactPower(0.1, 13.3), 17.689, 1e-3); // vis desserree, forte charge : ~18 W
  close(contactPower(0.002, 13.3), 0.35378, 1e-4); // vis serree : negligeable
  close(contactPower(0.1, 0.26), 0.00676, 1e-5); // ampoule seule : negligeable meme desserree
});

test('temperature de regime et evolution du premier ordre', () => {
  close(steadyTemperature(17.689, 4, 25), 95.756, 1e-3);
  close(stepTemperature(25, 95, 6, 6), 95 - 70 * Math.exp(-1));
  close(stepTemperature(25, 95, 0, 6), 25);
  assert.equal(stepTemperature(25, 95, 1, 0), 95);
  // convergence
  let t = 25;
  for (let i = 0; i < 600; i++) t = stepTemperature(t, 95, 0.1, 6);
  close(t, 95, 0.1);
});

test('niveaux de chaleur et calibre', () => {
  const th = { warm: 45, danger: 70 };
  assert.equal(heatLevel(30, th), 'normal');
  assert.equal(heatLevel(45, th), 'chaud');
  assert.equal(heatLevel(96, th), 'danger');
  assert.equal(exceedsRating(13.3, 16), false); // le disjoncteur ne voit rien : le danger vient du serrage
  assert.equal(exceedsRating(17, 16), true);
});

test('format francais', () => {
  assert.equal(fr(0.2609, 2), '0,26');
  assert.match(fr(3060, 0), /^3\s?060$/u);
});
