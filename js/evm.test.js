/* evm.test.js — jalankan dengan: node js/evm.test.js
 * Tanpa framework: pakai assert bawaan Node. Exit code != 0 jika ada yang gagal.
 */
'use strict';
var assert = require('assert');
var EVM = require('./evm.js');

var pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '  → ' + e.message); }
}
function approx(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-9); }

console.log('SPI / variance');
test('SPI = aktual/rencana', function () {
  var r = EVM.calcSchedule(50, 40);
  assert.ok(approx(r.spi, 0.8), 'spi ' + r.spi);
  assert.strictEqual(r.variance, -10);
});
test('rencana 0 → SPI null (tak terdefinisi, bukan Infinity)', function () {
  assert.strictEqual(EVM.calcSchedule(0, 30).spi, null);
});
test('input string/kosong ditoleransi', function () {
  var r = EVM.calcSchedule('60', '');
  assert.strictEqual(r.actual, 0);
  assert.ok(approx(r.spi, 0));
});

console.log('Forecast jadwal');
test('proyek telat → finish mundur, delay positif', function () {
  // 100 hari rencana, SPI 0.5 → durasi efektif 200 hari → telat ~100 hari
  var fc = EVM.calcForecast('2026-01-01', '2026-04-11', 0.5, 40);
  assert.ok(fc.finish instanceof Date);
  assert.ok(fc.delayDays > 90 && fc.delayDays < 110, 'delay ' + fc.delayDays);
});
test('aktual ≥ 99.5% → tidak ada forecast (sudah hampir selesai)', function () {
  var fc = EVM.calcForecast('2026-01-01', '2026-04-11', 0.5, 99.6);
  assert.strictEqual(fc.finish, null);
  assert.strictEqual(fc.delayDays, null);
});
test('tanggal tidak lengkap → null aman', function () {
  assert.strictEqual(EVM.calcForecast(null, '2026-04-11', 0.8, 50).finish, null);
});

console.log('CPI / EAC / serapan');
test('CPI & EAC dasar', function () {
  // RAB 1000, aktual 50% → EV 500; earned 400 → CPI 1.25; EAC 1000/1.25 = 800
  var c = EVM.calcCost(1000, 450, 400, 50);
  assert.ok(approx(c.ev, 500));
  assert.ok(approx(c.cpi, 1.25), 'cpi ' + c.cpi);
  assert.ok(approx(c.eac, 800), 'eac ' + c.eac);
  assert.ok(approx(c.eacOver, -200));
  assert.ok(approx(c.serap, 45)); // 450/1000
});
test('earned 0 → CPI null & EAC null (hindari bagi nol)', function () {
  var c = EVM.calcCost(1000, 100, 0, 20);
  assert.strictEqual(c.cpi, null);
  assert.strictEqual(c.eac, null);
});
test('over-budget: CPI<1 → EAC>RAB, eacOver positif', function () {
  var c = EVM.calcCost(1000, 700, 800, 50); // EV 500, earned 800 → CPI 0.625
  assert.ok(c.cpi < 1);
  assert.ok(c.eac > 1000 && c.eacOver > 0, 'eacOver ' + c.eacOver);
});

console.log('Orkestrator analyze()');
test('analyze menggabungkan semuanya konsisten', function () {
  var a = EVM.analyze({
    plan: 50, actual: 40, mulai: '2026-01-01', selesai: '2026-04-11',
    rabTotal: 1000, costReal: 450, costEarned: 400
  });
  assert.ok(approx(a.spi, 0.8));        // 40/50
  assert.ok(approx(a.cpi, 1.0));        // EV 400 / earned 400
  assert.ok(a.fcDelay > 20);            // SPI 0.8 → telat ~25 hari
});

console.log('Earned Schedule calcES()');
// Kurva rencana: minggu 1..4 → cPlan 25/50/75/100 (calcES menambah origin {0,0})
var CURVE = [{ w: 1, c: 25 }, { w: 2, c: 50 }, { w: 3, c: 75 }, { w: 4, c: 100 }];
test('pd = minggu saat plan capai 100%', function () {
  assert.ok(approx(EVM.calcES(CURVE, 50).pd, 4), 'pd ' + EVM.calcES(CURVE, 50).pd);
});
test('aktual 50% → ES = 2 mgg (plan 50% di minggu 2)', function () {
  assert.ok(approx(EVM.calcES(CURVE, 50).es, 2));
});
test('aktual 0% → ES = 0', function () {
  assert.strictEqual(EVM.calcES(CURVE, 0).es, 0);
});
test('interpolasi: aktual 60% → ES 2.4 mgg', function () {
  assert.ok(approx(EVM.calcES(CURVE, 60).es, 2.4), 'es ' + EVM.calcES(CURVE, 60).es);
});
test('aktual 100% → ES = PD (on-schedule jika waktu = pd)', function () {
  var r = EVM.calcES(CURVE, 100);
  assert.ok(approx(r.es, 4) && approx(r.pd, 4));
});
test('aktual melebihi plan maksimum → ES = minggu terakhir', function () {
  assert.ok(approx(EVM.calcES(CURVE, 110).es, 4));
});
test('kurva kosong → null', function () {
  assert.strictEqual(EVM.calcES([], 50), null);
});
test('kurva tak pernah capai 100% → pd = minggu terakhir', function () {
  assert.ok(approx(EVM.calcES([{ w: 2, c: 40 }], 20).pd, 2));
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
