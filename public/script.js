// script.js

// --- AUTH & CONFIG ---
const user = JSON.parse(localStorage.getItem('user'));
const token = localStorage.getItem('token');

if (!user || !token) {
  window.location.href = 'login.html';
}

document.getElementById('user-name').textContent = user.name;

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

// --- API HELPER ---
async function api(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token
  };
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(endpoint, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error en la petición');
  }
  return res.json();
}

// --- MAP SETUP ---
const map = L.map('map').setView([21.15, -101.68], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Cluster Group
const markersCluster = L.markerClusterGroup();
map.addLayer(markersCluster);

// Icons
const icons = {
  place: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png', iconSize: [25, 41], iconAnchor: [12, 41] }),
  client: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png', iconSize: [25, 41], iconAnchor: [12, 41] }),
  delivery: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', iconSize: [25, 41], iconAnchor: [12, 41] }),
  driver: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png', iconSize: [25, 41], iconAnchor: [12, 41] })
};

// State
let currentTab = 'places'; // places, clients, deliveries, drivers
let interactionMode = null;
let tempData = {};
let loadedData = []; // Store current list for filtering
let routeLayer = null;

// --- DRAW CONTROL (Polygons) ---
const drawControl = new L.Control.Draw({
  draw: {
    polyline: false,
    rectangle: false,
    circle: false,
    marker: false,
    circlemarker: false,
    polygon: {
      allowIntersection: false,
      showArea: true
    }
  },
  edit: false
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, async function (e) {
  const layer = e.layer;
  if (e.layerType === 'polygon') {
    const latlngs = layer.getLatLngs()[0];
    const coords = latlngs.map(p => [p.lng, p.lat]);

    if (coords.length > 0) coords.push(coords[0]); // Close ring

    showModal('Nueva Zona', [{ name: 'name', label: 'Nombre', required: true }], async (data) => {
      try {
        await api('/polygons', 'POST', {
          name: data.name,
          description: '',
          userId: user._id,
          coordinates: [coords]
        });
        layer.addTo(map);
        alert('Zona guardada');
      } catch (err) {
        alert(err.message);
        map.removeLayer(layer);
      }
    });
  }
});

// --- TABS LOGIC ---
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.getAttribute('data-target');
    document.getElementById('btn-optimize').style.display = (currentTab === 'deliveries') ? 'flex' : 'none';
    loadData();
  });
});

// --- LOAD DATA ---
async function loadData() {
  const list = document.getElementById('main-list');
  list.innerHTML = '<div style="padding:10px; text-align:center; color:#64748b;">Cargando...</div>';

  markersCluster.clearLayers();
  if (routeLayer) map.removeLayer(routeLayer);

  try {
    let data = [];
    if (currentTab === 'places') {
      data = await api(`/places?userId=${user._id}`);
      renderItems(data, icons.place, 'place');
    } else if (currentTab === 'clients') {
      data = await api('/clients');
      renderItems(data, icons.client, 'client');
    } else if (currentTab === 'deliveries') {
      data = await api('/deliveries');
      renderItems(data, icons.delivery, 'delivery');
    } else if (currentTab === 'drivers') {
      data = await api('/drivers');
      renderItems(data, icons.driver, 'driver');
    }
    loadedData = data;
  } catch (err) {
    list.innerHTML = `<div style="color:red; padding:10px;">Error: ${err.message}</div>`;
  }
}

// --- SEARCH FILTER ---
document.getElementById('search-input').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = loadedData.filter(item => {
    const name = item.name ? item.name.toLowerCase() : '';
    const desc = (item.description || item.address || item.vehicle || '').toLowerCase();
    return name.includes(term) || desc.includes(term);
  });

  // Re-render based on current tab
  if (currentTab === 'places') renderItems(filtered, icons.place, 'place');
  else if (currentTab === 'clients') renderItems(filtered, icons.client, 'client');
  else if (currentTab === 'deliveries') renderItems(filtered, icons.delivery, 'delivery');
  else if (currentTab === 'drivers') renderItems(filtered, icons.driver, 'driver');
});

