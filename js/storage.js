import { state } from './state.js';

export function saveData() {
  localStorage.setItem('prolab_rm', JSON.stringify(state.rawMaterialsData));
  localStorage.setItem('prolab_hl', JSON.stringify(state.hourlyLogData));
  localStorage.setItem('prolab_sop', JSON.stringify(state.sopTargets));
  localStorage.setItem('prolab_latest_feeders', JSON.stringify(state.latestFeederData));
  localStorage.setItem('prolab_last_saved', new Date().toISOString());
  const stats = document.getElementById('stat-rm-count');
  if (stats) stats.innerText = state.rawMaterialsData.length;
}

export function downloadJsonBackup() {
  const exportData = {
    sopTargets: state.sopTargets,
    rawMaterials: state.rawMaterialsData,
    hourlyLog: state.hourlyLogData,
    exportedAt: new Date().toISOString()
  };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const anchor = document.createElement('a');
  anchor.setAttribute('href', dataStr);
  anchor.setAttribute('download', `PRO_LAB_Backup_${new Date().toISOString().substring(0,10)}.json`);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function importJsonBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.rawMaterials && parsed.hourlyLog) {
        state.rawMaterialsData = parsed.rawMaterials;
        state.hourlyLogData = parsed.hourlyLog;
        if (parsed.sopTargets) state.sopTargets = parsed.sopTargets;
        saveData();
        location.reload();
      } else {
        alert('Invalid JSON format. Backup missing key data.');
      }
    } catch (err) {
      alert('Error reading JSON backup file.');
    }
  };
  reader.readAsText(file);
}

export function clearDatabase() {
  if (confirm('Reset local database to initial demo values?')) {
    localStorage.removeItem('prolab_rm');
    localStorage.removeItem('prolab_hl');
    localStorage.removeItem('prolab_sop');
    localStorage.removeItem('prolab_latest_feeders');
    location.reload();
  }
}
