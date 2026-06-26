// ============================================
//  Statistik Kunjungan — Data & Charts Logic
//  Dashboard Kunjungan Perpustakaan PKN STAN
// ============================================

const STORAGE_KEY = 'kunjungan_apps_script_url';
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxXCIpXibwgkY0JOjUGaBXIqVs81gf77wGTgR9QlOYyI8ClxsJN-_4lAkkGRoxDqCZ6pw/exec';
let appsScriptUrl = localStorage.getItem(STORAGE_KEY) || DEFAULT_APPS_SCRIPT_URL;
let allData       = [];
let charts        = {};
let currentPeriod = 'bulanan';

/* ── Constants ── */
const TUJUAN_LIST = [
  'Meminjam/Mengembalikan Buku',
  'Mengunjungi Ruang Baca dan Referensi',
  'Diskusi Kelompok',
  'Belajar Mandiri',
  'Mengakses Layanan Data (LSEG)',
  'Mengakses Layanan E-Journal',
  'Mengakses Karya Tulis / Repositori',
  'Healing / Rehat',
  'Rapat',
  'Bimbingan dengan Dosen',
  'Lainnya',
];

const DURASI_ORDER = [
  'Kurang dari 1 jam',
  '1-2 jam',
  '2-3 jam',
  'Lebih dari 3 jam',
];

const CHART_COLORS = {
  sky:    'rgba(14,165,233,',
  blue:   'rgba(59,130,246,',
  cyan:   'rgba(6,182,212,',
  green:  'rgba(5,150,105,',
  amber:  'rgba(217,119,6,',
  purple: 'rgba(124,58,237,',
  rose:   'rgba(225,29,72,',
  slate:  'rgba(148,163,184,',
};

/* ──────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  initMobileMenu();
  initConfig();
  initPeriodTabs();

  // Auto-fetch: URL sudah terhubung ke Google Sheet
  fetchData();
});

/* ── Mobile Sidebar ── */
function initMobileMenu() {
  const btn     = document.getElementById('mobile-menu-btn');
  const overlay = document.getElementById('mobile-overlay');
  const sidebar = document.getElementById('sidebar');
  if (btn)     btn.addEventListener('click',    () => { sidebar.classList.toggle('open');  overlay.classList.toggle('visible'); });
  if (overlay) overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('visible'); });
}

/* ── Config ── */
function initConfig() {
  const urlInput = document.getElementById('script-url-input');
  if (urlInput && appsScriptUrl) urlInput.value = appsScriptUrl;

  document.getElementById('save-url-btn').addEventListener('click', function () {
    const url = (urlInput ? urlInput.value : '').trim();
    if (!url) return;
    appsScriptUrl = url;
    localStorage.setItem(STORAGE_KEY, url);
    document.getElementById('config-panel').style.display = 'none';
    fetchData();
  });
}

function toggleConfig() {
  const panel = document.getElementById('config-panel');
  panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
}

/* ── Period Tabs ── */
function initPeriodTabs() {
  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      currentPeriod = this.dataset.period;
      if (allData.length > 0) rebuildTrendChart();
    });
  });
}

/* ── Visibility Helpers ── */
function showLoading() {
  document.getElementById('loading').style.display        = 'flex';
  document.getElementById('empty-state').style.display   = 'none';
  document.getElementById('stats-section').style.display = 'none';
  document.getElementById('period-section').style.display= 'none';
  document.getElementById('charts-section').style.display= 'none';
}

function showEmpty(msg) {
  document.getElementById('loading').style.display        = 'none';
  document.getElementById('empty-state').style.display   = 'flex';
  document.getElementById('empty-desc').textContent      = msg;
  document.getElementById('stats-section').style.display = 'none';
  document.getElementById('period-section').style.display= 'none';
  document.getElementById('charts-section').style.display= 'none';
}

