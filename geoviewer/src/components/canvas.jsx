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

const styles = {
    root: {
        width: '100%',
        position: 'fixed',
        top: 64,
        bottom: 0
    },
    legend: {
        position: 'absolute',
        bottom: '30px',
        left: '10px',
        background: 'white',
        padding: '10px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '18px',
        color: '#333',
        borderRadius: '3px',
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)'
    },
    legendTitle: {
        margin: '0 0 10px',
        fontSize: '14px'
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '5px'
    },
    legendColorBox: {
        width: '20px',
        height: '10px',
        display: 'inline-block',
        marginRight: '5px'
    },
    spectralLegend: {
        position: 'absolute',
        bottom: '30px',
        left: '10px',
        background: 'white',
        padding: '10px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '18px',
        color: '#333',
        borderRadius: '3px',
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)'
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
            styleCode: Object.values(mapStyles)[1].substring(16)
        };
    }

    flyToGeometry(map, geometry) {
        const type = geometry.type;
        let coordinates;

        if (type === 'FeatureCollection') {
            const firstFeature = geometry.features[0];
            coordinates = firstFeature.geometry.coordinates;
        } else if (type === 'Feature') {
            coordinates = geometry.geometry.coordinates;
        } else {
            coordinates = geometry.coordinates;
        }

        if (geometry.features[0].geometry.type === 'Polygon') {
            this.state.map.flyTo({
                center: coordinates[0][0],
                zoom: 15
            });
        } else if (geometry.features[0].geometry.type === 'Point') {
            this.state.map.flyTo({
                center: coordinates,
                zoom: 17
            });
        }
    }

    removeTempLayer = () => {
        const layers = this.state.map.getStyle().layers;
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

        if (this.state.popup && this.state.popup.isOpen()) {
            this.state.popup.remove();
        }
    }

    removeAllLayer = () => {
        const layers = this.state.map.getStyle().layers;
        layers.map(layer => {
            if (layer.id.includes('-points')) {
                this.state.map.removeLayer(layer.id);
                this.state.map.removeSource(layer.source);
            }
            return true;
        });

        layers.map(layer => {
            if (layer.id.includes('-boundary')) {
                this.state.map.removeLayer(layer.id);
                this.state.map.removeSource(layer.source);
            }
            return true;
        });

        if (this.state.popup && this.state.popup.isOpen()) {
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
        mapboxgl.accessToken = ACCESS_TOKEN;

        if (!mapboxgl.supported()) {
            alert('Your browser does not support Mapbox GL');
            return;
        }

        const map = new mapboxgl.Map({
            container: this.mapContainer.current,
            style: Object.values(mapStyles)[0],
            center: [-6.002481, 37.377469],
            zoom: 10,
            antialias: true
        });

        const draw = new MapboxDraw({
            controls: {
                combine_features: false,
                uncombine_features: false
            }
        });

        //const minimap = new Minimap({
        //    center: map.getCenter(),
        //    style: Object.values(mapStyles)[0]
        //});

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
        //map.addControl(minimap, 'bottom-left');

        const popup = new mapboxgl.Popup({
            closeButton: false,
            anchor: 'bottom'
        }).setHTML('<div id="popup-container"></div>');

        document.getElementsByClassName('mapboxgl-ctrl-geocoder--input')[0].setAttribute('type', 'search-box');

        map.on('load', () => {
            this.add3dLayer();
            // Hide loader
            document.getElementById('loader-wrapper').classList.add('loaded');        
            
        });

        map.on('zoomend', () => {
            const zoomLevel = map.getZoom();
            emitter.emit('setMapZoom', zoomLevel);
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

        this.setMapStyleListener = emitter.addListener('setMapStyle', e => {
            if (this.state.popup.isOpen()) {
                this.state.popup.remove();
            }
            
            this.state.map.setStyle(mapStyles[e]);

            const minimap = new Minimap({
                center: this.state.map.getCenter(),
                style: mapStyles[e]
            });

            this.state.map.removeControl(this.state.minimap);
            this.state.map.addControl(minimap, 'bottom-left');
            this.setState({
                minimap: minimap,
                styleCode: mapStyles[e].substring(16)
            });
        }); 

    // Escuchar el evento para cambiar la visibilidad de las capas
        this.toggleLayerVisibilityListener = emitter.addListener('toggleLayerVisibility', (layerId, visible) => {
            console.log(layerId)
            console.log(this.state.map.getLayer(layerId))
            if (this.state.map.getLayer(layerId)) {
                this.state.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
            }
        });

        // Escuchar el evento para cambiar la transparencia de las capas
        this.changeLayerTransparencyListener = emitter.addListener('changeLayerTransparency', (layerId, transparency) => {
            if (this.state.map.getLayer(layerId)) {
                this.state.map.setPaintProperty(layerId, 'raster-opacity', transparency);
            }
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
                'id': id,
                'type': 'fill',
                'source': id,
                'paint': 
                    buildPolygonStyle(id)
                ,
                'filter': ['==', '$type', 'Polygon']
            });

            map.addLayer({
                'id': id + '-points',
                'type': 'circle',
                'source': id,
                'paint': {
                    'circle-radius': 6,
                    'circle-color': '#B42222'
                },
                'filter': ['==', '$type', 'Point']
            });

            this.flyToGeometry(map, geometry);
        });

        this.removeDatasetListener = emitter.addListener('removeDataset', e => {
            const layerIds = [e + '-boundary', e + '-points'];

            layerIds.forEach(layerId => {
                if (this.state.map.getLayer(layerId)) {
                    this.state.map.removeLayer(layerId);
                }
            });

            if (this.state.map.getSource(e)) {
                this.state.map.removeSource(e);
            }
        });

        this.displayTempLayerListener = emitter.addListener('displayTempLayer', e => {
            this.removeTempLayer();

            if (!this.state.map.hasImage('marker')) {
                this.state.map.addImage('marker', marker, { pixelRatio: 3 });
            }

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

            this.state.popup.setLngLat(e.geometry.geometry.coordinates).addTo(this.state.map);
            emitter.emit('bindPopup', e);

            this.state.map.flyTo({
                center: e.geometry.geometry.coordinates,
                zoom: 6,
                bearing: 0
            });
        });

        this.setState({
            map: map,
            draw: draw,
            //minimap: minimap,
            popup: popup
        });

        emitter.on('moveURL', this.handleURLMoved);

    }

    handlePredict = async () => {
        // Datos que se enviarán en la solicitud POST
        const data = {
            "ETO_med": 3.6,  // Media de la evapotranspiración
            "ETO_min": 0.5,  // Mínimo de la evapotranspiración
            "ETO_max": 9.0,  // Máximo de la evapotranspiración
            "PREC_med": 1.3,  // Precipitación media
            "RAD_med": 17.5,  // Radiación media
            "HUM_med": 62.0,  // Humedad media
            "Tmed": 18.0,  // Temperatura media
            "Tmin": 8.0,  // Temperatura mínima
            "Tmax": 28.0,  // Temperatura máxima
            "UFK(LN)": 6.5,  // Unidades de fertilizante potásico (logaritmo natural)
            "UFP(LN)": 4.5,  // Unidades de fertilizante fosfórico (logaritmo natural)
            "UFN(LN)": 5.2,  // Unidades de fertilizante nitrogenado (logaritmo natural)
            "ZONA_VULNERABLE_A_NITROGENO": 1.0,  // Zona vulnerable a nitrógeno (valor binario)
            "RIEGO_DEFICITARIO": 0.5,  // Riego deficitario (valor binario)
            "TEXTURA": 1.0  // Textura del suelo (valor categórico)
        };
    
        try {
          // Realizar la solicitud fetch a la API de Flask
          const response = await fetch('http://localhost:5003/predict', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data), // Convertir los datos a JSON
          });
    
          const result = await response.json(); // Obtener la respuesta JSON
          console.log(result)
          console.log(result.prediction); // Almacenar la predicción en el estado
        } catch (err) {
          console.error('Error:', err);
        }
      };

    handleURLMoved = (movedURL) => {
        console.log('Received moved data:', movedURL);
        // Aquí puedes hacer algo con los datos, como establecer el estado
        this.setState({ url: movedURL });
        const parts = movedURL.split('/');
        console.log(movedURL)
        console.log(parts[parts.length - 5])

        // El identificador es la penúltima parte de la URL
        // Nos quedamos con el elemento que está en la posición antepenúltima
      
        // Emitir el evento con el nombre de la capa y la URL
        emitter.emit('newLayer', {
            id: parts[parts.length - 5],  // Nombre de la capa
            url: movedURL,  // URL del mapa
            visible: true,
            transparency: 100
        });
        console.log(movedURL)
        this.state.map.addLayer({
            'id': parts[parts.length - 5],
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
        console.log(this.state.url);

        this.setState({ legendVisible: false });

        this.setState({ spectralLegendVisible: true });
    };
    
    componentWillUnmount() {
        emitter.removeListener(this.setMapStyleListener);
        emitter.removeListener(this.displayDatasetListener);
        emitter.removeListener(this.removeDatasetListener);
        emitter.removeListener(this.displayTempLayerListener);
        emitter.removeListener(this.toggleLayerVisibilityListener);
        emitter.removeListener(this.changeLayerTransparencyListener);  
    }
    
    render() {
        return (
            <div>
                <div id="map" style={styles.root} ref={this.mapContainer}></div>
                {this.state.legendVisible && (
                    <div style={styles.legend}>
                        <h4 style={styles.legendTitle}>Producción de almendra (t/ha.)</h4>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#B22222' }}></span>0 - 5,00
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#ff8c1a' }}></span>5,01 - 6,00
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#ffd700' }}></span>6,01 - 7,00
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#cfff04' }}></span>7,01 - 8,00
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#9acd32' }}></span>8,01 - 9,00
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#6b8e23' }}></span>9,01 - 10,00
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#40ff00' }}></span>10,01 - 11,00
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#00ff00' }}></span>11,01 - 15,00
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#008000' }}></span>15,01+
                        </div>
                    </div>
                )}
                {this.state.spectralLegendVisible && (
                    <div style={styles.spectralLegend}>
                        <h4 style={styles.legendTitle}>Índice Espectral</h4>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#a50026' }}></span>-1.0 a -0.8
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#d73027' }}></span>-0.8 a -0.6
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#f46d43' }}></span>-0.6 a -0.4
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#fdae61' }}></span>-0.4 a -0.2
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#fee08b' }}></span>-0.2 a 0.0
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#ffffbf' }}></span>0.0 a 0.2
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#d9ef8b' }}></span>0.2 a 0.4
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#a6d96a' }}></span>0.4 a 0.6
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#66bd63' }}></span>0.6 a 0.8
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#1a9850' }}></span>0.8 a 1.0
                        </div>
                        <div style={styles.legendItem}>
                            <span style={{ ...styles.legendColorBox, backgroundColor: '#006837' }}></span>1.0
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    
}

export default Canvas;