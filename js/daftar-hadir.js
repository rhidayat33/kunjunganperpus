// ============================================
//  Daftar Hadir — Form Logic & Submission
//  Dashboard Kunjungan Perpustakaan PKN STAN
// ============================================

const STORAGE_KEY = 'kunjungan_apps_script_url';
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwcMXkTpWrZPigxX6bugFHiQUFUkxRDLJBtwppjkYzKgIm8dN11XY5EIpAqXfSk6_i1-Q/exec';
const OLD_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxXCIpXibwgkY0JOjUGaBXIqVs81gf77wGTgR9QlOYyI8ClxsJN-_4lAkkGRoxDqCZ6pw/exec';

let localUrl = localStorage.getItem(STORAGE_KEY);
if (localUrl === OLD_APPS_SCRIPT_URL) {
  localStorage.removeItem(STORAGE_KEY);
  localUrl = null;
}
let appsScriptUrl = localUrl || DEFAULT_APPS_SCRIPT_URL;

/* ── Months & Days (Indonesian) ── */
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni',
                'Juli','Agustus','September','Oktober','November','Desember'];
const DAYS   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

/* ──────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  initMobileMenu();
  initDateTime();
  initConfig();
  initCategoryPreview();

  // URL sudah terhubung ke Google Sheet secara default
  // Config panel hanya ditampilkan jika user klik tombol konfigurasi

  document.getElementById('submit-btn').addEventListener('click', handleSubmit);
});

/* ── Mobile Sidebar ── */
function initMobileMenu() {
  const btn     = document.getElementById('mobile-menu-btn');
  const overlay = document.getElementById('mobile-overlay');
  const sidebar = document.getElementById('sidebar');
  if (btn)     btn.addEventListener('click',    () => { sidebar.classList.toggle('open');  overlay.classList.toggle('visible'); });
  if (overlay) overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('visible'); });
}

