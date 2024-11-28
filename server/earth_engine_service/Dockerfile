# Usar una imagen base de Python
FROM python:3.10.11


# Instalar dependencias del sistema para Google Cloud SDK
RUN apt-get update && apt-get install -y curl gcc python3-dev apt-transport-https ca-certificates gnupg

# Descargar e instalar la Google Cloud SDK
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg  add -
RUN apt-get update && apt-get install -y google-cloud-sdk && apt-get install -y jq

# RUN apt-get update && apt-get install -y jq  # Install jq (if needed)  # Optional for JSON parsing

ENV EARTHENGINE_SERVICE_ACCOUNT_TYPE service_account
ENV GOOGLE_APPLICATION_CREDENTIALS ./application_default_credentials.json

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar los archivos de requisitos y instalar las dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto de los archivos de la aplicación
COPY . .

# Exponer el puerto en el que se ejecutará el servicio
EXPOSE 5004

# Comando para ejecutar la aplicación
CMD ["flask", "run", "--host=0.0.0.0", "--port=5004"]