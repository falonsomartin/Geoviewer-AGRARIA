/* Written by Ye Liu */

const mapStyles = {
    Streets: 'mapbox://styles/mapbox/streets-v11',
    Light: 'mapbox://styles/mapbox/light-v10',
    Dark: 'mapbox://styles/mapbox/dark-v10',
    Navigation_Day: 'mapbox://styles/mapbox/navigation-day-v1',
    Navigation_Night: 'mapbox://styles/mapbox/navigation-night-v1',
    Satellite: 'mapbox://styles/mapbox/satellite-v9',
    Satellite_Streets: 'mapbox://styles/mapbox/satellite-streets-v11',
    Outdoors: 'mapbox://styles/mapbox/outdoors-v11'
};


const buildHeatmapStyle = (color) => {
    const heatmap = {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'mag'], 10, 10, 16, 16],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 10, 19, 19],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 19, 30],
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, '#67A9CF', 0.4, '#D1E5F0', 1]
    };

    heatmap['heatmap-color'].push(color);
    return heatmap;
}

const buildPolygonStyle = (color) => {
    console.log(color)
    const polygon = {
        'fill-color': '#f08',
        'fill-opacity': 0.4    
    };

    return polygon;
}


export { mapStyles, buildHeatmapStyle, buildPolygonStyle };