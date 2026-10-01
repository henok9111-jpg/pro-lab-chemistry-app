import { state, getActiveDateKey, getActiveHourlyLogs, getCurrentShift, getCurrentHourlyTime, getDefaultHourlyDate, getLocalDateTimeString, getLocalTimestamp, getShiftForHour, isWithinAllowedFutureWindow, setHourlyField, updateTargetDisplay, openSopMappingModal, closeModal, updateSettingsStats } from './state.js';
import { calcModuli, updateRawMillModuli, updateKilnFeedModuli, updateFeederRatioTotal, updateRawFeederRatioTotal, updateRawFeederMoistureLabels, getFeederValues, getRawFeederValues } from './calculations.js';
import { saveData, downloadJsonBackup, importJsonBackup, clearDatabase } from './storage.js';
import { renderDashboard, renderRawMaterialsTable, renderHourlyLogTable, renderReportTable, renderSettingsStats, renderUnitTables, setUnitHistoryDate, setUnitHistoryShift } from './render.js';

function setActiveTab(tabId) {
  const tabs = ['dashboard','raw-materials','hourly-log','moduli-calc','reports','settings'];
  tabs.forEach((t) => {
    const sec = document.getElementById(`tab-${t}`);
    const navBtn = document.getElementById(`nav-${t}`);
    if (t === tabId) {
      sec.classList.remove('hidden');
      if (navBtn) {
        navBtn.className = 'nav-tab active flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition text-teal-400 bg-teal-950/60 border border-teal-800/60';
      }
    } else {
      sec.classList.add('hidden');
      if (navBtn) {
        navBtn.className = 'nav-tab flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition text-slate-400 hover:text-slate-200 hover:bg-slate-800';
      }
    }
  });
  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'reports') renderReportTable();
}

function saveSopTargets() {
  state.sopTargets.lsfMin = parseFloat(document.getElementById('target-lsf-min').value) || 95.0;
  state.sopTargets.lsfMax = parseFloat(document.getElementById('target-lsf-max').value) || 98.0;
  state.sopTargets.smMin = parseFloat(document.getElementById('target-sm-min').value) || 2.30;
  state.sopTargets.smMax = parseFloat(document.getElementById('target-sm-max').value) || 2.70;
  saveData();
  updateTargetDisplay();
  renderDashboard();
  closeModal('modal-sop-mapping');
}

function populateLatestFeederData(unit, allowEdit = false) {
  if (!allowEdit && document.getElementById('form-hl-edit-id').value) return false;
  const unitRecords = state.hourlyLogData.filter(record => record.location === unit).sort((a, b) => String(a.datetime || '').localeCompare(String(b.datetime || '')));

  if (unit.indexOf('Cement Mill') === 0) {
    let loaded = false;
    for (let feeder = 1; feeder <= 6; feeder++) {
      const cachedName = state.latestFeederData.cement?.[`feederName${feeder}`];
      const cachedRatio = state.latestFeederData.cement?.[`feederRatio${feeder}`];
      const record = unitRecords.find(item => String(item[`feederName${feeder}`] || '').trim() || Number.isFinite(parseFloat(item[`feederRatio${feeder}`])));
      const name = String(cachedName || record?.[`feederName${feeder}`] || '').trim();
      const ratio = cachedRatio ?? record?.[`feederRatio${feeder}`] ?? '';
      if (name || ratio !== '') {
        setHourlyField(`form-hl-feeder-name-${feeder}`, name);
        loaded = true;
      }
      if (ratio !== '') setHourlyField(`form-hl-feeder-ratio-${feeder}`, ratio);
    }
    updateFeederRatioTotal();
    return loaded;
  }

  if (unit === 'Raw Mill') {
    let loaded = false;
    for (let feeder = 1; feeder <= 6; feeder++) {
      const cachedName = state.latestFeederData.raw?.[`rawFeederName${feeder}`];
      const cachedRatio = state.latestFeederData.raw?.[`rawFeederRatio${feeder}`];
      const cachedMoisture = state.latestFeederData.raw?.[`rawFeederMoisture${feeder}`];
      const record = unitRecords.find(item => String(item[`rawFeederName${feeder}`] || item[`feederName${feeder}`] || '').trim() || Number.isFinite(parseFloat(item[`rawFeederRatio${feeder}`])) || Number.isFinite(parseFloat(item[`feederRatio${feeder}`])));
      const name = String(cachedName || record?.[`rawFeederName${feeder}`] || record?.[`feederName${feeder}`] || '').trim();
      const ratio = cachedRatio ?? record?.[`rawFeederRatio${feeder}`] ?? record?.[`feederRatio${feeder}`] ?? '';
      const moisture = cachedMoisture ?? record?.[`rawFeederMoisture${feeder}`] ?? '';
      if (name || ratio !== '') {
        setHourlyField(`form-hl-raw-feeder-name-${feeder}`, name);
        loaded = true;
      }
      if (ratio !== '') setHourlyField(`form-hl-raw-feeder-ratio-${feeder}`, ratio);
      if (moisture !== '') setHourlyField(`form-hl-raw-feeder-moisture-${feeder}`, moisture);
    }
    updateRawFeederRatioTotal();
    updateRawFeederMoistureLabels();
    return loaded;
  }
  return false;
}

