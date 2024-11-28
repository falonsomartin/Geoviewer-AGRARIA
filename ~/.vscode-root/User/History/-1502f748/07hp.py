from flask import Flask, jsonify, request
from werkzeug.utils import secure_filename
from flask_cors import CORS
import geopandas as gpd
import pandas as pd
import zipfile
import ee
import requests
import os
import tempfile
import json

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["https://localhost:5004"])

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER) 
    
ee.Authenticate(auth_mode="gcloud")
ee.Initialize(project='soil-values-predictor')

@app.route('/api/', methods=['GET'])
def index():
    return ""

@app.route('/api/watsat', methods=['GET'])
def get_watsat():
    try:
            # Define el área de interés usando coordenadas
            bounds = ee.Geometry.Rectangle([-120, 35, -119, 36])

            # Cargar datos de NDVI de MODIS
            ndvi = ee.ImageCollection('MODIS/006/MOD13Q1').select('NDVI').filterDate('2020-01-01', '2020-12-31')

            # Cargar datos de precipitación de CHIRPS
            precipitation = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterDate('2020-01-01', '2020-12-31')

            # Cargar datos de evapotranspiración de referencia de MODIS
            et0 = ee.ImageCollection('MODIS/006/MOD16A2').select('ET').filterDate('2020-01-01', '2020-12-31')
            
            # Cálculo del FVC
# Cálculo del FVC utilizando una función map
            def calculate_FVC(image):
                ndvi_max = 0.9
                ndvi_min = 0.1
                fvc = image.normalizedDifference(['sur_refl_b02', 'sur_refl_b01']).subtract(ndvi_min).divide(ndvi_max - ndvi_min)
                return image.addBands(fvc.rename('FVC'))

            # Calcular FVC para cada imagen en la colección
            ndvi_fvc = ndvi.map(calculate_FVC)

            # Calcular el Agua Disponible (AW) - Ejemplo simplificado
            aw = precipitation.mean().subtract(et0.mean())

            # Calcular el Coeficiente de Estrés Hídrico (CWS)
            def calculate_CWS(img):
                cws = img.expression('0.5 + 0.5 * AW', {'AW': aw})
                return img.addBands(cws.rename('CWS'))

            # Aplicar el CWS a cada imagen en la colección
            cws_images = ndvi.map(calculate_CWS)

            predicted_soil_carbon=cws_images.first().select('CWS').clip(bounds)

            visualization_parameters = {
                'min': -10, 'max': 10, 'palette': ['red', 'blue']
            }
            
            print(type(predicted_soil_carbon))
            
            #map_id = predicted_soil_carbon.getMapId(visualization_parameters)
            
            # Multi-band GeoTIFF file wrapped in a zip file.
            url = predicted_soil_carbon.getDownloadUrl({
                'name': 'band',
                'bands': ['CWS'],
                'region': bounds,
                'scale': 100,
                'filePerBand': False
            })
            response = requests.get(url)
            with open('band.zip', 'wb') as fd:
                fd.write(response.content)
            
            return jsonify({"success": True, "output":url}), 200



    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500
    

@app.route('/api/vegetation_index_change_inspector', methods=['POST'])
def vegetation_index_change_inspector():
    try:
        
        aoi_file = request.files['aoiDataFiles']
        
        band = request.form['indexType']

        
        with tempfile.TemporaryDirectory() as temp_dir:
            aoi_filepath = os.path.join(temp_dir, secure_filename(aoi_file.filename))

        # Directorio base donde se encuentra el script

        # Ruta al archivo shapefile
            aoi_file.save(aoi_filepath)

            gdf = gpd.read_file(aoi_filepath)
            geojson_dict = gdf.__geo_interface__
            table = ee.FeatureCollection(geojson_dict['features'])   
                
        
            # Filtrar y crear una colección de imágenes Sentinel-2
            ColeccionSentinel = ee.ImageCollection("COPERNICUS/S2_HARMONIZED") \
                .filterDate('2018-01-01', '2018-12-30') \
                .filterBounds(table) \
                .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'Less_Than', 1)

            Vegetacion = ColeccionSentinel.median().clip(table)

            # Filtrar y crear una colección de imágenes Sentinel-2 para un segundo periodo
            ColeccionSentinel2 = ee.ImageCollection("COPERNICUS/S2_HARMONIZED") \
                .filterDate('2023-01-01', '2023-12-30') \
                .filterBounds(table) \
                .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'Less_Than', 1)

            Vegetacion2 = ColeccionSentinel2.median().clip(table)
                
            mosaico_bands = Vegetacion.select(['B4', 'B3', 'B2', 'B11', 'B1', 'B12', 'B8', 'B5'])
            
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
                
            def calculateSAVI(image):
                L = 0.5  # Factor de corrección del suelo
                return image.expression(
                    'float(((NIR - RED) / (NIR + RED + L)) * (1 + L))', {
                        'NIR': image.select('B8'),
                        'RED': image.select('B4'),
                        'L': L
                    }
                ).rename('SAVI')
            
            def add_indices(image):
                indices = [
                    calculate_ndvi(image), calculate_evi(image), calculateSAVI(image)
                ]
                return image.addBands(indices)
            
            
            composite_indices1 = add_indices(Vegetacion)
            composite_indices2 = add_indices(Vegetacion2)
            
            composite_clipped=[]
            
            if band=="NDVI" :
                composite_clipped = composite_indices2.select('NDVI').subtract(composite_indices1.select('NDVI')).rename('deltaNDVI').select('deltaNDVI')
                
            elif band=="EVI":
                composite_clipped = composite_indices2.select('EVI').subtract(composite_indices1.select('EVI')).rename('deltaEVI').select('deltaEVI')
               
            elif band=="SAVI":
                composite_clipped = composite_indices2.select('SAVI').subtract(composite_indices1.select('SAVI')).rename('deltaSAVI').select('deltaSAVI')
            

            visualization_parameters = {
            'palette':  [
            'a50026', 'd73027', 'f46d43', 'fdae61', 'fee08b',
            'ffffbf', 'd9ef8b', 'a6d96a', '66bd63', '1a9850', '006837'
            ], 'min': -0.8, 'max': 0.8
                }
            
            map_id = composite_clipped.getMapId(visualization_parameters)
            
                
        return jsonify({"success": True, "output": [map_id['tile_fetcher'].url_format, visualization_parameters]}), 200

    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500
        
