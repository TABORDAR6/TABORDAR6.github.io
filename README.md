# Dashboard de Ventas y Rendimiento Comercial

Este proyecto es un dashboard interactivo y responsivo diseñado para visualizar métricas clave de ventas y rendimiento comercial. Permite a los usuarios monitorear ingresos, número de ventas, margen de beneficio, ticket promedio y tasa de conversión. Además, ofrece un análisis detallado de productos con funcionalidades de adición, edición, eliminación, importación/exportación CSV, filtrado, búsqueda y paginación, así como una sección para la distribución geográfica de ventas con drill-down por regiones y departamentos.

## Características

* **Dashboard de KPIs:** Muestra métricas clave con comparaciones de periodos anteriores.

* **Gráficos Interactivos:**

  * Tendencia de Ventas Mensuales (línea).

  * Ventas por Producto (barras, con drill-down a detalles del producto).

  * Distribución de Ventas por Región (dona, con drill-down a departamentos).

  * Ticket Promedio por Región (barras).

  * Ventas por Departamento/Ciudad (barras, dentro del drill-down de región).

  * Tendencia de Ventas de Producto (línea, en el modal de detalle de producto).

* **Gestión de Productos:**

  * Añadir nuevos productos con nombre, cantidad vendida, ingresos, costo por unidad y categoría.

  * Editar productos existentes.

  * Eliminar productos (individualmente, por página actual o todos).

  * Filtrado de productos por categoría.

  * Búsqueda de productos por nombre.

  * Paginación y ordenamiento de la tabla de productos.

  * Importación de datos de productos desde archivos CSV.

  * Exportación de datos de productos a archivos CSV (solo la página actual).

* **Detalle de Regiones:** Visualización de ventas y número de pedidos por departamento/ciudad con "mapas de calor" y gráficos de barras.

* **Persistencia de Datos:** Los datos de los productos se guardan en el `localStorage` del navegador.

* **Temas:** Alterna entre un tema claro y oscuro.

* **Auto-actualización de KPIs:** Opción para activar/desactivar la auto-actualización de las tarjetas KPI en el dashboard.

* **Diseño Responsivo:** Adaptado para una visualización óptima en diferentes tamaños de pantalla.

## Tecnologías Utilizadas

* **HTML5:** Estructura de la página.

* **CSS3 (Tailwind CSS):** Estilos y diseño responsivo.

* **JavaScript (Vanilla JS):** Lógica interactiva del dashboard, manejo de datos, gráficos y DOM.

* **Chart.js:** Biblioteca para la creación de gráficos interactivos.

## Estructura del Proyecto

```
.
├── index.html
├── style.css
└── script.js

```

* `index.html`: Contiene la estructura principal del dashboard, incluyendo la barra lateral, el encabezado, las secciones de contenido para el dashboard, productos y regiones, y los modales para detalles y edición de productos.

* `style.css`: Define los estilos CSS para la aplicación, incluyendo variables para temas claro/oscuro, estilos de componentes y clases para los "mapas de calor" de ventas y pedidos.

* `script.js`: Contiene toda la lógica JavaScript, incluyendo la generación de datos simulados, la renderización de gráficos y tablas, la gestión de productos (CRUD, filtrado, búsqueda, paginación, importación/exportación), el manejo de eventos, la persistencia de datos con `localStorage` y la alternancia de temas.

## Cómo Ejecutar el Proyecto Localmente

Para ejecutar este proyecto en tu máquina local, sigue estos pasos:

1. **Clona el repositorio:**

   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd dashboard-ventas
   
   ```

2. **Abre `index.html`:**
   Simplemente abre el archivo `index.html` en tu navegador web preferido. No se requiere un servidor local, ya que es una aplicación puramente de frontend.

## Uso

* **Navegación:** Utiliza la barra lateral izquierda para navegar entre las secciones "Dashboard", "Productos" y "Regiones".

* **Dashboard:**

  * Los KPIs se actualizan automáticamente cada 7 segundos (puedes alternar esta función con el botón "Auto-actualizar").

  * Puedes recargar manualmente los datos con el botón "Recargar Datos".

  * Cambia el tema entre claro y oscuro con el botón "Cambiar Tema".

  * Filtra los datos por rango de fechas (simulado).

* **Productos:**

  * **Añadir Producto:** Utiliza el formulario "Añadir Nuevo Producto" para ingresar los detalles y guardarlos.

  * **Editar/Eliminar:** Haz clic en los botones "Editar" o "Eliminar" en cada fila de la tabla de productos.

  * **Filtrar/Buscar:** Usa el selector de categoría y el campo de búsqueda para refinar la lista de productos.

  * **Paginación:** Navega por la tabla usando los botones "Anterior" y "Siguiente".

  * **Importar CSV:** Haz clic en "Importar CSV" para cargar productos desde un archivo CSV. El archivo debe tener encabezados como "Nombre", "Cantidad Vendida", "Ingresos Generados", "Costo por Unidad", "Categoría".

  * **Exportar CSV:** Haz clic en "Exportar CSV" para descargar los productos de la página actual en formato CSV.

  * **Borrar Tabla:** Elimina todos los productos almacenados.

  * **Borrar Página Actual:** Elimina solo los productos que se muestran en la página actual.

* **Regiones:**

  * El gráfico de dona muestra la distribución de ventas por región.

  * Haz clic en un segmento del gráfico para ver un detalle de ventas y pedidos por departamento/ciudad dentro de esa región.

  * Usa el botón "Volver a Regiones" para regresar a la vista principal de regiones.

## Contribuciones

Las contribuciones son bienvenidas. Si deseas mejorar este proyecto, por favor:

1. Haz un "fork" del repositorio.

2. Crea una nueva rama (`git checkout -b feature/nueva-caracteristica`).

3. Realiza tus cambios y haz "commit" (`git commit -am 'feat: Añadir nueva característica'`).

4. Sube tus cambios (`git push origin feature/nueva-caracteristica`).

5. Abre un "Pull Request".

## Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.