function showDashboard() {
  document.getElementById('loading').style.display        = 'none';
  document.getElementById('empty-state').style.display   = 'none';
  document.getElementById('stats-section').style.display = 'grid';
  document.getElementById('period-section').style.display= 'flex';
  document.getElementById('charts-section').style.display= 'grid';
  document.getElementById('refresh-btn').style.display   = 'flex';
}

/* ── JSONP fetch (bypass CORS untuk file:// protocol) ── */
function fetchJsonp(url) {
  return new Promise(function (resolve, reject) {
    var callbackName = 'jsonpCb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    var script = document.createElement('script');
    var done   = false;

    var cleanup = function () {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
    };

    window[callbackName] = function (data) {
      done = true;
      cleanup();
      resolve(data);
    };

    script.src     = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
    script.onerror = function () {
      if (done) return;
      cleanup();
      reject(new Error('JSONP request failed'));
    };

    document.head.appendChild(script);

    // Timeout 15 detik
    setTimeout(function () {
      if (!done) {
        cleanup();
        reject(new Error('JSONP timeout'));
      }
    }, 15000);
  });
}

/* ── Fetch Data ── */
async function fetchData() {
  showLoading();
  try {
    const json = await fetchJsonp(`${appsScriptUrl}?action=getData`);

    if (json.status === 'success' && Array.isArray(json.data)) {
      allData = json.data.filter(d => d.nama); // exclude blank rows
      if (allData.length === 0) {
        showEmpty('Belum ada data kunjungan yang tercatat. Ajak pengunjung mengisi daftar hadir!');
        return;
      }
      renderDashboard();
    } else {
      showEmpty('Gagal memuat data. Pastikan URL Apps Script sudah benar dan izin akses sudah diberikan.');
    }
  } catch (err) {
    showEmpty('Tidak dapat terhubung ke Apps Script. Periksa URL dan koneksi internet Anda.');
  }
}


/* ── Render All ── */
function renderDashboard() {
  updateStatCards();
  destroyAllCharts();
  renderTrendChart();
  renderCategoryChart();
  renderDurationChart();
  renderPurposeChart();
  showDashboard();
}

function destroyAllCharts() {
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
  charts = {};
}

/* ── Category Detection ── */
function detectCategory(nama) {
  const s = (nama || '').trim();
  if (/^[34]\d{5,}/.test(s)) return 'Mahasiswa';
  if (/^(19|20)\d{6,}/.test(s)) return 'Pegawai';
  return 'Tamu';
}

/* ── Duration → Hours ── */
function durationToHours(durasi) {
  const d = (durasi || '').toLowerCase();
  if (d.includes('kurang') || d.startsWith('< 1')) return 0.5;
  if (d.includes('1-2') || d.includes('1–2'))       return 1.5;
  if (d.includes('2-3') || d.includes('2–3'))       return 2.5;
  if (d.includes('lebih') || d.startsWith('> 3'))   return 3.5;
  return 1;
}

/* ── Stat Cards ── */
function updateStatCards() {
  // Total
  document.getElementById('stat-total').textContent = allData.length.toLocaleString('id-ID');

  // Today
  const todayStr = new Date().toDateString();
  const todayCount = allData.filter(d => {
    try { return d.timestamp && new Date(d.timestamp).toDateString() === todayStr; }
    catch { return false; }
  }).length;
  document.getElementById('stat-today').textContent = todayCount.toLocaleString('id-ID');

  // Most popular purpose
  const purposeCount = {};
  allData.forEach(d => {
    if (!d.tujuan) return;
    d.tujuan.split('|').forEach(t => {
      const clean = t.trim();
      if (clean) purposeCount[clean] = (purposeCount[clean] || 0) + 1;
    });
  });
  const topEntry = Object.entries(purposeCount).sort((a,b) => b[1]-a[1])[0];
  document.getElementById('stat-popular').textContent =
    topEntry ? topEntry[0].replace(/\/.*/, '').trim() : '–';

  // Average duration
  const totalHours = allData.reduce((s, d) => s + durationToHours(d.durasi), 0);
  const avg = allData.length > 0 ? totalHours / allData.length : 0;
  let avgText = '–';
  if (avg > 0 && avg < 1)   avgText = '< 1 Jam';
  else if (avg < 1.8)       avgText = '1–2 Jam';
  else if (avg < 2.8)       avgText = '2–3 Jam';
  else if (avg >= 2.8)      avgText = '> 3 Jam';
  document.getElementById('stat-duration').textContent = avgText;
}