// --- EDIT LOGIC ---
// --- EDIT LOGIC ---
window.editItem = async (type, id) => {
  const item = loadedData.find(i => i._id === id);
  if (!item) return;

  if (type === 'driver') {
    showModal('Editar Repartidor', [
      { name: 'name', label: 'Nombre', value: item.name, required: true },
      { name: 'vehicle', label: 'Vehículo', value: item.vehicle },
      { name: 'capacity', label: 'Capacidad', type: 'number', value: item.capacity }
    ], async (data) => {
      await api(`/drivers/${id}`, 'PUT', data);
      loadData();
    });
  } else if (type === 'client') {
    showModal('Editar Cliente', [
      { name: 'name', label: 'Nombre', value: item.name, required: true },
      { name: 'address', label: 'Dirección', value: item.address },
      { name: 'phone', label: 'Teléfono', value: item.phone }
    ], async (data) => {
      await api(`/clients/${id}`, 'PUT', data);
      loadData();
    });
  } else if (type === 'place') {
    showModal('Editar Lugar', [
      { name: 'name', label: 'Nombre', value: item.name, required: true },
      { name: 'description', label: 'Descripción', value: item.description, type: 'textarea' }
    ], async (data) => {
      await api(`/places/${id}`, 'PUT', data);
      loadData();
    });
  } else if (type === 'delivery') {
    showModal('Editar Entrega', [
      { name: 'description', label: 'Descripción', value: item.description, required: true },
      { name: 'priority', label: 'Prioridad', value: item.priority },
      { name: 'status', label: 'Status', value: item.status }
    ], async (data) => {
      await api(`/deliveries/${id}`, 'PUT', data);
      loadData();
    });
  }
};

