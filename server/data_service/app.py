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
import numpy as np
from sqlalchemy import create_engine

from requests.auth import AuthBase
from Crypto.Hash import HMAC
from Crypto.Hash import SHA256
from datetime import datetime

apiURI = 'https://api.fieldclimate.com/v2'
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


# Separar las características y la variable objetivo



def fetch_data_for_sensor(sensor_id, start_date, end_date):
    # Esta función hace la llamada a la API para un intervalo dado
    api_route = f'/data/{sensor_id}/raw/from/{str(start_date)}/to/{str(end_date)}'
    method = "GET"
    auth = AuthHmacMetos(api_route, publicKey, privateKey, method)
    response = requests.get(apiURI + api_route, headers={'Accept': 'application/json'}, auth=auth)
    if response.status_code == 200:
        return response.json()
    else:
        print(response.json())
        return None
    
def update_sensors(start_timestamp, end_timestamp):

        sensores=["0020DEFA", "0020DAF1"]
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
        conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
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
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
    cur = conn.cursor()  
    data = request.get_json()
    category = data.get('category')
    data_types = data.get('dataTypes')  # List of data types
    start_date = data.get('startDate')
    end_date = data.get('endDate')

    try:
        if category.lower() == 'sensors':
            query = """
            SELECT sampling_date, measurement_value, measurement 
            FROM sensores 
            WHERE measurement = ANY(%s) AND sampling_date BETWEEN %s AND %s
            """
            cur.execute(query, (data_types, start_date, end_date))
        elif category.lower() == 'cameras':
            query = """
            SELECT sampling_date, tracked, insect_type 
            FROM camaras 
            WHERE insect_type = ANY(%s) AND sampling_date BETWEEN %s AND %s
            """
            cur.execute(query, (data_types, start_date, end_date))

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

    
@app.route('/precipitaciones', methods=['GET'])
def precipitaciones():
    try:
        conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
        cur = conn.cursor()  
        query = "SELECT sampling_date, measurement_value FROM sensores WHERE measurement='Precipitation'"

        df_p = pd.read_sql(query, conn)
        
        df_json_str = df_p.to_json(orient='records')
        df_json = json.loads(df_json_str)
           
        return jsonify({"success": True, "output": df_json}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({"success": False, "error": e.output.decode("utf-8")}), 500
    
    
@app.route('/illness_model', methods=['POST'])
def illness_model():
    try:
        # Leer los datos del cuerpo de la solicitud
        data = request.get_json()
        selected_illnesses = data.get('illnesses', [])
        start_date = data.get('startDate', '2024-01-01')
        end_date = data.get('endDate', '2024-12-31')

        # Validar entrada
        if not selected_illnesses:
            return jsonify({"error": "No illnesses selected"}), 400

        # Configuración de la conexión a la base de datos
        conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")

        # Mapeo de enfermedades y columnas
        illness_mapping = {
            "Tizón": {"table": "tizon", "columns": ["sampling_date", "tizon_esporulacion_prc", "tizon_infeccion_prc"]},
            "Blossom": {"table": "blossom", "columns": ["sampling_date", "blossom_infeccion_leve_prc", "blossom_infeccion_moderada_prc", "blossom_infeccion_severa_prc"]},
            "FRLF": {"table": "frlf", "columns": ["sampling_date", "frlf_infeccion_leve_prc", "frlf_infeccion_moderada_prc", "frlf_infeccion_severa_prc"]},
            "Gnomonia": {"table": "gnomonia", "columns": ["sampling_date", "gnominia_descarga_de_ascos_prc", "gnominia_infeccion_prc"]},
            "Mancha Foliar": {"table": "mancha_foliar", "columns": ["sampling_date", "mancha_foliar_gravedad_dsv"]},
            "Monilia": {"table": "monilia", "columns": ["sampling_date", "monilia_infeccion_1_prc", "monilia_infeccion_2_prc"]},
            "Perdigonado": {"table": "perdigonado", "columns": ["sampling_date", "perdigonado_infeccion_leve_prc", "perdigonado_infeccion_moderada_prc", "perdigonado_infeccion_severa_prc"]},
            "Roya": {"table": "roya", "columns": ["sampling_date", "infeccion_de_roya_prc"]},
            "Tramos Fríos": {"table": "tramos_frios", "columns": ["sampling_date", "tramos_frios"]}
        }

        results = []

        # Iterar sobre las enfermedades seleccionadas
        for illness in selected_illnesses:
            if illness in illness_mapping:
                table = illness_mapping[illness]["table"]
                columns = illness_mapping[illness]["columns"]

                # Construir y ejecutar la consulta SQL
                query = f"""
                    SELECT {', '.join(columns)}
                    FROM {table}
                    WHERE sampling_date BETWEEN %s AND %s
                """
                df = pd.read_sql(query, conn, params=(start_date, end_date))
                if not df.empty:
                    df['illness_name'] = illness  # Agregar nombre de la enfermedad
                    results.append(df)

        # Combinar los resultados en un formato JSON sin mezclar variables de diferentes enfermedades
        output = []
        for result in results:
            output.append(result.to_dict(orient='records'))

        # Cerrar la conexión
        conn.close()

        return jsonify({"success": True, "data": output}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500



@app.route('/available_illnesses', methods=['GET'])
def available_illnesses():
    try:
        # Conexión a la base de datos
        conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
        cur = conn.cursor()

        # Lista de tablas y nombres de enfermedades
        illnesses = [
            {"table": "tizon", "name": "Tizón"},
            {"table": "blossom", "name": "Blossom"},
            {"table": "frlf", "name": "FRLF"},
            {"table": "gnomonia", "name": "Gnomonia"},
            {"table": "mancha_foliar", "name": "Mancha Foliar"},
            {"table": "monilia", "name": "Monilia"},
            {"table": "perdigonado", "name": "Perdigonado"},
            {"table": "roya", "name": "Roya"},
            {"table": "tramos_frios", "name": "Tramos Fríos"}
        ]

        # Validar la existencia de las tablas en la base de datos
        valid_illnesses = []
        for illness in illnesses:
            cur.execute(f"SELECT to_regclass('{illness['table']}')")
            if cur.fetchone()[0] is not None:  # Si la tabla existe
                valid_illnesses.append(illness['name'])

        # Cerrar conexión
        cur.close()
        conn.close()

        # Responder con la lista de enfermedades disponibles
        return jsonify({"illnesses": valid_illnesses}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/temperatura', methods=['GET'])
def temperatura():
    try:
        conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
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
    conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
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

from flask import request, jsonify
import pandas as pd
import io

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files or 'table' not in request.form:
        return jsonify({"error": "No file or table name provided"}), 400

    file = request.files['file']
    table_name = request.form['table']

    try:
        # Leer el archivo dependiendo de su extensión
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file, sep=";")
        elif file.filename.endswith('.xlsx'):
            df = pd.read_excel(file)
        else:
            return jsonify({"error": "Unsupported file format"}), 400

        # Usar SQLAlchemy para la conexión a PostgreSQL
        engine = create_engine('postgresql://postgres:postgres@localhost:5432/tepro')
        
        # Validar que las columnas del archivo coincidan con las de la tabla seleccionada
        conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
        cur = conn.cursor()
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'")
        columns = [row[0] for row in cur.fetchall()]
        if not all(item in df.columns for item in columns):
            return jsonify({"error": "File columns do not match table columns"}), 400

        # Insertar los datos en la base de datos
        df.to_sql(name=table_name, con=engine, if_exists='append', index=False)
        return jsonify({"success": "Data uploaded successfully"}), 200
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500
      
@app.route('/api/tables', methods=['GET'])
def list_tables():
    try:
        conn = psycopg2.connect(dbname="tepro", user="postgres", password="postgres")
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        tables = cur.fetchall()
        return jsonify([table[0] for table in tables]), 200
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


    
 #HC Air temperature   
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003)