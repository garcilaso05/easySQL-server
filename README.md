# easySQL-server
Nueva versión de prueba de easySQL para poder gestionar tus bases de datos en un servidor web de manera simple.

## ¿Cómo funciona?
Este programa permite gestionar bases de datos en Supabase de forma visual y sencilla desde una interfaz web. La aplicación está dividida en módulos independientes (por ejemplo, crear tablas e insertar datos), que se cargan dinámicamente según la opción seleccionada en el menú. Solo necesitas introducir tus credenciales de Supabase y podrás crear tablas o insertar datos fácilmente.

## Pruebas locales y CORS
Debido a la modularidad (los módulos HTML/JS se cargan dinámicamente), si abres el archivo `index.html` directamente en tu navegador (file://), verás un error CORS y los módulos no se cargarán. Para evitar esto, ejecuta en la raíz del proyecto:

```
python3 -m http.server 8000
```

Luego abre tu navegador en [http://localhost:8000](http://localhost:8000)