/* ── Group by Period ── */
function groupByPeriod(data, period) {
  const groups = {};
  data.forEach(d => {
    try {
      if (!d.timestamp) return;
      const date = new Date(d.timestamp);
      if (isNaN(date)) return;
      let key;
      if (period === 'harian') {
        key = date.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
      } else if (period === 'mingguan') {
        const dow = date.getDay();  // 0=Sun
        const monday = new Date(date);
        monday.setDate(date.getDate() - ((dow + 6) % 7));
        key = 'Minggu ' + monday.toLocaleDateString('id-ID', { day:'2-digit', month:'short' });
      } else {
        key = date.toLocaleDateString('id-ID', { month:'short', year:'numeric' });
      }
      groups[key] = (groups[key] || 0) + 1;
    } catch { /* skip */ }
  });
  return groups;
}

/* ── Chart: Trend ── */
function renderTrendChart() {
  const groups = groupByPeriod(allData, currentPeriod);
  const labels = Object.keys(groups);
  const values = Object.values(groups);

  const ctx = document.getElementById('chart-trend').getContext('2d');
  charts.trend = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Jumlah Kunjungan',
        data: values,
        backgroundColor: CHART_COLORS.sky + '0.18)',
        borderColor:     CHART_COLORS.sky + '1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw} kunjungan` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color:'#6b8299', font:{ family:'Inter', size:11 } } },
        y: { beginAtZero: true,
             grid: { color:'rgba(14,165,233,0.07)' },
             ticks: { color:'#6b8299', font:{ family:'Inter', size:11 }, stepSize:1, precision:0 } }
      }
    }
  });
}

function rebuildTrendChart() {
  if (charts.trend) { charts.trend.destroy(); delete charts.trend; }
  renderTrendChart();
}

/* ── Chart: Category (Doughnut) ── */
function renderCategoryChart() {
  const counts = { 'Mahasiswa': 0, 'Pegawai': 0, 'Tamu': 0 };
  allData.forEach(d => counts[detectCategory(d.nama)]++);

  const ctx = document.getElementById('chart-category').getContext('2d');
  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#0ea5e9','#3b82f6','#94a3b8'],
        borderWidth: 0,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '66%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding:16, font:{ family:'Inter', size:12 }, color:'#445566' }
        },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} orang` } }
      }
    }
  });
}

/* ── Chart: Duration ── */
function renderDurationChart() {
  const counts = {};
  DURASI_ORDER.forEach(d => counts[d] = 0);
  allData.forEach(d => {
    const key = (d.durasi || '').trim();
    if (counts[key] !== undefined) counts[key]++;
  });

  const bgColors = [
    CHART_COLORS.cyan   + '0.75)',
    CHART_COLORS.sky    + '0.75)',
    CHART_COLORS.blue   + '0.75)',
    CHART_COLORS.purple + '0.75)',
  ];

  const ctx = document.getElementById('chart-duration').getContext('2d');
  charts.duration = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['< 1 Jam', '1–2 Jam', '2–3 Jam', '> 3 Jam'],
      datasets: [{
        label: 'Pengunjung',
        data: DURASI_ORDER.map(d => counts[d] || 0),
        backgroundColor: bgColors,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw} pengunjung` } }
      },
      scales: {
        x: { grid:{ display:false }, ticks:{ color:'#6b8299', font:{ family:'Inter', size:12 } } },
        y: { beginAtZero:true,
             grid:{ color:'rgba(14,165,233,0.07)' },
             ticks:{ color:'#6b8299', font:{ family:'Inter', size:12 }, stepSize:1, precision:0 } }
      }
    }
  });
}

