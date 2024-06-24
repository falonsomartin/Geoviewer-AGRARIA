import json
import pickle
import pandas as pd
import requests
import torch
from AuthHmacMetos import AuthHmacMetos
from shapely.geometry import Point, Polygon
from datetime import datetime, timedelta
from sqlalchemy import create_engine
import xml.etree.ElementTree as ET
import plotly.graph_objs as go
import random
import psycopg2


import geopandas as gpd
import numpy as np
from ria import RIA
from sentinelhub import (
    CRS,
    DataCollection,
    Geometry,
    SentinelHubStatistical,
    SentinelHubStatisticalDownloadClient,
    SHConfig,
    parse_time,
)
import requests
import simplekml
import zipfile
import json
import time

from RNN import RNN
apiURI = 'https://apidev.fieldclimate.com/v2'
# HMAC Authentication credentials
publicKey = '7b831b6ed349787c3f0e69bb63206abd74bedf3aeea5cf41'
privateKey = '7266006455f0f4ef0cd9a160e6f02e74c5fcc0590c4fe7e1'

def fetch_data_for_sensor(sensor_id, start_date, end_date):
    # Esta función hace la llamada a la API para un intervalo dado
    api_route = f'/data/{sensor_id}/raw/from/{str(start_date)}/to/{str(end_date)}'
    method = "GET"
    auth = AuthHmacMetos(api_route, publicKey, privateKey, method)
    response = requests.get(apiURI + api_route, headers={'Accept': 'application/json'}, auth=auth)
    if response.status_code == 200:
        return response.json()
    else:
        return None
    
def update_sensors(start_timestamp, end_timestamp):

        sensores=["0020DEFA"]
        all_sensor_data = []
        for sensor in sensores:
            current_start = start_timestamp
            while current_start < end_timestamp:
                current_end = min(current_start + 604800, end_timestamp)  # 604800 segundos en una semana
                data = fetch_data_for_sensor(sensor, str(current_start), str(current_end))
                if data:
                    aux=[]
                    aux.append(data)
                    all_sensor_data.append(aux)
                current_start += 604800
            sensors=[]
            for p in all_sensor_data:
                for d in p[0]['data']:
                    if(len(d)>4):
                        if(d["name"]=="Daily ET0" or d["name"]=="ET0"):
                            break;
                        for val in d["aggr"]:
                            avg_values = d['values'][val]
                            for v,f in zip(avg_values, p[0]["dates"]):
                                if(v != None):
                                    aux=[]
                                    aux.append(str(f))
                                    aux.append(d["name"])
                                    aux.append(val)
                                    aux.append(round(float(v), 1))
                                    sensors.append(aux)
        return sensors

def update_camera(from_d,to_d):
    trampas=["072104B6"]
    data_ins = {}
    for trampa in trampas:
        endpoint = '/camera/072104B6/photos/from/1705577038/to/1706441038'
        method = 'GET'
        auth = AuthHmacMetos(endpoint, publicKey, privateKey, method)
        response = requests.get(apiURI+endpoint, headers={'Accept': 'application/json'}, auth=auth)
        json_object = response.json()
        json_formatted = json.dumps(json_object, indent=2)
        data = json.loads(json_formatted)
        for d in data:         
            insectos={}
            if('rectangles' in d):
              for pic in d["rectangles"]:
                  especie = pic["label"]
                  if especie in insectos:
                      insectos[especie] += 1
                  else:
                      insectos[especie] = 1
              fecha = d["time"][:10]
              if fecha in data_ins:
                  for especie, conteo in insectos.items():
                      if especie in data_ins[fecha]:
                          data_ins[fecha][especie] += conteo
                      else:
                          data_ins[fecha][especie] = conteo
              else:
                  data_ins[fecha] = insectos
    return data_ins

def update_satellite(from_d, to_d):
    config = SHConfig()

    config.sh_client_id = '36d359b8-3fd6-4d05-a342-4840e1d72913'
    config.sh_client_secret = 'M@YEx@@#E)@LHS!|oO>3LZAEFMBoZ[14OlU)6[cc'

    config.save()

    if not config.sh_client_id or not config.sh_client_secret:
        print("Warning! To use Statistical API, please provide the credentials (OAuth client ID and client secret).")
    else:    
        yearly_time_interval = from_d, to_d

        parcela = Polygon([(37.60365698,-5.64265545),
        (37.60272411, -5.64231992),
        (37.60242823, -5.64221352),
        (37.60195234, -5.64207588),
        (37.60289534, -5.63805383),
        (37.60287459, -5.63804713),
        (37.60365608, -5.63467469),
        (37.60461928, -5.63535895),
        (37.60544358, -5.63594065),
        (37.60471811, -5.63864161),
        (37.60441346, -5.63982507),
        (37.60440824, -5.63984527),
        (37.6044031, -5.63986525),
        (37.60410952, -5.64093279),
        (37.60390027, -5.64169386),
        (37.60365698, -5.64265545)])
        polygons_crop_gdf = gpd.GeoDataFrame({'land_type': 'agricultural', 'geometry': [parcela]}, crs='epsg:4326')

        ndvi_evalscript = """
        //VERSION=3

        function setup() {
        return {
            input: [
            {
                bands: [
                "B03",
                "B04",
                "B08",
                "B11",
                "B12",
                "dataMask"
                ]
            }
            ],
            output: [
            {
                id: "ndvi",
                bands: 1
            },
            {
                id: "ndwi",
                bands: 1
            },
            {
                id: "nbri",
                bands: 1
            },
            {
                id: "ndsi",
                bands: 1
            },
            {
                id: "savi",
                bands: 1
            },
            {
                id: "dataMask",
                bands: 1
            }
            ]
        }
        }

        function evaluatePixel(samples) {
            return {
            ndvi: [(samples.B08 - samples.B04) / (samples.B08 + samples.B04)],       
            ndwi: [(samples.B03 - samples.B08) / (samples.B03 + samples.B08)],
            nbri: [(samples.B08 - samples.B12) / (samples.B08 + samples.B12)],
            ndsi: [(samples.B03 - samples.B11) / (samples.B03 + samples.B11)],
            savi: [(samples.B08 - samples.B04) / (samples.B08 + samples.B04 + 0.428) * (1.428)],
            dataMask: [samples.dataMask]
            };
        }
        """

        aggregation = SentinelHubStatistical.aggregation(
            evalscript=ndvi_evalscript, time_interval=yearly_time_interval, aggregation_interval="P1D", resolution=(10, 10)
        )

        input_data = SentinelHubStatistical.input_data(DataCollection.SENTINEL2_L2A)

        ndvi_requests = []

        for geo_shape in polygons_crop_gdf.geometry.values:
            request = SentinelHubStatistical(
                aggregation=aggregation,
                input_data=[input_data],
                geometry=Geometry(geo_shape, crs=CRS(polygons_crop_gdf.crs)),
                config=config,
            )
            ndvi_requests.append(request)

        download_requests = [ndvi_request.download_list[0] for ndvi_request in ndvi_requests]

        client = SentinelHubStatisticalDownloadClient(config=config)

        ndvi_stats = client.download(download_requests)

        ndvi_dfs = [stats_to_df(polygon_stats) for polygon_stats in ndvi_stats]

        for df, land_type in zip(ndvi_dfs, polygons_crop_gdf["land_type"].values):
            df["land_type"] = land_type

        ndvi_df = pd.concat(ndvi_dfs)

        total=ndvi_df[["interval_from", "ndvi_B0_mean", "ndwi_B0_mean", "nbri_B0_mean", "ndsi_B0_mean", "savi_B0_mean"]].sort_values('interval_from', ascending=False)
        total.to_excel('./total.xlsx')  

def load_placemarks(ruta):
# Cargar archivo KMZ
    kml = simplekml.Kml()
    kml_file = ruta
    kmz = zipfile.ZipFile(kml_file, 'r')
    kml_string = kmz.read('doc.kml').decode('utf-8')
    kml = simplekml.Kml()

    def parse_kml_string(kml_string):
        placemarks = []
        root = ET.fromstring(kml_string)
        for pm in root.findall('.//{http://www.opengis.net/kml/2.2}Placemark'):
            name = pm.find('{http://www.opengis.net/kml/2.2}name').text
            coords = pm.find('.//{http://www.opengis.net/kml/2.2}coordinates').text
            coords = [float(c) for c in coords.split(',')]
            placemarks.append((name, coords))
        return placemarks

    placemarks = parse_kml_string(kml_string)
    for name, coords in placemarks:
        print(f"{name}: {coords}")

