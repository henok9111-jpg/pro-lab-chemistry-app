export const state = {
  sopTargets: JSON.parse(localStorage.getItem('prolab_sop')) || {
    lsfMin: 95.0,
    lsfMax: 98.0,
    smMin: 2.30,
    smMax: 2.70,
  },
  rawMaterialsData: JSON.parse(localStorage.getItem('prolab_rm')) || [
    { id: 1, datetime: '2026-09-20 08:30', ticket: 'TCK-1042', material: 'Limestone', supplier: 'Holcim Quarry', weight: 42.5, moisture: 4.2, ash: 0.0, gcv: 0, status: 'Approved' },
    { id: 2, datetime: '2026-09-20 09:15', ticket: 'TCK-1043', material: 'Coal', supplier: 'Global Energy Ltd', weight: 31.8, moisture: 8.2, ash: 14.5, gcv: 5840, status: 'Approved' }
  ],
  hourlyLogData: JSON.parse(localStorage.getItem('prolab_hl')) || [
    { id: 1, datetime: '2026-09-20 08:00', shift: 'Shift A', location: 'Kiln #1', sio2: 21.20, al2o3: 5.30, fe2o3: 3.20, cao: 65.40, mgo: 1.50, lsf: 96.3, sm: 2.49, am: 1.66, status: 'In Spec' },
    { id: 2, datetime: '2026-09-20 09:00', shift: 'Shift A', location: 'Raw Mill', sio2: 21.10, al2o3: 5.25, fe2o3: 3.18, cao: 65.50, mgo: 1.48, lsf: 96.8, sm: 2.50, am: 1.65, status: 'In Spec' }
  ],
  latestFeederData: JSON.parse(localStorage.getItem('prolab_latest_feeders')) || {
    raw: null,
    cement: null,
  },
  trendChartInstance: null,
  tonnageChartInstance: null,
  unitHistoryDates: {},
  unitHistoryShifts: {},
  processUnits: [
    { name: 'Raw Mill', groups: [['Chemistry',10],['Weight Feeders',6],['Mill Operation',4],['Moisture',6]], fields: [['SiO₂ (%)','sio2'],['Al₂O₃ (%)','al2o3'],['Fe₂O₃ (%)','fe2o3'],['CaO (%)','cao'],['LOI (%)','loi'],['LSF','lsf'],['SM','sm'],['AM','am'],['CV (kcal/kg)','cv'],['Residue 80 µm (%)','residue80'],['WF1','rawFeederRatio1'],['WF2','rawFeederRatio2'],['WF3','rawFeederRatio3'],['WF4','rawFeederRatio4'],['WF5','rawFeederRatio5'],['WF6','rawFeederRatio6'],['Silo','rawSilo','text'],['TPH','rawFeedRate'],['Separator (Hz)','rawSeparatorHz'],['Current (A)','millCurrent'],['WF1','rawFeederMoisture1'],['WF2','rawFeederMoisture2'],['WF3','rawFeederMoisture3'],['WF4','rawFeederMoisture4'],['WF5','rawFeederMoisture5'],['WF6','rawFeederMoisture6']] },
    { name: 'Kiln #1', groups: [['Kiln Feed',11],['Clinker',2],['Production',3]], fields: [['SiO₂ (%)','kilnSio2'],['Al₂O₃ (%)','kilnAl2o3'],['Fe₂O₃ (%)','kilnFe2o3'],['CaO (%)','kilnCao'],['LOI (%)','kilnLoi'],['LSF','kilnLsf'],['SM','kilnSm'],['AM','kilnAm'],['CV (kcal/kg)','kilnCv'],['Nodule Size','noduleSize'],['Nodule Moisture (%)','noduleMoisture'],['Free Lime (%)','clinkerFreeLime'],['LOI (%)','clinkerLoi'],['Feed Rate (TPH)','kilnFeedRate'],['Discharge (TPH)','dischargeRate'],['Silo','kilnSilo','text']] },
    { name: 'Kiln #2', groups: [['Kiln Feed',11],['Clinker',2],['Production',3]], fields: [['SiO₂ (%)','kilnSio2'],['Al₂O₃ (%)','kilnAl2o3'],['Fe₂O₃ (%)','kilnFe2o3'],['CaO (%)','kilnCao'],['LOI (%)','kilnLoi'],['LSF','kilnLsf'],['SM','kilnSm'],['AM','kilnAm'],['CV (kcal/kg)','kilnCv'],['Nodule Size','noduleSize'],['Nodule Moisture (%)','noduleMoisture'],['Free Lime (%)','clinkerFreeLime'],['LOI (%)','clinkerLoi'],['Feed Rate (TPH)','kilnFeedRate'],['Discharge (TPH)','dischargeRate'],['Silo','kilnSilo','text']] },
    { name: 'Cement Mill #2', groups: [['Cement Quality',4],['Cement Mill Weight Feeders',6],['Moisture',2],['Mill Operation',5]], fields: [['SO₃ (%)','cementSo3'],['Fineness 45 µm (%)','fineness45'],['Fineness 80 µm (%)','fineness80'],['Additive (%)','additive'],['WF1','feederRatio1'],['WF2','feederRatio2'],['WF3','feederRatio3'],['WF4','feederRatio4'],['WF5','feederRatio5'],['WF6','feederRatio6'],['Gypsum','gypsumMoisture'],['Pozzolana','pozzolanaMoisture'],['Temperature (°C)','cementTemperature'],['Separator (Hz)','separatorHz'],['TPH','feedRate'],['Silo','silo','text'],['Cement Type','cementType','text']] },
    { name: 'Cement Mill #3', groups: [['Cement Quality',4],['Cement Mill Weight Feeders',6],['Moisture',2],['Mill Operation',5]], fields: [['SO₃ (%)','cementSo3'],['Fineness 45 µm (%)','fineness45'],['Fineness 80 µm (%)','fineness80'],['Additive (%)','additive'],['WF1','feederRatio1'],['WF2','feederRatio2'],['WF3','feederRatio3'],['WF4','feederRatio4'],['WF5','feederRatio5'],['WF6','feederRatio6'],['Gypsum','gypsumMoisture'],['Pozzolana','pozzolanaMoisture'],['Temperature (°C)','cementTemperature'],['Separator (Hz)','separatorHz'],['TPH','feedRate'],['Silo','silo','text'],['Cement Type','cementType','text']] }
  ]
};

