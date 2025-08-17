const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQUyjM9WjlMz2-T9d2rDQJV65gWL7swVtDAkg-ODkzonKOjnuykUKr2NlmGN0zqp35sYulYYJLmoUo6/pub?output=csv';

let map, markersLayer;
let shops = [];

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  fetchAndRender();
  registerSW();

  document.getElementById('groupToggle').addEventListener('change', renderList);
  document.getElementById('ratingSelect').addEventListener('change', renderList);
  document.getElementById('refreshBtn').addEventListener('click', fetchAndRender);
  document.getElementById('downloadBtn').addEventListener('click', downloadData);
});

function initMap() {
  map = L.map('map').setView([16.8, 96.15], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

async function fetchAndRender() {
  const res = await fetch(CSV_URL + '&_=' + Date.now(), { cache: 'no-store' });
  const text = await res.text();
  shops = parseCSV(text);
  renderList();
  renderMap();
}

function parseCSV(csv) {
  const [headerLine, ...lines] = csv.trim().split('\n');
  const headers = headerLine.split(',').map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(',');
    return headers.reduce((obj, key, i) => {
      obj[key] = cols[i] ? cols[i].trim() : '';
      return obj;
    }, {});
  });
}

function renderList() {
  const shopListEl = document.getElementById('shopList');
  shopListEl.innerHTML = '';
  const ratingValue = document.getElementById('ratingSelect').value;
  const groupToggle = document.getElementById('groupToggle').checked;

  const filtered = shops.filter(s => ratingValue === 'All' || s.Rating === ratingValue);

  if (groupToggle) {
    const groups = filtered.reduce((acc, shop) => {
      acc[shop.Rating] = acc[shop.Rating] || [];
      acc[shop.Rating].push(shop);
      return acc;
    }, {});
    Object.keys(groups).sort((a, b) => b - a).forEach(rating => {
      const heading = document.createElement('li');
      heading.textContent = `Rating ${rating}`;
      heading.style.fontWeight = 'bold';
      shopListEl.appendChild(heading);
      groups[rating].forEach(addShopItem);
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
  document.getElementById('shopList').appendChild(li);
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
  if (!shops.length) return;
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

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
  }
}