def generate_dates(fecha_inicial, fecha_final, fechas_exist):
    # Rango de fechas
    # Generar lista de fechas faltantes
    fechas_faltantes = []
    fecha_actual = fecha_inicial + timedelta(days=1)  # se salta la fecha inicial
    while fecha_actual <= fecha_final:
        if fecha_actual not in fechas_exist:
            fechas_faltantes.append(fecha_actual)
        fecha_actual += timedelta(days=1)
    return fechas_faltantes


def watsat_model(conn,cur):
    cur.execute("SELECT sampling_date FROM sensores WHERE measurement='Precipitation' order by measurement_value desc, sampling_date")
    result = cur.fetchone()
    fecha_inicio = result[0].strftime('%Y-%m-%d')
    cur.execute("SELECT max(extraction_date) from metadata")
    result = cur.fetchone()
    fecha_fin = result[0].strftime('%Y-%m-%d')

    # Definir la consulta SQL
    query = '''
    SELECT DATE_TRUNC('day', sampling_date) as fecha, SUM(measurement_value) as precipitacion_diaria
    FROM sensores
    WHERE measurement = 'Precipitation' AND (sampling_date >= '{}' and sampling_date<='{}')
    GROUP BY fecha
    ORDER BY fecha ASC
    '''.format(fecha_inicio, fecha_fin)

    # Leer los resultados en un DataFrame de pandas
    df_sum_precip = pd.read_sql(query, conn)

    # Crear la columna con el sumatorio acumulado
    df_sum_precip['precipitacion_acumulada'] = df_sum_precip['precipitacion_diaria'].cumsum()

    query = '''
    SELECT interval_to, "ndvi_B0_max", "ndvi_B0_min", "ndvi_B0_mean" 
    FROM indices where interval_to >= '{}' and interval_to <= '{}' order by interval_to'''.format(fecha_inicio, fecha_fin)
    cur.execute(query)
    data = cur.fetchall()
    df_indices = pd.DataFrame(data, columns=['interval_to', 'ndvi_B0_max', 'ndvi_B0_min', 'ndvi_B0_mean'])

    # Calcula la columna que quieres añadir al DataFrame
    df_indices['ndvi_formula'] = (df_indices['ndvi_B0_mean'] - df_indices['ndvi_B0_min']) / (df_indices['ndvi_B0_max'] - df_indices['ndvi_B0_min'])
    
    query = '''SELECT sampling_date, measurement_value FROM sensores WHERE measurement LIKE 'ET0' order by sampling_date'''
    cur.execute(query)
    data = cur.fetchall()
    fechas=[]
    et0=[]
    for i in data:
        fechas.append(i[0].strftime("%Y-%m-%d %H:%M:%S"))        
        et0.append(round(float(i[1]),1))        

    df_et0 = pd.DataFrame({'fecha': fechas, 'et0': et0})
    
    df_indices = df_indices.fillna(0)

    kc_veg = 0.5  # Coeficiente de cultivo para vegetación
    kc_soil = 0.2  # Coeficiente de cultivo para suelo

    # Calcular Cws (factor de estrés hídrico)
    df_et0['fecha'] = pd.to_datetime(df_et0['fecha'])  # Convertir la columna 'fecha' a tipo datetime

    df_et0 = df_et0.loc[df_et0['fecha'] >= df_sum_precip['fecha'].min()]  # Filtrar fechas posteriores al inicio de las precipitaciones
    print(df_sum_precip)
    aa=[elemento1/elemento2 for elemento1, elemento2 in zip(df_sum_precip['precipitacion_acumulada'].tolist(), df_et0['et0'].tolist())]
    df_sum_precip['aw'] = aa  # Calcular AW y limitar su rango a [0, 1]
    df_sum_precip['aw'] = (df_sum_precip['aw']).clip(0,1)
    df_sum_precip['cws'] = 0.5 + 0.5 * df_sum_precip['aw']  # Calcular Cws
    df_indices['fecha'] = pd.to_datetime(df_indices['interval_to']).dt.date
    df_indices = df_indices.loc[df_indices['fecha'] >= df_sum_precip['fecha'].min()]  # Filtrar fechas posteriores al inicio de las precipitaciones
    # Convertir la columna 'fecha' de df_et0 a tipo date
    df_et0['fecha'] = df_et0['fecha'].dt.date
    # Seleccionar sólo las fechas que están en df_indices
    df_et0 = df_et0.loc[df_et0['fecha'] <= df_indices['fecha'].max()]
    del df_indices["fecha"]
    df_indices.rename(columns={'interval_to':'fecha'},inplace=True)
    df_merged = pd.merge(df_sum_precip, df_indices, on='fecha')
    
    tr_aaa=[et0 * kc_veg * kc_soil * cws for et0, cws in zip(df_et0['et0'].tolist(), df_merged['cws'].tolist())]
    df_merged['tr_a'] = tr_aaa
    
    ev_aaa=[et0 * (1 - kc_veg) * kc_soil * aw for et0, aw in zip(df_et0['et0'].tolist(), df_merged['aw'].tolist())]
    df_merged['ev_a'] = ev_aaa
    
    df_merged['precip_mm'] = df_merged['precipitacion_diaria']  # Renombrar columna para que sea más claro
    df_merged['eta_mm'] = df_merged['tr_a'] + df_merged['ev_a']  # Sumar TrA y EvA para obtener la ETa
    df_merged['dpp_mm'] = 0  # Assumir que no hay deep percolation o runoff (Dpp=0)
    df_merged['vi'] = 0  # Assumir que el volumen de agua en el suelo al inicio es 0
    for i in range(len(df_merged)):
        if i == 0:
            continue  # La primera fila no tiene un valor anterior de 'vi' para hacer la suma
        prev_vi = df_merged.loc[i-1, 'vi']
        precip_mm = df_merged.loc[i, 'precip_mm']
        eta_mm = df_merged.loc[i, 'eta_mm']
        dpp_mm = df_merged.loc[i, 'dpp_mm']
        vi = prev_vi + precip_mm - eta_mm - dpp_mm
        df_merged.loc[i, 'vi'] = max(0, vi)  # Limitar el volumen de agua en el suelo a valores no negativos
    return df_merged

def check_metadata(conn,cur):
    cur.execute("SELECT COUNT(*) FROM metadata")
    result = cur.fetchone()[0]
    return result

def plot_graphs(conn,cur):
#    data_wat=watsat_model(conn,cur)                                  
    # Crear las gráficas    
#    query = "SELECT sampling_date, measurement_value FROM sensores WHERE measurement='Precipitation'"

# Obtener los datos desde la base de datos
#    df_p = pd.read_sql(query, conn)
#    query = "SELECT sampling_date, measurement_value FROM sensores WHERE measurement='Solar radiation'"

    # Obtener los datos desde la base de datos
#    df_s= pd.read_sql(query, conn)
    
#    scatter_fig = go.Figure()
#    scatter_fig.add_trace(go.Scatter(x=df_s['sampling_date'], y=df_s['measurement_value'], mode='lines', name='Solar Radiation'))
#    scatter_fig.add_trace(go.Scatter(x=df_p['sampling_date'], y=df_p['measurement_value'], mode='lines', name='Precipitation'))
#    scatter_fig.update_layout(title='Radiación vs Precipitación')
    
    
# Obtener los datos desde la base de datos
    query = "SELECT sampling_date, insect_type, tracked FROM camaras"
    df_c = pd.read_sql(query, conn)

    # Crear una tabla pivote para tener los datos agrupados por fecha y especie
    df_c_pivot = df_c.pivot_table(index='sampling_date', columns='insect_type', values='tracked', aggfunc='sum').reset_index()

    # Crear la gráfica de barras apiladas
    stacked_bar_fig_ = go.Figure()
    for insect_type in df_c['insect_type'].unique():
        stacked_bar_fig_.add_trace(go.Bar(x=df_c_pivot['sampling_date'], y=df_c_pivot[insect_type], name=insect_type))

    stacked_bar_fig_.update_layout(title='Avistamientos de insectos por día', barmode='stack')

