from flask import Flask, jsonify, request
import pandas as pd

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return ""

@app.route('/analyze', methods=['POST'])
def analyze_data():
    data = request.json
    # Procesamiento de los datos con Pandas
    df = pd.DataFrame(data)
    result = df.describe()  # Solo un ejemplo simple
    return jsonify(result.to_dict()), 200

if __name__ == '__main__':
    app.run(port=5003)