<template>
  <div class="map-container">
    <div class="map-header">
      <h5>
        <i class="bi bi-geo-alt-fill"></i>
        {{ uiLanguage === 'ar' ? 'خريطة الأخبار' : 'News Map' }}
      </h5>
      <div>
        <button
          v-if="selectedLocations.length > 0"
          class="btn-sm"
          @click="clearSelections"
        >
          <i class="bi bi-x-circle"></i>
          {{ uiLanguage === 'ar' ? 'مسح الكل' : 'Clear All' }}
        </button>
      </div>
    </div>

    <!-- Selected Locations -->
    <div v-if="selectedLocations.length > 0" class="selected-locations">
      <small>{{ uiLanguage === 'ar' ? 'المناطق المحددة:' : 'Selected:' }}</small>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
        <span
          v-for="location in selectedLocations"
          :key="location.code"
          class="badge"
        >
          {{ location.name }}
          <i class="bi bi-x" @click="removeLocation(location.code)"></i>
        </span>
      </div>
    </div>

    <!-- Map -->
    <div ref="mapContainer" class="map" :style="{ height: mapHeight }"></div>

    <!-- Legend -->
    <div class="map-legend">
      <small>
        <i class="bi bi-info-circle"></i>
        {{ uiLanguage === 'ar' ? 'انقر على المناطق لتصفية الأخبار' : 'Click regions to filter news' }}
      </small>
      <small v-if="trendingLocations.length > 0" class="legend-item">
        <i class="bi bi-bell-fill" style="color: #ff4444"></i>
        {{ uiLanguage === 'ar' ? 'مواضيع رائجة' : 'Trending topics' }}
      </small>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, inject } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default {
  name: 'NewsMap',
  props: {
    uiLanguage: {
      type: String,
      default: 'en'
    },
    trendingLocations: {
      type: Array,
      default: () => []
    }
  },
  emits: ['locations-changed', 'trending-topic-selected'],
  setup(props, { emit }) {
    const mapContainer = ref(null)
    const map = ref(null)
    const selectedLocations = ref([])
    const mapHeight = ref('400px')

    // Define major news regions with coordinates
    const regions = [
      { code: 'us', name: 'United States', lat: 37.0902, lng: -95.7129, zoom: 4 },
      { code: 'uk', name: 'United Kingdom', lat: 55.3781, lng: -3.4360, zoom: 6 },
      { code: 'fr', name: 'France', lat: 46.2276, lng: 2.2137, zoom: 6 },
      { code: 'de', name: 'Germany', lat: 51.1657, lng: 10.4515, zoom: 6 },
      { code: 'ru', name: 'Russia', lat: 61.5240, lng: 105.3188, zoom: 3 },
      { code: 'cn', name: 'China', lat: 35.8617, lng: 104.1954, zoom: 4 },
      { code: 'jp', name: 'Japan', lat: 36.2048, lng: 138.2529, zoom: 5 },
      { code: 'in', name: 'India', lat: 20.5937, lng: 78.9629, zoom: 5 },
      { code: 'sa', name: 'Saudi Arabia', lat: 23.8859, lng: 45.0792, zoom: 6 },
      { code: 'ae', name: 'UAE', lat: 23.4241, lng: 53.8478, zoom: 7 },
      { code: 'eg', name: 'Egypt', lat: 26.8206, lng: 30.8025, zoom: 6 },
      { code: 'il', name: 'Israel', lat: 31.0461, lng: 34.8516, zoom: 7 },
      { code: 'ir', name: 'Iran', lat: 32.4279, lng: 53.6880, zoom: 5 },
      { code: 'tr', name: 'Turkey', lat: 38.9637, lng: 35.2433, zoom: 6 },
      { code: 'br', name: 'Brazil', lat: -14.2350, lng: -51.9253, zoom: 4 },
      { code: 'au', name: 'Australia', lat: -25.2744, lng: 133.7751, zoom: 4 },
      { code: 'za', name: 'South Africa', lat: -30.5595, lng: 22.9375, zoom: 5 },
      { code: 'ng', name: 'Nigeria', lat: 9.0820, lng: 8.6753, zoom: 6 },
      { code: 'mx', name: 'Mexico', lat: 23.6345, lng: -102.5528, zoom: 5 },
      { code: 'ca', name: 'Canada', lat: 56.1304, lng: -106.3468, zoom: 4 }
    ]

    const markers = ref([])

    // Check if a region has trending topics
    const getTrendingData = (regionCode) => {
      return props.trendingLocations.find(loc => loc.countryCode === regionCode)
    }

    const initMap = () => {
      if (!mapContainer.value) return

      // Initialize map
      map.value = L.map(mapContainer.value, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        worldCopyJump: true
      })

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map.value)

      // Add markers for each region
      regions.forEach(region => {
        const marker = createMarker(region)
        marker.addTo(map.value)
        markers.value.push({ region, marker })
      })
    }

    const createMarker = (region) => {
      const trendingData = getTrendingData(region.code)
      const isTrending = !!trendingData

      let iconHtml
      if (isTrending && trendingData.topics.length > 0) {
        const topTopic = trendingData.topics[0]
        iconHtml = `<div class="marker-pin trending">
                      <i class="bi bi-bell-fill alarm-bell"></i>
                      <span class="trending-count">${topTopic.count}</span>
                    </div>
                    <div class="marker-label trending">${region.name}</div>`
      } else {
        iconHtml = `<div class="marker-pin">
                      <i class="bi bi-geo-alt-fill"></i>
                    </div>
                    <div class="marker-label">${region.name}</div>`
      }

      const marker = L.marker([region.lat, region.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: iconHtml,
          iconSize: [30, 42],
          iconAnchor: [15, 42]
        })
      })

      marker.on('click', () => {
        if (isTrending && trendingData.topics.length > 0) {
          // Emit trending topic selection
          const topTopic = trendingData.topics[0].topic
          emit('trending-topic-selected', topTopic)
        }
        toggleLocation(region)
      })

      return marker
    }

    const toggleLocation = (region) => {
      const index = selectedLocations.value.findIndex(loc => loc.code === region.code)

      if (index !== -1) {
        // Remove location
        selectedLocations.value.splice(index, 1)
      } else {
        // Add location
        selectedLocations.value.push(region)
      }

      updateMarkers()
      emit('locations-changed', selectedLocations.value)
    }

    const removeLocation = (code) => {
      const index = selectedLocations.value.findIndex(loc => loc.code === code)
      if (index !== -1) {
        selectedLocations.value.splice(index, 1)
        updateMarkers()
        emit('locations-changed', selectedLocations.value)
      }
    }

    const clearSelections = () => {
      selectedLocations.value = []
      updateMarkers()
      emit('locations-changed', selectedLocations.value)
    }

    const updateMarkers = () => {
      markers.value.forEach(({ region, marker }) => {
        const isSelected = selectedLocations.value.some(loc => loc.code === region.code)
        const trendingData = getTrendingData(region.code)
        const isTrending = !!trendingData

        let iconHtml
        if (isTrending && trendingData.topics.length > 0) {
          const topTopic = trendingData.topics[0]
          iconHtml = `<div class="marker-pin trending ${isSelected ? 'selected' : ''}">
                        <i class="bi bi-bell-fill alarm-bell"></i>
                        <span class="trending-count">${topTopic.count}</span>
                      </div>
                      <div class="marker-label trending ${isSelected ? 'selected' : ''}">${region.name}</div>`
        } else {
          iconHtml = `<div class="marker-pin ${isSelected ? 'selected' : ''}">
                        <i class="bi bi-geo-alt-fill"></i>
                      </div>
                      <div class="marker-label ${isSelected ? 'selected' : ''}">${region.name}</div>`
        }

        const icon = L.divIcon({
          className: 'custom-marker',
          html: iconHtml,
          iconSize: [30, 42],
          iconAnchor: [15, 42]
        })
        marker.setIcon(icon)
      })
    }

    // Watch for trending locations changes
    watch(() => props.trendingLocations, () => {
      updateMarkers()
    }, { deep: true })

    onMounted(() => {
      initMap()
    })

    return {
      mapContainer,
      selectedLocations,
      mapHeight,
      removeLocation,
      clearSelections
    }
  }
}
</script>