#    query = 'SELECT interval_to, "ndvi_B0_mean", "savi_B0_mean", "nbri_B0_mean", "ndsi_B0_mean", "cmr_B0_mean" FROM indices'

    # Obtener los datos desde la base de datos
#    df_is= pd.read_sql(query, conn)

#    stacked_bar_fig = go.Figure()
#    stacked_bar_fig.add_trace(go.Bar(x=df_is['interval_to'], y=df_is['ndvi_B0_mean'], name='NDVI'))
#    stacked_bar_fig.add_trace(go.Bar(x=df_is['interval_to'], y=df_is['savi_B0_mean'], name='SAVI'))
#    stacked_bar_fig.add_trace(go.Bar(x=df_is['interval_to'], y=df_is['nbri_B0_mean'], name='NBRI'))
#    stacked_bar_fig.add_trace(go.Bar(x=df_is['interval_to'], y=df_is['cmr_B0_mean'], name='CMR'))
#    stacked_bar_fig.update_layout(title='Valores de índices en diferentes fechas', barmode='stack')
    
#    scatter_fig_ = go.Figure()
#    scatter_fig_.add_trace(go.Scatter(x=data_wat['fecha'], y=data_wat['vi'], mode='lines', name='Volumetric'))
#    scatter_fig_.update_layout(title='Watsat Model')
    
    return stacked_bar_fig_

