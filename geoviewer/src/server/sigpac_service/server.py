from flask import Flask, jsonify, request
from flask_cors import CORS  # Importa CORS
import requests

app = Flask(__name__)
CORS(app)    

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
    base_info_url = 'https://sigpac.mapama.gob.es/fega/ServiciosVisorSigpac/LayerInfo?layer=recinto'
    geojson_url = 'https://sigpac.mapama.gob.es/fega/ServiciosVisorSigpac/query/recintos/'

    # Obtener el ID para la URL de info y geojson
    id_info = format_cadastral_ref(ref)
    id_geojson = format_cadastral_ref(ref, delimiter='/')

    try:
        # Primera llamada para obtener información básica
        add=''
        if recinto_num:
            add += f",{recinto_num}"
        
        info_response = requests.get(f"{base_info_url}&id={id_info}"+add)
        info_response.raise_for_status()
        info_data = info_response.json()

        # Segunda llamada para obtener el geojson
        geojson_response = requests.get(f"{geojson_url}{id_geojson}.geojson")
        geojson_response.raise_for_status()
        geojson_data = geojson_response.json()

        # Combinar las respuestas en un solo objeto JSON
        result = {
            'parcelInfo': info_data,
            'geojson': geojson_data
        }
        return jsonify(result)
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

    
 #HC Air temperature   
if __name__ == '__main__':
    app.run(port=5005)