function setSiloOptions(unit) {
  const siloConfig = {
    'Raw Mill': { id: 'form-hl-raw-silo', count: 2 },
    'Kiln #1': { id: 'form-hl-kiln-silo', count: 3 },
    'Kiln #2': { id: 'form-hl-kiln-silo', count: 3 },
    'Cement Mill #2': { id: 'form-hl-silo', count: 2 },
    'Cement Mill #3': { id: 'form-hl-silo', count: 4 }
  };

  ['form-hl-silo','form-hl-raw-silo','form-hl-kiln-silo'].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select silo</option>';
    const config = siloConfig[unit];
    if (!config || config.id !== id) return;
    for (let silo = 1; silo <= config.count; silo++) {
      select.insertAdjacentHTML('beforeend', `<option value="${silo}">${silo}</option>`);
    }
    if (currentValue && Number(currentValue) <= config.count) select.value = currentValue;
  });
}

function toggleProcessUnitFields() {
  const unit = document.getElementById('form-hl-point').value;
  const cementFields = document.getElementById('cement-mill-fields');
  const rawFields = document.getElementById('raw-mill-fields');
  const kilnFields = document.getElementById('kiln-fields');
  const cementUnit = unit.indexOf('Cement Mill') === 0;
  const rawUnit = unit === 'Raw Mill';
  const kilnUnit = unit.indexOf('Kiln #') === 0;
  const kilnRunning = kilnUnit && document.getElementById('form-hl-kiln-status').value === 'Running';
  setSiloOptions(unit);
  cementFields.classList.toggle('hidden', !cementUnit);
  rawFields.classList.toggle('hidden', !rawUnit);
  kilnFields.classList.toggle('hidden', !kilnUnit);
  populateLatestFeederData(unit);

  ['form-hl-sio2','form-hl-al2o3','form-hl-fe2o3','form-hl-cao','form-hl-mgo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.required = rawUnit;
  });
  ['form-hl-residue-80','form-hl-raw-silo','form-hl-raw-feed-rate','form-hl-raw-separator','form-hl-mill-current', 'form-hl-raw-feeder-name-1','form-hl-raw-feeder-name-2','form-hl-raw-feeder-name-3','form-hl-raw-feeder-name-4','form-hl-raw-feeder-name-5','form-hl-raw-feeder-name-6','form-hl-raw-feeder-ratio-1','form-hl-raw-feeder-ratio-2','form-hl-raw-feeder-ratio-3','form-hl-raw-feeder-ratio-4','form-hl-raw-feeder-ratio-5','form-hl-raw-feeder-ratio-6'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.required = rawUnit;
  });
  ['form-hl-fineness-45','form-hl-fineness-80','form-hl-cement-so3','form-hl-additive','form-hl-cement-temp','form-hl-separator-hz','form-hl-silo','form-hl-feed-rate','form-hl-feeder-name-1','form-hl-feeder-name-2','form-hl-feeder-name-3','form-hl-feeder-name-4','form-hl-feeder-name-5','form-hl-feeder-name-6','form-hl-feeder-ratio-1','form-hl-feeder-ratio-2','form-hl-feeder-ratio-3','form-hl-feeder-ratio-4','form-hl-feeder-ratio-5','form-hl-feeder-ratio-6'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.required = cementUnit;
  });
  ['form-hl-clinker-free-lime','form-hl-kiln-feed-rate','form-hl-discharge-rate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.required = kilnRunning;
  });
}

