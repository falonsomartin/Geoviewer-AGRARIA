import random
from flask import Flask, jsonify, request, make_response
import subprocess
from flask_cors import CORS  # Importa CORS
import pandas as pd
import psycopg2
import json
from datetime import datetime, timedelta
import requests
from ria import RIA
import time

from requests.auth import AuthBase
from Crypto.Hash import HMAC
from Crypto.Hash import SHA256
from datetime import datetime

apiURI = 'https://apidev.fieldclimate.com/v2'
# HMAC Authentication credentials
publicKey = '7b831b6ed349787c3f0e69bb63206abd74bedf3aeea5cf41'
privateKey = '7266006455f0f4ef0cd9a160e6f02e74c5fcc0590c4fe7e1'

class AuthHmacMetos(AuthBase):
    # Creates HMAC authorization header for Metos REST service GET request.
    def __init__(self, apiRoute, publicKey, privateKey, method):
        self._publicKey = publicKey
        self._privateKey = privateKey
        self._method = method
        self._apiRoute = apiRoute

    def __call__(self, request):
        dateStamp = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S GMT')
        request.headers['Request-Date'] = dateStamp
        msg = (self._method + self._apiRoute + dateStamp + self._publicKey).encode(encoding='utf-8')
        h = HMAC.new(self._privateKey.encode(encoding='utf-8'), msg, SHA256)
        signature = h.hexdigest()
        request.headers['Authorization'] = 'hmac ' + self._publicKey + ':' + signature
        return request

app = Flask(__name__)
CORS(app) 

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

@app.route('/run-script', methods=['POST'])
def run_script():
    try:
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
        return jsonify({"success": True, "output": ""}), 200
    except subprocess.CalledProcessError as e:
        print(e)
        return jsonify({"success": False, "error": e.output.decode("utf-8")}), 500

@app.route('/data', methods=['POST'])
def handle_data_request():
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="Evenor2510Tech")
    cur = conn.cursor()  
    # Extraemos los datos enviados por el cliente
    data = request.get_json()
    category = data.get('category')
    data_type = data.get('dataType')
    start_date = data.get('startDate')
    end_date = data.get('endDate')

    try:
        # Elegir la consulta adecuada basada en el tipo de equipo
        if category.lower() == 'cameras':
            query = """
            SELECT sampling_date, tracked 
            FROM camaras 
            WHERE insect_type = %s AND sampling_date BETWEEN %s AND %s
            """
            cur.execute(query, (data_type, start_date, end_date))
        elif category.lower() == 'sensors':
            query = """
            SELECT sampling_date, measurement_value 
            FROM sensores 
            WHERE measurement = %s AND sampling_date BETWEEN %s AND %s
            """
            cur.execute(query, (data_type, start_date, end_date))

        # Convertimos los resultados en un DataFrame de pandas y luego a JSON
        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]
        df = pd.DataFrame(rows, columns=columns)
        result = df.to_json(orient='records')
        
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@app.route('/camaras', methods=['GET'])
def camaras():
    try:
        conn = psycopg2.connect(dbname="tepro", user="postgres", password="Evenor2510Tech")
        cur = conn.cursor()  
        query = "SELECT sampling_date, insect_type, tracked FROM camaras"
        df_c = pd.read_sql(query, conn)

        df_c_pivot = df_c.pivot_table(index='sampling_date', columns='insect_type', values='tracked', aggfunc='sum').reset_index()

        df_json_str = df_c_pivot.to_json(orient='records')
        df_json = json.loads(df_json_str)
           
        return jsonify({"success": True, "output": df_json}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"success": False, "error": e.output.decode("utf-8")}), 500
    
@app.route('/precipitaciones', methods=['GET'])
def precipitaciones():
    try:
        conn = psycopg2.connect(dbname="tepro", user="postgres", password="Evenor2510Tech")
        cur = conn.cursor()  
        query = "SELECT sampling_date, measurement_value FROM sensores WHERE measurement='Precipitation'"

        df_p = pd.read_sql(query, conn)
        
        df_json_str = df_p.to_json(orient='records')
        df_json = json.loads(df_json_str)
           
        return jsonify({"success": True, "output": df_json}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"success": False, "error": e.output.decode("utf-8")}), 500
    

@app.route('/temperatura', methods=['GET'])
def temperatura():
    try:
        conn = psycopg2.connect(dbname="tepro", user="postgres", password="Evenor2510Tech")
        cur = conn.cursor()  
        query = "SELECT sampling_date, measurement_value FROM sensores WHERE measurement='HC Air temperature'"

        df_p = pd.read_sql(query, conn)
        
        df_json_str = df_p.to_json(orient='records')
        df_json = json.loads(df_json_str)
           
        return jsonify({"success": True, "output": df_json}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"success": False, "error": e.output.decode("utf-8")}), 500
    