/* ── Live Clock ── */
function initDateTime() {
  const dateEl   = document.getElementById('current-date');
  const timeEl   = document.getElementById('current-time');
  const bannerEl = document.getElementById('date-banner-text');

  function tick() {
    const now = new Date();
    const dayName = DAYS[now.getDay()];
    const date    = now.getDate();
    const month   = MONTHS[now.getMonth()];
    const year    = now.getFullYear();
    const hh = String(now.getHours()).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    const ss = String(now.getSeconds()).padStart(2,'0');

    if (dateEl)   dateEl.textContent   = `${dayName}, ${date} ${month} ${year}`;
    if (timeEl)   timeEl.textContent   = `${hh}:${mm}:${ss}`;
    if (bannerEl) bannerEl.textContent = `Daftar hadir untuk hari ${dayName}, ${date} ${month} ${year}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ── Config Panel (disabled — elemen sudah dihapus dari HTML) ── */
function initConfig() {
  const urlInput  = document.getElementById('script-url-input');
  const saveBtn   = document.getElementById('save-url-btn');
  if (urlInput && appsScriptUrl) urlInput.value = appsScriptUrl;
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      const url = (urlInput ? urlInput.value : '').trim();
      if (!url) { showAlert('Masukkan URL Apps Script terlebih dahulu.', 'error'); return; }
      appsScriptUrl = url;
      localStorage.setItem(STORAGE_KEY, url);
      const panel = document.getElementById('config-panel');
      if (panel) panel.style.display = 'none';
      showAlert('✅ URL berhasil disimpan! Form siap digunakan.', 'success');
    });
  }
}

function toggleConfig() {
  const panel = document.getElementById('config-panel');
  if (panel) panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
}

/* ── Category Preview (live while typing) ── */
function initCategoryPreview() {
  const input   = document.getElementById('nama-input');
  const preview = document.getElementById('category-preview');
  const badge   = document.getElementById('category-badge');

  if (!input) return;

  input.addEventListener('input', function () {
    const val = this.value.trim();
    if (!val) { preview.style.display = 'none'; return; }

    const cat = detectCategory(val);
    const cfg = {
      'Mahasiswa': { emoji: '🎓', color: '#6d28d9', bg: 'rgba(109,40,217,0.10)' },
      'Pegawai'  : { emoji: '🏛️', color: '#0f766e', bg: 'rgba(15,118,110,0.10)' },
      'Tamu'     : { emoji: '👤', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)' },
    }[cat];

    badge.textContent = `${cfg.emoji} Terdeteksi sebagai: ${cat}`;
    badge.style.color      = cfg.color;
    badge.style.background = cfg.bg;
    badge.style.border     = `1px solid ${cfg.color}40`;
    preview.style.display  = 'block';
  });
}

/* ── Detect Visitor Category ── */
function detectCategory(input) {
  const s = (input || '').trim();
  if (/^[34]\d{5,}/.test(s)) return 'Mahasiswa';  // NIM: starts with 3 or 4
  if (/^(19|20)\d{6,}/.test(s)) return 'Pegawai'; // NIP: starts with 19 or 20
  return 'Tamu';
}

/* ── Form Submission ── */
async function handleSubmit() {
  clearAlert();

  const nama = (document.getElementById('nama-input').value || '').trim();
  if (!nama) {
    showAlert('Mohon isi NIM / NIP / Nama Lengkap Anda.', 'error');
    document.getElementById('nama-input').focus();
    return;
  }

  const checkedTujuan = Array.from(
    document.querySelectorAll('input[name="tujuan"]:checked')
  ).map(cb => cb.value);
  if (checkedTujuan.length === 0) {
    showAlert('Mohon pilih setidaknya satu tujuan berkunjung.', 'error');
    return;
  }

  const durasi = (document.querySelector('input[name="durasi"]:checked') || {}).value;
  if (!durasi) {
    showAlert('Mohon pilih estimasi durasi kunjungan.', 'error');
    return;
  }

  if (!appsScriptUrl) {
    showAlert('⚠️ Sistem tidak terkonfigurasi. Hubungi pengelola perpustakaan.', 'error');
    return;
  }

  /* ── Send Data ── */
  const btn = document.getElementById('submit-btn');
  btn.disabled    = true;
  btn.textContent = 'Menyimpan kehadiran...';

  const formData = new FormData();
  formData.append('nama',   nama);
  formData.append('tujuan', checkedTujuan.join(' | '));
  formData.append('durasi', durasi);

  try {
    // no-cors: data IS sent, response is opaque (can't read) — this is expected
    await fetch(appsScriptUrl, { method: 'POST', body: formData, mode: 'no-cors' });
    onSubmitSuccess(nama);
  } catch (err) {
    showAlert('Gagal mengirim data. Periksa koneksi internet dan URL Apps Script.', 'error');
    btn.disabled    = false;
    btn.textContent = 'Simpan Kehadiran';
  }
}

function onSubmitSuccess(nama) {
  try { localStorage.setItem('kunjungan_stats_revision', String(Date.now())); } catch (_) {}
  const category = detectCategory(nama);
  const label    = (category === 'Tamu') ? nama : category;
  showAlert(
    `Terima kasih, ${label}! Daftar hadirmu sudah dikirim. Selamat menikmati waktu di perpus!`,
    'success'
  );
  // Update aside counter
  document.dispatchEvent(new CustomEvent('kunjungan:submit-success'));
  resetForm();
  document.getElementById('alert-box').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetForm() {
  document.getElementById('nama-input').value = '';
  document.getElementById('category-preview').style.display = 'none';
  document.querySelectorAll('input[name="tujuan"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="durasi"]').forEach(rb => rb.checked = false);
  const btn = document.getElementById('submit-btn');
  btn.disabled    = false;
  btn.textContent = 'Simpan Kehadiran';
}

/* ── Alert Helpers ── */
function showAlert(message, type) {
  const el = document.getElementById('alert-box');
  el.className   = `alert-box ${type}`;
  el.style.display = 'flex';
  el.textContent = message;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearAlert() {
  const el = document.getElementById('alert-box');
  if (el) el.style.display = 'none';
}
