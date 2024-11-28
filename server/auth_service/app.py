from flask import Flask, jsonify, request
from flask_cors import CORS  # Importa CORS
from flask_jwt_extended import JWTManager, create_access_token
app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'super-secret'  # Cambia esto por una clave secreta real
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # CSRF protection

jwt = JWTManager(app)

CORS(app, supports_credentials=True, origins=["http://localhost:3000"])    

@app.route('/', methods=['GET'])
def index():
    return ""

@app.route('/login', methods=['POST'])
def login():
    username = request.json.get('username', None)
    password = request.json.get('password', None)
    # Aquí conectarías a la base de datos y verificarías el usuario y contraseña
    if username == "admin" and password == "password":  # Simplificación
        access_token = create_access_token(identity=username)
        return jsonify(access_token=access_token), 200
    return jsonify({"msg": "Credenciales incorrectas"}), 401

if __name__ == '__main__':
    app.run(port=5001)