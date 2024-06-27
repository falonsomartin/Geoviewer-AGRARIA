import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import MapboxTraffic from '@mapbox/mapbox-gl-traffic';
import mapboxgl from 'mapbox-gl';
import React from 'react';

import geocoder from '@plugins/geocoder.plugin';
import marker from '@plugins/marker.plugin';
import Minimap from '@plugins/minimap.plugin';
import { buildPolygonStyle } from '../utils/map.utils';
import { ACCESS_TOKEN } from '@/config';
import '@styles/map.style.css';
import emitter from '@utils/events.utils';
import { mapStyles } from '@utils/map.utils';
import { DOMParser } from 'xmldom';
var tj = require('@mapbox/togeojson')


const styles = {
    root: {
        width: '100%',
        position: 'fixed',
        top: 64,
        bottom: 0
    }
};

class Canvas extends React.Component {
    constructor(props) {
        super(props);
        this.mapContainer = React.createRef();
        this.state = {
            map: null,
            draw: null,
            minimap: null,
            popup: null,
            gettingPoint: null,
            tempId: null,
            styleCode: Object.values(mapStyles)[0].substring(16)
        }    
    }
    
    flyToGeometry(map, geometry) {
        console.log(geometry)
        const type = geometry.type;
        let coordinates;
    
        if (type === 'FeatureCollection') {
            // Si es una colección de características, toma la primera característica
            const firstFeature = geometry.features[0];
            console.log(firstFeature)
            coordinates = firstFeature.geometry.coordinates;

        } else if (type === 'Feature') {
            coordinates = geometry.geometry.coordinates;
        } else {
            // Asume que es una estructura GeoJSON directa
            coordinates = geometry.coordinates;
        }
    
        // Ajuste en base al tipo de geometría
        if (geometry.features[0].geometry.type === 'Polygon') {
            // Usa el primer conjunto de coordenadas del primer polígono
            console.log(coordinates)
            this.state.map.flyTo({
                center: coordinates[0][0], // Coordenadas del primer punto del polígono
                zoom: 15 // Ajusta según necesidades
            });
        } else if (geometry.features[0].geometry.type === 'Point') {
            // Vuela directamente al punto
            this.state.map.flyTo({
                center: coordinates,
                zoom: 17 // Ajusta según necesidades
            });
        }
    }

    handleDragOver = (event) => {
        this.removeAllLayer();
        event.preventDefault();
    };

    

    removeTempLayer = () => {
        // Remove layers
        const layers = this.state.map.getStyle().layers;
        console.log(layers)
        this.setState({
            map: null
        })
        layers.map(layer => {
            if (layer.id === 'custom-temp-point') {
                this.state.map.removeLayer('custom-temp-point');
                this.state.map.removeSource('custom-temp-point');
            }
            return true;
        });

        // Remove popup
        if (this.state.popup.isOpen()) {
            this.state.popup.remove();
        }
    }

    removeAllLayer = () => {
        // Remove layers
        const layers = this.state.map.getStyle().layers;

        layers.map(layer => {
            if (layer.id.includes('-points')) {
                this.state.map.removeLayer(layer.id);
                this.state.map.removeSource(layer.source);
            }

            return true;
        });

        layers.map(layer => {
            console.log(layer.id)
            if (layer.id.includes('-boundary')) {
                this.state.map.removeLayer(layer.id);
                this.state.map.removeSource(layer.source);
            }
            return true;

        });

        layers.map(layer => {
            console.log(layer.id)
            if (layer.id.includes('SOC')) {
                this.state.map.removeLayer(layer.id);
                this.state.map.removeSource(layer.source);
            }

            return true;
        });

        // Remove popup
        if (this.state.popup.isOpen()) {
            this.state.popup.remove();
        }

        emitter.emit('handleDatasetRemove');
    }

