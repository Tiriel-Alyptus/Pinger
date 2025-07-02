// Build UI dynamically using Tailwind CSS v4
// This script reproduces the previous HTML interface

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  app.innerHTML = `
  <main class="max-w-6xl mx-auto p-6 text-gray-800">
    <section class="mb-8 text-center">
      <h1 class="text-4xl font-extrabold text-sky-600 mb-2">📶 Tableau de Bord du Débit Internet</h1>
      <p class="text-gray-500 text-lg">Suivi en temps réel de vos performances de connexion avec Fast.com</p>
    </section>

    <section id="stats" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div class="p-4 bg-white rounded-2xl shadow flex flex-col items-center">
        <div class="text-sm text-gray-500">Dernier débit</div>
        <div id="stat-latest" class="text-3xl font-bold text-sky-600">--</div>
      </div>
      <div class="p-4 bg-white rounded-2xl shadow flex flex-col items-center">
        <div class="text-sm text-gray-500">Moyenne</div>
        <div id="stat-average" class="text-3xl font-bold text-sky-600">--</div>
      </div>
      <div class="p-4 bg-white rounded-2xl shadow flex flex-col items-center">
        <div class="text-sm text-gray-500">Tests totaux</div>
        <div id="stat-count" class="text-3xl font-bold text-sky-600">--</div>
      </div>
    </section>

    <section class="bg-white shadow-xl rounded-2xl p-6 mb-8">
      <div class="flex flex-wrap gap-2 justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-sky-700">Graphique du Débit</h2>
        <div class="flex flex-wrap gap-2">
          <button id="testNow" class="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700 transition">🚀 Tester maintenant</button>
          <button id="downloadCSV" class="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700 transition">📄 Export CSV</button>
          <button id="downloadJSON" class="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700 transition">📁 Export JSON</button>
          <button id="localTestBtn" class="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700 transition">⚡ Test local</button>
          <button id="clearOld" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition">🗑️ Nettoyer (>7j)</button>
        </div>
      </div>
      <div id="rangeButtons" class="flex flex-wrap gap-2 mb-4">
        <button class="range-btn px-3 py-1 border rounded" data-range="3600000">1h</button>
        <button class="range-btn px-3 py-1 border rounded" data-range="10800000">3h</button>
        <button class="range-btn px-3 py-1 border rounded" data-range="43200000">12h</button>
        <button class="range-btn px-3 py-1 border rounded" data-range="86400000">24h</button>
        <button class="range-btn px-3 py-1 border rounded" data-range="172800000">48h</button>
        <button class="range-btn px-3 py-1 border rounded" data-range="604800000">Semaine</button>
        <button class="range-btn px-3 py-1 border rounded" data-range="2592000000">Mois</button>
        <button class="range-btn px-3 py-1 border rounded" data-range="all">Tout</button>
      </div>
      <canvas id="speedChart" height="100"></canvas>
    </section>

    <section id="localTestSection" class="bg-white shadow-xl rounded-2xl p-6 mb-8 hidden">
      <h2 class="text-xl font-semibold text-sky-700 mb-4">Résultat Speedtest Local</h2>
      <p>Ping : <span id="localPing">--</span> ms</p>
      <p>Débit : <span id="localSpeed">--</span> Mbps</p>
    </section>

    <section class="bg-white shadow-xl rounded-2xl p-6">
      <h2 class="text-xl font-semibold text-sky-700 mb-4">Historique des Mesures</h2>
      <div class="overflow-auto rounded-lg">
        <table class="min-w-full table-auto border-collapse">
          <thead class="bg-sky-700 text-white text-left">
            <tr>
              <th class="px-4 py-2">Horodatage</th>
              <th class="px-4 py-2">Débit (Mbps)</th>
              <th class="px-4 py-2">État</th>
              <th class="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody id="dataTable" class="text-gray-700 divide-y divide-gray-200"></tbody>
        </table>
      </div>
    </section>
  </main>`;

  let chart;
  let rawData = [];
  let filteredData = [];
  let currentRange = 86400000; // 24h par défaut

  function updateData() {
    $.get('/api/data', function (data) {
      rawData = data;
      const now = Date.now();
      filteredData = currentRange ? rawData.filter(d => new Date(d.timestamp).getTime() >= now - currentRange) : rawData;

      const labels = filteredData.map((d) => new Date(d.timestamp).toLocaleTimeString());
      const speeds = filteredData.map((d) => d.download_mbps);

      if (!chart) {
        chart = new Chart(document.getElementById('speedChart'), {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Débit Mbps',
              data: speeds,
              borderColor: '#0ea5e9',
              backgroundColor: 'rgba(14,165,233,0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 6,
            }],
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 10 },
              },
            },
          },
        });
      } else {
        chart.data.labels = labels;
        chart.data.datasets[0].data = speeds;
        chart.update();
      }

      const tableRows = filteredData.slice().reverse().map((d) => {
        const speed = d.download_mbps;
        let badgeClass = 'bg-red-100 text-red-800', label = 'Lent';
        if (speed >= 100) badgeClass = 'bg-green-100 text-green-800', label = 'Rapide';
        else if (speed >= 30) badgeClass = 'bg-yellow-100 text-yellow-800', label = 'Moyen';

        return `
          <tr>
            <td class="px-4 py-2 whitespace-nowrap">${new Date(d.timestamp).toLocaleString()}</td>
            <td class="px-4 py-2 font-semibold">${speed}</td>
            <td class="px-4 py-2"><span class="px-2 py-1 rounded-full text-sm font-medium ${badgeClass}">${label}</span></td>
            <td class="px-4 py-2 text-right"><button data-ts="${d.timestamp}" class="delete-entry text-red-600 hover:underline">Supprimer</button></td>
          </tr>`;
      }).join('');

      $('#dataTable').html(tableRows);

      const count = rawData.length;
      document.getElementById('stat-count').textContent = count;
      if (count > 0) {
        const latest = rawData[rawData.length - 1].download_mbps;
        const average = Math.round(rawData.reduce((sum, d) => sum + d.download_mbps, 0) / count);
        document.getElementById('stat-latest').textContent = latest;
        document.getElementById('stat-average').textContent = average;
      }
    });
  }

  function downloadCSV() {
    const header = ['Horodatage', 'Débit (Mbps)', 'État'];
    const rows = rawData.map(row => {
      const speed = row.download_mbps;
      let state = 'Lent';
      if (speed >= 100) state = 'Rapide';
      else if (speed >= 30) state = 'Moyen';
      return [new Date(row.timestamp).toLocaleString(), speed, state];
    });
    const csv = [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'statistiques_debit.csv';
    link.click();
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'statistiques_debit.json';
    link.click();
  }

  async function runLocalTest() {
    document.getElementById('localTestSection').classList.remove('hidden');
    document.getElementById('localPing').textContent = '--';
    document.getElementById('localSpeed').textContent = '--';

    const start = performance.now();
    const response = await fetch('/speedtest-file');
    const ping = performance.now() - start;
    document.getElementById('localPing').textContent = Math.round(ping);

    const reader = response.body.getReader();
    let received = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.length;
      const elapsed = (performance.now() - start) / 1000;
      const speed = (received * 8 / 1e6) / elapsed;
      document.getElementById('localSpeed').textContent = Math.round(speed);
    }
  }

  document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
  document.getElementById('downloadJSON').addEventListener('click', downloadJSON);
  document.getElementById('testNow').addEventListener('click', async () => {
    await fetch('/api/test', { method: 'POST' });
    updateData();
  });
  document.getElementById('localTestBtn').addEventListener('click', runLocalTest);
  document.getElementById('clearOld').addEventListener('click', async () => {
    await fetch('/api/data/old', { method: 'DELETE' });
    updateData();
  });

  $(document).on('click', '.delete-entry', async function () {
    const ts = $(this).data('ts');
    await fetch(`/api/data/${ts}`, { method: 'DELETE' });
    updateData();
  });

  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentRange = btn.dataset.range === 'all' ? null : parseInt(btn.dataset.range);
      document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('bg-sky-600', 'text-white'));
      btn.classList.add('bg-sky-600', 'text-white');
      updateData();
    });
  });

  const defaultBtn = document.querySelector('.range-btn[data-range="86400000"]');
  if (defaultBtn) defaultBtn.classList.add('bg-sky-600', 'text-white');

  setInterval(updateData, 5000);
  updateData();
});