export function getDefaultHourlyDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentHourlyTime() {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, '0');
  return `${hour}:00`;
}

export function getLocalDateTimeString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function getLocalTimestamp(date = new Date()) {
  return `${getLocalDateTimeString(date)}:${String(date.getSeconds()).padStart(2, '0')}`;
}

export function getCurrentShift() {
  const hour = new Date().getHours();
  if (hour >= 8 && hour <= 15) return 'Shift A';
  if (hour >= 16 && hour <= 23) return 'Shift B';
  return 'Shift C';
}

export function getShiftForHour(hourValue) {
  const hour = Number(String(hourValue || '').slice(0, 2));
  if (hour >= 8 && hour <= 15) return 'Shift A';
  if (hour >= 16 && hour <= 23) return 'Shift B';
  if (hour >= 0 && hour <= 7) return 'Shift C';
  return null;
}

export function isWithinAllowedFutureWindow(dateValue, hourValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{2}:00$/.test(hourValue)) return false;
  const [year, month, day] = dateValue.split('-').map(Number);
  const hour = Number(hourValue.slice(0, 2));
  const recordTime = new Date(0);
  recordTime.setFullYear(year, month - 1, day);
  recordTime.setHours(hour, 0, 0, 0);
  return recordTime.getTime() <= Date.now() + (60 * 60 * 1000);
}

export function getActiveDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isActiveDayRecord(record) {
  return String(record.datetime || '').slice(0, 10) === getActiveDateKey();
}

export function getActiveHourlyLogs() {
  return state.hourlyLogData.filter(isActiveDayRecord);
}

export function setHourlyField(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value ?? '';
}

export function updateTargetDisplay() {
  const lsfMin = state.sopTargets.lsfMin;
  const lsfMax = state.sopTargets.lsfMax;
  const smMin = state.sopTargets.smMin;
  const smMax = state.sopTargets.smMax;
  const lsfText = `${lsfMin.toFixed(1)} - ${lsfMax.toFixed(1)}`;
  const smText = `${smMin.toFixed(2)} - ${smMax.toFixed(2)}`;
  const lsfDisplay = document.getElementById('sop-target-lsf-display');
  const smDisplay = document.getElementById('sop-target-sm-display');
  const kpiTarget = document.getElementById('kpi-target-lsf-str');
  if (lsfDisplay) lsfDisplay.innerText = lsfText;
  if (smDisplay) smDisplay.innerText = smText;
  if (kpiTarget) kpiTarget.innerText = lsfText;
}

export function openSopMappingModal() {
  document.getElementById('modal-sop-mapping').classList.remove('hidden');
}

export function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

export function updateSettingsStats() {
  document.getElementById('stat-rm-count').innerText = state.rawMaterialsData.length;
  document.getElementById('stat-hl-count').innerText = state.hourlyLogData.length;
  const hourlyCount = document.getElementById('hourly-log-count');
  if (hourlyCount) hourlyCount.innerText = state.hourlyLogData.length;
}
