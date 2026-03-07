<template>
  <div class="map-container">
    <div class="map-header">
      <h5>
        <i class="bi bi-geo-alt-fill"></i>
        {{ uiLanguage === 'ar' ? 'خريطة الأخبار' : 'News Map' }}
      </h5>
      <div class="map-legend-row">
        <small v-if="trendingLocations.length > 0" class="legend-item">
          <i class="bi bi-bell-fill" style="color:#ff4444"></i>
          {{ uiLanguage === 'ar' ? 'رائج' : 'Trending' }}
        </small>
        <small class="legend-item">
          <i class="bi bi-geo-alt-fill" style="color:#f5756c"></i>
          {{ uiLanguage === 'ar' ? 'انقر للتصفية' : 'Click to filter' }}
        </small>
      </div>
    </div>

    <div ref="mapContainer" class="map" :style="{ height: mapHeight }"></div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default {
  name: 'NewsMap',
  props: {
    uiLanguage: { type: String, default: 'en' },
    trendingLocations: { type: Array, default: () => [] },
    activeLocations: { type: Array, default: () => [] },
    isDarkMode: { type: Boolean, default: false }
  },
  emits: ['locations-changed', 'trending-topic-selected'],
  setup(props, { emit }) {
    const mapContainer = ref(null)
    const map = ref(null)
    const tileLayer = ref(null)
    const selectedLocations = ref([])
    const mapHeight = ref('420px')

    const regions = [
      { code: 'us', name: 'United States',  lat: 37.09,  lng: -95.71 },
      { code: 'uk', name: 'United Kingdom', lat: 55.38,  lng: -3.44  },
      { code: 'fr', name: 'France',         lat: 46.23,  lng: 2.21   },
      { code: 'de', name: 'Germany',        lat: 51.17,  lng: 10.45  },
      { code: 'ru', name: 'Russia',         lat: 61.52,  lng: 105.32 },
      { code: 'cn', name: 'China',          lat: 35.86,  lng: 104.20 },
      { code: 'jp', name: 'Japan',          lat: 36.20,  lng: 138.25 },
      { code: 'in', name: 'India',          lat: 20.59,  lng: 78.96  },
      { code: 'sa', name: 'Saudi Arabia',   lat: 23.89,  lng: 45.08  },
      { code: 'ae', name: 'UAE',            lat: 23.42,  lng: 53.85  },
      { code: 'eg', name: 'Egypt',          lat: 26.82,  lng: 30.80  },
      { code: 'il', name: 'Israel',         lat: 31.05,  lng: 34.85  },
      { code: 'ir', name: 'Iran',           lat: 32.43,  lng: 53.69  },
      { code: 'tr', name: 'Turkey',         lat: 38.96,  lng: 35.24  },
      { code: 'br', name: 'Brazil',         lat: -14.24, lng: -51.93 },
      { code: 'au', name: 'Australia',      lat: -25.27, lng: 133.78 },
      { code: 'za', name: 'South Africa',   lat: -30.56, lng: 22.94  },
      { code: 'ng', name: 'Nigeria',        lat: 9.08,   lng: 8.68   },
      { code: 'mx', name: 'Mexico',         lat: 23.63,  lng: -102.55},
      { code: 'ca', name: 'Canada',         lat: 56.13,  lng: -106.35},
      { code: 'pk', name: 'Pakistan',       lat: 30.38,  lng: 69.35  },
      { code: 'ua', name: 'Ukraine',        lat: 48.38,  lng: 31.17  },
      { code: 'ps', name: 'Palestine',      lat: 31.95,  lng: 35.23  }
    ]

    const markers = ref([])

    const getTrendingData = (regionCode) =>
      props.trendingLocations.find(loc => loc.countryCode === regionCode)

    const buildIconHtml = (region, isSelected) => {
      const trendingData = getTrendingData(region.code)
      const isTrending = !!(trendingData?.topics?.length)

      if (isTrending) {
        const count = trendingData.topics[0].count
        return `<div class="marker-pin trending ${isSelected ? 'selected' : ''}">
                  <i class="bi bi-bell-fill alarm-bell"></i>
                  <span class="trending-count">${count}</span>
                </div>
                <div class="marker-label trending ${isSelected ? 'selected' : ''}">${region.name}</div>`
      }
      return `<div class="marker-pin ${isSelected ? 'selected' : ''}">
                <i class="bi bi-geo-alt-fill"></i>
              </div>
              <div class="marker-label ${isSelected ? 'selected' : ''}">${region.name}</div>`
    }

    const createMarker = (region) => {
      const isSelected = selectedLocations.value.some(loc => loc.code === region.code)
      const marker = L.marker([region.lat, region.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: buildIconHtml(region, isSelected),
          iconSize: [30, 42],
          iconAnchor: [15, 42]
        })
      })

      marker.on('click', () => {
        const trendingData = getTrendingData(region.code)
        if (trendingData?.topics?.length) {
          emit('trending-topic-selected', trendingData.topics[0].topic)
        }
        toggleLocation(region)
      })

      return marker
    }

    const updateMarkers = () => {
      markers.value.forEach(({ region, marker }) => {
        const isSelected = selectedLocations.value.some(loc => loc.code === region.code)
        marker.setIcon(L.divIcon({
          className: 'custom-marker',
          html: buildIconHtml(region, isSelected),
          iconSize: [30, 42],
          iconAnchor: [15, 42]
        }))
      })
    }

    const toggleLocation = (region) => {
      const idx = selectedLocations.value.findIndex(loc => loc.code === region.code)
      if (idx !== -1) selectedLocations.value.splice(idx, 1)
      else selectedLocations.value.push(region)
      updateMarkers()
      emit('locations-changed', selectedLocations.value)
    }

    const removeLocation = (code) => {
      const idx = selectedLocations.value.findIndex(loc => loc.code === code)
      if (idx !== -1) {
        selectedLocations.value.splice(idx, 1)
        updateMarkers()
        emit('locations-changed', selectedLocations.value)
      }
    }

    const clearSelections = () => {
      selectedLocations.value = []
      updateMarkers()
      emit('locations-changed', [])
    }

    const initMap = () => {
      if (!mapContainer.value || map.value) return

      map.value = L.map(mapContainer.value, {
        center: [20, 15],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        worldCopyJump: true,
        zoomControl: false
      })

      L.control.zoom({ position: 'bottomright' }).addTo(map.value)

      const style = props.isDarkMode ? 'dark_all' : 'light_all'
      tileLayer.value = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      })
      tileLayer.value.addTo(map.value)

      regions.forEach(region => {
        const marker = createMarker(region)
        marker.addTo(map.value)
        markers.value.push({ region, marker })
      })
    }

    watch(() => props.isDarkMode, (dark) => {
      if (!map.value) return
      if (tileLayer.value) map.value.removeLayer(tileLayer.value)
      const style = dark ? 'dark_all' : 'light_all'
      tileLayer.value = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      })
      tileLayer.value.addTo(map.value)
    })

    watch(() => props.trendingLocations, updateMarkers, { deep: true })
    watch(() => props.activeLocations, (newLocs) => {
      selectedLocations.value = [...newLocs]
      updateMarkers()
    }, { deep: true })

    onMounted(() => { initMap() })

    onUnmounted(() => {
      if (map.value) {
        map.value.remove()
        map.value = null
      }
    })

    return { mapContainer, selectedLocations, mapHeight, removeLocation, clearSelections }
  }
}
</script>

