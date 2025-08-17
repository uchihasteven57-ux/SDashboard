// URL to CSV data
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQUyjM9WjlMz2-T9d2rDQJV65gWL7swVtDAkg-ODkzonKOjnuykUKr2NlmGN0zqp35sYulYYJLmoUo6/pub?output=csv';

let map, markersLayer;
let shops = [];

// DOM Elements
const shopListEl   = document.getElementById('shopList');
const groupToggle  = document.getElementById('groupToggle');
const ratingSelect = document.getElementById('ratingSelect');
const refreshBtn   = document.getElementById('refreshBtn');
const downloadBtn  = document.getElementById('downloadBtn');

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  fetchAndRender();
  registerSW();

  groupToggle.addEventListener('change', renderList);
  ratingSelect.addEventListener('change', renderList);
  refreshBtn.addEventListener('click', fetchAndRender);
  downloadBtn.addEventListener('click', downloadData);
});

// Initialize Leaflet map
function initMap() {
  map = L.map('map').setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

// Fetch CSV, parse, render
async function fetchAndRender() {
  const res = await fetch(CSV_URL, { cache: 'reload' });
  const text = await res.text();
  shops = parseCSV(text);
  renderList();
  renderMap();
}

// Simple CSV parser
function parseCSV(csv) {
  const [headerLine, ...lines] = csv.trim().split('\n');
  const headers = headerLine.split(',').map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(',');
    return headers.reduce((obj, key, i) => {
      obj[key] = cols[i].trim();
      return obj;
    }, {});
  });
}

// Render sidebar list
function renderList() {
  shopListEl.innerHTML = '';
  const filtered = shops.filter(s => {
    return ratingSelect.value === 'All' || s.Rating === ratingSelect.value;
  });

  if (groupToggle.checked) {
    // Group by rating
    const groups = filtered.reduce((acc, shop) => {
      acc[shop.Rating] = acc[shop.Rating] || [];
      acc[shop.Rating].push(shop);
      return acc;
    }, {});

    Object.keys(groups).sort((a, b) => b - a).forEach(r => {
      const heading = document.createElement('li');
      heading.textContent = `Rating ${r}`;
      heading.style.fontWeight = 'bold';
      shopListEl.appendChild(heading);

      groups[r].forEach(shop => {
        addShopItem(shop);
      });
    });
  } else {
    filtered.forEach(shop => addShopItem(shop));
  }
}

// Helper: create list item
function addShopItem(shop) {
  const li = document.createElement('li');
  li.textContent = shop.ShopName;
  li.addEventListener('click', () => {
    const lat = parseFloat(shop.Latitude);
    const lon = parseFloat(shop.Longitude);
    map.setView([lat, lon], 16);
  });
  shopListEl.appendChild(li);
}

// Render markers on map
function renderMap() {
  markersLayer.clearLayers();
  shops.forEach(shop => {
    const lat = parseFloat(shop.Latitude);
    const lon = parseFloat(shop.Longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      const marker = L.marker([lat, lon]).bindPopup(
        `<strong>${shop.ShopName}</strong><br>Rating: ${shop.Rating}`
      );
      markersLayer.addLayer(marker);
    }
  });
}

// Download current data as CSV
function downloadData() {
  const header = Object.keys(shops[0]).join(',');
  const rows = shops.map(s => Object.values(s).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shops_data.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Register Service Worker
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
  }
}