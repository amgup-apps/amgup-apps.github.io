/* Tuner Journal: tonos de referencia para la puerta G2 (P9; diseño 3.4 y 16.5, paso 4).
   Cada tono es exacto: lo arma el navegador con WebAudio (OscillatorNode con una onda de armónicos), sin red y sin archivos de sonido.
   A4 440 Hz · A4 + 10 cents (442.55 Hz) · E2 82.41 Hz (sonido de cuerda) · E1 41.20 Hz (sonido de bajo con armónicos: la bocina de una PC casi no da la fundamental).
   Las frecuencias salen de la fórmula de la app: f = 440 × 2^((n − 69) / 12) (core-notas.js). La misma onda se arma en un OfflineAudioContext para la prueba
   (herramientas/probar-tono.py lee esos tonos con el detector de la app y pide ≤ 0.1 cents en cada uno). ES5, sin librerías. */
(function (root) {
  'use strict';
  function hzDe(midi, cents) { return 440 * Math.pow(2, (midi - 69) / 12 + (cents || 0) / 1200); }
  var ONDA_REF = [0, 1, 0.45, 0.25, 0.12, 0.06];                                   // la del tono de referencia de la app (ui-afinador.js)
  var ONDA_CUERDA = [0, 1, 0.8, 0.55, 0.42, 0.3, 0.22, 0.15, 0.1, 0.07, 0.05];        // muchos armónicos, como una cuerda
  var ONDA_BAJO = [0, 0.6, 1, 0.9, 0.7, 0.5, 0.36, 0.25, 0.16, 0.1, 0.06];            // fundamental baja y armónicos fuertes, como un bajo por una bocina chica
  var TONOS = [
    { id: 'a4', midi: 69, cents: 0, note: 'A4', onda: ONDA_REF },
    { id: 'a4p10', midi: 69, cents: 10, note: 'A4 + 10 cents', onda: ONDA_REF },
    { id: 'e2', midi: 40, cents: 0, note: 'E2', onda: ONDA_CUERDA },
    { id: 'e1', midi: 28, cents: 0, note: 'E1', onda: ONDA_BAJO }
  ];
  var i;
  for (i = 0; i < TONOS.length; i++) TONOS[i].hz = hzDe(TONOS[i].midi, TONOS[i].cents);
  function tono(id) { for (var k = 0; k < TONOS.length; k++) if (TONOS[k].id === id) return TONOS[k]; return null; }
  function armar(ctx, t, vol, t0) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(t.onda), new Float32Array(t.onda.length)));
    osc.frequency.value = t.hz;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.05);
    osc.connect(g); g.connect(ctx.destination); osc.start(t0);
    return { osc: osc, g: g };
  }
  var S = { ctx: null, cur: null, id: null, vol: 0.3 };
  function stop() {
    if (!S.cur) return;
    var c = S.cur, now = S.ctx.currentTime; S.cur = null; S.id = null;
    try { c.g.gain.cancelScheduledValues(now); c.g.gain.setTargetAtTime(0, now, 0.02); c.osc.stop(now + 0.15); } catch (e) { /* ya parado */ }
  }
  function play(id) {
    var AC = root.AudioContext || root.webkitAudioContext, t = tono(id);
    if (!AC || !t) return false;
    stop();
    S.ctx = S.ctx || new AC();
    if (S.ctx.resume) S.ctx.resume();
    S.cur = armar(S.ctx, t, S.vol, S.ctx.currentTime); S.id = id;
    return true;
  }
  function setVol(v) { S.vol = Math.max(0.02, Math.min(0.6, v)); if (S.cur) S.cur.g.gain.setTargetAtTime(S.vol, S.ctx.currentTime, 0.03); }
  /** Para la prueba: el mismo tono en un OfflineAudioContext (mono). Devuelve una promesa con las muestras. */
  function render(id, secs, rate) {
    var OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext, t = tono(id), n, ctx;
    rate = rate || 48000; n = Math.round((secs || 3) * rate);
    ctx = new OAC(1, n, rate);
    armar(ctx, t, 0.3, 0);
    return ctx.startRendering().then(function (buf) { return buf.getChannelData(0); });
  }
  root.TJTono = { TONOS: TONOS, hzDe: hzDe, play: play, stop: stop, setVol: setVol, render: render, playing: function () { return S.id; } };
})(this);