@app.route('/api/get_spectral_indexes', methods=['POST'])
def get_spectral_indexes():
    try:
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        aoi_file = request.files['aoiDataFiles']

        print(f"Fetching image from {start_date} to {end_date}")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            aoi_filepath = os.path.join(temp_dir, secure_filename(aoi_file.filename))

        # Directorio base donde se encuentra el script

        # Ruta al archivo shapefile
            aoi_file.save(aoi_filepath)

            gdf = gpd.read_file(aoi_filepath)
            geojson_dict = gdf.__geo_interface__
            bbox = ee.FeatureCollection(geojson_dict['features'])   
                
        
            coleccion_sentinel = ee.ImageCollection("COPERNICUS/S2_HARMONIZED")\
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
            
            if band=="NDVI" :
                composite_clipped = composite_indices.clip(bbox).select("NDVI")
                
            elif band=="GNDVI":
                composite_clipped = composite_indices.clip(bbox).select("GNDVI")

                
            elif band=="EVI":
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

@app.route('/api/spatiotemporal_analysis', methods=['POST'])  
def get_spatiotemporal_analysis():
    try:
        if 'aoiDataFiles' not in request.files:
            return jsonify({"error": "No file part"}), 400

        aoi_file = request.files['aoiDataFiles']

        if aoi_file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        with tempfile.TemporaryDirectory() as temp_dir:
            aoi_filepath = os.path.join(temp_dir, secure_filename(aoi_file.filename))

            aoi_file.save(aoi_filepath)

            # Suponiendo que el shapefile se extrae en el directorio temporal
                        
            gdf = gpd.read_file(aoi_filepath)
            geojson_dict = gdf.__geo_interface__
            aoi = ee.FeatureCollection(geojson_dict['features'])
            
            startdate = '2001-01-01'
            enddate = '2023-12-31'
            df_result=None

            var = request.form['varType']
            
            if var == "LST":
                #-----------------------------MODIS NPP AGB-----------------------------------#

                # Cargar las colecciones de imágenes MODIS NPP y GPP
                npp = ee.ImageCollection('MODIS/061/MOD17A3HGF')
                gpp = ee.ImageCollection("MODIS/006/MYD17A2H")

                # Filtrar las colecciones por fecha y límites, y seleccionar las bandas relevantes
                nppCollection = npp.filterDate(startdate, enddate).filterBounds(aoi).select("Npp")
                gppCollection = gpp.filterDate(startdate, enddate).filterBounds(aoi).select("Gpp")

                # Filtrar las colecciones para asegurarse de la presencia de las bandas específicas
                nppfilteredCollection = nppCollection.filter(ee.Filter.listContains('system:band_names', 'Npp'))
                gppfilteredCollection = gppCollection.filter(ee.Filter.listContains('system:band_names', 'Gpp'))

                # Función para calcular NPP8
                def myNpp(myimg):
                    d = ee.Date(myimg.get('system:time_start'))
                    y = d.get('year').toInt()

                    GPPy = gppfilteredCollection.filter(ee.Filter.calendarRange(y, y, 'year')).sum()
                    NPPy = nppfilteredCollection.filter(ee.Filter.calendarRange(y, y, 'year')).mean()

                    npp8 = myimg.expression('(GGP8 / GPPy) * NPPy', {
                        'GGP8': myimg,
                        'GPPy': GPPy,
                        'NPPy': NPPy
                    }).multiply(0.0001)

                    return npp8.copyProperties(myimg, ['system:time_start'])

                # Aplicar la función a la colección de GPP
                npp8Collection = gppCollection.map(myNpp)


                #-------------------------------LST MODIS-----------------------------------#

                # Cargar la colección MODIS LST
                lst = ee.ImageCollection("MODIS/061/MOD11A2").select('LST_Day_1km')

                # Filtrar la colección LST por fecha y límites
                lstCollection = lst.filterDate(startdate, enddate).filterBounds(aoi).select("LST_Day_1km")

                # Función para calcular LST mensual
                def myLst(myimg):
                    d = ee.Date(myimg.get('system:time_start'))
                    y = d.get('year').toInt()
                    m = d.get('month').toInt()

                    LSTm = lstCollection.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month')).mean()

                    return LSTm.copyProperties(myimg, ['system:time_start'])

                # Aplicar la función a la colección de LST para obtener LST mensual
                monthlyLSTCollection = lstCollection.map(myLst)
                
                # Filtrar las colecciones para valores válidos y crear gráficos
                filteredFeaturesLST = monthlyLSTCollection.filterDate('2003-01-01', '2021-12-31').map(
                    lambda image: ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'LST': image.reduceRegion(ee.Reducer.firstNonNull(), aoi, 30).get('LST_Day_1km')
                    })
                ).filter(ee.Filter.notNull(['LST']))
                
                features_list = filteredFeaturesLST.getInfo()['features']
                data = [feature['properties'] for feature in features_list]

                # Crear un DataFrame de pandas
                df = pd.DataFrame(data)

                # Convertir la columna de fecha a un tipo datetime
                df['Date'] = pd.to_datetime(df['Date'])

                # Filtrar valores nulos
                df = df.dropna()
                
                df_pivot = df.pivot_table(index='Date', values='LST', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'LST': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result=df_json
                
                
            elif var =="PRECIPT":
                # ----------------------------------- CHIRPS (Precipitación) -----------------------------------

                # Cargar la colección CHIRPS de precipitación diaria
                chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").select('precipitation')

                # Filtrar la colección por fecha y límites
                chirpsCollection = chirps.filterDate(startdate, enddate).filterBounds(aoi)

                # Función para agrupar y calcular la precipitación mensual
                def calculateMonthlyPrecipitation(year, month):
                    monthly_precipitation = chirpsCollection.filter(ee.Filter.calendarRange(year, year, 'year')) \
                                                            .filter(ee.Filter.calendarRange(month, month, 'month')) \
                                                            .mean()
                    return monthly_precipitation.set('year', year).set('month', month)

                # Generar una lista de años y meses
                years = ee.List.sequence(2001, 2021)
                months = ee.List.sequence(1, 12)

                # Aplicar la función para calcular precipitación mensual
                monthlyPrecipitationCollection = ee.ImageCollection(
                    years.map(lambda y: months.map(lambda m: calculateMonthlyPrecipitation(y, m))).flatten()
                )

                # Reducir la colección a valores medios dentro del AOI
                def reduceToFeature(image):
                    precipitation = image.reduceRegion(
                        reducer=ee.Reducer.mean(), geometry=aoi, scale=5000
                    ).get('precipitation')
                    return ee.Feature(None, {
                        'Date': ee.Date.fromYMD(image.get('year'), image.get('month'), 1).format('YYYY-MM'),
                        'Precipitation': precipitation
                    })

                # Reducir y convertir en un DataFrame
                filteredFeaturesPrecipitation = monthlyPrecipitationCollection.map(reduceToFeature).filter(ee.Filter.notNull(['Precipitation']))

                features_list_Precipitation = filteredFeaturesPrecipitation.getInfo()['features']
                data_Precipitation = [feature['properties'] for feature in features_list_Precipitation]
                df_Precipitation = pd.DataFrame(data_Precipitation)
                df_Precipitation['Date'] = pd.to_datetime(df_Precipitation['Date'])
                df_Precipitation = df_Precipitation.dropna()
                df_pivot = df_Precipitation.pivot_table(index='Date', values='Precipitation', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'Precipitation': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result=df_json
                
            elif var=="EVI":
                # Cargar la colección MODIS EVI
                evi = ee.ImageCollection("MODIS/061/MOD13A1").select('EVI')

                # Filtrar la colección de EVI por fecha y límites
                eviCollection = evi.filterDate(startdate, enddate).filterBounds(aoi)

                # Función para calcular la EVI media mensual
                def calculateMonthlyEVI(image):
                    return image.set('system:time_start', image.date().format('YYYY-MM')).set('EVI', image.reduceRegion(ee.Reducer.mean(), aoi, 30).get('EVI'))

                # Aplicar la función a la colección EVI
                monthlyEVICollection = eviCollection.map(calculateMonthlyEVI)

                # Filtrar y convertir en un DataFrame
                filteredFeaturesEVI = monthlyEVICollection.map(
                    lambda image: ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'EVI': image.get('EVI')
                    })
                ).filter(ee.Filter.notNull(['EVI']))

                features_list_EVI = filteredFeaturesEVI.getInfo()['features']
                data_EVI = [feature['properties'] for feature in features_list_EVI]
                df_EVI = pd.DataFrame(data_EVI)
                df_EVI['Date'] = pd.to_datetime(df_EVI['Date'])
                df_EVI = df_EVI.dropna()
                df_pivot = df_EVI.pivot_table(index='Date', values='EVI', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'EVI': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result=df_json
                
            elif var=="NDVI":
                # Cargar la colección MODIS NDVI
                ndvi = ee.ImageCollection("MODIS/061/MOD13A1").select('NDVI')

                # Filtrar la colección de NDVI por fecha y límites
                ndviCollection = ndvi.filterDate(startdate, enddate).filterBounds(aoi)

                # Función para calcular la NDVI media mensual
                def calculateMonthlyNDVI(image):
                    return image.set('system:time_start', image.date().format('YYYY-MM')).set('NDVI', image.reduceRegion(ee.Reducer.mean(), aoi, 30).get('NDVI'))

                # Aplicar la función a la colección NDVI
                monthlyNDVICollection = ndviCollection.map(calculateMonthlyNDVI)

                # Filtrar y convertir en un DataFrame
                filteredFeaturesNDVI = monthlyNDVICollection.map(
                    lambda image: ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'NDVI': image.get('NDVI')
                    })
                ).filter(ee.Filter.notNull(['NDVI']))

                features_list_NDVI = filteredFeaturesNDVI.getInfo()['features']
                data_NDVI = [feature['properties'] for feature in features_list_NDVI]
                df_NDVI = pd.DataFrame(data_NDVI)
                df_NDVI['Date'] = pd.to_datetime(df_NDVI['Date'])
                df_NDVI = df_NDVI.dropna()
                df_pivot = df_NDVI.pivot_table(index='Date', values='NDVI', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'NDVI': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result=df_json

            elif var=="TSAVI":
                # Cargar la colección Sentinel-2
                s = 1.0  # Ejemplo de valor, ajusta según tu región
                a = 0.0  # Ejemplo de valor, ajusta según tu región
                X = 0.08  # Parámetro de ajuste

                sentinel2 = ee.ImageCollection("COPERNICUS/S2_HARMONIZED").filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)).select(['B4', 'B8'])

                # Definir el período de análisis
                startdate_s2 = '2015-06-23'  # Fecha de inicio para Sentinel-2
                enddate_s2 = '2021-12-31'

                # Filtrar la colección Sentinel-2 por fecha y límites
                sentinel2Collection = sentinel2.filterDate(startdate_s2, enddate_s2).filterBounds(aoi)

                # Función para calcular TSAVI
                def calculateTSAVI(image):
                    tsavi = image.expression(
                        '((s * (NIR - s * Red - a)) / (s * NIR + Red - s * a + X))', {
                            'NIR': image.select('B8'),
                            'Red': image.select('B4'),
                            's': s,
                            'a': a,
                            'X': X
                        }).rename('TSAVI')
                    return image.addBands(tsavi).set('system:time_start', image.date().format('YYYY-MM'))

                # Aplicar la función a la colección TSAVI
                tsaviCollection = sentinel2Collection.map(calculateTSAVI)

                # Filtrar y convertir en un DataFrame
                filteredFeaturesTSAVI = tsaviCollection.map(
                    lambda image: ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'TSAVI': image.select('TSAVI').reduceRegion(ee.Reducer.mean(), aoi, 30).get('TSAVI')
                    })
                ).filter(ee.Filter.notNull(['TSAVI']))

                features_list_TSAVI = filteredFeaturesTSAVI.getInfo()['features']
                data_TSAVI = [feature['properties'] for feature in features_list_TSAVI]
                df_TSAVI = pd.DataFrame(data_TSAVI)
                df_TSAVI['Date'] = pd.to_datetime(df_TSAVI['Date'])
                df_TSAVI = df_TSAVI.dropna()
                df_pivot = df_TSAVI.pivot_table(index='Date', values='TSAVI', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'TSAVI': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result = df_json
                
            elif var=="MSI":
                # Cargar la colección Sentinel-2 para MSI
                sentinel2_msi = ee.ImageCollection("COPERNICUS/S2_HARMONIZED").filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)).select(['B8', 'B11'])

                # Filtrar la colección Sentinel-2 por fecha y límites para MSI
                sentinel2Collection_msi = sentinel2_msi.filterDate(startdate_s2, enddate_s2).filterBounds(aoi)

                # Función para calcular MSI
                def calculateMSI(image):
                    msi = image.expression(
                        'SWIR / NIR', {
                            'SWIR': image.select('B11'),
                            'NIR': image.select('B8')
                        }).rename('MSI')
                    return image.addBands(msi).set('system:time_start', image.date().format('YYYY-MM'))

                # Aplicar la función a la colección MSI
                msiCollection = sentinel2Collection_msi.map(calculateMSI)

                # Filtrar y convertir en un DataFrame
                filteredFeaturesMSI = msiCollection.map(
                    lambda image: ee.Feature(None, {
                        'Date': ee.Date(image.get('system:time_start')).format('YYYY-MM'),
                        'MSI': image.select('MSI').reduceRegion(ee.Reducer.mean(), aoi, 30).get('MSI')
                    })
                ).filter(ee.Filter.notNull(['MSI']))

                features_list_MSI = filteredFeaturesMSI.getInfo()['features']
                data_MSI = [feature['properties'] for feature in features_list_MSI]
                df_MSI = pd.DataFrame(data_MSI)
                df_MSI['Date'] = pd.to_datetime(df_MSI['Date'])
                df_MSI = df_MSI.dropna()
                df_pivot = df_MSI.pivot_table(index='Date', values='MSI', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'MSI': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result = df_json
                      
            elif var=="ABVGRND_CARBON":
                                # Cargar las colecciones de imágenes MODIS NPP y GPP
                npp = ee.ImageCollection('MODIS/061/MOD17A3HGF').select('Npp')
                gpp = ee.ImageCollection("MODIS/006/MYD17A2H").select('Gpp')

                # Filtrar las colecciones por fecha y límites
                nppCollection = npp.filterDate(startdate, enddate).filterBounds(aoi)
                gppCollection = gpp.filterDate(startdate, enddate).filterBounds(aoi)

                # Función para calcular NPP8 (Carbono sobre el suelo)
                def calculateNpp8(image):
                    # Extraer la fecha de la imagen
                    date = ee.Date(image.get('system:time_start'))
                    year = date.get('year')

                    # Filtrar las colecciones GPP y NPP para el año específico
                    GPPy = gppCollection.filter(ee.Filter.calendarRange(year, year, 'year')).sum()
                    NPPy = nppCollection.filter(ee.Filter.calendarRange(year, year, 'year')).mean()

                    # Calcular npp8 usando una expresión
                    npp8 = GPPy.expression(
                        '(GGP8 / GPPy) * NPPy',
                        {
                            'GGP8': image.select('Gpp'),
                            'GPPy': GPPy.select('Gpp'),
                            'NPPy': NPPy.select('Npp')
                        }
                    ).multiply(0.0001)

                    # Añadir propiedades para mantener la consistencia
                    return npp8.set({
                        'system:time_start': image.get('system:time_start'),
                        'year': year
                    })

                # Aplicar la función sobre la colección GPP
                npp8Collection = gppCollection.map(calculateNpp8)

                # Reducir la colección a valores medios dentro del AOI
                # Reducir la colección a valores medios dentro del AOI
                def reduceToFeature(image):
                    # Reducir la región para obtener el valor medio
                    carbon_dict = image.reduceRegion(
                        reducer=ee.Reducer.mean(), geometry=aoi, scale=5000
                    )

                    # Verificar si 'Gpp' está presente en el resultado
                    carbon = ee.Algorithms.If(
                        carbon_dict.contains('Gpp'),
                        carbon_dict.get('Gpp'),
                        ee.Algorithms.If(
                            carbon_dict.contains('Npp'),
                            carbon_dict.get('Npp'),
                            None  # Si ninguna de las claves está presente, devolver None
                        )
                    )

                    # Devolver la imagen con la propiedad 'Carbon'
                    return image.set('Carbon', carbon)

                # Aplicar la reducción y filtrar valores nulos en el servidor
                npp8CollectionWithCarbon = npp8Collection.map(reduceToFeature).filter(ee.Filter.notNull(['Carbon']))

                # Continuar con el procesamiento como antes

                # Traer los datos al lado del cliente
                features_list_Carbon = npp8CollectionWithCarbon.getInfo()['features']
                data_Carbon = [feature['properties'] for feature in features_list_Carbon]

                # Crear el DataFrame
                df_Carbon = pd.DataFrame(data_Carbon)

                # Verifica si 'Date' está en las columnas antes de intentar la conversión
                if 'system:time_start' in df_Carbon.columns:
                    df_Carbon['Date'] = pd.to_datetime(df_Carbon['system:time_start'], unit='ms')
                else:
                    print("Error: La columna 'system:time_start' no está presente en el DataFrame.")

                # Filtrar filas con valores nulos
                df_Carbon = df_Carbon.dropna()
                df_pivot = df_Carbon.pivot_table(index='Date', values='Carbon', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'Carbon': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result = df_json
                
            elif var=="TREE_COVER":
                
                # Cargar la colección MODIS Percent Tree Cover
                cover = ee.ImageCollection('MODIS/006/MOD44B').select('Percent_Tree_Cover')

                # Filtrar la colección Percent Tree Cover por fecha y límites
                coverCollection = cover.filterDate(startdate, enddate).filterBounds(aoi)

                # Función para calcular la cobertura arbórea media mensual
                def calculateMonthlyTreeCover(year, month):
                    monthly_cover = coverCollection.filter(ee.Filter.calendarRange(year, year, 'year')) \
                                                .filter(ee.Filter.calendarRange(month, month, 'month')) \
                                                .mean()
                    return monthly_cover.set('year', year).set('month', month)

                # Generar una lista de años y meses
                years = ee.List.sequence(2001, 2023)
                months = ee.List.sequence(1, 12)

                # Aplicar la función para calcular cobertura arbórea mensual
                def map_over_months(year):
                    return months.map(lambda month: calculateMonthlyTreeCover(year, month))

                # Mapear sobre los años y aplanar la colección
                monthlyCoverCollection = ee.ImageCollection(years.map(map_over_months).flatten())

                # Reducir la colección a valores medios dentro del AOI
                def reduceToFeature(image):
                    # Verificar si la clave 'Percent_Tree_Cover' está presente en los datos
                    dict_keys = image.reduceRegion(
                        reducer=ee.Reducer.mean(), geometry=aoi, scale=5000
                    ).keys()

                    # Solo continuar si 'Percent_Tree_Cover' está presente
                    def createFeature(valid):
                        return ee.Algorithms.If(
                            valid,
                            ee.Feature(None, {
                                'Date': ee.Date.fromYMD(image.get('year'), image.get('month'), 1).format('YYYY-MM'),
                                'Percent_Tree_Cover': image.reduceRegion(
                                    reducer=ee.Reducer.mean(), geometry=aoi, scale=5000
                                ).get('Percent_Tree_Cover')
                            }),
                            ee.Feature(None, {})
                        )

                    return ee.Feature(createFeature(dict_keys.contains('Percent_Tree_Cover')))

                # Filtrar y convertir en un DataFrame
                filteredFeaturesCover = monthlyCoverCollection.map(reduceToFeature).filter(ee.Filter.notNull(['Percent_Tree_Cover']))

                features_list_Cover = filteredFeaturesCover.getInfo()['features']
                data_Cover = [feature['properties'] for feature in features_list_Cover]
                df_Cover = pd.DataFrame(data_Cover)
                df_Cover['Date'] = pd.to_datetime(df_Cover['Date'])
                df_Cover = df_Cover.dropna()
                df_pivot = df_Cover.pivot_table(index='Date', values='Percent_Tree_Cover', aggfunc='mean').reset_index()
                df_pivot = df_pivot.rename(columns={'Percent_Tree_Cover': 'Value', 'Date': 'Date'})  # Renombrar columnas
                df_json_str = df_pivot.to_json(orient='records')
                df_json = json.loads(df_json_str)
                df_result=df_json
                
            print(df_result)
            
            return jsonify({
                "success": True,
                "output": df_result[0]
            }), 200

    except Exception as e:
        print(str(e))
        return jsonify({"error": str(e)}), 500
     
@app.route('/api/rusle', methods=['POST'])  
def get_rusle():
    try:
        if 'aoiDataFiles' not in request.files:
            return jsonify({"error": "No file part"}), 400

        aoi_file = request.files['aoiDataFiles']

        if aoi_file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        with tempfile.TemporaryDirectory() as temp_dir:
            aoi_filepath = os.path.join(temp_dir, secure_filename(aoi_file.filename))

            aoi_file.save(aoi_filepath)

            # Suponiendo que el shapefile se extrae en el directorio temporal
                        
            gdf = gpd.read_file(aoi_filepath)
            geojson_dict = gdf.__geo_interface__
            aoi = ee.FeatureCollection(geojson_dict['features'])
            
            # Cargar la imagen de precipitación mensual
            clim_rainmap = ee.Image("OpenLandMap/CLM/CLM_PRECIPITATION_SM2RAIN_M/v01")

            # Reducir la imagen para obtener la precipitación anual
            year = clim_rainmap.reduce(ee.Reducer.sum())

            # Calcular la precipitación mensual ajustada
            R_monthly = ee.Image(10).pow(ee.Image(1.5).multiply(clim_rainmap.pow(2).divide(year).log10().subtract(-0.08188))).multiply(1.735)

            # Clippear la imagen ajustada por la AOI
            R_monthly_clipped = R_monthly.clip(aoi)

            # Calcular el factor R sobre la AOI clipeada
            factorR = R_monthly_clipped.reduce(ee.Reducer.sum())

            # Cargamos toda la informacion necesaria para estimar el factor K
            sand = ee.Image("OpenLandMap/SOL/SOL_CLAY-WFRACTION_USDA-3A1A1A_M/v02").select('b0')
            silt = ee.Image('users/aschwantes/SLTPPT_I').divide(100)
            clay = ee.Image("OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02").select('b0')
            morg = ee.Image("OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02").select('b0').multiply(0.58)
            sn1 = sand.expression('1 - b0 / 100', {'b0': sand})
            orgcar = ee.Image("OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02").select('b0')

            #Juntando todas las imagenes en una sola
            soil = ee.Image([sand, silt, clay, morg, sn1, orgcar]).rename(['sand', 'silt', 'clay', 'morg', 'sn1', 'orgcar'] )

            factorK = soil.expression(
            '(0.2 + 0.3 * exp(-0.0256 * SAND * (1 - (SILT / 100)))) * (1 - (0.25 * CLAY / (CLAY + exp(3.72 - 2.95 * CLAY)))) * (1 - (0.7 * SN1 / (SN1 + exp(-5.51 + 22.9 * SN1))))',
            {
                'SAND': soil.select('sand'),
                'SILT': soil.select('silt'),
                'CLAY': soil.select('clay'),
                'MORG': soil.select('morg'),
                'SN1':  soil.select('sn1'),
                'CORG': soil.select('orgcar')
            }).clip(aoi);

            facc = ee.Image("WWF/HydroSHEDS/15ACC")
            dem = ee.Image("WWF/HydroSHEDS/03CONDEM")
            slope = ee.Terrain.slope(dem)

            ls_factors = ee.Image([facc, slope]).rename(['facc','slope'])

            factorLS = ls_factors.expression(
            '(FACC*270/22.13)**0.4*(SLOPE/0.0896)**1.3',
            {
                'FACC': ls_factors.select('facc'),
                'SLOPE': ls_factors.select('slope')
            }).clip(aoi);

            date1 = '2017-01-01';
            date2 = '2018-01-01';
            s2 = ee.ImageCollection("COPERNICUS/S2_HARMONIZED")
            s23 = s2.filterDate(date1, date2).median().clip(aoi);
            image_ndvi = s23.normalizedDifference(['B8','B4']).rename("NDVI");

            sentinelCollection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED').filterBounds(aoi).filterDate('2021-01-01', '2021-12-31').filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))

            sentinelMedian = sentinelCollection.median();

            L = 0.5;

            savi = sentinelMedian.expression('((NIR - RED) / (NIR + RED + L)) * (1 + L)', {'NIR': sentinelMedian.select('B8'), 'RED': sentinelMedian.select('B4'), 'L': L }).rename('SAVI');

            savi_median = savi

            factorC = ee.Image(0.805).multiply(savi_median).multiply(-1).add(0.431).clip(aoi)

            erosion = factorC.multiply(factorR).multiply(factorLS).multiply(factorK)
            
            l8_viz_params = {'palette': ["#00BFBF", "#00FF00", "#FFFF00", "#FF7F00", "#BF7F3F", "#141414"],'min':0,'max': 6000}
            
            map_id = erosion.getMapId(l8_viz_params)
            
            return jsonify({
                "success": True,
                "output": [map_id['tile_fetcher'].url_format, l8_viz_params]
            }), 200


    except Exception as e:
        
        return jsonify({"error": str(e)}), 500

@app.route('/api/list-assets', methods=['GET'])
def list_assets():
    try:
        folder = 'users/jbravo/sps'  # Carpeta de ejemplo, puedes cambiar esto
        assets = ee.data.listAssets({'parent': folder})
        
        # Filtramos los assets y pasamos su tipo
        formatted_assets = [
            {'id': asset['id'], 'type': asset['type']} for asset in assets['assets']
        ]
        
        return jsonify({'assets': formatted_assets})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/get-map-url', methods=['POST'])
def get_map_url():
    try:
        data = request.get_json()
        asset_id = data.get('asset_id')  # Asset seleccionado por el usuario
        asset_type = data.get('asset_type')  # Tipo del asset (TABLE o IMAGE)
        colores = ['#FFFFFF','#E6F4E6','#CCEACC','#99D699','#66BF66','#339933','#006600']

        # Definir los parámetros de visualización
        vis_params = {
            'palette': colores,
            'opacity': 0.65
        }
        # Verificamos el tipo de asset
        if asset_type == 'IMAGE':
            asset = ee.Image(asset_id)  # Cargar el asset como imagen
        elif asset_type == 'TABLE':
            vis_params = {}
            asset = ee.FeatureCollection(asset_id)  # Cargar el asset como FeatureCollection
        else:
            return jsonify({'error': 'Unknown asset type'}), 400
        
        map_id = asset.getMapId(vis_params)  # Obtener el MapID de esa imagen o FeatureCollection
        url = map_id['tile_fetcher'].url_format  # Extraer la URL del mapa
 
        return jsonify({'map_url': [url, asset_id]})
    except Exception as e:
        print(str(e))
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/soil_organic_prediction', methods=['POST'])
def get_image():
    try:
        if 'soilDataFiles' not in request.files or 'aoiDataFiles' not in request.files:
            return jsonify({"error": "No file part"}), 400

        soil_file = request.files['soilDataFiles']
        aoi_file = request.files['aoiDataFiles']

        if soil_file.filename == '' or aoi_file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        with tempfile.TemporaryDirectory() as temp_dir:
            soil_filepath = os.path.join(temp_dir, secure_filename(soil_file.filename))
            aoi_filepath = os.path.join(temp_dir, secure_filename(aoi_file.filename))

            soil_file.save(soil_filepath)
            aoi_file.save(aoi_filepath)

            # Suponiendo que el shapefile se extrae en el directorio temporal
            
            data_scale = 20
            
            gdf = gpd.read_file(soil_filepath)
            geojson_dict = gdf.__geo_interface__
            table = ee.FeatureCollection(geojson_dict['features'])

            gdf = gpd.read_file(aoi_filepath)
            geojson_dict = gdf.__geo_interface__
            bbox = ee.FeatureCollection(geojson_dict['features'])
            
            coleccion_sentinel = ee.ImageCollection("COPERNICUS/S2_HARMONIZED")\
            .filterDate('2021-12-30', '2022-12-30')\
            .filterBounds(bbox)\
            .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 10)
            
            mosaico = coleccion_sentinel.median().clip(bbox)
            
            mosaico_bands = mosaico.select(['B4', 'B3', 'B2', 'B11', 'B1', 'B12', 'B8', 'B5'])
            
            def calculate_ndvi(image):
                return image.normalizedDifference(['B8', 'B4']).rename('NDVI')

            def calculate_evi(image):
                return image.expression(
                    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                        'NIR': image.select('B8'),
                        'RED': image.select('B4'),
                        'BLUE': image.select('B2')
                    }).rename('EVI')


            def calculate_nbr(image):
                nbr = image.expression(
                    '(NIR - SWIR2) / (NIR + SWIR2)', 
                    {
                        'NIR': image.select('B8'),  
                        'SWIR2': image.select('B12')
                    }).rename('NBR')
                return nbr

            def calculate_nbr2(image):
                nbr2 = image.expression(
                    '(SWIR - SWIR2) / (SWIR + SWIR2)', 
                    {
                        'SWIR': image.select('B11'),  
                        'SWIR2': image.select('B12')
                    }).rename('NBR2')
                return nbr2

            def calculate_ndmi(image):
                ndmi = image.expression(
                    '(NIR - SWIR) / (NIR + SWIR)', 
                    {
                        'SWIR': image.select('B11'),  
                        'NIR': image.select('B8')
                    }).rename('NDMI')
                return ndmi

            def calculate_arvi(image):
                arvi = image.expression(
                    '((NIR - (2 * RED) + BLUE) / (NIR + (2 * RED) + BLUE))', 
                    {
                        'NIR': image.select('B8'),
                        'BLUE': image.select('B2'), 
                        'RED': image.select('B4')
                    }).rename('ARVI')
                return arvi

            def calculate_sipi(image):
                sipi = image.expression(
                    '((NIR - BLUE) / (NIR - RED))', 
                    {
                        'NIR': image.select('B8'),
                        'BLUE': image.select('B2'), 
                        'RED': image.select('B4')
                    }).rename('SIPI')
                return sipi

            def calculate_rgr(image):
                rgr = image.expression(
                    'RED / GREEN', 
                    {
                        'RED': image.select('B4'),  
                        'GREEN': image.select('B3')
                    }).rename('RGR')
                return rgr

            def calculate_gli(image):
                gli = image.expression(
                    '(((GREEN - RED) + (GREEN - BLUE)) / ((2 * GREEN) + RED + BLUE))', 
                    {
                        'GREEN': image.select('B3'),  
                        'RED': image.select('B4'),
                        'BLUE': image.select('B2')
                    }).rename('GLI')
                return gli

            def calculate_msi(image):
                msi = image.expression(
                    'NIR / SWIR', 
                    {
                        'NIR': image.select('B8'),
                        'SWIR': image.select('B11')
                    }).rename('MSI')
                return msi

            def calculate_soci(image):
                soci = image.expression(
                    'BLUE / (GREEN * RED)', 
                    {
                        'BLUE': image.select('B2'),
                        'GREEN': image.select('B3'),
                        'RED': image.select('B4')
                    }).rename('SOCI')
                return soci

            def calculate_bi(image):
                bi = image.expression(
                    'sqrt(((RED * RED) / (GREEN * GREEN)) / 2)', 
                    {
                        'GREEN': image.select('B3'),
                        'RED': image.select('B4')
                    }).rename('BI')
                return bi

            def calculate_savi(image):
                savi = image.expression(
                    '((NIR - RED) / (NIR + RED + L)) * (1 + L)', 
                    {
                        'L': 0.5,  # Cover of vegetation 0-1
                        'NIR': image.select('B8'),
                        'RED': image.select('B4')
                    }).rename('SAVI')
                return savi

            def calculate_gci(image):
                gci = image.expression(
                    '((NIR) / (GREEN)) - 1', 
                    {
                        'NIR': image.select('B8'),  
                        'GREEN': image.select('B3')
                    }).rename('GCI')
                return gci

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
                    calculate_nbr(image), calculate_nbr2(image), calculate_ndmi(image),
                    calculate_arvi(image), calculate_sipi(image), calculate_rgr(image),
                    calculate_gli(image), calculate_msi(image), calculate_soci(image),
                    calculate_bi(image), calculate_savi(image), calculate_gci(image),
                    calculate_gndvi(image), calculate_ndvi(image), calculate_evi(image)
                ]
                return image.addBands(indices)


            composite_indices = add_indices(mosaico_bands)
            
            precipitation_1d = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').select('precipitation')
            LST= ee.ImageCollection('MODIS/061/MOD11A2').select('LST_Day_1km')
            surface_radiance = ee.ImageCollection('MODIS/061/MCD18A1').select('DSR')
            npp = ee.ImageCollection('MODIS/061/MOD17A3HGF').select('Npp')
            eti = ee.ImageCollection('FAO/WAPOR/2/L1_AETI_D').select('L1_AETI_D')
            lulc = ee.Image('COPERNICUS/Landcover/100m/Proba-V-C3/Global/2019').select('discrete_classification')
            
            def prec(image):
                x = image.select("precipitation")
                return x.rename('Precipitation')

            def statistics(image_collection, bbox):
                first_image = image_collection.first()
                band_name = first_image.bandNames().get(0).getInfo()
                mean = image_collection.mean().rename(band_name + '_mean')
                mode = image_collection.mode().rename(band_name + '_mode')
                min_ = image_collection.min().rename(band_name + '_min')
                max_ = image_collection.max().rename(band_name + '_max')
                median = image_collection.median().rename(band_name + '_median')
                stats = ee.Image.cat([mean, mode, min_, max_, median]).clip(bbox)
                return stats

            temperature_stats = statistics(LST, bbox)
            precipitation_stats = statistics(precipitation_1d.map(prec), bbox)
            
            lulc_clipped = lulc.clip(bbox)
            
            stack = composite_indices.select("NDVI", "EVI",
                "SAVI", "SIPI",
                "SOCI", "NBR",
                "BI", "NBR2",
                "MSI", "RGR",
                "ARVI", "GLI", "GCI",
                "GNDVI", "NDMI","B8", "B11" )
            
            # Sampling and Classifier
            training_samples = stack.sampleRegions(
                collection=table,
                properties=['SOC'],
                scale=data_scale,
                geometries=True
            )

            classifier_rf = ee.Classifier.smileRandomForest(500).setOutputMode('REGRESSION').train(
                features=training_samples,
                classProperty='SOC',
                inputProperties=stack.bandNames()
            )
            
            predicted_soil_carbon = stack.classify(classifier_rf).rename("Predicted_SOC")
            visualization_parameters = {
                'min': 0,
                'max': 6,
                'palette': ['yellow', 'GreenYellow', 'DarkGreen']
            }
            map_id = predicted_soil_carbon.getMapId(visualization_parameters)
            
            return jsonify({
                "success": True,
                "output": [map_id['tile_fetcher'].url_format, visualization_parameters]
            }), 200


    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5004)
