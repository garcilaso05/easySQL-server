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

## Pruebas locales y CORS
Debido a la modularidad (los módulos HTML/JS se cargan dinámicamente), si abres el archivo `index.html` directamente en tu navegador (file://), verás un error CORS y los módulos no se cargarán. Para evitar esto, ejecuta en la raíz del proyecto:

```
python3 -m http.server 8000
```

Luego abre tu navegador en [http://localhost:8000](http://localhost:8000)
