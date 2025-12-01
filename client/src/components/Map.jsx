import { useEffect, useRef } from 'react';

const Map = ({ items = [], type, onMapClick, selectedItem, onMarkerClick }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersMapRef = useRef(new window.Map());
  const LRef = useRef(null);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (mapInstanceRef.current || !mapRef.current) return;

      // Dynamic import of Leaflet
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

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

      const marker = L.marker([lat, lng], { icon: icons[type] || icons.place })
        .bindPopup(`<b>${title}</b><br>${desc}`);

      marker.on('click', () => {
        if (onMarkerClick) onMarkerClick(item);
      });

      markersLayerRef.current.addLayer(marker);
      markersMapRef.current.set(item._id, marker);
    });
  }, [items, type, onMarkerClick]);

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