function openRawMaterialModal() { document.getElementById('modal-raw-material').classList.remove('hidden'); }
function openHourlyLogModal() {
  document.getElementById('form-hl-edit-id').value = '';
  document.getElementById('hourly-log-submit').innerText = 'Save Hourly Log';
  const dateInput = document.getElementById('form-hl-date');
  const hourInput = document.getElementById('form-hl-hour');
  if (dateInput) dateInput.value = getDefaultHourlyDate();
  if (hourInput) hourInput.value = getCurrentHourlyTime();
  for (let feeder = 1; feeder <= 6; feeder++) {
    setHourlyField(`form-hl-feeder-name-${feeder}`,'');
    setHourlyField(`form-hl-feeder-ratio-${feeder}`,'');
    setHourlyField(`form-hl-raw-feeder-name-${feeder}`,'');
    setHourlyField(`form-hl-raw-feeder-ratio-${feeder}`,'');
    setHourlyField(`form-hl-raw-feeder-moisture-${feeder}`,'');
  }
  ['form-hl-silo','form-hl-feed-rate','form-hl-raw-silo','form-hl-raw-feed-rate','form-hl-raw-separator','form-hl-mill-current','form-hl-loi','form-hl-cv','form-hl-residue-80','form-hl-lsf','form-hl-sm','form-hl-am','form-hl-cement-type','form-hl-additive','form-hl-kiln-status','form-hl-kiln-sio2','form-hl-kiln-al2o3','form-hl-kiln-fe2o3','form-hl-kiln-cao','form-hl-kiln-loi','form-hl-kiln-cv','form-hl-nodule-size','form-hl-nodule-moisture','form-hl-clinker-free-lime','form-hl-clinker-loi','form-hl-kiln-feed-rate','form-hl-discharge-rate','form-hl-kiln-lsf','form-hl-kiln-sm','form-hl-kiln-am','form-hl-kiln-silo','form-hl-gypsum-moisture','form-hl-pozzolana-moisture'].forEach(id => setHourlyField(id, ''));
  setHourlyField('form-hl-cement-type', '42.5');
  setHourlyField('form-hl-kiln-status', 'Running');
  updateFeederRatioTotal();
  updateRawMillModuli();
  updateKilnFeedModuli();
  updateRawFeederRatioTotal();
  updateRawFeederMoistureLabels();
  toggleProcessUnitFields();
  document.getElementById('modal-hourly-log').classList.remove('hidden');
}

function saveRawMaterialEntry(e) {
  e.preventDefault();
  const now = getLocalDateTimeString();
  state.rawMaterialsData.unshift({
    id: Date.now(),
    datetime: now,
    recordedAt: getLocalTimestamp(),
    updatedAt: null,
    ticket: document.getElementById('form-rm-ticket').value,
    material: document.getElementById('form-rm-material').value,
    supplier: document.getElementById('form-rm-supplier').value,
    weight: parseFloat(document.getElementById('form-rm-tonnes').value),
    moisture: parseFloat(document.getElementById('form-rm-moisture').value),
    ash: parseFloat(document.getElementById('form-rm-ash').value),
    gcv: parseInt(document.getElementById('form-rm-gcv').value),
    status: 'Approved'
  });
  saveData();
  renderRawMaterialsTable();
  renderDashboard();
  closeModal('modal-raw-material');
}

