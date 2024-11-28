from app import app  # Importamos la app desde app.py

if __name__ == "__main__":
    app.run()  # Esto no es estrictamente necesario para Gunicorn, pero lo usamos si queremos ejecutar el archivo directamente
