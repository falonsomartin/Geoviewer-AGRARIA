from flask import Flask, jsonify, request
from werkzeug.utils import secure_filename
from flask_cors import CORS
import geopandas as gpd
import pandas as pd
import zipfile
from ria import RIA
import ee
import requests
import os
import tempfile
import json
import math
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])
ria = RIA()

result=pd.read_csv('server\earth_engine_service\lmond_test_final_agraria.csv', sep=';')
X = result.drop(columns=['RENDIMIENTO(t PEPITA/ha)'])
y = result['RENDIMIENTO(t PEPITA/ha)']

# Dividir el dataset en conjuntos de entrenamiento y prueba
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
linear_model = LinearRegression()
linear_model.fit(X_train, y_train)

ee.Authenticate(auth_mode="gcloud")
ee.Initialize(project='soil-values-predictor')

@app.route('/api/', methods=['GET'])
def index():
    return ""

def format_cadastral_ref(ref, delimiter=','):
    # Asumiendo que ref tiene el formato '29076A00200929'
    provincia = ref[0:2]
    municipio = ref[2:5]
    # 'A' es omitido según el ejemplo
    poligono = ref[6:9]  # Saltando 'A' que está en posición 5
    parcela = ref[9:14]
    return f"{provincia}{delimiter}{municipio}{delimiter}0{delimiter}0{delimiter}{poligono}{delimiter}{parcela}"