<style scoped>
/* ============================================
   MAP CONTAINER - Mobile-First Design
   ============================================ */
.map-container {
  background: rgba(26, 26, 46, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.map-header h5 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #ffffff;
  display: flex;
  align-items: center;
}

.map-header i {
  color: #06b6d4;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.875rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(245, 117, 108, 0.15);
  border: 1px solid rgba(245, 117, 108, 0.3);
  color: #f5756c;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.btn-sm:active {
  background: rgba(245, 117, 108, 0.25);
  transform: scale(0.95);
}

/* ============================================
   SELECTED LOCATIONS - Mobile-First
   ============================================ */
.selected-locations {
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 12px;
}

.selected-locations small {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.selected-locations .badge {
  background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.selected-locations .badge i {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.selected-locations .badge i:active {
  transform: scale(0.9);
}

/* ============================================
   MAP - Mobile-First
   ============================================ */
.map {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* ============================================
   MAP LEGEND - Mobile-First
   ============================================ */
.map-legend {
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 12px;
}

.map-legend small {
  color: #718096;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.map-legend i {
  color: #06b6d4;
}

.legend-item {
  margin-left: 16px;
}

/* ============================================
   CUSTOM MARKERS - Mobile-Optimized
   ============================================ */
:deep(.custom-marker) {
  background: none;
  border: none;
}

:deep(.marker-pin) {
  width: 30px;
  height: 42px;
  position: relative;
  color: #f5756c;
  font-size: 2rem;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
  filter: drop-shadow(0 2px 8px rgba(245, 117, 108, 0.4));
}

:deep(.marker-pin:hover) {
  transform: scale(1.2);
  color: #3b82f6;
}

:deep(.marker-pin.selected) {
  color: #3b82f6;
  transform: scale(1.3);
  animation: pulse 2s infinite;
}

:deep(.marker-label) {
  position: absolute;
  top: 45px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 15, 0.9);
  backdrop-filter: blur(8px);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.marker-label.selected) {
  background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%);
  color: white;
  border: none;
}

/* Trending marker styles */
:deep(.marker-pin.trending) {
  position: relative;
  animation: pulse-ring 2s infinite;
}

:deep(.marker-pin.trending .alarm-bell) {
  color: #ff4444;
  animation: shake 2s ease-in-out infinite;
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 8px rgba(255, 68, 68, 0.6));
}

:deep(.marker-pin.trending.selected .alarm-bell) {
  color: #3b82f6;
}

:deep(.trending-count) {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.9);
  z-index: 10;
}

:deep(.marker-label.trending) {
  background: rgba(255, 68, 68, 0.15);
  border: 1px solid rgba(255, 68, 68, 0.5);
  color: #ff4444;
  font-weight: 700;
}

/* ============================================
   TABLET ENHANCEMENT (min-width: 768px)
   ============================================ */
@media (min-width: 768px) {
  .map-container {
    padding: 20px;
  }

  .map-header h5 {
    font-size: 1.25rem;
  }
}

/* ============================================
   DESKTOP ENHANCEMENT (min-width: 1024px)
   ============================================ */
@media (min-width: 1024px) {
  .map-container {
    backdrop-filter: blur(12px);
    border-radius: 24px;
    padding: 24px;
  }

  .btn-sm:hover {
    background: rgba(245, 117, 108, 0.25);
    transform: translateY(-2px);
  }

  .btn-sm:active {
    transform: scale(0.95);
  }
}

/* ============================================
   ANIMATIONS
   ============================================ */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes shake {
  0%, 100% {
    transform: rotate(0deg);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: rotate(-10deg);
  }
  20%, 40%, 60%, 80% {
    transform: rotate(10deg);
  }
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(255, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 68, 68, 0);
  }
}

/* ============================================
   ACCESSIBILITY
   ============================================ */
@media (prefers-reduced-motion: reduce) {
  :deep(.marker-pin),
  :deep(.marker-pin.selected),
  :deep(.marker-pin.trending),
  :deep(.alarm-bell) {
    animation: none !important;
    transition: none;
  }
}

/* Mobile: Reduce animation intensity */
@media (max-width: 768px) {
  @keyframes shake {
    0%, 100% {
      transform: rotate(0deg);
    }
    25%, 75% {
      transform: rotate(-5deg);
    }
    50% {
      transform: rotate(5deg);
    }
  }
}
</style>
