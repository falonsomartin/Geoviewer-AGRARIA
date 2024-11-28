# Usar una imagen base de Python
FROM python:3.10.11

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar los archivos de requisitos y instalar las dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto de los archivos de la aplicación
COPY . /app

# Exponer el puerto en el que se ejecutará el servicio
EXPOSE 5002

# Comando para ejecutar la aplicación
CMD ["flask", "run", "--host=0.0.0.0", "--port=5002"]