@app.route('/cadastral/<ref>', methods=['GET'])
def get_cadastral_data(ref):
    recinto_num = request.args.get('recintoNum', '')
    base_info_url = 'https://sigpac.mapama.gob.es/fega/serviciosvisorsigpac/layerinfo/recinto/'
    geojson_url = 'https://sigpac.mapama.gob.es/fega/ServiciosVisorSigpac/query/recintos/'

    # Obtener el ID para la URL de info y geojson
    id_info = format_cadastral_ref(ref)
    id_geojson = format_cadastral_ref(ref, delimiter='/')

    try:
        # Primera llamada para obtener información básica
        add=''
        if recinto_num:
            add += f",{recinto_num}"
        print(f"{base_info_url}{id_info}"+add)
        info_response = requests.get(f"{base_info_url}{id_info}"+add)
        info_response.raise_for_status()
        info_data = info_response.json()
        parts = id_geojson.split('/')
        print(f"{geojson_url}{id_geojson}.geojson")

        # Seleccionar los trozos primero, segundo, quinto y sexto
        selected_parts = [parts[0], parts[1], parts[4], parts[5]]

        # Quitar ceros a la izquierda
        cleaned_parts = [int(part) for part in selected_parts]
        
        print(info_data)
        # Enviamos la lista en el cuerpo de la solicitud
        response = get_boundaries(cleaned_parts, int(recinto_num))
        
        # Combinar las respuestas en un solo objeto JSON
        result = {
            'parcelInfo': info_data,
            'output': response
        }    
        
        return jsonify({
                "success": True,
                'parcelInfo': info_data,
                "output": response
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_boundaries(numbers, recinto_num):
    
# Extraemos la lista enviada
    print(numbers)
# Realizamos alguna operación con la lista (ejemplo: convertir a enteros)
    table=  None
    if(numbers[0]==41):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_41') 
    if(numbers[0]==4):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_04') 
    if(numbers[0]==11):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_11') 
    if(numbers[0]==14):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_14') 
    if(numbers[0]==18):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_18') 
    if(numbers[0]==21):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_21') 
    if(numbers[0]==23):
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_23') 
    if(numbers[0]==29):      
        table = ee.FeatureCollection('users/jbravo/sigpac/SP24_REC_29') 

    print((numbers))
    
    cd_prov = ee.Number(numbers[0]).int()
    cd_mun = ee.Number(numbers[1]).int()
    cd_pol = ee.Number(numbers[2]).int()
    cd_parcela = ee.Number(numbers[3]).long()
    cd_recinto = ee.Number(recinto_num).long()

    # Filtrar los polígonos usando los valores con tipos adecuados
    filtered_polygon = table.filter(
        ee.Filter.And(
            ee.Filter.eq('CD_PROV', cd_prov),
            ee.Filter.eq('CD_MUN', cd_mun),
            ee.Filter.eq('CD_POL', cd_pol),
            ee.Filter.eq('CD_PARCELA', cd_parcela),
            ee.Filter.eq('CD_RECINTO', cd_recinto),     # Cambia al valor que corresponda
        )
    )

    polygon_count = filtered_polygon.size().getInfo()
    if polygon_count == 0:
        print("No se encontraron polígonos con los criterios especificados.")
    elif polygon_count > 1:
        print(f"Se encontraron {polygon_count} polígonos. Ajusta los filtros para ser más específico.")
    else:
        print(f"Se encontró {polygon_count} polígono.")
    
    erosion_viz_params = {'min': 0, 'max': 10, 'palette': ['#490eff', '#12f4ff', '#12ff50', '#e5ff12', '#ff4812']}

    
    map_id = filtered_polygon.getMapId(erosion_viz_params)
    
    
    
    return[map_id['tile_fetcher'].url_format, erosion_viz_params, 'Parcela_'+str(numbers[0])+str(numbers[1])+str(numbers[1])+str(recinto_num), filtered_polygon.geometry().getInfo()]

@app.route('/api/watsat', methods=['GET'])
def watsat():
    try:
        # Parámetros generales
        start_date = request.args.get('start_date', '2024-01-01')
        end_date = request.args.get('end_date', '2024-10-27')
        capacidad_campo = 280  # Capacidad máxima de agua en el suelo
        IR_t = 0.0  # Riego

        # Coordenadas de la parcela
        parcela_coords = [
            [-5.642585040174811, 37.603797608482267],
            [-5.635956607324422, 37.605479449653259],
            [-5.634857536485654, 37.60388571964657],
            [-5.634942556030146, 37.603847074399063],
            [-5.642139846923665, 37.601942636602494],
            [-5.642350437717613, 37.602820098243946],
            [-5.642705613346971, 37.603758963234789],
            [-5.642585040174811, 37.603797608482267]
        ]
        region = ee.Geometry.Polygon(parcela_coords).simplify(10)

        # Funciones auxiliares
        def calculate_aw(precip, et0):
            return sum(precip) / sum(et0) if sum(et0) != 0 else 1

        def calculate_cws(aw):
            return 0.5 + 0.5 * aw

        def calculate_fvc(ndvi):
            ndvi_min, ndvi_max = 0.2, 0.8
            return ndvi.subtract(ndvi_min).divide(ndvi_max - ndvi_min).clamp(0, 1)

        # Obtener NDVI
        ndvi_collection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED') \
            .filterDate(start_date, end_date) \
            .filterBounds(region) \
            .map(lambda image: image.normalizedDifference(['B8', 'B4']).rename('NDVI'))

        ndvi_image = ndvi_collection.mean()
        fvc_image = calculate_fvc(ndvi_image)
        fvc_value = fvc_image.reduceRegion(ee.Reducer.mean(), region, scale=30).get('NDVI').getInfo()

        # Obtener datos meteorológicos
        estaciones = ria.obtener_datos_diarios_periodo_con_et0(41, 22, start_date, end_date)
        precip_diarios = [e['precipitacion'] for e in estaciones]
        et0_diarios = [e['et0'] for e in estaciones]

        # Calcular AW y CWS
        aw = calculate_aw(precip_diarios, et0_diarios)
        cws = calculate_cws(aw)

        # Procesar contenido de agua (Vi)
        kc_veg, kc_soil = 0.7, 0.2
        Vi = capacidad_campo
        fechas, vi_values = [], []

        for e in estaciones:
            fecha = e['fecha']
            et0_diario = e['et0']
            precip_diario = e['precipitacion']

            TRa = et0_diario * fvc_value * kc_veg * cws
            EVa = et0_diario * (1 - fvc_value) * kc_soil * aw
            ETA_t = TRa + EVa
            W_t = precip_diario + IR_t
            DP_t = max(0, W_t - capacidad_campo)
            Vi = max(0, Vi + W_t - ETA_t - DP_t)

            if Vi > capacidad_campo:
                Vi = capacidad_campo

            fechas.append(fecha)
            vi_values.append(Vi)

        # Cargar datos de humedad
        humedad_data = pd.read_excel('server\earth_engine_service\hum.xlsx')
        humedad_data['Fecha'] = pd.to_datetime(humedad_data['Fecha / Hora'])
        humedad_data['Mes'] = humedad_data['Fecha'].dt.to_period('M')
        humedad_mensual_porcentaje = humedad_data.set_index('Mes')['promedio']

        # Crear DataFrame combinado
        df_vi = pd.DataFrame({'Fecha': pd.to_datetime(fechas), 'Vi': vi_values})
        df_vi['Mes'] = df_vi['Fecha'].dt.to_period('M')
        vi_mensual = df_vi.groupby('Mes')['Vi'].mean()
        vi_mensual_porcentaje = (vi_mensual / capacidad_campo) * 100

        df_merged = pd.DataFrame({
            'Mes': vi_mensual_porcentaje.index.astype(str),
            'Contenido_Agua_Suelo': vi_mensual_porcentaje.values,
            'Humedad_Relativa': humedad_mensual_porcentaje.reindex(vi_mensual_porcentaje.index).values
        })

        # Convertir a JSON y devolver como respuesta
        df_json_str = df_merged.to_json(orient='records')
        return jsonify(json.loads(df_json_str))

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Obtener datos JSON de la solicitud
        data = request.get_json()
        riego_aportado = data['riegoAportado']
        ufn = data['ufn']
        ufp = data['ufp']
        ufk = data['ufk']
        start_date = data['startDate']  # Opcional, se obtiene del JSON
        end_date = data['endDate'] 
        temp_max = data.get('tempMax', None)
        temp_mean = data.get('tempMean', None)
        temp_min = data.get('tempMin', None)
        precip_max = data.get('precMax', None)
        precip_sum = data.get('precSum', None)
        precip_mean = data.get('precMed', None)
        # Crear array con datos del usuario
        user_data = np.array([riego_aportado, ufn, ufp, ufk])

        # Definir fechas y cargar shapefile
        shapefile_path = 'server\earth_engine_service\parcela_random.shp'
        gdf = gpd.read_file(shapefile_path)
        bounds = gdf.unary_union.bounds
        roi = ee.Geometry.Rectangle([bounds[0], bounds[1], bounds[2], bounds[3]])
        start_date = '2016-02-01'
        end_date = '2016-05-31'
        # Obtener datos de Google Earth Engine y ordenar las bandas
        landsat = (ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
                   .filterDate(start_date, end_date)
                   .filterBounds(roi)
                   .filter(ee.Filter.lt('CLOUD_COVER', 20))
                   .map(lambda image: image.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
                        .multiply(0.0000275)
                        .add(-0.2)))

        def calculate_indices(img):
            evi = img.expression(
                '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                    'NIR': img.select('SR_B5'),
                    'RED': img.select('SR_B4'),
                    'BLUE': img.select('SR_B2')
                }).rename('EVI')
            savi = img.expression(
                '((1 + L) * (NIR - RED)) / (NIR + RED + L)', {
                    'NIR': img.select('SR_B5'),
                    'RED': img.select('SR_B4'),
                    'L': 0.5
                }).rename('SAVI')
            msi = img.expression('NIR / SWIR', {
                'NIR': img.select('SR_B5'),
                'SWIR': img.select('SR_B6')
            }).rename('MSI')
            ndvi = img.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
            return img.addBands([evi, savi, msi, ndvi])

        landsat_indices = landsat.map(calculate_indices)
        variables = None
        if temp_max != None:
            variables = (
                ee.Image("OpenLandMap/SOL/SOL_CLAY-WFRACTION_USDA-3A1A1A_M/v02").select('b10').rename('Clay_Content')
                .addBands(landsat_indices.select('EVI').mean().rename('EVI'))
                .addBands(ee.Image("USGS/SRTMGL1_003").select('elevation').rename('Elevation'))
                .addBands(ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY").select('potential_evaporation').filterDate(start_date, end_date).reduce(ee.Reducer.mean()).rename('Evaporation'))
                .addBands(ee.ImageCollection("MODIS/061/MOD15A2H").filterDate(start_date, end_date).select('Fpar_500m').mean().rename('FAPAR'))
                .addBands(ee.ImageCollection("MODIS/061/MOD15A2H").filterDate(start_date, end_date).select('Lai_500m').mean().rename('LAI'))
                .addBands(landsat_indices.select('MSI').mean().rename('MSI'))
                .addBands(landsat_indices.select('NDVI').mean().rename('NDVI'))
                .addBands(ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterDate(start_date, end_date).reduce(ee.Reducer.max()).select('precipitation_max').rename('Precipitation_Max'))
                .addBands(ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterDate(start_date, end_date).reduce(ee.Reducer.sum()).select('precipitation_sum').rename('Precipitation_Sum'))
                .addBands(ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterDate(start_date, end_date).reduce(ee.Reducer.mean()).select('precipitation_mean').rename('Precipitation_Mean'))
                .addBands(landsat_indices.select('SAVI').mean().rename('SAVI'))
                .addBands(ee.Image.constant(302.702377).rename('TempMax'))
                .addBands(ee.Image.constant(287.556804).rename('TempMean'))
                .addBands(ee.Image.constant(273.879806).rename('TempMin'))
            )
        if precip_max != None:
            variables = (
                ee.Image("OpenLandMap/SOL/SOL_CLAY-WFRACTION_USDA-3A1A1A_M/v02").select('b10').rename('Clay_Content')
                .addBands(landsat_indices.select('EVI').mean().rename('EVI'))
                .addBands(ee.Image("USGS/SRTMGL1_003").select('elevation').rename('Elevation'))
                .addBands(ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY").select('potential_evaporation').filterDate(start_date, end_date).reduce(ee.Reducer.mean()).rename('Evaporation'))
                .addBands(ee.ImageCollection("MODIS/061/MOD15A2H").filterDate(start_date, end_date).select('Fpar_500m').mean().rename('FAPAR'))
                .addBands(ee.ImageCollection("MODIS/061/MOD15A2H").filterDate(start_date, end_date).select('Lai_500m').mean().rename('LAI'))
                .addBands(landsat_indices.select('MSI').mean().rename('MSI'))
                .addBands(landsat_indices.select('NDVI').mean().rename('NDVI'))
                .addBands(ee.Image.constant(precip_max).rename('Precipitation_Max'))
                .addBands(ee.Image.constant(precip_sum).rename('Precipitation_Sum'))
                .addBands(ee.Image.constant(precip_mean).rename('Precipitation_Mean'))
                .addBands(landsat_indices.select('SAVI').mean().rename('SAVI'))
                .addBands(ee.Image.constant(302.702377).rename('TempMax'))
                .addBands(ee.Image.constant(287.556804).rename('TempMean'))
                .addBands(ee.Image.constant(273.879806).rename('TempMin'))
            )
        if precip_max == None and temp_max==None:
                        variables = (
                ee.Image("OpenLandMap/SOL/SOL_CLAY-WFRACTION_USDA-3A1A1A_M/v02").select('b10').rename('Clay_Content')
                .addBands(landsat_indices.select('EVI').mean().rename('EVI'))
                .addBands(ee.Image("USGS/SRTMGL1_003").select('elevation').rename('Elevation'))
                .addBands(ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY").select('potential_evaporation').filterDate(start_date, end_date).reduce(ee.Reducer.mean()).rename('Evaporation'))
                .addBands(ee.ImageCollection("MODIS/061/MOD15A2H").filterDate(start_date, end_date).select('Fpar_500m').mean().rename('FAPAR'))
                .addBands(ee.ImageCollection("MODIS/061/MOD15A2H").filterDate(start_date, end_date).select('Lai_500m').mean().rename('LAI'))
                .addBands(landsat_indices.select('MSI').mean().rename('MSI'))
                .addBands(landsat_indices.select('NDVI').mean().rename('NDVI'))
                .addBands(ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterDate(start_date, end_date).reduce(ee.Reducer.max()).select('precipitation_max').rename('Precipitation_Max'))
                .addBands(ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterDate(start_date, end_date).reduce(ee.Reducer.sum()).select('precipitation_sum').rename('Precipitation_Sum'))
                .addBands(ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterDate(start_date, end_date).reduce(ee.Reducer.mean()).select('precipitation_mean').rename('Precipitation_Mean'))
                .addBands(landsat_indices.select('SAVI').mean().rename('SAVI'))
                .addBands(ee.Image.constant(302.702377).rename('TempMax'))
                .addBands(ee.Image.constant(287.556804).rename('TempMean'))
                .addBands(ee.Image.constant(273.879806).rename('TempMin'))
            )
            

        # Reducir los valores de las bandas en la ROI
        precip_values = variables.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=roi,
            scale=30,
            maxPixels=1e13
        ).getInfo()

        # Crear un array con los valores obtenidos de Google Earth Engine
        earth_engine_data = np.array([
            precip_values['Clay_Content'], precip_values['EVI'], precip_values['Elevation'], precip_values['Evaporation'],
            precip_values['FAPAR'], precip_values['LAI'], precip_values['MSI'], precip_values['NDVI'],
            precip_values['Precipitation_Max'], precip_values['Precipitation_Sum'], precip_values['Precipitation_Mean'],
            precip_values['SAVI'], precip_values['TempMax'], precip_values['TempMean'], precip_values['TempMin']
        ])

        # Concatenar los arrays en el orden especificado
        final_array = np.concatenate([user_data, earth_engine_data])

        # Realizar predicción con el modelo lineal
        prediction = linear_model.predict(final_array.reshape(1, -1))[0]
        
        # Calcular métricas de rendimiento del modelo en datos de entrenamiento
        y_train_pred = linear_model.predict(X_train)
        r2 = r2_score(y_train, y_train_pred)
        rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
        mae = mean_absolute_error(y_train, y_train_pred)

        # Respuesta con predicción y métricas adicionales
        response = {
            'prediction': float(prediction),
            'model_metrics': {
                'r2_score': r2,
                'rmse': rmse,
                'mae': mae
            }
        }

        return jsonify({'prediction': response}), 200
    except Exception as e:
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
            
            # Definir fechas desde los parámetros del request
            start_date = request.form.get('startDate')
            end_date = request.form.get('endDate')
            
            # **************** R Factor ***************
            clim_rainmap = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterDate(start_date, end_date)
            annual_rain = clim_rainmap.select('precipitation').sum().clip(aoi)
            R = annual_rain.multiply(0.363).add(79).rename('R')
            
            # Visualización del factor R
            R_viz_params = {'min': 300, 'max': 900, 'palette': ['a52508', 'ff3818', 'fbff18', '25cdff', '2f35ff', '0b2dab']}
            
            # **************** K Factor ***************
            soil = ee.Image("OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02").select('b0').clip(aoi).rename('soil')
            K = soil.expression(
                "(b('soil') > 11) ? 0.0053"
                ": (b('soil') > 10) ? 0.0170"
                ": (b('soil') > 9) ? 0.045"
                ": (b('soil') > 8) ? 0.050"
                ": (b('soil') > 7) ? 0.0499"
                ": (b('soil') > 6) ? 0.0394"
                ": (b('soil') > 5) ? 0.0264"
                ": (b('soil') > 4) ? 0.0423"
                ": (b('soil') > 3) ? 0.0394"
                ": (b('soil') > 2) ? 0.036"
                ": (b('soil') > 1) ? 0.0341"
                ": (b('soil') > 0) ? 0.0288"
                ": 0"
            ).rename('K').clip(aoi)
            
            # Visualización del factor K
            K_viz_params = {'min': 0, 'max': 0.06, 'palette': ['a52508', 'ff3818', 'fbff18', '25cdff', '2f35ff', '0b2dab']}
            
            # **************** LS Factor ***************
            dem = ee.Image("WWF/HydroSHEDS/03CONDEM")
            slope = ee.Terrain.slope(dem).clip(aoi)
            slope_percent = slope.divide(180).multiply(math.pi).tan().multiply(100)
            LS4 = math.sqrt(500 / 100)
            LS = slope_percent.expression(
                "(b('slope') * 0.53) + (b('slope') * (b('slope') * 0.076)) + 0.76"
            ).multiply(LS4).rename('LS').clip(aoi)
            
            # Visualización del factor LS
            LS_viz_params = {'min': 0, 'max': 90, 'palette': ['a52508', 'ff3818', 'fbff18', '25cdff', '2f35ff', '0b2dab']}
            
            # **************** C Factor **************


            L = 0.5;
            # Visualización del factor LS

            
            # **************** C Factor ***************
            s2 = ee.ImageCollection("COPERNICUS/S2_HARMONIZED").filterDate(start_date, end_date).median().clip(aoi)
            ndvi = s2.normalizedDifference(['B8', 'B4']).rename("NDVI")
            sentinelCollection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED').filterBounds(aoi).filterDate(start_date, end_date).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))

            sentinelMedian = sentinelCollection.median();
            savi = sentinelMedian.expression('((NIR - RED) / (NIR + RED + L)) * (1 + L)', {'NIR': sentinelMedian.select('B8'), 'RED': sentinelMedian.select('B4'), 'L': L }).rename('SAVI');

            savi_median = savi

            C = ee.Image(0.805).multiply(savi_median).multiply(-1).add(0.431).clip(aoi)

            
            # Visualización del factor C
            C_viz_params = {'min': 0, 'max': 1, 'palette': ['FFFFFF', 'CC9966', 'CC9900', '996600', '33CC00', '009900', '006600', '000000']}
            
            # **************** Erosion Calculation ***************
            erosion = R.multiply(K).multiply(LS).multiply(C).rename('erosion')
            
            erosion_viz_params = {'min': 0, 'max': 10, 'palette': ['#490eff', '#12f4ff', '#12ff50', '#e5ff12', '#ff4812']}
            
            # Generar mapa
            map_id = erosion.getMapId(erosion_viz_params) 
            bounds=aoi.geometry().getInfo()
            print(bounds)
            return jsonify({
                "success": True,
                "output": [map_id['tile_fetcher'].url_format, erosion_viz_params, 'Erosion_Result', bounds]
            }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/list-assets', methods=['GET'])
def list_assets():
    try:
        folder = 'users/jbravo/sigpac'  # Carpeta de ejemplo, puedes cambiar esto
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
 
        return jsonify({'map_url': [url, vis_params, asset_id]})
    except Exception as e:
        print(str(e))
        return jsonify({'error': str(e)}), 500
    


if __name__ == '__main__':
    app.run(port=5004)