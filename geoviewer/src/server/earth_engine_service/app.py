from flask import Flask, jsonify, request
from flask_cors import CORS
import geopandas as gpd
import ee
import json

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])    
    
ee.Authenticate(auth_mode="appdefault", quiet=False)
ee.Initialize(project='soil-values-predictor')

@app.route('/', methods=['GET'])
def index():
    return ""

@app.route('/get_image', methods=['POST'])
def get_image():
    try:
        # Manejo de form-data con archivo
        start_date = request.form['startDate']
        end_date = request.form['endDate']
        index_type = request.form['indexType']
        
        if request.form['geojson']:
            geojson_string = request.form['geojson']
            geojson = json.loads(geojson_string)
            features = geojson.get('features', [])
    
            # Preparar las nuevas features con geometría
            new_features = []
            for feature in features:
                properties = feature.get('properties', {})
                x1 = properties.get('x1')
                y1 = properties.get('y1')
                x2 = properties.get('x2')
                y2 = properties.get('y2')
                
                # Crear un polígono usando las esquinas inferiores izquierda y superiores derecha
                if x1 is not None and y1 is not None and x2 is not None and y2 is not None:
                    geometry = {
                        "type": "Polygon",
                        "coordinates": [[
                            [x1, y1],  # Inferior izquierda
                            [x1, y2],  # Superior izquierda
                            [x2, y2],  # Superior derecha
                            [x2, y1],  # Inferior derecha
                            [x1, y1]   # Cerrando el polígono
                        ]]
                    }
                    new_features.append({
                        "type": "Feature",
                        "geometry": geometry,
                        "properties": properties
                    })

                # Crear el nuevo GeoJSON
            new_geojson = {
                "type": "FeatureCollection",
                "features": new_features
            }
            
            print(new_geojson)

            bbox= ee.FeatureCollection(new_geojson)

        elif request.files.get('aoiDataFiles', None):
            file = request.files.get('aoiDataFiles', None)
            # Suponiendo que el archivo es un shapefile o similar que puede ser leído directamente
            gdf = gpd.read_file(file)
            geojson_dict = gdf.__geo_interface__
            bbox = ee.FeatureCollection(geojson_dict['features'])    
        elif file == None or geojson_string==None:
            # Si no hay archivo, se debe enviar un error o manejar de otra manera
            return jsonify({"error": "No geojson or file provided"}), 400
            
        coleccion_sentinel = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")\
            .filterDate(start_date, end_date)\
            .filterBounds(bbox)\
            .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 10)
            
        mosaico = coleccion_sentinel.median().clip(bbox)
            
        mosaico_bands = mosaico.select(['B4', 'B3', 'B2', 'B11', 'B1', 'B12', 'B8', 'B5'])
        
        def calculate_ndvi(image):
            # Calcular NDVI usando la expresión
            ndvi = image.expression(
                'float((NIR - RED) / (NIR + RED))', {
                'NIR': image.select('B8'),
                'RED': image.select('B4')
            }).rename('NDVI')  # Renombrar como 'NDVI'
            
            # Imprimir NDVI (opcional, principalmente para debugging o exploración)
            
            return ndvi
        
        def calculate_evi(image):
            return image.expression(
                '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                    'NIR': image.select('B8'),
                    'RED': image.select('B4'),
                    'BLUE': image.select('B2')
                }).rename('EVI')
            
        def calculate_gndvi(image):
            gndvi = image.expression(
                '(NIR - GREEN) / (NIR + GREEN)', 
                {
                    'NIR': image.select('B8'),  
                    'GREEN': image.select('B3')
                }).rename('GNDVI')
            return gndvi
        
        def add_indices(image):
            indices = [
                calculate_ndvi(image), calculate_evi(image), calculate_gndvi(image)
            ]
            return image.addBands(indices)


        composite_indices = add_indices(mosaico_bands)
        
        band = request.args.get('indexType')
        
        composite_clipped = []
        
        if index_type=="NDVI" :
            composite_clipped = composite_indices.clip(bbox).select("NDVI")
            
        elif index_type=="GNDVI":
            composite_clipped = composite_indices.clip(bbox).select("GNDVI")

            
        elif index_type=="EVI":
            composite_clipped = composite_indices.clip(bbox).select("EVI")
        

        palette = [
        'a50026', 'd73027', 'f46d43', 'fdae61', 'fee08b',
        'ffffbf', 'd9ef8b', 'a6d96a', '66bd63', '1a9850', '006837'
        ]
        visualization_parameters = {
        'min': 0.3, 'max': 0.8,  'palette':  palette
            }
        
        map_id = composite_clipped.getMapId(visualization_parameters)
        
            
        return jsonify({"success": True, "output": map_id['tile_fetcher'].url_format}), 200



    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5004)