    add3dLayer = () => {
        var layers = this.state.map.getStyle().layers;
        for (var layer in layers) {
            if (layer.type === 'symbol' && layer.layout['text-field']) {
                var labelLayerId = layer.id;
                break;
            }
        }

        if (this.state.map.getLayer('3d-buildings')) {
            this.state.map.moveLayer('3d-buildings', labelLayerId);
            return;
        }

        this.state.map.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 12,
            'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0,
                    15.05, ["get", "height"]
                ],
                'fill-extrusion-base': [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0,
                    15.05, ["get", "min_height"]
                ],
                'fill-extrusion-opacity': .6
            }
        }, labelLayerId);
    }

    removeTempPoint = () => {
        this.state.draw.delete(this.state.tempId);
        this.setState({
            tempId: null
        });
    }

    componentDidMount() {
        // Verify access token
        mapboxgl.accessToken = ACCESS_TOKEN;

        // Check for browser support
        if (!mapboxgl.supported()) {
            alert('Your browser does not support Mapbox GL');
            return;
        }

        // Initialize map object
        const map = new mapboxgl.Map({
            container: this.mapContainer.current,
            style: Object.values(mapStyles)[1],
            center: [-6.002481, 37.377469],
            zoom: 17,
            antialias: true
        });
        console.log(map.container)
        // Initialize map draw plugin
        const draw = new MapboxDraw({
            controls: {
                combine_features: false,
                uncombine_features: false
            }
        });

        // Add map controls
        const minimap = new Minimap({
            center: map.getCenter()
        });

        map.addControl(new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
            localGeocoder: geocoder,
            placeholder: 'Search Address',
            marker: {
                color: 'red'
            }
        }), 'top-left');
        map.addControl(new mapboxgl.NavigationControl(), 'top-left');
        map.addControl(new mapboxgl.GeolocateControl(), 'top-left');
        map.addControl(new MapboxTraffic({
            trafficSource: new RegExp('/*/')
        }), 'top-left');
        map.addControl(draw, 'top-left');
        map.addControl(minimap, 'bottom-left');

        // Initialize popup
        const popup = new mapboxgl.Popup({
            closeButton: false,
            anchor: 'bottom'
        }).setHTML('<div id="popup-container"></div>');

        // Cover search box style
        document.getElementsByClassName('mapboxgl-ctrl-geocoder--input')[0].setAttribute('type', 'search-box');

        // Bind event listeners
        map.on('load', () => {
            this.add3dLayer();
            // Hide loader
            document.getElementById('loader-wrapper').classList.add('loaded');        
            
        });

        // Suponiendo que 'map' es tu objeto Mapbox
        map.on('zoomend', function() {
            var zoomLevel = map.getZoom();
            emitter.emit('setMapZoom', zoomLevel);

            // Haz algo con el nivel de zoom, como actualizar la UI o hacer una nueva consulta a tu base de datos
        });

  
        map.on('draw.create', e => {
            if (!this.state.gettingPoint) {
                return;
            }

            // Save temp id
            this.setState({
                tempId: e.features[0].id
            });

            // Set point
            emitter.emit('setPoint', e.features[0], this.state.styleCode, this.state.map.getZoom());

            // Reset state
            this.setState({
                gettingPoint: false
            })
        });

        this.fetchData();

        this.setMapStyleListener = emitter.addListener('setMapStyle', e => {
            // Remove last popup
            if (this.state.popup.isOpen()) {
                this.state.popup.remove();
            }

            // Set main map style
            this.state.map.setStyle(mapStyles[e]);

            // Set minimap style
            const minimap = new Minimap({
                center: this.state.map.getCenter(),
                style: Object.values(mapStyles)[1]
            });
            this.state.map.removeControl(this.state.minimap);
            this.state.map.addControl(minimap, 'bottom-left');
            console.log(mapStyles[e])
            this.setState({
                minimap: minimap,
                styleCode: mapStyles[e].substring(16)
            });
        });

        this.displayDatasetListener = emitter.addListener('displayDataset', (id, geometry) => {

            if (this.state.map.getSource(id)) {
                this.state.map.removeSource(id);
            }
             
            map.addSource(id, {
                'type': 'geojson',
                'data': geometry
            });

            map.addLayer({
                'id': id + '-boundary', // Se utiliza el id proporcionado para generar un identificador único para la capa
                'type': 'fill',
                'source': id,
                'paint': 
                    buildPolygonStyle(id)
                ,
                'filter': ['==', '$type', 'Polygon']
            });

            map.addLayer({
                'id': id + '-points', // Genera un identificador único para la capa de puntos
                'type': 'circle',
                'source': id,
                'paint': {
                    'circle-radius': 6,
                    'circle-color': '#B42222'
                },
                'filter': ['==', '$type', 'Point']
            });

            this.flyToGeometry(map, geometry)
               
        });

        this.removeDatasetListener = emitter.addListener('removeDataset', e => {
            // Identificadores de capas basados en el id del conjunto de datos
            const layerIds = [e + '-boundary', e + '-points'];
        
            // Recorre cada id de capa derivado para eliminar las capas y la fuente de datos
            layerIds.forEach(layerId => {
                // Verifica si la capa existe antes de intentar removerla
                if (this.state.map.getLayer(layerId)) {
                    console.log('Removing layer and source:', layerId);
                    // Remueve la capa
                    this.state.map.removeLayer(layerId);
                }
            });
        
            // Verifica si la fuente de datos existe antes de intentar removerla
            if (this.state.map.getSource(e)) {
                // Remueve la fuente de datos asociada al id original del conjunto de datos
                this.state.map.removeSource(e);
            }
        });
        

        this.moveLayerListener = emitter.addListener('moveLayer', (id, beforeId) => {
            // Move layer
            if (beforeId) {
                this.state.map.moveLayer(id, beforeId);
            } else {
                this.state.map.moveLayer(id);
            }
        });

        this.displayTempLayerListener = emitter.addListener('displayTempLayer', e => {
            // Remove previews temp layer
            this.removeTempLayer();

            // Add rendering resource
            if (!this.state.map.hasImage('marker')) {
                this.state.map.addImage('marker', marker, { pixelRatio: 3 });
            }

            // Add point layer on map
            this.state.map.addLayer({
                id: 'custom-temp-point',
                type: 'symbol',
                source: {
                    type: 'geojson',
                    data: e.geometry
                },
                layout: {
                    'icon-image': 'marker'
                }
            });

            // Add popup on map
            this.state.popup.setLngLat(e.geometry.geometry.coordinates).addTo(this.state.map);
            emitter.emit('bindPopup', e);

            // Fly to the point
            this.state.map.flyTo({
                center: e.geometry.geometry.coordinates,
                zoom: 6,
                bearing: 0
            });
        });

        this.removeAllLayerListener = emitter.addListener('removeAllLayer', () => {
            // Remove temp layer
            this.removeAllLayer();
        });

        this.removeTempLayerListener = emitter.addListener('removeTempLayer', () => {
            // Remove temp layer
            this.removeTempLayer();
        });

        this.getPointListener = emitter.addListener('getPoint', () => {
            // Remove temp point
            this.removeTempPoint();

            // Active draw_point mode
            this.state.draw.changeMode('draw_point');
            emitter.emit('showSnackbar', 'default', 'Click on the map to select a point.');
            this.setState({
                gettingPoint: true
            })
        });

        this.removeTempPointListener = emitter.addListener('removeTempPoint', () => {
            // Remove temp point
            this.removeTempPoint();
        });

        // Set state
        this.setState({
            map: map,
            draw: draw,
            style: Object.values(mapStyles)[1],
            minimap: minimap,
            popup: popup
        });

        emitter.on('moveURL', this.handleURLMoved);
        emitter.on('moveCapa', this.handleCapaMoved);
        window.addEventListener('dragover', this.handleDragOver);
        window.addEventListener('drop', this.handleDrop);


        
    }

    handleURLMoved = (movedURL) => {

        console.log('Received moved data:', movedURL);
        // Aquí puedes hacer algo con los datos, como establecer el estado
        this.removeAllLayer();
        this.setState({ url: movedURL });
        this.state.map.addLayer({
            'id': 'predictedSOC',
            'type': 'raster',
            'source': {
                'type': 'raster',
                'tiles': [
                    this.state.url
                ],
                'tileSize': 256
            },
            'paint': {
                'raster-opacity': 0.8  // Opacidad de la capa de ráster
            }
        });
    }

    

    handleDragOver = (event) => {
        event.preventDefault();
    };

    handleCapaMoved = (movedCapa) => {
        console.log('Received moved data:', movedCapa);
        // Aquí puedes hacer algo con los datos, como establecer el estado
        this.removeAllLayer();

        this.setState({ capa: movedCapa });
        let geometry = this.convertToGeoJSON(this.state.capa)
        this.state.map.addSource('id', {
            'type': 'geojson',
            'data': geometry
        });

        this.state.map.addLayer({
            'id': 'id' + '-boundary', // Se utiliza el id proporcionado para generar un identificador único para la capa
            'type': 'fill',
            'source': 'id',
            'paint': {
                'fill-color': '#888888',
                'fill-opacity': 0.4
            },
            'filter': ['==', '$type', 'Polygon']
        });

        this.flyToGeometry(this.state.map, geometry)
    }

    convertToGeoJSON(data) {
        const geojson = {
            type: 'FeatureCollection',
            features: data.features.map((feature) => {
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [feature.properties.x1, feature.properties.y1],
                            [feature.properties.x1, feature.properties.y2],
                            [feature.properties.x2, feature.properties.y2],
                            [feature.properties.x2, feature.properties.y1],
                            [feature.properties.x1, feature.properties.y1] // Cerrar el polígono
                        ]]
                    },
                    properties: {
                        codigo: feature.properties.codigo,
                        dn_pk: feature.properties.dn_pk,
                        nombre: feature.properties.nombre
                    }
                };
            })
        };
    
        return geojson;
    }
    

    fetchData = () => {

    }

    handleDrop = (event) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            console.log(file)
            const reader = new FileReader();
            reader.onload = (e) => {
            
                if (file.name.endsWith('.kml')) {
                    console.log("Raw file content:", e.target.result);
                    const parser = new DOMParser();
                    const dom = parser.parseFromString(e.target.result, 'utf8');
                
                    // Verificar si hubo un error al parsear el XML
                    if (dom.documentElement.nodeName === "parsererror") {
                        console.error("Error al parsear el XML:", dom.documentElement.textContent);
                        return;
                    }
                
                    console.log("DOM Object:", dom);
                    console.log(dom.documentElement.textContent)
                    try {
                        const geoJsonData = tj.kml(e.target.result);
                        console.log("Converted GeoJSON Data:", geoJsonData);
                    } catch (error) {
                        console.error("Error converting KML to GeoJSON:", error);
                    }
                }else{
                    console.log(e)
                    const data = JSON.parse(e.target.result);
                    console.log(data)
                    const geoJsonData = data; // Asumiendo que el archivo es un GeoJSON válido
                    this.setState({datasets:{geoJsonData}})
                    emitter.emit('displayDataset', file.name, geoJsonData);
                    emitter.emit('showSnackbar', 'success', `Dataset '${file.name}' downloaded successfully.`);
        
                }

            
        };
            reader.readAsText(file);
        
    }
        
    };

    componentWillUnmount() {
        // Remove event listeners
        emitter.removeListener(this.setMapStyleListener);
        emitter.removeListener(this.displayDatasetListener);
        emitter.removeListener(this.removeDatasetListener);
        emitter.removeListener(this.moveLayerListener);
        emitter.removeListener(this.displayTempLayerListener);
        emitter.removeListener(this.removeTempLayerListener);
        emitter.removeListener(this.removeAllLayerListener);
        emitter.removeListener(this.getPointListener);
        emitter.removeListener(this.removeTempPointListener);
        window.removeEventListener('dragover', this.handleDragOver);
        window.removeEventListener('drop', this.handleDrop);

    }


    render() {
        console.log(this.state.map)
        return (
            <div id="map" style={styles.root} ref={this.mapContainer}></div>
        );
    }
}

export default Canvas;