// --- RENDER GENERIC ---
function renderItems(items, icon, type) {
  const list = document.getElementById('main-list');
  list.innerHTML = '';

  items.forEach(item => {
    let lat, lng, title, desc;

    if (type === 'driver') {
      // Ensure we access coordinates correctly.
      // Model: currentLocation: { type: 'Point', coordinates: [lng, lat] }
      // If coordinates are missing or [0,0], it might be the issue.
      // But we fixed creation to ask for location.
      if (item.currentLocation && item.currentLocation.coordinates) {
        [lng, lat] = item.currentLocation.coordinates;
      } else {
        [lng, lat] = [0, 0]; // Fallback
      }
      title = item.name;
      desc = item.vehicle;
    } else {
      [lng, lat] = item.location.coordinates;
      title = item.name || (item.description ? 'Entrega: ' + item.description : 'Item');
      desc = item.address || item.description || item.status || '';
    }

    const marker = L.marker([lat, lng], { icon }).bindPopup(`<b>${title}</b><br>${desc}`);
    markersCluster.addLayer(marker);

    const card = document.createElement('div');
    card.className = 'card-item';
    card.innerHTML = `
      <div class="card-title">${title}</div>
      <div class="card-desc">${desc}</div>
      <div style="margin-top:8px; display:flex; gap:4px;">
        <button class="btn-small" style="background:#3b82f6; font-size:0.7rem;" onclick="editItem('${type}', '${item._id}')">Editar</button>
        <button class="btn-small" style="background:#ef4444; font-size:0.7rem;" onclick="deleteItem('${type}', '${item._id}')">Eliminar</button>
      </div>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      map.setView([lat, lng], 16);
      marker.openPopup();
    });
    list.appendChild(card);
  });
}

// --- DELETE LOGIC ---
window.deleteItem = async (type, id) => {
  if (!confirm('¿Eliminar este elemento?')) return;
  try {
    let endpoint = '';
    if (type === 'place') endpoint = `/places/${id}`;
    if (type === 'client') endpoint = `/clients/${id}`;
    if (type === 'delivery') endpoint = `/deliveries/${id}`;
    if (type === 'driver') endpoint = `/drivers/${id}`;

    await api(endpoint, 'DELETE');
    loadData();
  } catch (err) { alert(err.message); }
};

// --- ADD BUTTON LOGIC ---
document.getElementById('btn-add-main').addEventListener('click', () => {
  if (currentTab === 'places') {
    startInteraction('create_place', 'Selecciona ubicación del lugar');
  } else if (currentTab === 'clients') {
    startInteraction('create_client', 'Selecciona ubicación del cliente');
  } else if (currentTab === 'deliveries') {
    startInteraction('create_delivery', 'Selecciona punto de entrega');
  } else if (currentTab === 'drivers') {
    startInteraction('create_driver', 'Selecciona ubicación del repartidor');
  }
});

// --- INTERACTION & MODALS ---
const statusBar = document.getElementById('status-bar');
const statusText = document.getElementById('status-text');
const cancelActionBtn = document.getElementById('cancel-action-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const dynamicForm = document.getElementById('dynamic-form');
const closeModalBtn = document.getElementById('close-modal');

cancelActionBtn.addEventListener('click', resetInteraction);
closeModalBtn.addEventListener('click', () => { modalOverlay.classList.remove('active'); resetInteraction(); });

function startInteraction(mode, text) {
  interactionMode = mode;
  statusBar.style.display = 'flex';
  statusText.textContent = text;
  document.body.style.cursor = 'crosshair';
}

function resetInteraction() {
  interactionMode = null;
  statusBar.style.display = 'none';
  document.body.style.cursor = 'default';
}

function showModal(title, fields, onSubmit) {
  modalTitle.textContent = title;
  dynamicForm.innerHTML = '';
  fields.forEach(field => {
    const div = document.createElement('div');
    div.className = 'form-group';
    const label = document.createElement('label');
    label.textContent = field.label;
    let input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
    if (field.type !== 'textarea') input.type = field.type || 'text';
    input.className = 'form-control';
    input.name = field.name;
    if (field.required) input.required = true;
    if (field.value !== undefined) input.value = field.value; // Set initial value for editing
    div.appendChild(label);
    div.appendChild(input);
    dynamicForm.appendChild(div);
  });
  dynamicForm.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(dynamicForm).entries());
    try {
      await onSubmit(data);
      modalOverlay.classList.remove('active');
      resetInteraction();
      loadData();
    } catch (err) { alert(err.message); }
  };
  modalOverlay.classList.add('active');
}

map.on('click', (e) => {
  if (!interactionMode) return;
  const { lat, lng } = e.latlng;

  // Helper to send correct location format
  const loc = { type: 'Point', coordinates: [lng, lat] };

  if (interactionMode === 'create_place') {
    showModal('Nuevo Lugar', [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'description', label: 'Descripción', type: 'textarea' }
    ], async (data) => {
      await api('/places', 'POST', { ...data, userId: user._id, location: loc });
    });
  } else if (interactionMode === 'create_client') {
    showModal('Nuevo Cliente', [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'address', label: 'Dirección' },
      { name: 'phone', label: 'Teléfono' }
    ], async (data) => {
      await api('/clients', 'POST', { ...data, location: loc });
    });
  } else if (interactionMode === 'create_driver') {
    showModal('Nuevo Repartidor', [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'vehicle', label: 'Vehículo' },
      { name: 'capacity', label: 'Capacidad', type: 'number' }
    ], async (data) => {
      await api('/drivers', 'POST', { ...data, currentLocation: loc });
    });
  } else if (interactionMode === 'create_delivery') {
    api('/clients').then(clients => {
      if (clients.length === 0) {
        alert('Primero crea un cliente');
        resetInteraction();
        return;
      }
      modalTitle.textContent = 'Nueva Entrega';
      dynamicForm.innerHTML = '';

      const div = document.createElement('div');
      div.className = 'form-group';
      div.innerHTML = `<label>Cliente</label><select name="clientId" class="form-control">${clients.map(c => `<option value="${c._id}">${c.name}</option>`).join('')}</select>`;
      dynamicForm.appendChild(div);

      const fields = [
        { name: 'description', label: 'Descripción', required: true },
        { name: 'priority', label: 'Prioridad (normal/high)' }
      ];
      fields.forEach(field => {
        const d = document.createElement('div');
        d.className = 'form-group';
        d.innerHTML = `<label>${field.label}</label><input name="${field.name}" class="form-control" required>`;
        dynamicForm.appendChild(d);
      });

      dynamicForm.onsubmit = async (ev) => {
        ev.preventDefault();
        const data = Object.fromEntries(new FormData(dynamicForm).entries());
        try {
          await api('/deliveries', 'POST', { ...data, location: loc });
          modalOverlay.classList.remove('active');
          resetInteraction();
          loadData();
        } catch (err) { alert(err.message); }
      };
      modalOverlay.classList.add('active');
    });
  }
});

// --- ROUTE OPTIMIZATION ---
document.getElementById('btn-optimize').addEventListener('click', async () => {
  if (loadedData.length < 2) {
    alert('Necesitas al menos 2 entregas para calcular una ruta.');
    return;
  }
  const coords = loadedData.map(d => d.location.coordinates.join(',')).join(';');
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    const json = await res.json();
    if (json.code !== 'Ok') throw new Error('Error calculando ruta');
    const route = json.routes[0];
    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.geoJSON(route.geometry, { style: { color: 'blue', weight: 5, opacity: 0.7 } }).addTo(map);
    map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
    alert(`Ruta calculada: ${(route.distance / 1000).toFixed(2)} km, ${(route.duration / 60).toFixed(0)} min`);
  } catch (err) { alert('Error al conectar con OSRM: ' + err.message); }
});

// --- INIT ---
loadData();