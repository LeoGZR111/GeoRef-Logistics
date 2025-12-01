import { useEffect, useRef } from 'react';

const Map = ({
  items = [],
  type,
  onMapClick,
  selectedItem,
  onMarkerClick,
  onEdit,
  onDelete,
  polygons = [],
  onPolygonCreated
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const polygonsLayerRef = useRef(null);
  const markersMapRef = useRef(new window.Map());
  const LRef = useRef(null);
  const drawControlRef = useRef(null);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (mapInstanceRef.current || !mapRef.current) return;

      // Dynamic import of Leaflet
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      // Import Leaflet Draw
      await import('leaflet-draw/dist/leaflet.draw.css');
      await import('leaflet-draw');

      LRef.current = L.default || L;

      // Fix default markers
      delete LRef.current.Icon.Default.prototype._getIconUrl;
      LRef.current.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      mapInstanceRef.current = LRef.current.map(mapRef.current).setView([21.15, -101.68], 13);

      LRef.current.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstanceRef.current);

      markersLayerRef.current = LRef.current.layerGroup().addTo(mapInstanceRef.current);
      polygonsLayerRef.current = LRef.current.layerGroup().addTo(mapInstanceRef.current);

      // Add draw control
      const drawnItems = new LRef.current.FeatureGroup();
      mapInstanceRef.current.addLayer(drawnItems);

      drawControlRef.current = new LRef.current.Control.Draw({
        draw: {
          polyline: false,
          rectangle: false,
          circle: false,
          marker: false,
          circlemarker: false,
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
              color: '#6366f1',
              fillOpacity: 0.3
            }
          }
        },
        edit: {
          featureGroup: drawnItems,
          remove: false,
          edit: false
        }
      });
      mapInstanceRef.current.addControl(drawControlRef.current);

      // Handle polygon created
      mapInstanceRef.current.on(LRef.current.Draw.Event.CREATED, (e) => {
        const layer = e.layer;
        if (e.layerType === 'polygon') {
          const latlngs = layer.getLatLngs()[0];
          const coords = latlngs.map(p => [p.lng, p.lat]);
          if (coords.length > 0) coords.push(coords[0]); // Close ring

          if (onPolygonCreated) {
            onPolygonCreated(coords);
          }
        }
      });
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle map click
  useEffect(() => {
    if (!mapInstanceRef.current || !onMapClick) return;

    const handleClick = (e) => {
      onMapClick(e.latlng);
    };

    mapInstanceRef.current.on('click', handleClick);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('click', handleClick);
      }
    };
  }, [onMapClick]);

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current || !LRef.current) return;

    const L = LRef.current;

    const icons = {
      place: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
      client: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
      delivery: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
      driver: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
    };

    markersLayerRef.current.clearLayers();
    markersMapRef.current.clear();

    items.forEach((item) => {
      let lat, lng, title, desc;

      if (type === 'driver') {
        if (item.currentLocation?.coordinates) {
          [lng, lat] = item.currentLocation.coordinates;
        } else {
          return;
        }
        title = item.name;
        desc = item.vehicle || '';
      } else {
        if (!item.location?.coordinates) return;
        [lng, lat] = item.location.coordinates;
        title = item.name || (item.description ? `Entrega: ${item.description}` : 'Item');
        desc = item.address || item.description || item.status || '';
      }

      // Create popup content with edit/delete buttons
      const popupContent = document.createElement('div');
      popupContent.innerHTML = `
        <div style="min-width: 150px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px;">${title}</h4>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">${desc}</p>
          <p style="margin: 0 0 12px 0; font-size: 11px; color: #999;">
            Lat: ${lat.toFixed(6)}<br>
            Lng: ${lng.toFixed(6)}
          </p>
          <div style="display: flex; gap: 8px;">
            <button id="edit-btn-${item._id}" style="
              background: #3b82f6;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">Editar</button>
            <button id="delete-btn-${item._id}" style="
              background: #ef4444;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">Eliminar</button>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: icons[type] || icons.place });

      const popup = L.popup().setContent(popupContent);
      marker.bindPopup(popup);

      // Add event listeners after popup opens
      marker.on('popupopen', () => {
        const editBtn = document.getElementById(`edit-btn-${item._id}`);
        const deleteBtn = document.getElementById(`delete-btn-${item._id}`);

        if (editBtn) {
          editBtn.onclick = (e) => {
            e.stopPropagation();
            marker.closePopup();
            if (onEdit) onEdit(item, type);
          };
        }

        if (deleteBtn) {
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            marker.closePopup();
            if (onDelete) onDelete(item, type);
          };
        }
      });

      marker.on('click', () => {
        if (onMarkerClick) onMarkerClick(item);
      });

      markersLayerRef.current.addLayer(marker);
      markersMapRef.current.set(item._id, marker);
    });
  }, [items, type, onMarkerClick, onEdit, onDelete]);

  // Update polygons
  useEffect(() => {
    if (!polygonsLayerRef.current || !LRef.current) return;

    const L = LRef.current;
    polygonsLayerRef.current.clearLayers();

    polygons.forEach((polygon) => {
      if (polygon.area?.coordinates) {
        const coords = polygon.area.coordinates[0].map(coord => [coord[1], coord[0]]);
        const poly = L.polygon(coords, {
          color: '#6366f1',
          fillOpacity: 0.2,
          weight: 2
        }).bindPopup(`<b>${polygon.name}</b>`);
        polygonsLayerRef.current.addLayer(poly);
      }
    });
  }, [polygons]);

  // Center on selected item
  useEffect(() => {
    if (!selectedItem || !mapInstanceRef.current) return;

    let coords;
    if (selectedItem.currentLocation?.coordinates) {
      coords = selectedItem.currentLocation.coordinates;
    } else if (selectedItem.location?.coordinates) {
      coords = selectedItem.location.coordinates;
    }

    if (coords) {
      const [lng, lat] = coords;
      mapInstanceRef.current.setView([lat, lng], 16);

      const marker = markersMapRef.current.get(selectedItem._id);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedItem]);

  return <div id="map" ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};

export default Map;
