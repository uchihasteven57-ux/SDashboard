const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQUyjM9WjlMz2-T9d2rDQJV65gWL7swVtDAkg-ODkzonKOjnuykUKr2NlmGN0zqp35sYulYYJLmoUo6/pub?output=csv';

let map, markersLayer;
let shops = [];

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

function initMap() {
  map = L.map('map').setView([16.8, 96.15], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

async function fetchAndRender() {
  const res = await fetch(CSV_URL + '&_=' + Date.now()); // cache-bust
  const text = await res.text();
  shops = parseCSV(text);
  renderList();
  renderMap();
}

function parseCSV(csv) {
  const rows = csv.trim().split('\n').map(r => r.split(','));
  const headers = rows[0];
  return rows.slice(1).map(r => {
    return headers.reduce((acc, h, i) => {
      acc[h.trim()] = r[i] ? r[i].trim() : '';
      return acc;
    }, {});
  });
}

function renderList() {
  shopListEl.innerHTML = '';
  const filtered = shops.filter(s => ratingSelect.value === 'All' || s.Rating === ratingSelect.value);

  if (groupToggle.checked) {
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
      groups[r].forEach(addShopItem);
    });
  } else {
    filtered.forEach(addShopItem);
  }
}

function addShopItem(shop) {
  const li = document.createElement('li');
  li.textContent = shop.ShopName;
  li.addEventListener('click', () => {
    const lat = parseFloat(shop.Latitude);
    const lon = parseFloat(shop.Longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      map.setView([lat, lon], 16);
    }
  });
  shopListEl.appendChild(li);
}

function renderMap() {
  markersLayer.clearLayers();
  shops.forEach(shop => {
    const lat = parseFloat(shop.Latitude);
    const lon = parseFloat(shop.Longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      L.marker([lat, lon])
        .bindPopup(`<strong>${shop.ShopName}</strong><br>Rating: ${shop.Rating}`)
        .addTo(markersLayer);
    }
  });
}

function downloadData() {
  const header = Object.keys(shops[0]).join(',');
  const rows = shops.map(s => Object.values(s).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
 
