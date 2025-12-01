import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Map from '../components/Map';
import Modal from '../components/Modal';
import {
  placesService,
  clientsService,
  deliveriesService,
  driversService,
  polygonsService,
} from '../services/api';
import { io } from 'socket.io-client';

const TABS = [
  { id: 'places', label: 'Lugares' },
  { id: 'clients', label: 'Clientes' },
  { id: 'deliveries', label: 'Entregas' },
  { id: 'drivers', label: 'Repartidores' },
];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState('places');
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [polygons, setPolygons] = useState([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMode, setModalMode] = useState('create');
  const [editingItem, setEditingItem] = useState(null);
  const [pendingLocation, setPendingLocation] = useState(null);

  // Form states
  const [formData, setFormData] = useState({});

  // Interaction mode
  const [interactionMode, setInteractionMode] = useState(null);
  const [statusText, setStatusText] = useState('');

  // Selected item for map
  const [selectedItem, setSelectedItem] = useState(null);

  // Clients list for deliveries
  const [clientsList, setClientsList] = useState([]);

  // Socket
  useEffect(() => {
    const socket = io();

    socket.on('driverLocationUpdated', (data) => {
      if (currentTab === 'drivers') {
        loadData();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentTab]);

  // Load data when tab changes
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let data = [];
      switch (currentTab) {
        case 'places':
          const placesRes = await placesService.getAll(user._id);
          data = placesRes.data;
          break;
        case 'clients':
          const clientsRes = await clientsService.getAll();
          data = clientsRes.data;
          break;
        case 'deliveries':
          const deliveriesRes = await deliveriesService.getAll();
          data = deliveriesRes.data;
          break;
        case 'drivers':
          const driversRes = await driversService.getAll();
          data = driversRes.data;
          break;
      }
      setItems(data);
      setFilteredItems(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [currentTab, user._id]);

  // Load polygons
  const loadPolygons = useCallback(async () => {
    try {
      const res = await polygonsService.getAll(user._id);
      setPolygons(res.data);
    } catch (err) {
      console.error('Error loading polygons:', err);
    }
  }, [user._id]);

  useEffect(() => {
    loadData();
    loadPolygons();
  }, [loadData, loadPolygons]);

  // Filter items
  useEffect(() => {
    if (!searchTerm) {
      setFilteredItems(items);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = items.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const desc = (item.description || item.address || item.vehicle || '').toLowerCase();
      return name.includes(term) || desc.includes(term);
    });
    setFilteredItems(filtered);
  }, [searchTerm, items]);

  // Load clients for delivery form
  const loadClients = async () => {
    try {
      const res = await clientsService.getAll();
      setClientsList(res.data);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  // Handle add button
  const handleAdd = () => {
    const messages = {
      places: 'Selecciona ubicación del lugar',
      clients: 'Selecciona ubicación del cliente',
      deliveries: 'Selecciona punto de entrega',
      drivers: 'Selecciona ubicación del repartidor',
    };

    setInteractionMode(`create_${currentTab}`);
    setStatusText(messages[currentTab]);
    document.body.style.cursor = 'crosshair';
  };

  // Handle map click
  const handleMapClick = async (latlng) => {
    if (!interactionMode) return;

    const location = {
      type: 'Point',
      coordinates: [latlng.lng, latlng.lat],
    };

    setPendingLocation(location);
    document.body.style.cursor = 'default';

    if (interactionMode === 'create_deliveries') {
      await loadClients();
      if (clientsList.length === 0) {
        const res = await clientsService.getAll();
        if (res.data.length === 0) {
          alert('Primero crea un cliente');
          resetInteraction();
          return;
        }
        setClientsList(res.data);
      }
    }

    setModalMode('create');
    setFormData({});
    setModalTitle(getModalTitle('create'));
    setModalOpen(true);
  };

  // Get modal title
  const getModalTitle = (mode) => {
    const titles = {
      places: mode === 'create' ? 'Nuevo Lugar' : 'Editar Lugar',
      clients: mode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente',
      deliveries: mode === 'create' ? 'Nueva Entrega' : 'Editar Entrega',
      drivers: mode === 'create' ? 'Nuevo Repartidor' : 'Editar Repartidor',
    };
    return titles[currentTab];
  };

  // Reset interaction
  const resetInteraction = () => {
    setInteractionMode(null);
    setStatusText('');
    setPendingLocation(null);
    document.body.style.cursor = 'default';
  };

  // Handle edit (from card, table, or popup)
  const handleEdit = (item, type = currentTab) => {
    const prevTab = currentTab;
    if (type !== currentTab) {
      setCurrentTab(type);
    }
    setEditingItem(item);
    setModalMode('edit');
    setFormData({ ...item });

    const titles = {
      places: 'Editar Lugar',
      place: 'Editar Lugar',
      clients: 'Editar Cliente',
      client: 'Editar Cliente',
      deliveries: 'Editar Entrega',
      delivery: 'Editar Entrega',
      drivers: 'Editar Repartidor',
      driver: 'Editar Repartidor',
    };
    setModalTitle(titles[type] || 'Editar');

    if (type === 'deliveries' || type === 'delivery') {
      loadClients();
    }

    setModalOpen(true);
  };

  // Handle delete (from card, table, or popup)
  const handleDelete = async (item, type = currentTab) => {
    if (!confirm('¿Eliminar este elemento?')) return;

    try {
      const typeMap = {
        place: 'places',
        client: 'clients',
        delivery: 'deliveries',
        driver: 'drivers',
      };
      const actualType = typeMap[type] || type;

      switch (actualType) {
        case 'places':
          await placesService.delete(item._id);
          break;
        case 'clients':
          await clientsService.delete(item._id);
          break;
        case 'deliveries':
          await deliveriesService.delete(item._id);
          break;
        case 'drivers':
          await driversService.delete(item._id);
          break;
      }
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  // Handle polygon created
  const handlePolygonCreated = async (coordinates) => {
    const name = prompt('Nombre de la zona:');
    if (!name) return;

    try {
      await polygonsService.create({
        name,
        description: '',
        userId: user._id,
        coordinates: [coordinates],
      });
      loadPolygons();
      alert('Zona guardada correctamente');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar zona');
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (modalMode === 'create') {
        const data = { ...formData };

        switch (currentTab) {
          case 'places':
            data.userId = user._id;
            data.location = pendingLocation;
            await placesService.create(data);
            break;
          case 'clients':
            data.location = pendingLocation;
            await clientsService.create(data);
            break;
          case 'deliveries':
            data.location = pendingLocation;
            await deliveriesService.create(data);
            break;
          case 'drivers':
            data.currentLocation = pendingLocation;
            await driversService.create(data);
            break;
        }
      } else {
        const typeMap = {
          place: 'places',
          client: 'clients',
          delivery: 'deliveries',
          driver: 'drivers',
        };
        const actualTab = typeMap[currentTab] || currentTab;

        switch (actualTab) {
          case 'places':
            await placesService.update(editingItem._id, formData);
            break;
          case 'clients':
            await clientsService.update(editingItem._id, formData);
            break;
          case 'deliveries':
            await deliveriesService.update(editingItem._id, formData);
            break;
          case 'drivers':
            await driversService.update(editingItem._id, formData);
            break;
        }
      }

      setModalOpen(false);
      resetInteraction();
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar');
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle card click
  const handleCardClick = (item) => {
    setSelectedItem(item);
  };

  // Get coordinates display
  const getCoordinates = (item) => {
    if (item.location?.coordinates) {
      return `${item.location.coordinates[1].toFixed(4)}, ${item.location.coordinates[0].toFixed(4)}`;
    }
    if (item.currentLocation?.coordinates) {
      return `${item.currentLocation.coordinates[1].toFixed(4)}, ${item.currentLocation.coordinates[0].toFixed(4)}`;
    }
    return '-';
  };

  // Render form fields based on current tab
  const renderFormFields = () => {
    const tab = currentTab.endsWith('s') ? currentTab : currentTab + 's';

    switch (tab) {
      case 'places':
        return (
          <>
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={formData.name || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea
                name="description"
                className="form-control"
                value={formData.description || ''}
                onChange={handleInputChange}
              />
            </div>
          </>
        );

      case 'clients':
        return (
          <>
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={formData.name || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                name="address"
                className="form-control"
                value={formData.address || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="text"
                name="phone"
                className="form-control"
                value={formData.phone || ''}
                onChange={handleInputChange}
              />
            </div>
          </>
        );

      case 'deliveries':
        return (
          <>
            {modalMode === 'create' && (
              <div className="form-group">
                <label>Cliente</label>
                <select
                  name="clientId"
                  className="form-control"
                  value={formData.clientId || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccionar cliente</option>
                  {clientsList.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Descripción</label>
              <input
                type="text"
                name="description"
                className="form-control"
                value={formData.description || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Prioridad</label>
              <select
                name="priority"
                className="form-control"
                value={formData.priority || 'normal'}
                onChange={handleInputChange}
              >
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
            {modalMode === 'edit' && (
              <div className="form-group">
                <label>Estado</label>
                <select
                  name="status"
                  className="form-control"
                  value={formData.status || 'pending'}
                  onChange={handleInputChange}
                >
                  <option value="pending">Pendiente</option>
                  <option value="assigned">Asignada</option>
                  <option value="in_transit">En tránsito</option>
                  <option value="delivered">Entregada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            )}
          </>
        );

      case 'drivers':
        return (
          <>
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={formData.name || ''}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Vehículo</label>
              <input
                type="text"
                name="vehicle"
                className="form-control"
                value={formData.vehicle || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Capacidad</label>
              <input
                type="number"
                name="capacity"
                className="form-control"
                value={formData.capacity || ''}
                onChange={handleInputChange}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  // Get item display info
  const getItemInfo = (item) => {
    switch (currentTab) {
      case 'places':
        return { title: item.name, desc: item.description || '' };
      case 'clients':
        return { title: item.name, desc: item.address || '' };
      case 'deliveries':
        return { title: `Entrega: ${item.description}`, desc: item.status || '' };
      case 'drivers':
        return { title: item.name, desc: item.vehicle || '' };
      default:
        return { title: '', desc: '' };
    }
  };

  // Render table headers based on current tab
  const renderTableHeaders = () => {
    switch (currentTab) {
      case 'places':
        return (
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Latitud</th>
            <th>Longitud</th>
            <th>Acciones</th>
          </tr>
        );
      case 'clients':
        return (
          <tr>
            <th>Nombre</th>
            <th>Dirección</th>
            <th>Teléfono</th>
            <th>Latitud</th>
            <th>Longitud</th>
            <th>Acciones</th>
          </tr>
        );
      case 'deliveries':
        return (
          <tr>
            <th>Descripción</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Latitud</th>
            <th>Longitud</th>
            <th>Acciones</th>
          </tr>
        );
      case 'drivers':
        return (
          <tr>
            <th>Nombre</th>
            <th>Vehículo</th>
            <th>Capacidad</th>
            <th>Latitud</th>
            <th>Longitud</th>
            <th>Acciones</th>
          </tr>
        );
      default:
        return null;
    }
  };

  // Render table row based on current tab
  const renderTableRow = (item) => {
    const coords = item.location?.coordinates || item.currentLocation?.coordinates || [0, 0];
    const lat = coords[1]?.toFixed(6) || '-';
    const lng = coords[0]?.toFixed(6) || '-';

    switch (currentTab) {
      case 'places':
        return (
          <tr key={item._id} onClick={() => handleCardClick(item)} style={{ cursor: 'pointer' }}>
            <td>{item.name}</td>
            <td>{item.description || '-'}</td>
            <td>{lat}</td>
            <td>{lng}</td>
            <td>
              <button
                className="btn-table-action edit"
                onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
              >
                Editar
              </button>
              <button
                className="btn-table-action delete"
                onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
              >
                Eliminar
              </button>
            </td>
          </tr>
        );
      case 'clients':
        return (
          <tr key={item._id} onClick={() => handleCardClick(item)} style={{ cursor: 'pointer' }}>
            <td>{item.name}</td>
            <td>{item.address || '-'}</td>
            <td>{item.phone || '-'}</td>
            <td>{lat}</td>
            <td>{lng}</td>
            <td>
              <button
                className="btn-table-action edit"
                onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
              >
                Editar
              </button>
              <button
                className="btn-table-action delete"
                onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
              >
                Eliminar
              </button>
            </td>
          </tr>
        );
      case 'deliveries':
        return (
          <tr key={item._id} onClick={() => handleCardClick(item)} style={{ cursor: 'pointer' }}>
            <td>{item.description}</td>
            <td>{item.status || 'pending'}</td>
            <td>{item.priority || 'normal'}</td>
            <td>{lat}</td>
            <td>{lng}</td>
            <td>
              <button
                className="btn-table-action edit"
                onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
              >
                Editar
              </button>
              <button
                className="btn-table-action delete"
                onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
              >
                Eliminar
              </button>
            </td>
          </tr>
        );
      case 'drivers':
        return (
          <tr key={item._id} onClick={() => handleCardClick(item)} style={{ cursor: 'pointer' }}>
            <td>{item.name}</td>
            <td>{item.vehicle || '-'}</td>
            <td>{item.capacity || '-'}</td>
            <td>{lat}</td>
            <td>{lng}</td>
            <td>
              <button
                className="btn-table-action edit"
                onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
              >
                Editar
              </button>
              <button
                className="btn-table-action delete"
                onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
              >
                Eliminar
              </button>
            </td>
          </tr>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard">
      {/* Map */}
      <Map
        items={filteredItems}
        type={currentTab === 'places' ? 'place' : currentTab.slice(0, -1)}
        onMapClick={interactionMode ? handleMapClick : null}
        selectedItem={selectedItem}
        onEdit={handleEdit}
        onDelete={handleDelete}
        polygons={polygons}
        onPolygonCreated={handlePolygonCreated}
      />

      {/* Status Bar */}
      {interactionMode && (
        <div className="status-bar">
          <span>{statusText}</span>
          <button className="btn-small" onClick={resetInteraction}>
            Cancelar
          </button>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="bottom-bar-container">
        <div className="bottom-controls">
          <div className="logo-small">
            <h3>DeliveryTrack</h3>
          </div>

          <div className="search-wrapper">
            <i className="ri-search-line search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="nav-tabs-horizontal">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`nav-tab ${currentTab === tab.id ? 'active' : ''}`}
                onClick={() => setCurrentTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="view-toggle">
            <button
              className={`btn-view ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Ver como cards"
            >
              <i className="ri-layout-grid-line"></i>
            </button>
            <button
              className={`btn-view ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Ver como tabla"
            >
              <i className="ri-table-line"></i>
            </button>
          </div>

          <button className="btn-add" onClick={handleAdd}>
            <i className="ri-add-line"></i>
            Agregar
          </button>

          <div className="user-menu">
            <span>{user.name}</span>
            <button className="btn-icon" onClick={logout} title="Cerrar sesión">
              <i className="ri-logout-box-r-line"></i>
            </button>
          </div>
        </div>

        {/* Items List - Cards View */}
        {viewMode === 'cards' && (
          <div className="places-horizontal-list">
            {loading ? (
              <div style={{ padding: '10px', color: '#64748b' }}>Cargando...</div>
            ) : error ? (
              <div style={{ padding: '10px', color: '#ef4444' }}>{error}</div>
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: '10px', color: '#64748b' }}>No hay elementos</div>
            ) : (
              filteredItems.map((item) => {
                const { title, desc } = getItemInfo(item);
                return (
                  <div
                    key={item._id}
                    className="card-item"
                    onClick={() => handleCardClick(item)}
                  >
                    <div className="card-title">{title}</div>
                    <div className="card-desc">{desc}</div>
                    <div className="card-coords">{getCoordinates(item)}</div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                      <button
                        className="btn-small"
                        style={{ background: '#3b82f6', fontSize: '0.7rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-small"
                        style={{ background: '#ef4444', fontSize: '0.7rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Items List - Table View */}
        {viewMode === 'table' && (
          <div className="table-container">
            {loading ? (
              <div style={{ padding: '10px', color: '#64748b', textAlign: 'center' }}>Cargando...</div>
            ) : error ? (
              <div style={{ padding: '10px', color: '#ef4444', textAlign: 'center' }}>{error}</div>
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: '10px', color: '#64748b', textAlign: 'center' }}>No hay elementos</div>
            ) : (
              <table className="data-table">
                <thead>
                  {renderTableHeaders()}
                </thead>
                <tbody>
                  {filteredItems.map((item) => renderTableRow(item))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>
        <form onSubmit={handleSubmit}>
          {renderFormFields()}
          <button type="submit" className="btn-primary">
            {modalMode === 'create' ? 'Crear' : 'Guardar'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