@app.route('/dataTypes/<equipment_type>', methods=['GET'])
def get_data_types(equipment_type):
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="Evenor2510Tech")
    cur = conn.cursor()
    if equipment_type.lower() == 'cameras':
        query = "SELECT DISTINCT insect_type FROM camaras"
    elif equipment_type.lower() == 'sensors':
        query = "SELECT DISTINCT measurement FROM sensores"
    else:
        return jsonify({"error": "Invalid equipment type"}), 400

    try:
        cur.execute(query)
        data_types = cur.fetchall()
        return jsonify([item[0] for item in data_types]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
        
@app.route('/watsat', methods=['GET'])
def watsat():
    try:
        conn = psycopg2.connect(dbname="tepro", user="postgres", password="Evenor2510Tech")
        cur = conn.cursor()   
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
        print(df_sum_precip)
        
        
        # Convertir la columna 'fecha' a tipo datetime si no lo es
        df_sum_precip['fecha'] = pd.to_datetime(df_sum_precip['fecha'])

        # Crear un DataFrame con todas las fechas en el rango
        rango_fechas = pd.date_range(start=fecha_inicio, end=fecha_fin, freq='D')
        df_fechas = pd.DataFrame(rango_fechas, columns=['fecha'])

        # Combinar el DataFrame de fechas con los datos de precipitación
        df_completo = df_fechas.merge(df_sum_precip, on='fecha', how='left')

        # Llenar los valores nulos de precipitación con 0.0
        df_completo['precipitacion_diaria'].fillna(0.0, inplace=True)
        # Crear la columna con el sumatorio acumulado
        df_completo['precipitacion_acumulada'] = df_completo['precipitacion_diaria'].cumsum()
        print(df_completo)

        query = '''
        SELECT interval_to, "ndvi_B0_max", "ndvi_B0_min", "ndvi_B0_mean" 
        FROM indices where interval_to >= '{}' and interval_to <= '{}' order by interval_to'''.format(fecha_inicio, fecha_fin)
        cur.execute(query)
        data = cur.fetchall()
        df_indices = pd.DataFrame(data, columns=['interval_to', 'ndvi_B0_max', 'ndvi_B0_min', 'ndvi_B0_mean'])
        print(df_indices)

        # Calcula la columna que quieres añadir al DataFrame
        df_indices['ndvi_formula'] = (df_indices['ndvi_B0_mean'] - df_indices['ndvi_B0_min']) / (df_indices['ndvi_B0_max'] - df_indices['ndvi_B0_min'])
        print(df_indices)

        query = '''SELECT sampling_date, measurement_value FROM sensores WHERE measurement LIKE 'ET0' order by sampling_date'''
        cur.execute(query)
        data = cur.fetchall()
        fechas=[]
        et0=[]
        for i in data:
            fechas.append(i[0].strftime("%Y-%m-%d %H:%M:%S"))        
            et0.append(round(float(i[1]),1))        

        df_et0 = pd.DataFrame({'fecha': fechas, 'et0': et0})
        print(df_et0)
        df_indices = df_indices.fillna(0)

        kc_veg = 0.5  # Coeficiente de cultivo para vegetación
        kc_soil = 0.2  # Coeficiente de cultivo para suelo

        # Calcular Cws (factor de estrés hídrico)
        df_et0['fecha'] = pd.to_datetime(df_et0['fecha'])  # Convertir la columna 'fecha' a tipo datetime

        df_et0 = df_et0.loc[df_et0['fecha'] >= df_completo['fecha'].min()]  # Filtrar fechas posteriores al inicio de las precipitaciones
        
        df_et0 = df_et0[df_et0['fecha'].between(df_completo['fecha'].min(), df_completo['fecha'].max())]

        # Fusionar df_et0 con df_completo; esto garantiza que todas las fechas en df_completo estén presentes
        # Usamos 'outer' para asegurar que no perdemos fechas de df_completo
        df_et0_completo = df_completo[['fecha']].merge(df_et0, on='fecha', how='outer')

        # Llenar los valores faltantes de la columna de mediciones (aquí suponemos que se llama 'et0') con 0.0
        df_et0_completo['et0'].fillna(0.0, inplace=True)
        print(df_et0_completo)
        aa = [
            (elemento1 / elemento2 if elemento2 != 0 else 0)
            for elemento1, elemento2 in zip(df_completo['precipitacion_acumulada'].tolist(), df_et0_completo['et0'].tolist())
        ]
        print(aa)
        df_completo['aw'] = aa  # Calcular AW y limitar su rango a [0, 1]
        df_completo['aw'] = (df_completo['aw']).clip(0,1)
        df_completo['cws'] = 0.5 + 0.5 * df_completo['aw']  # Calcular Cws
        df_indices['fecha'] = pd.to_datetime(df_indices['interval_to']).dt.date
        df_indices = df_indices.loc[pd.to_datetime(df_indices['fecha']) >= pd.to_datetime(df_completo['fecha'].min())]  # Filtrar fechas posteriores al inicio de las precipitaciones
        # Convertir la columna 'fecha' de df_et0 a tipo date
        df_et0_completo['fecha'] = df_et0_completo['fecha'].dt.date
        # Seleccionar sólo las fechas que están en df_indices
        df_et0_completo = df_et0_completo.loc[df_et0_completo['fecha'] <= df_indices['fecha'].max()]
        del df_indices["fecha"]
        df_indices.rename(columns={'interval_to':'fecha'},inplace=True)
        df_merged = pd.merge(df_completo, df_indices, on='fecha')
        
        tr_aaa=[et0 * kc_veg * kc_soil * cws for et0, cws in zip(df_et0_completo['et0'].tolist(), df_merged['cws'].tolist())]
        df_merged['tr_a'] = tr_aaa
        
        ev_aaa=[et0 * (1 - kc_veg) * kc_soil * aw for et0, aw in zip(df_et0_completo['et0'].tolist(), df_merged['aw'].tolist())]
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
        print(df_merged)          
        df_json_str = df_merged.to_json(orient='records')
        df_json = json.loads(df_json_str)
            
        return jsonify({"success": True, "output": df_json}), 200
    except subprocess.CalledProcessError as e:
        print(e)
        return jsonify({"success": False, "error": e.output.decode("utf-8")}), 500

    
 #HC Air temperature   
if __name__ == '__main__':
    app.run(port=5003)