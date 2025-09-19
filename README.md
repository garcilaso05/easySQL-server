# easySQL-server
Nueva versión de prueba de easySQL para poder gestionar tus bases de datos en un servidor web de manera simple.

## Idea de la "llave" (.easySQL)
La aplicación utiliza un sistema de "llave" basado en un archivo `.easySQL` que contiene información sensible y de configuración:
- Datos de la empresa o usuario
- Credenciales de acceso a la base de datos Supabase
- Claves de API externas (por ejemplo, Gemini)

Este archivo está comprimido (usando **JSZip**) y encriptado (usando **CryptoJS AES**) y solo puede ser desbloqueado con una clave maestra robusta. Así, aunque alguien obtuviera el archivo, no podría acceder a la información sin la clave.

## Tecnologías utilizadas
- **JSZip**: Para comprimir y descomprimir los archivos de configuración y credenciales.
- **CryptoJS**: Para cifrar y descifrar el archivo .easySQL con una clave maestra.
- **Supabase**: Plataforma backend (PostgreSQL + API REST + Auth) para gestionar la base de datos, autenticación y funciones RPC seguras.
- **HTML/JS modular**: Cada menú y funcionalidad está implementado como un módulo independiente, facilitando el mantenimiento y la escalabilidad.

## Seguridad y control de acceso en Supabase
- Se crea automáticamente una tabla `profiles` que almacena los usuarios y su rol (1=viewer, 2=editor, 3=admin).
- Al desencriptar el archivo .easySQL, el usuario debe autenticarse con email y contraseña (no basta con tener el archivo y la clave maestra).
- Todas las operaciones posteriores se realizan usando el token JWT del usuario autenticado, que se envía automáticamente en cada petición a Supabase.
- Los roles determinan los permisos:
  - **1 (viewer):** Solo lectura
  - **2 (editor):** Lectura, inserción y actualización
  - **3 (admin):** Todos los permisos, incluyendo borrado y creación de tablas/enumerados
- Las funciones RPC controlan la creación de tablas, enumerados y el acceso a metadatos (nombres de tablas, campos, enumerados, etc.), validando el rol del usuario.
- Cada vez que se crea una tabla, se aplican automáticamente políticas RLS (Row Level Security) que restringen la lectura y escritura según el rol del usuario.
- Se han añadido controles y sanitización de identificadores para evitar SQL injection en todas las operaciones dinámicas.

## Modularidad y arquitectura
- La aplicación está dividida en módulos HTML/JS independientes para cada menú y funcionalidad (crear tabla, inserciones, enumerados, etc.).
- Los módulos se cargan dinámicamente según la navegación, mejorando la experiencia de usuario y la mantenibilidad del código.

## Despliegue y configuración

### Desarrollo local
Debido a la modularidad (los módulos HTML/JS se cargan dinámicamente) y al uso de CDN externos para dependencias, si abres el archivo `index.html` directamente en tu navegador (file://), verás errores CORS y los módulos no se cargarán.

#### Opción 1: Servidor Python simple (recomendado para desarrollo)
```bash
python3 -m http.server 8000
```
Luego abre tu navegador en [http://localhost:8000](http://localhost:8000)

#### Opción 2: Servidor con headers CORS personalizados
Si necesitas control total sobre los headers CORS para permitir módulos externos, crea un archivo `server.py`:

```python
#!/usr/bin/env python3
import http.server
import socketserver
from urllib.parse import urlparse

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

PORT = 8000
with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"Servidor corriendo en http://localhost:{PORT}")
    httpd.serve_forever()
```

Ejecutar con: `python3 server.py`

#### Opción 3: Usar un navegador con políticas relajadas (solo para desarrollo)
```bash
# Chrome/Chromium (Linux/Mac)
google-chrome --disable-web-security --user-data-dir=/tmp/chrome-dev --allow-running-insecure-content

# Firefox con about:config
# security.fileuri.strict_origin_policy = false
```

**⚠️ Nota importante:** Las opciones 2 y 3 son solo para desarrollo. En producción, todos los recursos deben servirse desde el mismo dominio o configurar CORS apropiadamente en el servidor.

### Producción en servidor web

#### GitHub Pages / Servidor estático
La aplicación está optimizada para funcionar en GitHub Pages y otros servidores estáticos. En estos entornos:

1. **Los archivos .easySQL no se pueden desencriptar automáticamente** debido a limitaciones de CORS y políticas de seguridad.
2. **Solución:** Se proporciona un formulario manual donde introduces las credenciales directamente:
   - Supabase URL: `https://tu-proyecto.supabase.co`
   - API Key (anon): Tu clave pública de Supabase

#### Servidor Apache/Nginx
Si tienes control sobre el servidor, puedes:

1. **Apache:** El archivo `.htaccess` incluido configura los headers CORS necesarios.
2. **Nginx:** Añade esta configuración:
```nginx
location / {
    add_header Cross-Origin-Embedder-Policy "credentialless";
    add_header Cross-Origin-Opener-Policy "same-origin";
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type, Authorization";
}
```

#### Heroku / Vercel / Netlify
Estas plataformas suelen tener limitaciones similares a GitHub Pages. Usa el formulario manual de credenciales.

### Limitaciones en servidores web estáticos
- **Sin desencriptación automática:** Debes introducir manualmente las credenciales de Supabase.
- **Sin validación de licencias Firebase:** La validación está deshabilitada por defecto.
- **Funcionalidad completa:** Todas las demás funciones (crear tablas, inserciones, relaciones) funcionan normalmente.

## Control y monitorización de licencias con Firebase

Para mejorar la seguridad y el control de uso, la aplicación utiliza un servidor en **Firebase Firestore** que gestiona las licencias de acceso:
- Cada vez que se crea una llave `.easySQL`, se registra en Firestore un documento con los datos públicos (anon, activo) y una subcolección privada con los datos sensibles y accesos.
- Antes de crear una nueva llave, el sistema comprueba que no exista ya una licencia con la misma API Key (anon), para evitar que usuarios que han sido bloqueados vuelvan a crear otra llave `.easySQL` para la misma base de datos.
- Al acceder a la app, se valida que la licencia esté activa en Firestore antes de permitir el acceso.
- Si es necesario, el administrador puede desactivar una licencia (campo `activo`), bloqueando el acceso a la app para ese usuario.
- Cada vez que un usuario accede, se registra un log de acceso en la subcolección privada, permitiendo monitorizar el uso de la app.
- Las reglas de Firestore están diseñadas para que solo los campos públicos sean accesibles y ningún dato sensible pueda ser leído desde el cliente, incluso aunque la API Key de Firebase esté expuesta.
- Este sistema permite también tener un backup seguro de las contraseñas y credenciales, y controlar cuántos usuarios utilizan la aplicación.

**Nota:** En servidores web estáticos, la validación de licencias está deshabilitada por defecto para evitar errores de CORS.

**Resumen del flujo:**
- Al crear una llave, se registra la licencia en Firestore y se almacena la información sensible de forma privada.
- Al acceder, se valida la licencia y se monitoriza el acceso, garantizando un control seguro y centralizado.