function saveHourlyLogEntry(e) {
  e.preventDefault();
  const selectedDate = document.getElementById('form-hl-date').value || getDefaultHourlyDate();
  const selectedHour = document.getElementById('form-hl-hour').value || getCurrentHourlyTime();
  const timestamp = `${selectedDate} ${selectedHour}`;
  if (!isWithinAllowedFutureWindow(selectedDate, selectedHour)) {
    alert('Warning: Time is wrong. Enter a valid process date and hour that is not more than 1 hour in the future.');
    return;
  }

  const unit = document.getElementById('form-hl-point').value;
  const shift = document.getElementById('form-hl-shift').value;
  const editId = document.getElementById('form-hl-edit-id').value;
  const expectedShift = getShiftForHour(selectedHour);
  if (expectedShift && shift !== expectedShift) {
    alert(`The selected process hour ${selectedHour} belongs to ${expectedShift}. Select the matching shift before saving.`);
    return;
  }

  const s = parseFloat(document.getElementById('form-hl-sio2').value);
  const a = parseFloat(document.getElementById('form-hl-al2o3').value);
  const f = parseFloat(document.getElementById('form-hl-fe2o3').value);
  const c = parseFloat(document.getElementById('form-hl-cao').value);
  const isRawMill = unit === 'Raw Mill';
  const isKiln = unit.indexOf('Kiln #') === 0;
  const mod = isRawMill ? calcModuli(s,a,f,c) : { lsf: null, sm: null, am: null };
  const feeders = unit.indexOf('Cement Mill') === 0 ? getFeederValues() : [];
  const rawFeeders = isRawMill ? getRawFeederValues() : [];
  const feederRatioTotal = feeders.reduce((sum, feeder) => sum + (Number.isFinite(feeder.ratio) ? feeder.ratio : 0), 0);
  const rawFeederRatioTotal = rawFeeders.reduce((sum, feeder) => sum + (Number.isFinite(feeder.ratio) ? feeder.ratio : 0), 0);

  const entry = {
    id: editId ? Number(editId) : Date.now(),
    datetime: timestamp,
    shift,
    location: unit,
    sio2: isRawMill ? s : null,
    al2o3: isRawMill ? a : null,
    fe2o3: isRawMill ? f : null,
    cao: isRawMill ? c : null,
    mgo: null,
    lsf: mod.lsf,
    sm: mod.sm,
    am: mod.am,
    loi: isRawMill ? parseFloat(document.getElementById('form-hl-loi').value) || null : null,
    cv: isRawMill ? parseFloat(document.getElementById('form-hl-cv').value) || null : null,
    residue80: isRawMill ? parseFloat(document.getElementById('form-hl-residue-80').value) || null : null,
    rawSilo: isRawMill ? document.getElementById('form-hl-raw-silo').value.trim() : null,
    rawFeedRate: isRawMill ? parseFloat(document.getElementById('form-hl-raw-feed-rate').value) || null : null,
    rawSeparatorHz: isRawMill ? parseFloat(document.getElementById('form-hl-raw-separator').value) || null : null,
    millCurrent: isRawMill ? parseFloat(document.getElementById('form-hl-mill-current').value) || null : null,
    silo: unit.indexOf('Cement Mill') === 0 ? document.getElementById('form-hl-silo').value.trim() : null,
    feedRate: unit.indexOf('Cement Mill') === 0 ? parseFloat(document.getElementById('form-hl-feed-rate').value) || null : null,
    cementType: unit.indexOf('Cement Mill') === 0 ? document.getElementById('form-hl-cement-type').value : null,
    fineness45: parseFloat(document.getElementById('form-hl-fineness-45').value) || null,
    fineness80: parseFloat(document.getElementById('form-hl-fineness-80').value) || null,
    cementSo3: parseFloat(document.getElementById('form-hl-cement-so3').value) || null,
    additive: parseFloat(document.getElementById('form-hl-additive').value) || null,
    gypsumMoisture: document.getElementById('form-hl-gypsum-moisture').value === '' ? null : parseFloat(document.getElementById('form-hl-gypsum-moisture').value),
    pozzolanaMoisture: document.getElementById('form-hl-pozzolana-moisture').value === '' ? null : parseFloat(document.getElementById('form-hl-pozzolana-moisture').value),
    cementTemperature: parseFloat(document.getElementById('form-hl-cement-temp').value) || null,
    separatorHz: parseFloat(document.getElementById('form-hl-separator-hz').value) || null,
    remark: document.getElementById('form-hl-remark').value.trim(),
    status: !isRawMill || (parseFloat(mod.lsf) >= state.sopTargets.lsfMin && parseFloat(mod.lsf) <= state.sopTargets.lsfMax) ? 'Recorded' : 'Out of Spec'
  };

  const kilnNumber = (id) => {
    const value = document.getElementById(id).value;
    return value === '' ? null : parseFloat(value);
  };

  entry.kilnSio2 = isKiln ? kilnNumber('form-hl-kiln-sio2') : null;
  entry.kilnAl2o3 = isKiln ? kilnNumber('form-hl-kiln-al2o3') : null;
  entry.kilnFe2o3 = isKiln ? kilnNumber('form-hl-kiln-fe2o3') : null;
  entry.kilnCao = isKiln ? kilnNumber('form-hl-kiln-cao') : null;
  entry.kilnLoi = isKiln ? kilnNumber('form-hl-kiln-loi') : null;
  const kilnModuli = isKiln && [entry.kilnSio2, entry.kilnAl2o3, entry.kilnFe2o3, entry.kilnCao].every(value => Number.isFinite(value)) ? calcModuli(entry.kilnSio2, entry.kilnAl2o3, entry.kilnFe2o3, entry.kilnCao) : { lsf: null, sm: null, am: null };
  entry.kilnLsf = kilnModuli.lsf; entry.kilnSm = kilnModuli.sm; entry.kilnAm = kilnModuli.am;
  entry.kilnStatus = isKiln ? document.getElementById('form-hl-kiln-status').value : null;
  entry.kilnCv = isKiln ? kilnNumber('form-hl-kiln-cv') : null;
  entry.noduleSize = isKiln ? kilnNumber('form-hl-nodule-size') : null;
  entry.noduleMoisture = isKiln ? kilnNumber('form-hl-nodule-moisture') : null;
  entry.clinkerFreeLime = isKiln ? kilnNumber('form-hl-clinker-free-lime') : null;
  entry.clinkerLoi = isKiln ? kilnNumber('form-hl-clinker-loi') : null;
  entry.kilnFeedRate = isKiln ? kilnNumber('form-hl-kiln-feed-rate') : null;
  entry.dischargeRate = isKiln ? kilnNumber('form-hl-discharge-rate') : null;
  entry.kilnSilo = isKiln ? document.getElementById('form-hl-kiln-silo').value.trim() : null;

  feeders.forEach((feeder, index) => {
    const number = index + 1;
    entry[`feederName${number}`] = feeder.name;
    entry[`feederRatio${number}`] = Number.isFinite(feeder.ratio) ? feeder.ratio : null;
  });
  rawFeeders.forEach((feeder, index) => {
    const number = index + 1;
    entry[`rawFeederName${number}`] = feeder.name;
    entry[`rawFeederRatio${number}`] = Number.isFinite(feeder.ratio) ? feeder.ratio : null;
    entry[`rawFeederMoisture${number}`] = feeder.name && Number.isFinite(feeder.moisture) ? feeder.moisture : null;
  });

  if (isRawMill && Math.abs(rawFeederRatioTotal - 100) > 0.01) {
    alert(`Raw Mill WF ratios must total exactly 100%. Current total: ${rawFeederRatioTotal.toFixed(2)}%.`);
    return;
  }

  const existingIndex = state.hourlyLogData.findIndex(record => String(record.id) === String(editId));
  const existingRecord = existingIndex >= 0 ? state.hourlyLogData[existingIndex] : null;
  entry.recordedAt = existingRecord?.recordedAt || existingRecord?.createdAt || getLocalTimestamp();
  entry.updatedAt = editId ? getLocalTimestamp() : null;

  const duplicate = state.hourlyLogData.find(record => record.location === unit && String(record.datetime || '') === timestamp && record.shift === shift && String(record.id) !== String(editId));
  if (duplicate) {
    alert(`${unit} already has a sample recorded for ${selectedDate} at ${selectedHour} during ${shift}. Use the existing record to update it instead of creating a duplicate.`);
    return;
  }

  if (unit.indexOf('Cement Mill') === 0 && Math.abs(feederRatioTotal - 100) > 0.001) {
    alert(`The six weight feeder ratios must total exactly 100%. Current total: ${feederRatioTotal.toFixed(2)}%.`);
    return;
  }

  if (existingIndex >= 0) {
    state.hourlyLogData[existingIndex] = entry;
  } else {
    state.hourlyLogData.unshift(entry);
  }

  if (unit.indexOf('Cement Mill') === 0) {
    state.latestFeederData.cement = {};
    for (let feeder = 1; feeder <= 6; feeder++) {
      state.latestFeederData.cement[`feederName${feeder}`] = entry[`feederName${feeder}`];
      state.latestFeederData.cement[`feederRatio${feeder}`] = entry[`feederRatio${feeder}`];
    }
  }
  if (isRawMill) {
    state.latestFeederData.raw = {};
    for (let feeder = 1; feeder <= 6; feeder++) {
      state.latestFeederData.raw[`rawFeederName${feeder}`] = entry[`rawFeederName${feeder}`];
      state.latestFeederData.raw[`rawFeederRatio${feeder}`] = entry[`rawFeederRatio${feeder}`];
      state.latestFeederData.raw[`rawFeederMoisture${feeder}`] = entry[`rawFeederMoisture${feeder}`];
    }
  }

  document.getElementById('form-hl-date').value = getDefaultHourlyDate();
  document.getElementById('form-hl-hour').value = getCurrentHourlyTime();
  document.getElementById('form-hl-shift').value = getCurrentShift();
  document.getElementById('form-hl-edit-id').value = '';
  document.getElementById('hourly-log-submit').innerText = 'Save Hourly Log';

  saveData();
  renderHourlyLogTable();
  renderDashboard();
  renderReportTable();
  closeModal('modal-hourly-log');
}

