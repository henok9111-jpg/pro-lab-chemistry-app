import { state, getActiveDateKey, getActiveHourlyLogs } from './state.js';
import { calcModuli } from './calculations.js';

export function renderCharts() {
  const activeLogs = getActiveHourlyLogs().slice().sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const ctxTrend = document.getElementById('lsfTrendChart');
  if (ctxTrend && state.trendChartInstance) state.trendChartInstance.destroy();

  if (ctxTrend) {
    state.trendChartInstance = new Chart(ctxTrend.getContext('2d'), {
      type: 'line',
      data: {
        labels: activeLogs.map(d => (d.datetime || '').split(' ')[1] ? d.datetime.split(' ')[1].slice(0,5) : d.datetime),
        datasets: [
          { label: 'LSF', data: activeLogs.map(d => parseFloat(d.lsf || 0)), borderColor: '#14b8a6', backgroundColor: 'rgba(20,184,166,0.1)', tension: 0.3, fill: true },
          { label: 'SM (x30 Scale)', data: activeLogs.map(d => (parseFloat(d.sm || 0) * 30)), borderColor: '#818cf8', tension: 0.3 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } } }
    });
  }

  const ctxTonnage = document.getElementById('materialTonnageChart');
  if (ctxTonnage && state.tonnageChartInstance) state.tonnageChartInstance.destroy();

  if (ctxTonnage) {
    const totals = {};
    state.rawMaterialsData.forEach(r => {
      totals[r.material] = (totals[r.material] || 0) + parseFloat(r.weight || 0);
    });
    state.tonnageChartInstance = new Chart(ctxTonnage.getContext('2d'), {
      type: 'bar',
      data: {
        labels: Object.keys(totals),
        datasets: [{ label: 'Tonnes Received', data: Object.values(totals), backgroundColor: '#f59e0b' }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } } }
    });
  }
}

export function renderDashboard() {
  const totalTonnes = state.rawMaterialsData.reduce((acc, curr) => acc + (parseFloat(curr.weight) || 0), 0);
  const matCount = document.getElementById('kpi-mat-tonnes');
  if (matCount) matCount.innerHTML = `${totalTonnes.toFixed(1)} <span class="text-xs font-normal text-slate-400">Tonnes</span>`;
  const matCountLabel = document.getElementById('kpi-mat-count');
  if (matCountLabel) matCountLabel.innerText = state.rawMaterialsData.length;

  const activeLogs = getActiveHourlyLogs();
  const lsfVals = activeLogs.map(d => parseFloat(d.lsf)).filter(v => !isNaN(v));
  const avgLsf = lsfVals.length ? (lsfVals.reduce((a,b) => a+b, 0)/lsfVals.length).toFixed(1) : '96.4';
  const avgLsfEl = document.getElementById('kpi-avg-lsf');
  if (avgLsfEl) avgLsfEl.innerText = avgLsf;

  const outOfSpecCount = activeLogs.filter(h => {
    const lsf = parseFloat(h.lsf);
    return Number.isFinite(lsf) && (lsf < state.sopTargets.lsfMin || lsf > state.sopTargets.lsfMax);
  }).length;
  const alertEl = document.getElementById('kpi-alerts-count');
  if (alertEl) {
    alertEl.innerText = outOfSpecCount;
    alertEl.className = outOfSpecCount > 0 ? 'text-2xl font-bold text-rose-400 mt-1' : 'text-2xl font-bold text-emerald-400 mt-1';
  }

  const coals = state.rawMaterialsData.filter(r => r.material === 'Coal' && r.gcv > 0);
  if (coals.length > 0) {
    const avgGcv = Math.round(coals.reduce((a,b) => a + b.gcv, 0) / coals.length);
    const avgMoist = (coals.reduce((a,b) => a + b.moisture, 0) / coals.length).toFixed(1);
    const gcvEl = document.getElementById('kpi-coal-gcv');
    if (gcvEl) gcvEl.innerHTML = `${avgGcv.toLocaleString()} <span class="text-xs font-normal text-slate-400">kcal/kg</span>`;
    const moistureEl = document.getElementById('kpi-coal-moisture');
    if (moistureEl) moistureEl.innerText = `${avgMoist}%`;
  }

  const tbody = document.getElementById('recent-activity-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    const combined = [
      ...state.rawMaterialsData.map(r => ({ time: r.datetime, module: 'Material Intake', ref: `${r.ticket} (${r.material})`, val: `${r.weight} T`, status: r.status })),
      ...activeLogs.map(h => ({ time: h.datetime, module: 'Hourly Chemistry', ref: `${h.location}`, val: `LSF: ${h.lsf ?? 'Recorded'}`, status: h.status }))
    ].sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0,5);

    combined.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2.5 px-3 text-slate-400">${item.time}</td>
        <td class="py-2.5 px-3 font-medium text-slate-200">${item.module}</td>
        <td class="py-2.5 px-3">${item.ref}</td>
        <td class="py-2.5 px-3 font-semibold text-teal-400">${item.val}</td>
        <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">${item.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderCharts();
}