def load_db(conn, cur):
    
    # Comprobar si existe algún registro en la tabla 'sensor'
    cur.execute("SELECT COUNT(*) FROM metadata")
    result = cur.fetchone()[0]

    if result:
        # Si hay registros, extraer el atributo 'extracted_date' de la tabla 'metadata'
        cur.execute("SELECT extraction_date FROM metadata ORDER BY extraction_date DESC LIMIT 1")
        extraction_date = str(cur.fetchone()[0]).split(".")[0]
        unix_timestamp = int(time.mktime(datetime.strptime(str(extraction_date), '%Y-%m-%d %H:%M:%S').timetuple()))
    
    
        # Convertir la fecha actual a timestamp UNIX
        now_timestamp = int(time.mktime(datetime.now().timetuple()))

        # Pasar la fecha a formato Unix timestamp


        sensors= update_sensors(int(str(unix_timestamp).split(".")[0]), int(str(now_timestamp).split(".")[0]))
        sql = "INSERT INTO sensores (sampling_date, measurement, measurement_type, measurement_value) VALUES (%s, %s, %s, %s)"

        # Ejecutar la consulta SQL con los valores de la lista de listas
        cur.executemany(sql, sensors)
        camera=update_camera(str(unix_timestamp).split(".")[0], str(now_timestamp).split(".")[0])
        valores = []
        for fecha, especies in camera.items():
            for especie, cantidad in especies.items():
                valores.append((fecha, especie, cantidad))
        
        sql_diccionario = "INSERT INTO camaras (sampling_date, insect_type, tracked) VALUES (%s, %s, %s)"

        cur.executemany(sql_diccionario, valores)
        
        cur.execute("SELECT MAX(interval_to) FROM indices")
        result = cur.fetchone()
        min_date, max_date = result[0], datetime(datetime.now().year, datetime.now().month, datetime.now().day, 0, 0, 0)

        # Obtener todas las fechas excepto la más antigua y la más moderna
        cur.execute("SELECT interval_to FROM indices WHERE interval_to NOT IN (%s, %s)", (min_date, max_date))
        result = cur.fetchall()
        dates = [r[0] for r in result]

        mis=generate_dates(min_date,max_date,dates)
                
        for i in mis:
            fecha_anterior1 = i - timedelta(days=1)
            fecha_anterior2 = i - timedelta(days=2)
            fecha_anterior3 = i - timedelta(days=3)
            fecha_anterior4 = i - timedelta(days=4)
            cur.execute("SELECT sampling_date FROM sensores")
            result = cur.fetchall()

            
            ndvi_max=random.uniform(-0.5, 0.5)
            ndvi_min=random.uniform(-0.5, 0.5)
            ndvi_mean=random.uniform(-0.5, 0.5)
            ndwi_max=random.uniform(-0.5, 0.5)
            ndwi_min=random.uniform(-0.5, 0.5)
            ndwi_mean=random.uniform(-0.5, 0.5)
            ndsi_max=random.uniform(-0.5, 0.5)
            ndsi_min=random.uniform(-0.5, 0.5)
            ndsi_mean=random.uniform(-0.5, 0.5)
            nbri_max=random.uniform(-0.5, 0.5)
            nbri_min=random.uniform(-0.5, 0.5)
            nbri_mean=random.uniform(-0.5, 0.5)
            savi_max=random.uniform(-0.5, 0.5)
            savi_min=random.uniform(-0.5, 0.5)
            savi_mean=random.uniform(-0.5, 0.5)
            cmr_max=random.uniform(-0.5, 0.5)
            cmr_min=random.uniform(-0.5, 0.5)
            cmr_mean=random.uniform(-0.5, 0.5)
            sql = 'INSERT INTO indices (interval_to, "ndvi_B0_max", "ndvi_B0_min", "ndvi_B0_mean", "ndwi_B0_max", "ndwi_B0_min", "ndwi_B0_mean", "ndsi_B0_max", "ndsi_B0_min", "ndsi_B0_mean", "nbri_B0_max", "nbri_B0_min", "nbri_B0_mean", "savi_B0_max", "savi_B0_min", "savi_B0_mean", "cmr_B0_max", "cmr_B0_min", "cmr_B0_mean") VALUES (%s, %s, %s, %s,%s, %s, %s, %s,%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'

            cur.execute(sql, (i,ndvi_max,ndvi_min,ndvi_mean, ndwi_max,ndwi_min,ndwi_mean, ndsi_max,ndsi_min,ndsi_mean, nbri_max,nbri_min,nbri_mean, savi_max,savi_min,savi_mean,cmr_max,cmr_min,cmr_mean))

        sql = "INSERT INTO metadata (extraction_date, author) VALUES (%s, %s)"
        datetime.fromtimestamp(now_timestamp)
        metadata=[(datetime.fromtimestamp(now_timestamp)).strftime("%Y-%m-%d %H:%M:%S"), "EvenorTech"]
        # Ejecutar la consulta SQL con los valores de la lista
        cur.execute(sql, (metadata[0],metadata[1]))
        conn.commit()        
        
    else:
        extraction_date = datetime(2022, 1, 15, 0, 0, 0)

        unix_timestamp = time.mktime(extraction_date.timetuple())

        # Convertir la fecha actual a timestamp UNIX
        now_timestamp = int(time.mktime(datetime.now().timetuple()))
        
       # sensors= update_sensors(str(unix_timestamp).split(".")[0], '1681164000')
       # sql = "INSERT INTO sensores (sampling_date, measurement, measurement_type, measurement_value) VALUES (%s, %s, %s, %s)"

        # Ejecutar la consulta SQL con los valores de la lista de listas
    #    cur.executemany(sql, sensors)
    #    camera=update_camera(str(unix_timestamp).split(".")[0], '1681164000')
    #    valores = []
    #    for fecha, especies in camera.items():
    #        for especie, cantidad in especies.items():
    #            valores.append((fecha, especie, cantidad))
        
    #    sql_diccionario = "INSERT INTO camaras (sampling_date, insect_type, tracked) VALUES (%s, %s, %s)"

    #    cur.executemany(sql_diccionario, valores)
    
        df = pd.read_excel('./files/indices.xlsx')

        engine = create_engine('postgresql://postgres:Evenor2510Tech@localhost:5432/tepro')

        table_name = "indices"
        if_exists = "replace" # Opciones: "fail", "replace", "append"

        # Insertar datos en la base de datos
        df.to_sql(name=table_name, con=engine, if_exists=if_exists, index=False) 
        
        # Imprimir los resultados
        cur.execute("SELECT MIN(interval_to) FROM indices")
        result = cur.fetchone()
        min_date, max_date = result[0], datetime(2023, 4, 10, 0, 0, 0)

        # Obtener todas las fechas excepto la más antigua y la más moderna
        cur.execute("SELECT interval_to FROM indices WHERE interval_to NOT IN (%s, %s)", (min_date, max_date))
        result = cur.fetchall()
        dates = [r[0] for r in result]
        
        mis=generate_dates(min_date,max_date,dates)
                
        for i in mis:
            fecha_anterior1 = i - timedelta(days=1)
            fecha_anterior2 = i - timedelta(days=2)
            fecha_anterior3 = i - timedelta(days=3)
            fecha_anterior4 = i - timedelta(days=4)

            cur.execute("SELECT sampling_date FROM sensores")
            result = cur.fetchall()
            
            cur.execute("SELECT measurement, avg(measurement_value) FROM sensores WHERE sampling_date IN (%s, %s) and (measurement_type='avg' or measurement_type='sum') and (measurement='Solar radiation' or measurement='Dew Point' or measurement='HC Air temperature' or measurement='Wetbulb temperature' or measurement='VPD' or measurement='Precipitation') GROUP BY measurement", (fecha_anterior1, fecha_anterior2))
            result = cur.fetchall()
            dewpoint_1, hctmep1, precip1, solarrad1, vpd1, bulb1 = result[0][1], result[1][1], result[2][1], result[3][1], result[4][1], result[5][1]
            
            cur.execute("SELECT avg(measurement_value) FROM sensores WHERE sampling_date IN (%s, %s) and measurement LIKE 'EnviroPro Soil Temperature _'", (fecha_anterior1, fecha_anterior2))
            result = cur.fetchall()
            if(result[0][0] != None):    
                avgtemp1 = result[0][0]
            else:
                avgtemp1 = 15
                
            cur.execute("SELECT avg(measurement_value) FROM sensores WHERE sampling_date IN (%s, %s) and measurement LIKE 'EnviroPro Soil Moisture _'", (fecha_anterior1, fecha_anterior2))
            result = cur.fetchall()
            if(result[0][0] != None):    
                avgmois1 = result[0][0]
            else:
                avgmois1 = 35
                    
            cur.execute("SELECT measurement_value FROM sensores WHERE sampling_date IN (%s, %s) and measurement LIKE 'ET0'", (fecha_anterior1, fecha_anterior1))
            result = cur.fetchall()
            et1=result
            if(len(et1)<=0):
                et1.append(6.6)
                sql = "INSERT INTO sensores (sampling_date, measurement, measurement_type, measurement_value) VALUES (%s, %s, %s, %s)"
                cur.execute(sql, [fecha_anterior1.strftime('%Y-%m-%d %H:%M:%S'), 'ET0', 'avg', round(float(et1[0]), 1)])
            else:
                et1=[round(float(result[0][0]),1)]
                
            cur.execute("SELECT measurement, avg(measurement_value) FROM sensores WHERE sampling_date IN (%s, %s) and (measurement_type='avg' or measurement_type='sum') and (measurement='Solar radiation' or measurement='Dew Point' or measurement='HC Air temperature' or measurement='Wetbulb temperature' or measurement='VPD' or measurement='Precipitation') GROUP BY measurement", (fecha_anterior2, fecha_anterior3))
            result = cur.fetchall()
            dewpoint_2, hctmep2, precip2, solarrad2, vpd2, bulb2 = result[0][1], result[1][1], result[2][1], result[3][1], result[4][1], result[5][1]
            
            cur.execute("SELECT avg(measurement_value) FROM sensores WHERE sampling_date IN (%s, %s) and measurement LIKE 'EnviroPro Soil Temperature _'", (fecha_anterior2, fecha_anterior3))
            result = cur.fetchall()
            if(result[0][0] != None):    
                avgtemp2 = result[0][0]
            else:
                avgtemp2 = 15

            cur.execute("SELECT avg(measurement_value) FROM sensores WHERE sampling_date IN (%s, %s) and measurement LIKE 'EnviroPro Soil Moisture _'", (fecha_anterior1, fecha_anterior2))
            result = cur.fetchall()
            if(result[0][0] != None):    
                avgmois2 = result[0][0]
            else:
                avgmois2 = 35
                
            cur.execute("SELECT measurement_value FROM sensores WHERE sampling_date IN (%s, %s) and measurement LIKE 'ET0'", (fecha_anterior2, fecha_anterior2))
            result = cur.fetchall()
            et2=result  
            if(len(et2)<=0):
                et2.append(6.6)
                sql = "INSERT INTO sensores (sampling_date, measurement, measurement_type, measurement_value) VALUES (%s, %s, %s, %s)"
                cur.execute(sql, [fecha_anterior2.strftime('%Y-%m-%d %H:%M:%S'), 'ET0', 'avg', round(float(et2[0]), 1)])
            else:
                et2=[round(float(result[0][0]),1)]
                
            cur.execute("SELECT measurement, avg(measurement_value) FROM sensores WHERE sampling_date IN (%s, %s) and (measurement_type='avg' or measurement_type='sum') and (measurement='Solar radiation' or measurement='Dew Point' or measurement='HC Air temperature' or measurement='Wetbulb temperature' or measurement='VPD' or measurement='Precipitation') GROUP BY measurement", (fecha_anterior3, fecha_anterior4))
            result = cur.fetchall()
            dewpoint_3, hctmep3, precip3, solarrad3, vpd3, bulb3 = result[0][1], result[1][1], result[2][1], result[3][1], result[4][1], result[5][1]
            
            cur.execute("SELECT avg(measurement_value) FROM sensores WHERE sampling_date IN (%s, %s) and measurement LIKE 'EnviroPro Soil Temperature _'", (fecha_anterior3, fecha_anterior4))
            result = cur.fetchall()
            if(result[0][0] != None):    
                avgtemp3 = result[0][0]
            else:
                avgtemp3 = 15
                
            cur.execute("SELECT avg(measurement_value) FROM sensores WHERE sampling_date IN (%s, %s) and measurement LIKE 'EnviroPro Soil Moisture _'", (fecha_anterior1, fecha_anterior2))
            result = cur.fetchall()
            if(result[0][0] != None):    
                avgmois3 = result[0][0]
            else:
                avgmois3 = 35
            
            cur.execute("SELECT measurement_value FROM sensores WHERE sampling_date IN (%s, %s) and measurement LIKE 'ET0'", (fecha_anterior3, fecha_anterior3))
            result = cur.fetchall()
            et3=result  
            if(len(et3)<=0):
                et3.append(6.6)
                sql = "INSERT INTO sensores (sampling_date, measurement, measurement_type, measurement_value) VALUES (%s, %s, %s, %s)"
                cur.execute(sql, [fecha_anterior3.strftime('%Y-%m-%d %H:%M:%S'), 'ET0', 'avg', round(float(et3[0]), 1)])
            else:
                et3=[round(float(result[0][0]),1)]
                    
            cur.execute('SELECT indices."ndvi_B0_mean", indices."ndwi_B0_mean", indices."savi_B0_mean", indices."ndsi_B0_mean", indices."nbri_B0_mean", indices."cmr_B0_mean" FROM indices WHERE interval_to between %s and %s', (fecha_anterior1, fecha_anterior1))
            result = cur.fetchall()
            if(len(result)==0):
                ndvi1, ndwi1, savi1, ndsi1, nbri1, cmr1 = 0, 0, 0, 0, 0, 0
            else:     
                ndvi1, ndwi1, savi1, ndsi1, nbri1, cmr1 = result[0][0], result[0][1], result[0][2], result[0][3], result[0][4], result[0][5]
            
            
            cur.execute('SELECT indices."ndvi_B0_mean", indices."ndwi_B0_mean", indices."savi_B0_mean", indices."ndsi_B0_mean", indices."nbri_B0_mean", indices."cmr_B0_mean" FROM indices WHERE interval_to between %s and %s', (fecha_anterior2, fecha_anterior2))
            result = cur.fetchall()
            if(len(result)==0):
                ndvi2, ndwi2, savi2, ndsi2, nbri2, cmr2 = 0, 0, 0, 0, 0, 0
            else:     
                ndvi2, ndwi2, savi2, ndsi2, nbri2, cmr2 = result[0][0], result[0][1], result[0][2], result[0][3], result[0][4], result[0][5]
                                
            cur.execute('SELECT indices."ndvi_B0_mean", indices."ndwi_B0_mean", indices."savi_B0_mean", indices."ndsi_B0_mean", indices."nbri_B0_mean", indices."cmr_B0_mean" FROM indices WHERE interval_to between %s and %s', (fecha_anterior3, fecha_anterior3))
            result = cur.fetchall()
            if(len(result)==0):
                ndvi3, ndwi3, savi3, ndsi3, nbri3, cmr3 = 0, 0, 0, 0, 0, 0
            else:     
                ndvi3, ndwi3, savi3, ndsi3, nbri3, cmr3 = result[0][0], result[0][1], result[0][2], result[0][3], result[0][4], result[0][5]
                
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

            X_ndvi=pickle.load(open('./files/X_ndvi.sav', 'rb'))
            Y_ndvi=pickle.load(open('./files/Y_ndvi.sav', 'rb'))
            scaler_X_ndvi=pickle.load(open('./files/scaler_x_ndvi.sav', 'rb'))
            scaler_y_ndvi=pickle.load(open('./files/scaler_y_ndvi.sav', 'rb'))
            n_features_ndvi = X_ndvi.shape[1]

            model_ndvi = RNN(input_size=n_features_ndvi, hidden_size=100, output_size=3, num_layers=4).to(torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
            model_ndvi.load_state_dict(torch.load('./files/model_ndvi.pt'))

            # Crear arreglo con los datos para predecir el NDVI
            predict_data_ndvi = np.array([[ndvi1,ndwi1,savi1,ndsi1, solarrad1, dewpoint_1, hctmep1, bulb1, precip1],
                                            [ndvi2,ndwi2,savi2,ndsi2, solarrad2, dewpoint_2, hctmep2, bulb2, precip2],
                                            [ndvi3,ndwi3,savi3,ndsi3, solarrad3, dewpoint_3, hctmep3, bulb3, precip3]])

            # Normalizar los datos
            predict_data_ndvi = scaler_X_ndvi.transform(predict_data_ndvi)
            # Reshape los datos para que tengan la forma adecuada
            predict_data_ndvi = predict_data_ndvi.reshape((1, 3, n_features_ndvi))

            # Pasar los datos normalizados al dispositivo donde se encuentra el modelo
            predict_data_ndvi = torch.from_numpy(predict_data_ndvi).to(device)

            # Obtener la predicción del modelo
            with torch.no_grad():
                ndvi_pred = model_ndvi(predict_data_ndvi.float())

            # Pasar la predicción al dispositivo de la CPU y deshacer la normalización
            ndvi_pred = ndvi_pred.cpu().numpy()
            ndvi_pred = scaler_y_ndvi.inverse_transform(ndvi_pred)
            ndvi_pred = ndvi_pred.astype(np.float64)
            
            
            print(f"El valor del NDVI para la fecha {i} es: {ndvi_pred[0][2]:.6f}")
            
            X_ndwi=pickle.load(open('./files/X_ndwi.sav', 'rb'))
            Y_ndwi=pickle.load(open('./files/Y_ndwi.sav', 'rb'))
            scaler_X_ndwi=pickle.load(open('./files/scaler_x_ndwi.sav', 'rb'))
            scaler_y_ndwi=pickle.load(open('./files/scaler_y_ndwi.sav', 'rb'))
            n_features_ndwi = X_ndwi.shape[1]

            model_ndwi = RNN(input_size=n_features_ndwi, hidden_size=100, output_size=3, num_layers=4).to(torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
            model_ndwi.load_state_dict(torch.load('./files/model_ndwi.pt'))

            # Crear arreglo con los datos para predecir el NDWI
            predict_data_ndwi = np.array([[ndwi1,ndvi1,savi1,ndsi1, solarrad1, dewpoint_1, hctmep1, nbri1, precip1],
                                            [ndwi2,ndvi2,savi2,ndsi2, solarrad2, dewpoint_2, hctmep2, nbri2, precip2],
                                            [ndwi3,ndvi3,savi3,ndsi3, solarrad3, dewpoint_3, hctmep3, nbri3, precip3]])

            # Normalizar los datos
            predict_data_ndwi = scaler_X_ndwi.transform(predict_data_ndwi)
            # Reshape los datos para que tengan la forma adecuada
            predict_data_ndwi = predict_data_ndwi.reshape((1, 3, n_features_ndwi))

            # Pasar los datos normalizados al dispositivo donde se encuentra el modelo
            predict_data_ndwi = torch.from_numpy(predict_data_ndwi).to(device)

            # Obtener la predicción del modelo
            with torch.no_grad():
                ndwi_pred = model_ndwi(predict_data_ndwi.float())

            # Pasar la predicción al dispositivo de la CPU y deshacer la normalización
            ndwi_pred = ndwi_pred.cpu().numpy()
            ndwi_pred = scaler_y_ndwi.inverse_transform(ndwi_pred)
            ndwi_pred = ndwi_pred.astype(np.float64)
            
            
            print(f"El valor del NDWI para la fecha {i} es: {ndwi_pred[0][2]:.6f}")
            
            X_ndsi=pickle.load(open('./files/X_ndsi.sav', 'rb'))
            Y_ndsi=pickle.load(open('./files/Y_ndsi.sav', 'rb'))
            scaler_X_ndsi=pickle.load(open('./files/scaler_x_ndsi.sav', 'rb'))
            scaler_y_ndsi=pickle.load(open('./files/scaler_y_ndsi.sav', 'rb'))
            n_features_ndsi = X_ndsi.shape[1]

            model_ndsi = RNN(input_size=n_features_ndsi, hidden_size=100, output_size=3, num_layers=4).to(torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
            model_ndsi.load_state_dict(torch.load('./files/model_ndsi.pt'))

            # Crear arreglo con los datos para predecir el NDWI
            predict_data_ndsi = np.array([[ndsi1,ndvi1,ndwi1,nbri1,savi1, solarrad1, precip1, hctmep1, dewpoint_1, bulb1],
                                            [ndsi2,ndvi2,ndwi2,nbri2,savi2, solarrad2, precip2, hctmep2, dewpoint_2, bulb2],
                                            [ndsi3,ndvi3,ndwi3,nbri3,savi3, solarrad3, precip3, hctmep3, dewpoint_3, bulb3]])

            # Normalizar los datos
            predict_data_ndsi = scaler_X_ndsi.transform(predict_data_ndsi)
            # Reshape los datos para que tengan la forma adecuada
            predict_data_ndsi = predict_data_ndsi.reshape((1, 3, n_features_ndsi))

            # Pasar los datos normalizados al dispositivo donde se encuentra el modelo
            predict_data_ndsi = torch.from_numpy(predict_data_ndsi).to(device)

            # Obtener la predicción del modelo
            with torch.no_grad():
                ndsi_pred = model_ndsi(predict_data_ndsi.float())

            # Pasar la predicción al dispositivo de la CPU y deshacer la normalización
            ndsi_pred = ndsi_pred.cpu().numpy()
            ndsi_pred = scaler_y_ndsi.inverse_transform(ndsi_pred)
            ndsi_pred = ndsi_pred.astype(np.float64)
            
            
            print(ndsi_pred)
            print(f"El valor del NDSI para la fecha {i} es: {ndsi_pred[0][2]:.6f}")
            
            X_nbri=pickle.load(open('./files/X_nbri.sav', 'rb'))
            Y_nbri=pickle.load(open('./files/Y_nbri.sav', 'rb'))
            scaler_X_nbri=pickle.load(open('./files/scaler_x_nbri.sav', 'rb'))
            scaler_y_nbri=pickle.load(open('./files/scaler_y_nbri.sav', 'rb'))
            n_features_nbri = X_nbri.shape[1]

            model_nbri = RNN(input_size=n_features_nbri, hidden_size=100, output_size=3, num_layers=4).to(torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
            model_nbri.load_state_dict(torch.load('./files/model_nbri.pt', map_location=torch.device('cpu')))

            # Crear arreglo con los datos para predecir el NDWI
            predict_data_nbri = np.array([[nbri1,ndsi1,ndwi1,ndvi1,savi1, solarrad1, precip1, hctmep1, dewpoint_1, bulb1],
                                            [nbri2,ndsi2,ndwi2,ndvi2,savi2, solarrad2, precip2, hctmep2, dewpoint_2, bulb2],
                                            [nbri3,ndsi3,ndwi3,ndvi3,savi3, solarrad3, precip3, hctmep3, dewpoint_3, bulb3]])
            
            # Normalizar los datos
            predict_data_nbri = scaler_X_nbri.transform(predict_data_nbri)
            # Reshape los datos para que tengan la forma adecuada
            predict_data_nbri = predict_data_nbri.reshape((1, 3, n_features_nbri))

            # Pasar los datos normalizados al dispositivo donde se encuentra el modelo
            predict_data_nbri = torch.from_numpy(predict_data_nbri).to(device)

            # Obtener la predicción del modelo
            with torch.no_grad():
                nbri_pred = model_nbri(predict_data_nbri.float())

            # Pasar la predicción al dispositivo de la CPU y deshacer la normalización
            nbri_pred = nbri_pred.cpu().numpy()
            nbri_pred = scaler_y_nbri.inverse_transform(nbri_pred)
            nbri_pred = nbri_pred.astype(np.float64)
            
            
            print(nbri_pred)
            print(f"El valor del NBRI para la fecha {i} es: {nbri_pred[0][2]:.6f}")
            
            X_savi=pickle.load(open('./files/X_savi.sav', 'rb'))
            Y_savi=pickle.load(open('./files/Y_savi.sav', 'rb'))
            scaler_X_savi=pickle.load(open('./files/scaler_x_savi.sav', 'rb'))
            scaler_y_savi=pickle.load(open('./files/scaler_y_savi.sav', 'rb'))
            n_features_savi = X_savi.shape[1]

            model_savi = RNN(input_size=n_features_savi, hidden_size=100, output_size=3, num_layers=4).to(torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
            model_savi.load_state_dict(torch.load('./files/model_savi.pt', map_location=torch.device('cpu')))

            # Crear arreglo con los datos para predecir el NDWI
            predict_data_savi = np.array([[savi1,ndvi1,ndwi1,ndsi1, solarrad1, dewpoint_1, hctmep1, avgtemp1, precip1],
                                            [savi2,ndvi2,ndwi2,ndsi2, solarrad2, dewpoint_2, hctmep2, avgtemp2, precip2],
                                            [savi3,ndvi3,ndwi3,ndsi3, solarrad3, dewpoint_3, hctmep3, avgtemp3, precip3]])
            
            # Normalizar los datos
            predict_data_savi = scaler_X_savi.transform(predict_data_savi)
            # Reshape los datos para que tengan la forma adecuada
            predict_data_savi = predict_data_savi.reshape((1, 3, n_features_savi))

            # Pasar los datos normalizados al dispositivo donde se encuentra el modelo
            predict_data_savi = torch.from_numpy(predict_data_savi).to(device)

            # Obtener la predicción del modelo
            with torch.no_grad():
                savi_pred = model_savi(predict_data_savi.float())

            # Pasar la predicción al dispositivo de la CPU y deshacer la normalización
            savi_pred = savi_pred.cpu().numpy()
            savi_pred = scaler_y_savi.inverse_transform(savi_pred)
            savi_pred = savi_pred.astype(np.float64)
            
            
            print(savi_pred)
            print(f"El valor del SAVI para la fecha {i} es: {savi_pred[0][2]:.6f}")
            
            X_cmr=pickle.load(open('./files/X_cmr.sav', 'rb'))
            Y_cmr=pickle.load(open('./files/Y_cmr.sav', 'rb'))
            scaler_X_cmr=pickle.load(open('./files/scaler_x_cmr.sav', 'rb'))
            scaler_y_cmr=pickle.load(open('./files/scaler_y_cmr.sav', 'rb'))
            n_features_cmr = X_cmr.shape[1]

            model_cmr = RNN(input_size=n_features_savi, hidden_size=100, output_size=3, num_layers=4).to(torch.device('cuda' if torch.cuda.is_available() else 'cpu'))
            model_cmr.load_state_dict(torch.load('./files/model_cmr.pt', map_location=torch.device('cpu')))

            # Crear arreglo con los datos para predecir el NDWI
            predict_data_cmr = np.array([   [cmr1,round(float(et1[0]),1),avgmois1, vpd1,ndsi1, solarrad1, nbri1, ndwi1, avgtemp1],
                                            [cmr2,round(float(et2[0]),1),avgmois2, vpd2,ndsi2, solarrad2, nbri2, ndwi2, avgtemp2],
                                            [cmr3,round(float(et3[0]),1),avgmois3, vpd3,ndsi3, solarrad3, nbri3, ndwi3, avgtemp3]])
            
            # Normalizar los datos
            predict_data_cmr = scaler_X_cmr.transform(predict_data_cmr)
            # Reshape los datos para que tengan la forma adecuada
            predict_data_cmr = predict_data_cmr.reshape((1, 3, n_features_cmr))

            # Pasar los datos normalizados al dispositivo donde se encuentra el modelo
            predict_data_cmr = torch.from_numpy(predict_data_cmr).to(device)

            # Obtener la predicción del modelo
            with torch.no_grad():
                cmr_pred = model_cmr(predict_data_cmr.float())

            # Pasar la predicción al dispositivo de la CPU y deshacer la normalización
            cmr_pred = cmr_pred.cpu().numpy()
            cmr_pred = scaler_y_cmr.inverse_transform(cmr_pred)
            cmr_pred = cmr_pred.astype(np.float64)
            
            
            print(cmr_pred)
            print(f"El valor del CMR para la fecha {i} es: {cmr_pred[0][2]:.6f}")
            
            ndvi_max=ndvi_pred[0][0]
            ndvi_min=ndvi_pred[0][1]
            ndvi_mean=ndvi_pred[0][2]
            ndwi_max=ndwi_pred[0][0]
            ndwi_min=ndwi_pred[0][1]
            ndwi_mean=ndwi_pred[0][2]
            ndsi_max=ndsi_pred[0][0]
            ndsi_min=ndsi_pred[0][1]
            ndsi_mean=ndsi_pred[0][2]
            nbri_max=nbri_pred[0][0]
            nbri_min=nbri_pred[0][1]
            nbri_mean=nbri_pred[0][2]
            savi_max=savi_pred[0][0]
            savi_min=savi_pred[0][1]
            savi_mean=savi_pred[0][2]
            cmr_max=cmr_pred[0][0]
            cmr_min=cmr_pred[0][1]
            cmr_mean=cmr_pred[0][2]
            sql = 'INSERT INTO indices (interval_to, "ndvi_B0_max", "ndvi_B0_min", "ndvi_B0_mean", "ndwi_B0_max", "ndwi_B0_min", "ndwi_B0_mean", "ndsi_B0_max", "ndsi_B0_min", "ndsi_B0_mean", "nbri_B0_max", "nbri_B0_min", "nbri_B0_mean", "savi_B0_max", "savi_B0_min", "savi_B0_mean", "cmr_B0_max", "cmr_B0_min", "cmr_B0_mean") VALUES (%s, %s, %s, %s,%s, %s, %s, %s,%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'

            cur.execute(sql, (i,ndvi_max,ndvi_min,ndvi_mean, ndwi_max,ndwi_min,ndwi_mean, ndsi_max,ndsi_min,ndsi_mean, nbri_max,nbri_min,nbri_mean, savi_max,savi_min,savi_mean,cmr_max,cmr_min,cmr_mean))

        sql = "INSERT INTO metadata (extraction_date, author) VALUES (%s, %s)"
        datetime.fromtimestamp(now_timestamp)
        metadata=[(datetime.fromtimestamp(now_timestamp)).strftime("%Y-%m-%d %H:%M:%S"), "EvenorTech"]
        # Ejecutar la consulta SQL con los valores de la lista
        cur.execute(sql, (metadata[0],metadata[1]))
        
        conn.commit()

    # Cerrar el cursor y la conexión a la base de datos

def stats_to_df(stats_data):
    """Transform Statistical API response into a pandas.DataFrame"""
    df_data = []

    for single_data in stats_data["data"]:
        df_entry = {}
        is_valid_entry = True

        df_entry["interval_from"] = parse_time(single_data["interval"]["from"]).date()
        df_entry["interval_to"] = parse_time(single_data["interval"]["to"]).date()

        for output_name, output_data in single_data["outputs"].items():
            for band_name, band_values in output_data["bands"].items():
                band_stats = band_values["stats"]
                if band_stats["sampleCount"] == band_stats["noDataCount"]:
                    is_valid_entry = False
                    break

                for stat_name, value in band_stats.items():
                    col_name = f"{output_name}_{band_name}_{stat_name}"
                    if stat_name == "percentiles":
                        for perc, perc_val in value.items():
                            perc_col_name = f"{col_name}_{perc}"
                            df_entry[perc_col_name] = perc_val
                    else:
                        df_entry[col_name] = value

        if is_valid_entry:
            df_data.append(df_entry)

    return pd.DataFrame(df_data)

def loadd_db():
    apiURI = 'https://api.fieldclimate.com/v2'
    publicKey = '7b831b6ed349787c3f0e69bb63206abd74bedf3aeea5cf41'
    privateKey = '7266006455f0f4ef0cd9a160e6f02e74c5fcc0590c4fe7e1'
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="Evenor2510Tech")
    cur = conn.cursor()   

    cur.execute("SELECT extraction_date FROM metadata ORDER BY extraction_date DESC LIMIT 1")
    extraction_date = cur.fetchone()[0]
    unix_timestamp = int(time.mktime(datetime.strptime(str(extraction_date), '%Y-%m-%d %H:%M:%S').timetuple()))
    
    
    # Convertir la fecha actual a timestamp UNIX
    now_timestamp = int(time.mktime(datetime.now().timetuple()))


#    print(unix_timestamp)
#    print(now_timestamp)
    data_ins = {}
    endpoint = '/camera/072104B6/photos/from/'+str(unix_timestamp)+'/to/'+str(now_timestamp)
    method = 'GET'
    auth = AuthHmacMetos(endpoint, publicKey, privateKey, method)
    response = requests.get(apiURI+endpoint, headers={'Accept': 'application/json'}, auth=auth)
    json_object = response.json()
    json_formatted = json.dumps(json_object, indent=2)
    data = json.loads(json_formatted)
    for d in data:         
        insectos={}
        if('rectangles' in d):
            for pic in d["rectangles"]:
                especie = pic["label"]
                if especie in insectos:
                    insectos[especie] += 1
                else:
                    insectos[especie] = 1
            fecha = d["time"][:10]
            if fecha in data_ins:
                for especie, conteo in insectos.items():
                    if especie in data_ins[fecha]:
                        data_ins[fecha][especie] += conteo
                    else:
                        data_ins[fecha][especie] = conteo
            else:
                data_ins[fecha] = insectos

    valores = []
    for fecha, especies in data_ins.items():
        for especie, cantidad in especies.items():
            valores.append((fecha, especie, cantidad))
        
    sql_diccionario = "INSERT INTO camaras (sampling_date, insect_type, tracked) VALUES (%s, %s, %s)"
    cur.executemany(sql_diccionario, valores)
#
    # Crear un cursor para ejecutar las consultas
    sensors=update_sensors(int(str(unix_timestamp).split(".")[0]), int(str(now_timestamp).split(".")[0]))
    sql = "INSERT INTO sensores (sampling_date, measurement, measurement_type, measurement_value) VALUES (%s, %s, %s, %s)"

    # Ejecutar la consulta SQL con los valores de la lista de listas
    
    
    
    cur.executemany(sql, sensors)

    # Convertir el timestamp UNIX a datetime
    date_time = datetime.utcfromtimestamp(unix_timestamp)

    # Convertir datetime a formato ISO 8601
    iso_format_date = date_time.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

    # Convertir el timestamp UNIX a datetime
    date_time_ = datetime.utcfromtimestamp(now_timestamp)

# Convertir datetime a formato ISO 8601
    iso_format_date_ = date_time_.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    
    # Convertir ambos timestamps a datetime
    date_time = datetime.utcfromtimestamp(unix_timestamp)
    date_time_ = datetime.utcfromtimestamp(now_timestamp)

    # Extraer solo la fecha (año, mes, día)
    date_only = date_time.strftime('%Y-%m-%d')
    date_only_ = date_time_.strftime('%Y-%m-%d')

    # Comparar las fechas
    if date_only != date_only_:
        ria = RIA()
        estaciones = ria.obtener_datos_diarios_periodo_con_et0(41, 22,iso_format_date,iso_format_date_ )

        fechas_et0=[]
        et0_val=[]
        for e in estaciones:
            fechas_et0.append(e['fecha'])
            et0_val.append(e['et0'])
            
        
        et0=[]
        for v,f in zip(et0_val,fechas_et0):
            aux=[]
            aux.append(f)
            aux.append('ET0')
            aux.append('avg')
            aux.append(v)
            et0.append(aux)

    sql = "INSERT INTO sensores (sampling_date, measurement, measurement_type, measurement_value) VALUES (%s, %s, %s, %s)"
    cur.executemany(sql, et0)


    cur.execute("SELECT MAX(interval_to) FROM indices")
    result = cur.fetchone()
    min_date, max_date = result[0], datetime(datetime.now().year, datetime.now().month, datetime.now().day, 0, 0, 0)

    # Obtener todas las fechas excepto la más antigua y la más moderna
    cur.execute("SELECT interval_to FROM indices WHERE interval_to NOT IN (%s, %s)", (min_date, max_date))
    result = cur.fetchall()
    dates = [r[0] for r in result]

    mis=generate_dates(min_date,max_date,dates)
            
    for i in mis:
        fecha_anterior1 = i - timedelta(days=1)
        fecha_anterior2 = i - timedelta(days=2)
        fecha_anterior3 = i - timedelta(days=3)
        fecha_anterior4 = i - timedelta(days=4)
        cur.execute("SELECT sampling_date FROM sensores")
        result = cur.fetchall()

        
        ndvi_max=random.uniform(-0.5, 0.5)
        ndvi_min=random.uniform(-0.5, 0.5)
        ndvi_mean=random.uniform(-0.5, 0.5)
        ndwi_max=random.uniform(-0.5, 0.5)
        ndwi_min=random.uniform(-0.5, 0.5)
        ndwi_mean=random.uniform(-0.5, 0.5)
        ndsi_max=random.uniform(-0.5, 0.5)
        ndsi_min=random.uniform(-0.5, 0.5)
        ndsi_mean=random.uniform(-0.5, 0.5)
        nbri_max=random.uniform(-0.5, 0.5)
        nbri_min=random.uniform(-0.5, 0.5)
        nbri_mean=random.uniform(-0.5, 0.5)
        savi_max=random.uniform(-0.5, 0.5)
        savi_min=random.uniform(-0.5, 0.5)
        savi_mean=random.uniform(-0.5, 0.5)
        cmr_max=random.uniform(-0.5, 0.5)
        cmr_min=random.uniform(-0.5, 0.5)
        cmr_mean=random.uniform(-0.5, 0.5)
        sql = 'INSERT INTO indices (interval_to, "ndvi_B0_max", "ndvi_B0_min", "ndvi_B0_mean", "ndwi_B0_max", "ndwi_B0_min", "ndwi_B0_mean", "ndsi_B0_max", "ndsi_B0_min", "ndsi_B0_mean", "nbri_B0_max", "nbri_B0_min", "nbri_B0_mean", "savi_B0_max", "savi_B0_min", "savi_B0_mean", "cmr_B0_max", "cmr_B0_min", "cmr_B0_mean") VALUES (%s, %s, %s, %s,%s, %s, %s, %s,%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'

        cur.execute(sql, (i,ndvi_max,ndvi_min,ndvi_mean, ndwi_max,ndwi_min,ndwi_mean, ndsi_max,ndsi_min,ndsi_mean, nbri_max,nbri_min,nbri_mean, savi_max,savi_min,savi_mean,cmr_max,cmr_min,cmr_mean))

    sql = "INSERT INTO metadata (extraction_date, author) VALUES (%s, %s)"
    datetime.fromtimestamp(now_timestamp)
    metadata=[(datetime.fromtimestamp(now_timestamp)).strftime("%Y-%m-%d %H:%M:%S"), "EvenorTech"]
    # Ejecutar la consulta SQL con los valores de la lista
    cur.execute(sql, (metadata[0],metadata[1]))
    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    apiURI = 'https://api.fieldclimate.com/v2'
    publicKey = '7b831b6ed349787c3f0e69bb63206abd74bedf3aeea5cf41'
    privateKey = '7266006455f0f4ef0cd9a160e6f02e74c5fcc0590c4fe7e1'
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="Evenor2510Tech")
    cur = conn.cursor()   

    cur.execute("SELECT extraction_date FROM metadata ORDER BY extraction_date DESC LIMIT 1")
    extraction_date = cur.fetchone()[0]
    unix_timestamp = int(time.mktime(datetime.strptime(str(extraction_date), '%Y-%m-%d %H:%M:%S').timetuple()))
    
    
    # Convertir la fecha actual a timestamp UNIX
    now_timestamp = int(time.mktime(datetime.now().timetuple()))


#    print(unix_timestamp)
#    print(now_timestamp)
    data_ins = {}
    endpoint = '/camera/072104B6/photos/from/'+str(unix_timestamp)+'/to/'+str(now_timestamp)
    method = 'GET'
    auth = AuthHmacMetos(endpoint, publicKey, privateKey, method)
    response = requests.get(apiURI+endpoint, headers={'Accept': 'application/json'}, auth=auth)
    json_object = response.json()
    json_formatted = json.dumps(json_object, indent=2)
    data = json.loads(json_formatted)
    for d in data:         
        insectos={}
        if('rectangles' in d):
            for pic in d["rectangles"]:
                especie = pic["label"]
                if especie in insectos:
                    insectos[especie] += 1
                else:
                    insectos[especie] = 1
            fecha = d["time"][:10]
            if fecha in data_ins:
                for especie, conteo in insectos.items():
                    if especie in data_ins[fecha]:
                        data_ins[fecha][especie] += conteo
                    else:
                        data_ins[fecha][especie] = conteo
            else:
                data_ins[fecha] = insectos

    valores = []
    for fecha, especies in data_ins.items():
        for especie, cantidad in especies.items():
            valores.append((fecha, especie, cantidad))
        
    sql_diccionario = "INSERT INTO camaras (sampling_date, insect_type, tracked) VALUES (%s, %s, %s)"
    cur.executemany(sql_diccionario, valores)
#
    # Crear un cursor para ejecutar las consultas
    sensors=update_sensors(int(str(unix_timestamp).split(".")[0]), int(str(now_timestamp).split(".")[0]))
    sql = "INSERT INTO sensores (sampling_date, measurement, measurement_type, measurement_value) VALUES (%s, %s, %s, %s)"

    # Ejecutar la consulta SQL con los valores de la lista de listas
    
    
    
    cur.executemany(sql, sensors)

    # Convertir el timestamp UNIX a datetime
    date_time = datetime.utcfromtimestamp(unix_timestamp)

    # Convertir datetime a formato ISO 8601
    iso_format_date = date_time.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

    # Convertir el timestamp UNIX a datetime
    date_time_ = datetime.utcfromtimestamp(now_timestamp)

# Convertir datetime a formato ISO 8601
    iso_format_date_ = date_time_.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    
    date_time = datetime.utcfromtimestamp(unix_timestamp)
    date_time_ = datetime.utcfromtimestamp(now_timestamp)

    # Extraer solo la fecha (año, mes, día)
    date_only = date_time.strftime('%Y-%m-%d')
    date_only_ = date_time_.strftime('%Y-%m-%d')
    
    print(date_only)
    print(date_only_)
    if date_only != date_only_:
        ria = RIA()
        estaciones = ria.obtener_datos_diarios_periodo_con_et0(41, 22,iso_format_date,iso_format_date_ )

        fechas_et0=[]
        et0_val=[]
        for e in estaciones:
            fechas_et0.append(e['fecha'])
            et0_val.append(e['et0'])
            
        
        et0=[]
        for v,f in zip(et0_val,fechas_et0):
            aux=[]
            aux.append(f)
            aux.append('ET0')
            aux.append('avg')
            aux.append(v)
            et0.append(aux)

    sql = "INSERT INTO sensores (sampling_date, measurement, measurement_type, measurement_value) VALUES (%s, %s, %s, %s)"
    cur.executemany(sql, et0)


    cur.execute("SELECT MAX(interval_to) FROM indices")
    result = cur.fetchone()
    min_date, max_date = result[0], datetime(datetime.now().year, datetime.now().month, datetime.now().day, 0, 0, 0)

    # Obtener todas las fechas excepto la más antigua y la más moderna
    cur.execute("SELECT interval_to FROM indices WHERE interval_to NOT IN (%s, %s)", (min_date, max_date))
    result = cur.fetchall()
    dates = [r[0] for r in result]

    mis=generate_dates(min_date,max_date,dates)
            
    for i in mis:
        fecha_anterior1 = i - timedelta(days=1)
        fecha_anterior2 = i - timedelta(days=2)
        fecha_anterior3 = i - timedelta(days=3)
        fecha_anterior4 = i - timedelta(days=4)
        cur.execute("SELECT sampling_date FROM sensores")
        result = cur.fetchall()

        
        ndvi_max=random.uniform(-0.5, 0.5)
        ndvi_min=random.uniform(-0.5, 0.5)
        ndvi_mean=random.uniform(-0.5, 0.5)
        ndwi_max=random.uniform(-0.5, 0.5)
        ndwi_min=random.uniform(-0.5, 0.5)
        ndwi_mean=random.uniform(-0.5, 0.5)
        ndsi_max=random.uniform(-0.5, 0.5)
        ndsi_min=random.uniform(-0.5, 0.5)
        ndsi_mean=random.uniform(-0.5, 0.5)
        nbri_max=random.uniform(-0.5, 0.5)
        nbri_min=random.uniform(-0.5, 0.5)
        nbri_mean=random.uniform(-0.5, 0.5)
        savi_max=random.uniform(-0.5, 0.5)
        savi_min=random.uniform(-0.5, 0.5)
        savi_mean=random.uniform(-0.5, 0.5)
        cmr_max=random.uniform(-0.5, 0.5)
        cmr_min=random.uniform(-0.5, 0.5)
        cmr_mean=random.uniform(-0.5, 0.5)
        sql = 'INSERT INTO indices (interval_to, "ndvi_B0_max", "ndvi_B0_min", "ndvi_B0_mean", "ndwi_B0_max", "ndwi_B0_min", "ndwi_B0_mean", "ndsi_B0_max", "ndsi_B0_min", "ndsi_B0_mean", "nbri_B0_max", "nbri_B0_min", "nbri_B0_mean", "savi_B0_max", "savi_B0_min", "savi_B0_mean", "cmr_B0_max", "cmr_B0_min", "cmr_B0_mean") VALUES (%s, %s, %s, %s,%s, %s, %s, %s,%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'

        cur.execute(sql, (i,ndvi_max,ndvi_min,ndvi_mean, ndwi_max,ndwi_min,ndwi_mean, ndsi_max,ndsi_min,ndsi_mean, nbri_max,nbri_min,nbri_mean, savi_max,savi_min,savi_mean,cmr_max,cmr_min,cmr_mean))

    sql = "INSERT INTO metadata (extraction_date, author) VALUES (%s, %s)"
    datetime.fromtimestamp(now_timestamp)
    metadata=[(datetime.fromtimestamp(now_timestamp)).strftime("%Y-%m-%d %H:%M:%S"), "EvenorTech"]
    # Ejecutar la consulta SQL con los valores de la lista
    cur.execute(sql, (metadata[0],metadata[1]))
    conn.commit()
    cur.close()
    conn.close()