function deleteRawMaterial(idx) {
  state.rawMaterialsData.splice(idx, 1);
  saveData();
  renderRawMaterialsTable();
  renderDashboard();
}

function deleteHourlyLog(idx) {
  state.hourlyLogData.splice(idx, 1);
  saveData();
  renderHourlyLogTable();
  renderDashboard();
  renderReportTable();
}

function loadLatestFeederData(type) {
  const unit = type === 'raw' ? 'Raw Mill' : document.getElementById('form-hl-point').value;
  const loaded = populateLatestFeederData(unit, true);
  if (!loaded) {
    alert(`No saved ${type === 'raw' ? 'Raw Mill' : 'Cement Mill'} weight feeder data was found.`);
  }
}

function switchRole(role) {
  const avatar = document.getElementById('user-avatar');
  const name = document.getElementById('user-display-name');
  const roleEl = document.getElementById('user-display-role');
  if (role === 'admin') {
    avatar.innerText = 'AD';
    name.innerText = 'Alex Morgan';
    roleEl.innerText = 'Admin / Manager';
  } else {
    avatar.innerText = 'SC';
    name.innerText = 'Sarah Chen';
    roleEl.innerText = 'Shift Lead Chemist';
  }
}

function openEditHourlyLog(index) {
  const h = state.hourlyLogData[index];
  if (!h) return;
  const parts = String(h.datetime || '').split(' ');
  setHourlyField('form-hl-edit-id', h.id);
  setHourlyField('form-hl-date', parts[0] || getDefaultHourlyDate());
  setHourlyField('form-hl-hour', parts[1] || getCurrentHourlyTime());
  setHourlyField('form-hl-point', h.location);
  setSiloOptions(h.location);
  setHourlyField('form-hl-shift', h.shift);
  setHourlyField('form-hl-sio2', h.sio2);
  setHourlyField('form-hl-al2o3', h.al2o3);
  setHourlyField('form-hl-fe2o3', h.fe2o3);
  setHourlyField('form-hl-cao', h.cao);
  setHourlyField('form-hl-fineness-45', h.fineness45);
  setHourlyField('form-hl-fineness-80', h.fineness80);
  setHourlyField('form-hl-cement-so3', h.cementSo3);
  setHourlyField('form-hl-additive', h.additive);
  setHourlyField('form-hl-silo', h.silo);
  setHourlyField('form-hl-feed-rate', h.feedRate);
  setHourlyField('form-hl-cement-type', h.cementType || '42.5');
  setHourlyField('form-hl-cement-temp', h.cementTemperature);
  setHourlyField('form-hl-separator-hz', h.separatorHz);
  setHourlyField('form-hl-gypsum-moisture', h.gypsumMoisture);
  setHourlyField('form-hl-pozzolana-moisture', h.pozzolanaMoisture);
  setHourlyField('form-hl-kiln-sio2', h.kilnSio2);
  setHourlyField('form-hl-kiln-al2o3', h.kilnAl2o3);
  setHourlyField('form-hl-kiln-fe2o3', h.kilnFe2o3);
  setHourlyField('form-hl-kiln-cao', h.kilnCao);
  setHourlyField('form-hl-kiln-loi', h.kilnLoi);
  setHourlyField('form-hl-kiln-cv', h.kilnCv);
  setHourlyField('form-hl-kiln-lsf', h.kilnLsf);
  setHourlyField('form-hl-kiln-sm', h.kilnSm);
  setHourlyField('form-hl-kiln-am', h.kilnAm);
  setHourlyField('form-hl-nodule-size', h.noduleSize);
  setHourlyField('form-hl-nodule-moisture', h.noduleMoisture);
  setHourlyField('form-hl-clinker-free-lime', h.clinkerFreeLime);
  setHourlyField('form-hl-clinker-loi', h.clinkerLoi);
  setHourlyField('form-hl-kiln-feed-rate', h.kilnFeedRate);
  setHourlyField('form-hl-discharge-rate', h.dischargeRate);
  setHourlyField('form-hl-kiln-silo', h.kilnSilo);
  setHourlyField('form-hl-kiln-status', h.kilnStatus || 'Running');
  for (let feeder = 1; feeder <= 6; feeder++) {
    setHourlyField(`form-hl-feeder-name-${feeder}`, h[`feederName${feeder}`]);
    setHourlyField(`form-hl-feeder-ratio-${feeder}`, h[`feederRatio${feeder}`]);
  }
  setHourlyField('form-hl-remark', h.remark);
  setHourlyField('form-hl-loi', h.loi);
  setHourlyField('form-hl-cv', h.cv);
  setHourlyField('form-hl-residue-80', h.residue80);
  setHourlyField('form-hl-lsf', h.lsf);
  setHourlyField('form-hl-sm', h.sm);
  setHourlyField('form-hl-am', h.am);
  setHourlyField('form-hl-raw-silo', h.rawSilo);
  setHourlyField('form-hl-raw-feed-rate', h.rawFeedRate);
  setHourlyField('form-hl-raw-separator', h.rawSeparatorHz);
  setHourlyField('form-hl-mill-current', h.millCurrent);
  for (let feeder = 1; feeder <= 6; feeder++) {
    setHourlyField(`form-hl-raw-feeder-name-${feeder}`, h[`rawFeederName${feeder}`]);
    setHourlyField(`form-hl-raw-feeder-ratio-${feeder}`, h[`rawFeederRatio${feeder}`]);
    setHourlyField(`form-hl-raw-feeder-moisture-${feeder}`, h[`rawFeederMoisture${feeder}`]);
  }
  document.getElementById('hourly-log-submit').innerText = 'Update Hourly Log';
  toggleProcessUnitFields();
  updateFeederRatioTotal();
  updateRawFeederRatioTotal();
  updateRawFeederMoistureLabels();
  updateKilnFeedModuli();
  document.getElementById('modal-hourly-log').classList.remove('hidden');
}