<style scoped>
.map-container {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(30, 58, 95, 0.1);
  border-radius: 6px;
  padding: 12px 14px 0;
  margin-bottom: 0;
}

.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.map-header h5 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: #1c1917;
  display: flex;
  align-items: center;
  gap: 5px;
}

.map-header i { color: #1e3a5f; }

.map-legend-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.legend-item {
  color: #44403c;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.map {
  border-radius: 4px 4px 0 0;
  overflow: hidden;
}

/* ── Custom markers (dark style) ── */
:deep(.custom-marker) {
  background: none;
  border: none;
}

:deep(.marker-pin) {
  width: 30px;
  height: 42px;
  position: relative;
  color: #f5756c;
  font-size: 1.8rem;
  text-align: center;
  transition: all 0.25s;
  cursor: pointer;
  filter: drop-shadow(0 2px 6px rgba(245,117,108,0.5));
}

:deep(.marker-pin:hover) {
  transform: scale(1.2);
  color: #3b82f6;
}

:deep(.marker-pin.selected) {
  color: #3b82f6;
  transform: scale(1.3);
  filter: drop-shadow(0 2px 10px rgba(59,130,246,0.7));
}

:deep(.marker-label) {
  position: absolute;
  top: 43px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(6px);
  padding: 3px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  color: #1c1917;
  border: 1px solid rgba(30,58,95,0.15);
}

:deep(.marker-label.selected) {
  background: linear-gradient(135deg, #1e3a5f, #2d5f8a);
  border-color: transparent;
  color: white;
}

:deep(.marker-pin.trending) {
  position: relative;
}

:deep(.alarm-bell) {
  color: #ff4444;
  font-size: 1.6rem;
  display: inline-block;
  transform-origin: top center;
  animation: bell-ring 2s ease-in-out infinite;
  filter: drop-shadow(0 0 8px rgba(255, 68, 68, 0.9));
}

:deep(.marker-pin.trending.selected .alarm-bell) {
  color: #60a5fa;
  filter: drop-shadow(0 0 8px rgba(96, 165, 250, 0.9));
}

:deep(.trending-count) {
  position: absolute;
  top: -6px;
  right: -8px;
  background: #ff4444;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid rgba(255,255,255,0.85);
  z-index: 10;
}

:deep(.marker-label.trending) {
  background: rgba(255,68,68,0.15);
  border-color: rgba(255,68,68,0.4);
  color: #ff6666;
  font-weight: 700;
}

@keyframes bell-ring {
  0%,  55%, 100% { transform: rotate(0deg) scale(1);    }
  5%,  15%       { transform: rotate(-18deg) scale(1.1); }
  10%, 20%       { transform: rotate(18deg) scale(1.1);  }
  25%, 35%       { transform: rotate(-10deg) scale(1.05);}
  30%, 40%       { transform: rotate(10deg) scale(1.05); }
  50%            { transform: rotate(0deg) scale(1.15);  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.marker-pin), :deep(.alarm-bell) {
    animation: none !important;
    transition: none;
  }
}
</style>