/* ── Chart: Purpose (Horizontal Bar) ── */
function renderPurposeChart() {
  // Count each purpose
  const counts = {};
  TUJUAN_LIST.forEach(t => counts[t] = 0);
  allData.forEach(d => {
    if (!d.tujuan) return;
    d.tujuan.split('|').forEach(t => {
      const clean = t.trim();
      if (counts[clean] !== undefined) counts[clean]++;
      else if (clean) counts[clean] = (counts[clean] || 0) + 1;
    });
  });

  // Sort descending
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  const labels = sorted.map(([k]) => k);
  const values = sorted.map(([,v]) => v);

  // Colour palette cycling
  const colorKeys = ['sky','blue','cyan','green','amber','purple','rose','slate'];
  const bgColors  = labels.map((_,i) => CHART_COLORS[colorKeys[i % colorKeys.length]] + '0.72)');

  const ctx = document.getElementById('chart-purpose').getContext('2d');
  charts.purpose = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Jumlah',
        data: values,
        backgroundColor: bgColors,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw} pengunjung` } }
      },
      scales: {
        x: { beginAtZero:true,
             grid:{ color:'rgba(14,165,233,0.07)' },
             ticks:{ color:'#6b8299', font:{ family:'Inter', size:11 }, stepSize:1, precision:0 } },
        y: { grid:{ display:false },
             ticks:{ color:'#445566', font:{ family:'Inter', size:11 } } }
      }
    }
  });
}

/* ── Today's Visitors Modal Logic ── */
function openTodayVisitorsModal() {
  const modal = document.getElementById('visitors-modal');
  const tbody = document.getElementById('visitors-list');
  if (!modal || !tbody) return;

  // Clear previous rows
  tbody.innerHTML = '';

  // Filter today's visitors
  const todayStr = new Date().toDateString();
  const todayVisitors = allData.filter(d => {
    try { return d.timestamp && new Date(d.timestamp).toDateString() === todayStr; }
    catch { return false; }
  });

  // Sort today's visitors by timestamp descending (newest first)
  todayVisitors.sort((a, b) => {
    try { return new Date(b.timestamp) - new Date(a.timestamp); }
    catch { return 0; }
  });

  if (todayVisitors.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-modal-state">
            <div class="empty-modal-icon">👥</div>
            <div style="font-weight:600; color:var(--text-primary);">Belum ada kunjungan hari ini</div>
            <div style="font-size:12px; margin-top:4px; color:var(--text-muted);">Data pengunjung hari ini akan muncul di sini setelah mengisi daftar hadir.</div>
          </div>
        </td>
      </tr>
    `;
  } else {
    todayVisitors.forEach(d => {
      const timeVal = formatTime(d.timestamp);
      const cat = detectCategory(d.nama);
      const catClass = cat.toLowerCase();
      const badgeEmoji = cat === 'Mahasiswa' ? '🎓' : cat === 'Pegawai' ? '🏛️' : '👤';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color:var(--text-secondary); font-variant-numeric: tabular-nums;">${timeVal}</td>
        <td>
          <div style="font-weight:600; color:var(--text-primary);">${d.nama}</div>
        </td>
        <td>
          <span class="badge ${catClass}">${badgeEmoji} ${cat}</span>
        </td>
        <td>
          <div style="max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px;" title="${d.tujuan || ''}">
            ${(d.tujuan || '–').replace(/ \| /g, ', ')}
          </div>
        </td>
        <td style="color:var(--text-secondary); font-size:13px;">${d.durasi || '–'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // prevent background scrolling
}

window.closeModal = function() {
  const modal = document.getElementById('visitors-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = ''; // restore background scrolling
  }
}

window.openTodayVisitorsModal = openTodayVisitorsModal;

function formatTime(timestamp) {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '–';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch (e) {
    return '–';
  }
}

// Close on escape key and outside click
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('visitors-modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
});