export function renderRawMaterialsTable() {
  const tbody = document.getElementById('raw-materials-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  state.rawMaterialsData.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="py-2.5 px-3 text-slate-400">${r.datetime}</td>
      <td class="py-2.5 px-3 font-semibold text-slate-200">${r.ticket}</td>
      <td class="py-2.5 px-3">${r.material}</td>
      <td class="py-2.5 px-3">${r.supplier}</td>
      <td class="py-2.5 px-3 text-right font-medium">${r.weight}</td>
      <td class="py-2.5 px-3 text-right">${r.moisture}%</td>
      <td class="py-2.5 px-3 text-right">${r.ash}%</td>
      <td class="py-2.5 px-3 text-right">${r.gcv}</td>
      <td class="py-2.5 px-3 text-center"><span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">${r.status}</span></td>
      <td class="py-2.5 px-3 text-center"><button onclick="deleteRawMaterial(${idx})" class="text-rose-400 hover:text-rose-300"><i class="fa-solid fa-trash"></i></button></td>
      <td class="py-2.5 px-3 bg-slate-950/80 whitespace-nowrap"><span class="block text-[10px] text-slate-400">Recorded: ${r.recordedAt || '-'}</span><span class="block text-[10px] text-amber-300">Updated: ${r.updatedAt || '-'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

export function averageField(records, key) {
  const values = records
    .map(item => parseFloat(item.record ? item.record[key] : item[key]))
    .filter(value => Number.isFinite(value));
  if (!values.length) return '-';
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return average === 0 ? '-' : average.toFixed(2);
}

export function formatNumericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number !== 0 ? number.toFixed(2) : '-';
}

export function formatUnitField(record, key) {
  const feederMatch = key.match(/^feederRatio([1-6])$/);
  if (feederMatch) {
    const n = feederMatch[1];
    const name = record[`feederName${n}`] || 'Unnamed';
    const ratio = formatNumericValue(record[key]);
    return `<span class="block truncate" title="${name}">${name}</span><span class="block text-[9px] text-teal-300">${ratio}%</span>`;
  }
  const rawFeederMatch = key.match(/^rawFeederRatio([1-6])$/);
  if (rawFeederMatch) {
    const n = rawFeederMatch[1];
    const name = record[`rawFeederName${n}`] || 'No';
    const ratio = formatNumericValue(record[key]);
    return name === 'No' ? '<span class="block text-slate-500">No</span>' : `<span class="block truncate" title="${name}">${name}</span><span class="block text-[9px] text-teal-300">${ratio}%</span>`;
  }
  if (record[key] === null || record[key] === undefined || record[key] === '') return '-';
  if (['silo','cementType','rawSilo','kilnSilo'].includes(key)) return record[key];
  return typeof record[key] === 'number' || Number.isFinite(Number(record[key])) ? formatNumericValue(record[key]) : record[key];
}

export function unitFieldAlignment(key) {
  return /^(feederRatio|rawFeederRatio)[1-6]$/.test(key) || /^rawFeederMoisture[1-6]$/.test(key) ? 'text-center' : 'text-right';
}

export function unitFieldSizing(key) {
  if (/^(feederRatio|rawFeederRatio)[1-6]$/.test(key)) return 'w-16 min-w-16 max-w-16 whitespace-normal';
  if (/^rawFeederMoisture[1-6]$/.test(key)) return 'w-14 min-w-14 max-w-14 whitespace-normal';
  return '';
}

export function isFeederTableField(key) {
  return /^(feederRatio|rawFeederRatio|rawFeederMoisture)[1-6]$/.test(key);
}

export function unitFieldLabel(field) {
  return field[0];
}

export function isAverageField(field) {
  return field[2] !== 'text' && field[1] !== 'silo' && field[1] !== 'cementType' && field[1] !== 'rawSilo' && field[1] !== 'kilnSilo';
}

export function renderUnitTables(containerId, printable) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  state.processUnits.forEach(unit => {
    const selectedDate = state.unitHistoryDates[containerId]?.[unit.name] || getActiveDateKey();
    const selectedShift = state.unitHistoryShifts[containerId]?.[unit.name] || 'Shift A';
    const records = state.hourlyLogData
      .filter((record) => record.location === unit.name)
      .filter((record) => String(record.datetime || '').slice(0,10) === selectedDate)
      .sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
    const shiftRecords = selectedShift === 'All Shifts' ? records : records.filter(item => item.shift === selectedShift);
    const dayRecords = state.hourlyLogData.filter((record) => record.location === unit.name && String(record.datetime || '').slice(0,10) === selectedDate);

    let groupOffset = 0;
    const groupStarts = new Set();
    unit.groups.forEach((group, groupIndex) => {
      if (groupIndex > 0) groupStarts.add(groupOffset);
      groupOffset += group[1];
    });

    const rows = records.length ? records.map(item => {
      const lsfVal = parseFloat(item.lsf);
      const status = item.location === 'Raw Mill' && (lsfVal < state.sopTargets.lsfMin || lsfVal > state.sopTargets.lsfMax) ? 'Out of Spec' : (item.status || 'Recorded');
      const statusClass = item.location === 'Raw Mill' && (lsfVal < state.sopTargets.lsfMin || lsfVal > state.sopTargets.lsfMax) ? 'text-rose-300' : 'text-emerald-400';
      const fieldsHtml = unit.fields.map((field, fieldIndex) => `<td class="py-1 px-3 border-r border-slate-800 ${isFeederTableField(field[1]) ? 'feeder-table-cell' : ''} ${unitFieldAlignment(field[1])} ${unitFieldSizing(field[1])} text-slate-300">${formatUnitField(item, field[1])}</td>`).join('');
      return `<tr>
        <td class="py-2 px-3 border-r border-slate-800 text-slate-400 whitespace-nowrap">${item.datetime}<br><span class="text-[10px] text-teal-400">${item.shift}</span></td>
        ${fieldsHtml}
        <td class="py-2 px-3 border-r border-slate-800 text-slate-400">${item.remark || '-'}</td>
        <td class="py-2 px-3 border-r border-slate-800 ${statusClass}">${status}</td>
        <td class="py-2 px-3 text-center whitespace-nowrap">
          <button onclick="openEditHourlyLog(${state.hourlyLogData.indexOf(item)})" class="text-cyan-400 hover:text-cyan-300 mr-2" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deleteHourlyLog(${state.hourlyLogData.indexOf(item)})" class="text-rose-400 hover:text-rose-300" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
        <td class="py-2 px-3 bg-teal-950/50 text-teal-200 whitespace-nowrap min-w-[190px]"><span class="block text-[10px]">Recorded: ${item.recordedAt || '-'}</span><span class="block text-[10px] text-amber-300">Updated: ${item.updatedAt || '-'}</span></td>
      </tr>`;
    }).join('') : `<tr><td colspan="${unit.fields.length + 5}" class="py-5 px-3 text-center text-slate-500">No records for this unit on ${selectedDate}.</td></tr>`;

    const averageRow = `<tr class="bg-teal-950/30 border-b border-teal-800/60 font-semibold">
      <td class="py-2 px-3 border-r border-slate-800 text-teal-200">SHIFT AVG<br><span class="text-[10px] font-normal">${selectedShift}</span></td>
      ${unit.fields.map((field) => `<td class="py-1 px-3 border-r border-slate-800 ${isFeederTableField(field[1]) ? 'feeder-table-cell' : ''} ${unitFieldAlignment(field[1])} ${unitFieldSizing(field[1])} text-teal-300">${isAverageField(field) ? averageField(shiftRecords, field[1]) : '-'}</td>`).join('')}
      <td class="py-2 px-3 border-r border-slate-800 text-slate-500">Summary</td>
      <td class="py-2 px-3 border-r border-slate-800 text-slate-500">-</td>
      <td class="py-2 px-3 text-center text-slate-500">-</td>
      <td class="py-2 px-3 text-slate-500">-</td>
    </tr>
    <tr class="bg-indigo-950/20 border-b border-indigo-800/50 font-semibold">
      <td class="py-2 px-3 border-r border-slate-800 text-indigo-200">24 H AVG</td>
      ${unit.fields.map((field) => `<td class="py-1 px-3 border-r border-slate-800 ${isFeederTableField(field[1]) ? 'feeder-table-cell' : ''} ${unitFieldAlignment(field[1])} ${unitFieldSizing(field[1])} text-indigo-300">${isAverageField(field) ? averageField(dayRecords, field[1]) : '-'}</td>`).join('')}
      <td class="py-2 px-3 border-r border-slate-800 text-slate-500">Summary</td>
      <td class="py-2 px-3 border-r border-slate-800 text-slate-500">-</td>
      <td class="py-2 px-3 text-center text-slate-500">-</td>
      <td class="py-2 px-3 text-slate-500">-</td>
    </tr>`;

    const panel = document.createElement('div');
    panel.className = 'bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm';
    panel.innerHTML = `
      <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-white">${unit.name}</h3>
          <span class="text-[10px] text-slate-400">${records.length} record(s) on ${selectedDate}</span>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-[10px] text-slate-500 no-print" for="history-date-${containerId}-${unit.name.replace(/[^a-z0-9]/gi,'-').toLowerCase()}">History date</label>
          <input id="history-date-${containerId}-${unit.name.replace(/[^a-z0-9]/gi,'-').toLowerCase()}" type="date" value="${selectedDate}" max="${getActiveDateKey()}" onchange="setUnitHistoryDate('${unit.name}', this.value, '${containerId}')" class="no-print bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-white">
          <select class="no-print bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-white" onchange="setUnitHistoryShift('${unit.name}', this.value, '${containerId}')">
            <option value="All Shifts"${selectedShift === 'All Shifts' ? ' selected' : ''}>All Shifts</option>
            <option value="Shift A"${selectedShift === 'Shift A' ? ' selected' : ''}>Shift A</option>
            <option value="Shift B"${selectedShift === 'Shift B' ? ' selected' : ''}>Shift B</option>
            <option value="Shift C"${selectedShift === 'Shift C' ? ' selected' : ''}>Shift C</option>
          </select>
        </div>
      </div>
      <details ${printable ? 'open' : ''}>
        <summary class="cursor-pointer px-4 py-2 text-[11px] text-teal-300 hover:bg-slate-800/60">Show ${records.length} hourly record(s)</summary>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1800px] text-left text-xs text-slate-300">
            <thead class="bg-slate-950 text-slate-400 text-[10px] tracking-wider">
              <tr class="border-b border-slate-800">
                <th class="py-1 px-3"></th>
                ${unit.groups.map((group, groupIndex) => `<th colspan="${group[1]}" class="py-1 px-3 ${groupIndex > 0 ? 'border-l-2 border-slate-700' : ''} text-center text-teal-200 bg-teal-950/40">${group[0]}</th>`).join('')}
                <th colspan="4" class="py-1 px-3"></th>
              </tr>
              <tr>
                <th class="py-2 px-3 border-r border-slate-700">Time & Shift</th>
                ${unit.fields.map((field) => `<th class="py-1 px-3 border-r border-slate-700 ${isFeederTableField(field[1]) ? 'feeder-table-cell' : ''} ${unitFieldAlignment(field[1])} ${unitFieldSizing(field[1])}">${unitFieldLabel(field)}</th>`).join('')}
                <th class="py-2 px-3 border-r border-slate-700">Shift Remark</th>
                <th class="py-2 px-3 border-r border-slate-700">Status</th>
                <th class="py-2 px-3 text-center">Action</th>
                <th class="py-2 px-3 bg-teal-950/50 min-w-[190px]">Audit Timestamp</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/80">${averageRow}${rows}</tbody>
          </table>
        </div>
      </details>`;
    container.appendChild(panel);
  });
}

export function renderHourlyLogTable() {
  renderUnitTables('hourly-unit-tables', false);
}

export function renderReportTable() {
  const totalTonnes = state.rawMaterialsData.reduce((acc, curr) => acc + (parseFloat(curr.weight) || 0), 0);
  const intakeVol = document.getElementById('report-intake-vol');
  if (intakeVol) intakeVol.innerText = `${totalTonnes.toFixed(1)} Tonnes`;

  const activeLogs = getActiveHourlyLogs();
  const lsfVals = activeLogs.map(d => parseFloat(d.lsf)).filter(v => !isNaN(v));
  const avgLsf = lsfVals.length ? (lsfVals.reduce((a,b) => a+b, 0)/lsfVals.length).toFixed(1) : '96.4';
  const avgLsfReport = document.getElementById('report-avg-lsf');
  if (avgLsfReport) avgLsfReport.innerText = avgLsf;

  renderUnitTables('report-unit-tables', true);
}

export function renderSettingsStats() {
  const rmCount = document.getElementById('stat-rm-count');
  if (rmCount) rmCount.innerText = state.rawMaterialsData.length;
  const hlCount = document.getElementById('stat-hl-count');
  if (hlCount) hlCount.innerText = state.hourlyLogData.length;
  const countEl = document.getElementById('hourly-log-count');
  if (countEl) countEl.innerText = state.hourlyLogData.length;
}

export function setUnitHistoryDate(unitName, dateValue, containerId) {
  if (!state.unitHistoryDates[containerId]) state.unitHistoryDates[containerId] = {};
  state.unitHistoryDates[containerId][unitName] = dateValue || getActiveDateKey();
  if (containerId === 'report-unit-tables') renderReportTable(); else renderHourlyLogTable();
}

export function setUnitHistoryShift(unitName, shiftValue, containerId) {
  if (!state.unitHistoryShifts[containerId]) state.unitHistoryShifts[containerId] = {};
  state.unitHistoryShifts[containerId][unitName] = shiftValue || 'Shift A';
  if (containerId === 'report-unit-tables') renderReportTable(); else renderHourlyLogTable();
}