window.setActiveTab = setActiveTab;
window.saveSopTargets = saveSopTargets;
window.openSopMappingModal = openSopMappingModal;
window.closeModal = closeModal;
window.openRawMaterialModal = openRawMaterialModal;
window.openHourlyLogModal = openHourlyLogModal;
window.saveRawMaterialEntry = saveRawMaterialEntry;
window.saveHourlyLogEntry = saveHourlyLogEntry;
window.switchRole = switchRole;
window.deleteRawMaterial = deleteRawMaterial;
window.deleteHourlyLog = deleteHourlyLog;
window.populateLatestFeederData = populateLatestFeederData;
window.loadLatestFeederData = loadLatestFeederData;
window.toggleProcessUnitFields = toggleProcessUnitFields;
window.updateRawMillModuli = updateRawMillModuli;
window.updateKilnFeedModuli = updateKilnFeedModuli;
window.updateFeederRatioTotal = updateFeederRatioTotal;
window.updateRawFeederRatioTotal = updateRawFeederRatioTotal;
window.updateRawFeederMoistureLabels = updateRawFeederMoistureLabels;
window.openEditHourlyLog = openEditHourlyLog;
window.setUnitHistoryDate = setUnitHistoryDate;
window.setUnitHistoryShift = setUnitHistoryShift;
window.downloadJsonBackup = downloadJsonBackup;
window.importJsonBackup = importJsonBackup;
window.clearDatabase = clearDatabase;
window.runModuliCalculator = () => import('./calculations.js').then(mod => mod.runModuliCalculator());
window.updateSettingsStats = updateSettingsStats;

 document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('form-hl-date');
  const hourInput = document.getElementById('form-hl-hour');
  if (dateInput) dateInput.value = getDefaultHourlyDate();
  if (hourInput) hourInput.value = getCurrentHourlyTime();
  if (document.getElementById('form-hl-shift')) document.getElementById('form-hl-shift').value = getCurrentShift();
  updateTargetDisplay();
  renderDashboard();
  renderRawMaterialsTable();
  renderHourlyLogTable();
  renderReportTable();
  import('./calculations.js').then((mod) => mod.runModuliCalculator());
  renderSettingsStats();
  saveData();
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 1, 0);
  setTimeout(() => {
    renderHourlyLogTable();
    renderReportTable();
  }, Math.max(1000, nextDay.getTime() - now.getTime()));
});

window.addEventListener('pagehide', saveData);

export { setActiveTab, saveSopTargets, saveRawMaterialEntry, saveHourlyLogEntry, switchRole, deleteRawMaterial, deleteHourlyLog, openEditHourlyLog, loadLatestFeederData, toggleProcessUnitFields };
