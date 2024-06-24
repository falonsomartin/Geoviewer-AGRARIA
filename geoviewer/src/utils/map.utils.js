/* Written by Ye Liu */

const mapStyles = {
    Streets: 'mapbox://styles/goolhanrry/cjw8xh7e200781cnprhz1wdyv',
    Outdoors: 'mapbox://styles/goolhanrry/cjw8xvtw001271do5wh8jcisr',
    Light: 'mapbox://styles/goolhanrry/cjw8xfxnz00ov1ctbo72e8tvq',
    Dark: 'mapbox://styles/goolhanrry/cjw8x7qcb036z1cpakzz43vsv',
    Night: 'mapbox://styles/goolhanrry/cjw8xt95o05f01cpc101wyn5s',
    LeShine: 'mapbox://styles/goolhanrry/cjw8xn3y562m31cmngt2pzg2z',
    NorthStar: 'mapbox://styles/goolhanrry/cjw8xy5el01441do5lkxunsjn',
    Moonlight: 'mapbox://styles/goolhanrry/cjw8yqo2q01v11cqkk9e6iviq',
    Satellite:'mapbox://styles/mapbox/satellite-v9'
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
    let polygon = {};
    if(color.includes("Capa")){
        polygon = {
            // Asignar un color basado en el valor de 'Rend'
            'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'Rend'], // Usa el valor de la propiedad 'Rend' para determinar el color
            0, '#B22222', // Establece rangos de colores según los valores de rendimiento que esperas
            50000, '#ff8c1a', // Naranja
            60000, '#ffd700', // Amarillo dorado
            70000, '#cfff04', // Verde amarillento
            80000, '#9acd32', // Verde oliva claro
            90000, '#6b8e23', // Oliva
            100000, '#40ff00', // Verde claro
            110000, '#00ff00', // Verde
            120000, '#008000'  // Verde oscuro
            ],
            'fill-opacity': 0.75
        }
    }else{
        polygon = {
            'fill-color': '#f08',
            'fill-opacity': 0.4    
        };
    }
    return polygon;
}

export { mapStyles, buildHeatmapStyle, buildPolygonStyle };