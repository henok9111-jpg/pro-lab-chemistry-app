import { state } from './state.js';

export function calcModuli(s, a, f, c) {
  const denomLSF = (2.8 * s) + (1.2 * a) + (0.65 * f);
  const lsf = denomLSF > 0 ? (c / denomLSF) * 100 : 0;
  const sm = (a + f) > 0 ? s / (a + f) : 0;
  const am = f > 0 ? a / f : 0;
  return { lsf: lsf.toFixed(1), sm: sm.toFixed(2), am: am.toFixed(2) };
}

export function runModuliCalculator() {
  const s = parseFloat(document.getElementById('calc-sio2').value) || 0;
  const a = parseFloat(document.getElementById('calc-al2o3').value) || 0;
  const f = parseFloat(document.getElementById('calc-fe2o3').value) || 0;
  const c = parseFloat(document.getElementById('calc-cao').value) || 0;
  const so3 = parseFloat(document.getElementById('calc-so3').value) || 0;

  const mod = calcModuli(s, a, f, c);
  document.getElementById('calc-out-lsf').innerText = mod.lsf;
  document.getElementById('calc-out-sm').innerText = mod.sm;
  document.getElementById('calc-out-am').innerText = mod.am;

  const c3s = (4.071 * c) - (7.600 * s) - (6.718 * a) - (1.430 * f) - (2.852 * so3);
  const c2s = (2.867 * s) - (0.7544 * Math.max(0, c3s));
  const c3a = (2.650 * a) - (1.692 * f);
  const c4af = 3.043 * f;

  document.getElementById('calc-out-c3s').innerText = `${Math.max(0, c3s).toFixed(1)}%`;
  document.getElementById('calc-out-c2s').innerText = `${Math.max(0, c2s).toFixed(1)}%`;
  document.getElementById('calc-out-c3a').innerText = `${Math.max(0, c3a).toFixed(1)}%`;
  document.getElementById('calc-out-c4af').innerText = `${Math.max(0, c4af).toFixed(1)}%`;
}

export function updateRawMillModuli() {
  const ids = ['form-hl-sio2','form-hl-al2o3','form-hl-fe2o3','form-hl-cao'];
  if (ids.some(id => !document.getElementById(id))) return;
  const mod = calcModuli(
    parseFloat(document.getElementById('form-hl-sio2').value) || 0,
    parseFloat(document.getElementById('form-hl-al2o3').value) || 0,
    parseFloat(document.getElementById('form-hl-fe2o3').value) || 0,
    parseFloat(document.getElementById('form-hl-cao').value) || 0
  );
  const lsf = document.getElementById('form-hl-lsf');
  const sm = document.getElementById('form-hl-sm');
  const am = document.getElementById('form-hl-am');
  if (lsf) lsf.value = mod.lsf;
  if (sm) sm.value = mod.sm;
  if (am) am.value = mod.am;
}

export function updateKilnFeedModuli() {
  const ids = ['form-hl-kiln-sio2','form-hl-kiln-al2o3','form-hl-kiln-fe2o3','form-hl-kiln-cao'];
  if (ids.some(id => !document.getElementById(id))) return;
  const values = ids.map(id => parseFloat(document.getElementById(id).value));
  const complete = values.every(value => Number.isFinite(value) && value > 0);
  if (!complete) {
    const targetEls = ['form-hl-kiln-lsf','form-hl-kiln-sm','form-hl-kiln-am'];
    targetEls.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    return;
  }
  const mod = calcModuli(values[0], values[1], values[2], values[3]);
  document.getElementById('form-hl-kiln-lsf').value = mod.lsf;
  document.getElementById('form-hl-kiln-sm').value = mod.sm;
  document.getElementById('form-hl-kiln-am').value = mod.am;
}

export function getFeederValues() {
  return Array.from({ length: 6 }, (_, index) => {
    const id = index + 1;
    return {
      name: document.getElementById(`form-hl-feeder-name-${id}`).value.trim(),
      ratio: parseFloat(document.getElementById(`form-hl-feeder-ratio-${id}`).value)
    };
  });
}

export function getRawFeederValues() {
  return Array.from({ length: 6 }, (_, index) => {
    const id = index + 1;
    return {
      name: document.getElementById(`form-hl-raw-feeder-name-${id}`).value.trim(),
      ratio: parseFloat(document.getElementById(`form-hl-raw-feeder-ratio-${id}`).value),
      moisture: parseFloat(document.getElementById(`form-hl-raw-feeder-moisture-${id}`).value)
    };
  });
}

export function updateRawFeederMoistureLabels() {
  for (let i = 1; i <= 6; i++) {
    const name = document.getElementById(`form-hl-raw-feeder-name-${i}`)?.value.trim();
    const moisture = document.getElementById(`form-hl-raw-feeder-moisture-${i}`);
    if (moisture) moisture.placeholder = name ? `${name} (%)` : 'No';
  }
}

export function updateRawFeederRatioTotal() {
  const total = getRawFeederValues().reduce((sum, feeder) => sum + (Number.isFinite(feeder.ratio) ? feeder.ratio : 0), 0);
  const display = document.getElementById('raw-feeder-ratio-total');
  if (display) display.innerText = `Total: ${total.toFixed(2)}%`;
}

export function updateFeederRatioTotal() {
  const total = getFeederValues().reduce((sum, feeder) => sum + (Number.isFinite(feeder.ratio) ? feeder.ratio : 0), 0);
  const display = document.getElementById('feeder-ratio-total');
  if (display) {
    display.innerText = `Total ratio: ${total.toFixed(2)}%`;
    display.className = total === 100 ? 'text-xs font-bold text-emerald-300' : 'text-xs font-bold text-amber-300';
  }
  return total;
}
