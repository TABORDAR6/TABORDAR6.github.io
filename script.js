// script.js

// --- Declaración de instancias de gráficos para un control global ---
let monthlySalesChartInstance = null;
let productSalesChartInstance = null;
let regionDistributionChartInstance = null;
let modalProductSalesChartInstance = null;
let departmentSalesChartInstance = null; // Para el gráfico de detalle de departamento
let averageTicketByRegionChartInstance = null; // NUEVO: Instancia para el gráfico de ticket promedio por región
// REMOVIDO: let departmentTableBody = null; // Variable global para el cuerpo de la tabla de departamentos

// Variable global para almacenar los productos y usarlos en el drill-down y filtrado
let allProductsData = [];
let currentProductFilterCategory = 'all';
let currentProductSearchTerm = ''; // NUEVO: Variable para el término de búsqueda de productos

// Variables para paginación y ordenamiento de la tabla de productos
let currentPage = 1;
const rowsPerPage = 10; // Número de filas por página
let currentSortColumn = 'name'; // Columna de ordenamiento actual
let currentSortDirection = 'asc'; // Dirección de ordenamiento actual ('asc' o 'desc')
let currentPaginatedProducts = [];
// Variable global para almacenar todos los datos de regiones y departamentos
let allRegionData = {}; // Almacenará {regionName: {totalSales: X, departments: [{name: Y, sales: Z, numberOfOrders: N}]}}

// Variables para el auto-refresco de KPIs
let kpiRefreshInterval = null; // Para almacenar el ID del intervalo
const KPI_REFRESH_RATE = 7000; // 7 segundos (en milisegundos)
let kpiAutoRefreshEnabled = true; // NUEVO: Estado de la auto-actualización

// Variable para el estado de los breadcrumbs
let breadcrumbsState = [{ label: 'Dashboard', pageId: 'dashboard', section: 'main' }];
let currentActivePageId = 'dashboard';

// Variable global para almacenar el ID del producto que se está editando
let editingProductId = null;

// --- Categorías Predefinidas ---
// Categorías predefinidas para el formulario de añadir producto
const predefinedCategories = [
    "Granos y Cereales",
    "Lácteos y Huevos",
    "Carnes y Aves",
    "Frutas y Verduras",
    "Bebidas",
    "Abarrotes",
    "Limpieza del Hogar",
    "Cuidado Personal"
];

// --- 1. Utilidades y Generación de Datos Simulados ---

function getRandomNumber(min, max, decimals = 0) {
    const factor = Math.pow(10, decimals);
    return Math.round((Math.random() * (max - min) + min) * factor) / factor;
}

// Función auxiliar para simular una carga de datos
async function simulateDataLoad(minDelay = 300, maxDelay = 1000) {
    const delay = getRandomNumber(minDelay, maxDelay);
    return new Promise(resolve => setTimeout(resolve, delay));
}

// Determina si el tema oscuro está activo
function isDarkTheme() {
    return document.body.classList.contains('dark-theme');
}

// Obtiene los colores de Chart.js basados en el tema
function getChartColors() {
    if (isDarkTheme()) {
        return {
            fontColor: '#E2E8F0', // text-gray-200
            gridColor: 'rgba(255, 255, 255, 0.1)', // Líneas de cuadrícula sutiles
            borderColor: 'rgba(255, 255, 255, 0.2)', // Bordes de gráficos
            lineChartColor: 'rgb(130, 201, 169)', // Un verde más claro
            barChartColor: 'rgba(173, 130, 255, 0.6)', // Un morado más claro
            doughnutColors: ['#FF80A0', '#63B2F0', '#FFE080', '#7ED6D6', '#B080FF'] // Colores más vibrantes para oscuro
        };
    } else {
        return {
            fontColor: '#4A5568', // text-gray-700
            gridColor: 'rgba(0, 0, 0, 0.1)', // Líneas de cuadrícula sutiles
            borderColor: 'rgba(0, 0, 0, 0.2)', // Bordes de gráficos
            lineChartColor: 'rgb(75, 192, 192)',
            barChartColor: 'rgba(153, 102, 255, 0.6)',
            doughnutColors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
        };
    }
}

// MODIFICACIÓN: generateKPIData ahora calcula valores basados en allProductsData
function generateKPIData() {
    // Calcular Ingresos Totales sumando revenueGenerated de todos los productos
    const calculatedTotalRevenue = allProductsData.reduce((sum, product) => sum + product.revenueGenerated, 0);
    // Calcular Número de Ventas sumando quantitySold de todos los productos
    const calculatedNumberOfSales = allProductsData.reduce((sum, product) => sum + product.quantitySold, 0);
    // Calcular Costo Total sumando (quantitySold * costPerUnit) de todos los productos
    const calculatedTotalCost = allProductsData.reduce((sum, product) => sum + (product.quantitySold * product.costPerUnit), 0);

    // Calcular Ticket Promedio (manejar división por cero)
    const calculatedAverageTicket = calculatedNumberOfSales > 0
        ? calculatedTotalRevenue / calculatedNumberOfSales
        : 0;

    // Calcular Margen de Beneficio (manejar división por cero)
    const calculatedProfitMargin = calculatedTotalRevenue > 0
        ? ((calculatedTotalRevenue - calculatedTotalCost) / calculatedTotalRevenue) * 100
        : 0;

    // La Tasa de Conversión sigue siendo simulada, ya que no hay datos subyacentes de visitas/leads.
    const calculatedConversionRate = getRandomNumber(1.5, 4.5, 2);

    // Para la comparación con el "periodo anterior", simulamos una ligera variación de los valores actuales
    const previousTotalRevenue = calculatedTotalRevenue * getRandomNumber(0.9, 1.1, 2);
    const previousNumberOfSales = calculatedNumberOfSales * getRandomNumber(0.9, 1.1, 2);
    const previousProfitMargin = calculatedProfitMargin * getRandomNumber(0.9, 1.1, 2);
    const previousAverageTicket = calculatedAverageTicket * getRandomNumber(0.9, 1.1, 2);
    const previousConversionRate = calculatedConversionRate * getRandomNumber(0.9, 1.1, 2); // Ahora también derivada


    return {
        totalRevenue: {
            value: calculatedTotalRevenue, previous: previousTotalRevenue,
            label: "Ingresos Totales", format: (val) => `$${val.toLocaleString('es-CO')}`
        },
        numberOfSales: {
            value: calculatedNumberOfSales, previous: previousNumberOfSales,
            label: "Número de Ventas", format: (val) => val.toLocaleString('es-CO')
        },
        profitMargin: {
            value: calculatedProfitMargin, previous: previousProfitMargin,
            label: "Margen de Beneficio", format: (val) => `${val.toFixed(2)}%`
        },
        averageTicket: {
            value: calculatedAverageTicket, previous: previousAverageTicket,
            label: "Ticket Promedio", format: (val) => `$${val.toFixed(2)}`
        },
        conversionRate: {
            value: calculatedConversionRate, previous: previousConversionRate,
            label: "Tasa de Conversión", format: (val) => `${val.toFixed(2)}%`
        }
    };
}

// MODIFICACIÓN: generateMonthlySalesData ahora genera datos para el período actual y el anterior
function generateMonthlySalesData() {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentSales = [];
    const previousSales = [];
    let baseValueCurrent = getRandomNumber(8000, 10000);
    let baseValuePrevious = baseValueCurrent * getRandomNumber(0.8, 1.2); // El año anterior podría ser más alto o más bajo

    for (let i = 0; i < months.length; i++) {
        // Ventas del año actual
        baseValueCurrent = baseValueCurrent * getRandomNumber(1.00, 1.05, 2);
        let monthSalesCurrent = getRandomNumber(baseValueCurrent * 0.8, baseValueCurrent * 1.2);
        currentSales.push(Math.round(monthSalesCurrent));

        // Ventas del año anterior (con una tendencia ligeramente diferente)
        baseValuePrevious = baseValuePrevious * getRandomNumber(0.98, 1.03, 2); // Crecimiento ligeramente diferente
        let monthSalesPrevious = getRandomNumber(baseValuePrevious * 0.8, baseValuePrevious * 1.2);
        previousSales.push(Math.round(monthSalesPrevious));
    }
    return { labels: months, currentData: currentSales, previousData: previousSales };
}

// Modificado: generateProductSalesData ahora acepta un array de productos
function generateProductSalesData(products) {
    const productNames = products.map(p => p.name);
    const sales = products.map(p => p.revenueGenerated);
    return { labels: productNames, data: sales };
}

/**
 * Genera datos simulados para distribución por región y, opcionalmente, por departamento/ciudad.
 * Ahora incluye 'numberOfOrders' para cada departamento.
 * @returns {Object} Objeto con datos de regiones y sus sub-departamentos.
 */
function generateRegionDistributionData() {
    const regions = ['Norte', 'Centro', 'Sur', 'Este', 'Oeste'];
    const regionData = {};

    const departmentNames = {
        'Norte': ['Barranquilla', 'Cartagena', 'Santa Marta', 'Riohacha'],
        'Centro': ['Bogotá', 'Medellín', 'Manizales', 'Pereira', 'Ibagué'],
        'Sur': ['Cali', 'Popayán', 'Pasto', 'Neiva'],
        'Este': ['Cúcuta', 'Bucaramanga', 'Villavicencio', 'Tunja'],
        'Oeste': ['Armenia', 'Quibdó', 'Buenaventura']
    };

    let totalGlobalSales = 0;

    regions.forEach(region => {
        const departments = departmentNames[region] || [];
        let regionTotal = 0;
        const departmentSalesAndOrders = [];

        departments.forEach(dept => {
            // Rango de ventas para mayor contraste en el mapa de calor
            const sales = getRandomNumber(5000, 45000);
            // Número de pedidos relacionado con las ventas, pero con variabilidad
            // Para ventas altas, más pedidos, pero no directamente proporcional
            const numberOfOrders = Math.max(10, Math.round(sales / getRandomNumber(80, 200))); // Ticket promedio entre 80 y 200

            departmentSalesAndOrders.push({ name: dept, sales: sales, numberOfOrders: numberOfOrders });
            regionTotal += sales;
        });

        if (departments.length === 0) {
            // Si una región no tiene departamentos definidos, le asignamos ventas y pedidos directamente.
            regionTotal = getRandomNumber(10000, 50000);
            const numberOfOrdersForRegion = Math.max(5, Math.round(regionTotal / getRandomNumber(100, 250)));
            regionData[region] = {
                totalSales: regionTotal,
                departments: [{name: `${region} (General)`, sales: regionTotal, numberOfOrders: numberOfOrdersForRegion}] // Representar como un "departamento" general
            };
        } else {
            regionData[region] = {
                totalSales: regionTotal,
                departments: departmentSalesAndOrders
            };
        }
        totalGlobalSales += regionTotal;
    });

    const labels = Object.keys(regionData);
    const data = labels.map(label => regionData[label].totalSales);

    const normalizedData = data.map(s => parseFloat(((s / totalGlobalSales) * 100).toFixed(1)));

    return { labels: labels, data: normalizedData, fullData: regionData };
}

// NUEVA FUNCIÓN: Genera datos de ticket promedio por región
function generateAverageTicketByRegionData(regionFullData) {
    const labels = [];
    const data = [];

    for (const regionName in regionFullData) {
        const region = regionFullData[regionName];
        let totalSales = 0;
        let totalOrders = 0;

        region.departments.forEach(dept => {
            totalSales += dept.sales;
            totalOrders += dept.numberOfOrders;
        });

        const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

        labels.push(regionName);
        data.push(averageTicket);
    }
    return { labels, data };
}


function generateTopProductsData() {
    const productNames = [
        "Arroz (kg)", "Leche (Litro)", "Huevos (Docena)", "Pan (Unidad)",
        "Aceite (Litro)", "Azúcar (kg)", "Sal (kg)", "Café (Paq.)",
        "Pasta (Paq.)", "Lentejas (kg)", "Pollo (kg)", "Carne (kg)",
        "Pescado (kg)", "Tomate (kg)", "Cebolla (kg)", "Papa (kg)",
        "Plátano (Unidad)", "Naranjas (kg)", "Manzanas (kg)", "Jugo (Litro)",
        "Cereal (Paq.)", "Mermelada (Frasco)", "Galletas (Paq.)", "Atún (Lata)",
        "Harina (kg)", "Detergente (Litro)", "Jabón de Baño (Unidad)", "Crema Dental (Unidad)"
    ];
    // Las categorías iniciales ahora se toman de predefinedCategories para consistencia
    const categories = predefinedCategories;
    const numberOfProductsToGenerate = getRandomNumber(20, 30);
    const generatedProducts = [];
    const usedNames = new Set();

    while (generatedProducts.length < numberOfProductsToGenerate) {
        const randomName = productNames[getRandomNumber(0, productNames.length - 1)];
        if (usedNames.has(randomName)) {
            continue;
        }
        usedNames.add(randomName);

        const quantitySold = getRandomNumber(100, 800);
        const revenueGenerated = getRandomNumber(200, 10000);
        // Simular un costo por unidad que sea menor que el ingreso por unidad
        const costPerUnit = getRandomNumber(revenueGenerated / quantitySold * 0.4, revenueGenerated / quantitySold * 0.8, 2);


        generatedProducts.push({
            id: generatedProducts.length + 1,
            name: randomName,
            quantitySold: quantitySold,
            revenueGenerated: revenueGenerated,
            costPerUnit: costPerUnit, // Nuevo campo de costo
            category: categories[getRandomNumber(0, categories.length - 1)]
        });
    }
    return generatedProducts;
}

function generateProductMonthlySalesData() {
    const months = ['Hace 5M', 'Hace 4M', 'Hace 3M', 'Hace 2M', 'Hace 1M', 'Este Mes'];
    const sales = months.map(() => getRandomNumber(100, 1500));
    return { labels: months, data: sales };
}


// --- Función para obtener la clase de color para el "Mapa de Calor" de ventas---
/**
 * Devuelve una clase CSS de color basada en el monto de ventas.
 * Asume un rango de ventas para los departamentos (ej. 5000 a 45000).
 * Ajusta los umbrales según los datos simulados y la intensidad deseada.
 */
function getSalesColorClass(sales) {
    if (sales > 35000) return 'bg-sales-very-high';
    if (sales > 25000) return 'bg-sales-high';
    if (sales > 15000) return 'bg-sales-medium-high';
    if (sales > 8000) return 'bg-sales-medium';
    if (sales > 4000) return 'bg-sales-medium-low';
    return 'bg-sales-low';
}

// --- Función para obtener la clase de color para el "Mapa de Calor" de pedidos ---
/**
 * Devuelve una clase CSS de color basada en el número de pedidos.
 * Asume un rango de pedidos para los departamentos (ej. 10 a 500).
 * Ajusta los umbrales según los datos simulados y la intensidad deseada.
 */
function getOrdersColorClass(orders) {
    if (orders > 400) return 'bg-orders-very-high';
    if (orders > 300) return 'bg-orders-high';
    if (orders > 200) return 'bg-orders-medium-high';
    if (orders > 100) return 'bg-orders-medium';
    if (orders > 50) return 'bg-orders-medium-low';
    return 'bg-orders-low';
}

// --- NUEVAS FUNCIONES PARA EXPORTAR A CSV ---
/**
 * Convierte el array de productos a una cadena CSV.
 * @param {Array<Object>} products - El array de objetos de productos.
 * @returns {string} Una cadena CSV que representa los productos.
 */
function convertProductsToCsv(products) {
    if (products.length === 0) {
        return '';
    }

    // Encabezados del CSV
    // Usamos los nombres de las propiedades de los objetos de producto
    const headers = ['ID', 'Nombre', 'Cantidad Vendida', 'Ingresos Generados', 'Costo por Unidad', 'Categoría'];
    let csvString = headers.join(',') + '\n';

    // Filas de datos
    products.forEach(product => {
        // Asegurarse de que los valores sean cadenas y escapar comillas dobles
        // Envuelve campos que podrían contener comas o comillas dobles en comillas dobles
        const row = [
            product.id,
            `"${String(product.name || '').replace(/"/g, '""')}"`,
            product.quantitySold,
            product.revenueGenerated,
            product.costPerUnit, // Incluir el costo por unidad
            `"${String(product.category || '').replace(/"/g, '""')}"`
        ];
        csvString += row.join(',') + '\n';
    });

    return csvString;
}

/**
 * Inicia la descarga de un archivo con el contenido y nombre especificados.
 * @param {string} filename - El nombre del archivo a descargar.
 * @param {string} content - El contenido del archivo.
 * @param {string} mimeType - El tipo MIME del archivo (ej. 'text/csv', 'application/json').
 */
function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
// --- FIN DE NUEVAS FUNCIONES PARA EXPORTAR A CSV ---

// --- Funciones para Persistencia de Datos (localStorage) ---

/**
 * Guarda el array allProductsData en localStorage.
 */
function saveProductsToLocalStorage() {
    try {
        localStorage.setItem('allProductsData', JSON.stringify(allProductsData));
        console.log("Productos guardados en localStorage.");
    } catch (e) {
        console.error("Error al guardar productos en localStorage:", e);
        // Usar un modal personalizado en lugar de alert
        displayMessageModal("Advertencia: No se pudieron guardar los productos. Es posible que el almacenamiento local esté lleno o deshabilitado.");
    }
}

/**
 * Carga el array allProductsData desde localStorage.
 */
function loadProductsFromLocalStorage() {
    try {
        const storedData = localStorage.getItem('allProductsData');
        if (storedData) {
            allProductsData = JSON.parse(storedData);
            // Asegura que todos los productos tengan la propiedad costPerUnit para compatibilidad
            allProductsData = allProductsData.map(product => {
                if (product.costPerUnit === undefined || product.costPerUnit === 0) {
                    // Si falta o es 0, asigna un valor simulado basado en revenueGenerated y quantitySold
                    const simulatedCost = product.quantitySold > 0
                        ? getRandomNumber(product.revenueGenerated / product.quantitySold * 0.4, product.revenueGenerated / product.quantitySold * 0.8, 2)
                        : getRandomNumber(1, 10, 2);
                    return { ...product, costPerUnit: simulatedCost };
                }
                return product;
            });
            console.log("Productos cargados desde localStorage.");
        } else {
            console.log("No hay productos guardados en localStorage.");
        }
    }
    catch (e) {
        console.error("Error al cargar productos desde localStorage:", e);
        // Usar un modal personalizado en lugar de alert
        displayMessageModal("Advertencia: No se pudieron cargar los productos guardados. Se usarán datos nuevos.");
        allProductsData = generateTopProductsData(); // Regenerar si hay un error de parseo
        saveProductsToLocalStorage();
    }
}

// Función para mostrar mensajes al usuario (reemplazo de alert)
function displayMessageModal(message, isConfirm = false, onConfirm = null, autoDismissDelay = 0) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50';
    let buttonsHtml = `<button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 float-right" id="close-message-modal-btn">Cerrar</button>`;

    if (isConfirm) {
        buttonsHtml = `
            <button class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 mr-2" id="confirm-modal-btn">Confirmar</button>
            <button class="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400" id="cancel-modal-btn">Cancelar</button>
        `;
    }

    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative">
            <p class="text-gray-800 text-lg mb-4">${message}</p>
            <div class="flex justify-end">
                ${buttonsHtml}
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    if (isConfirm) {
        document.getElementById('confirm-modal-btn').addEventListener('click', () => {
            if (onConfirm) {
                onConfirm();
            }
            modal.remove();
        });
        document.getElementById('cancel-modal-btn').addEventListener('click', () => {
            modal.remove();
        });
    } else {
        document.getElementById('close-message-modal-btn').addEventListener('click', () => {
            modal.remove();
        });
        if (autoDismissDelay > 0) {
            setTimeout(() => {
                modal.remove();
            }, autoDismissDelay);
        }
    }
}


// --- 2. Funciones de Renderizado ---

function renderKpiCards(kpiData) {
    const container = document.getElementById('kpi-cards-container');
    if (!container) { console.error("Contenedor de KPIs no encontrado: 'kpi-cards-container'"); return; }
    container.innerHTML = '';
    for (const key in kpiData) {
        const kpi = kpiData[key];
        const variation = kpi.value - kpi.previous;
        const percentageChange = (kpi.previous === 0) ? 0 : (variation / kpi.previous) * 100; // Evitar división por cero
        const isPositive = percentageChange >= 0;
        const arrow = isPositive ? '↑' : '↓';
        const textColorClass = isPositive ? 'text-green-variation' : 'text-red-variation';
        const cardHtml = `
            <div class="kpi-card">
                <h3 class="kpi-label">${kpi.label}</h3>
                <p class="kpi-value">${kpi.format(kpi.value)}</p>
                <p class="kpi-variation ${textColorClass}">
                    ${arrow} ${Math.abs(percentageChange).toFixed(2)}% vs. periodo anterior
                </p>
            </div>
        `;
        container.innerHTML += cardHtml;
    }
}

// MODIFICACIÓN: renderMonthlySalesChart ahora maneja dos conjuntos de datos
function renderMonthlySalesChart(data) {
    const canvas = document.getElementById('monthly-sales-chart');
    if (!canvas) { console.error("Canvas 'monthly-sales-chart' no encontrado."); return; }
    const ctx = canvas.getContext('2d');
    if (monthlySalesChartInstance) { monthlySalesChartInstance.destroy(); }

    const colors = getChartColors(); // Obtener colores basados en el tema

    monthlySalesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Ventas Actuales ($)',
                    data: data.currentData,
                    borderColor: colors.lineChartColor, // Color dinámico para la línea actual
                    backgroundColor: colors.lineChartColor.replace('rgb', 'rgba').replace(')', ', 0.2)'), // Un poco transparente
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Ventas Año Anterior ($)',
                    data: data.previousData,
                    borderColor: colors.doughnutColors[1], // Usar un color diferente para el año anterior
                    backgroundColor: colors.doughnutColors[1].replace('rgb', 'rgba').replace(')', ', 0.1)'),
                    tension: 0.1,
                    fill: false,
                    borderDash: [5, 5] // Línea punteada para el año anterior
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Ingresos ($)',
                        color: colors.fontColor // Color del título del eje
                    },
                    ticks: {
                        color: colors.fontColor // Color de las etiquetas del eje
                    },
                    grid: {
                        color: colors.gridColor // Color de las líneas de cuadrícula
                    }
                },
                x: {
                    ticks: {
                        color: colors.fontColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) { return `${context.dataset.label}: $${context.parsed.y.toLocaleString('es-CO')}`; }
                    }
                },
                legend: {
                    labels: {
                        color: colors.fontColor
                    }
                }
            }
        }
    });
}

function renderProductSalesChart(data) {
    const canvas = document.getElementById('product-sales-chart');
    if (!canvas) { console.error("Canvas 'product-sales-chart' no encontrado."); return; }
    const ctx = canvas.getContext('2d');
    if (productSalesChartInstance) { productSalesChartInstance.destroy(); }

    const colors = getChartColors(); // Obtener colores basados en el tema

    productSalesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Ventas ($)', data: data.data,
                backgroundColor: colors.barChartColor, // Color dinámico
                borderColor: colors.borderColor, // Color dinámico
                borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Ingresos ($)',
                        color: colors.fontColor
                    },
                    ticks: {
                        color: colors.fontColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                },
                x: {
                    ticks: {
                        color: colors.fontColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                }
            },
            plugins: {
                tooltip: { callbacks: { label: function(context) { return `${context.label}: $${context.parsed.y.toLocaleString('es-CO')}`; } } },
                legend: {
                    labels: {
                        color: colors.fontColor
                    }
                }
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const firstElement = elements[0];
                    const label = productSalesChartInstance.data.labels[firstElement.index];
                    const productData = allProductsData.find(p => p.name === label);
                    if (productData) {
                        openProductDetailModal(productData);
                        updateBreadcrumbs('productDetail', productData.name);
                    } else { console.warn(`Producto no encontrado para drill-down: ${label}`); }
                }
            }
        }
    });
}

/**
 * Renderiza el gráfico de distribución por región.
 * Ahora es interactivo para el drill-down.
 * @param {Object} data - Datos para el gráfico, incluyendo fullData para drill-down.
 */
function renderRegionDistributionChart(data) {
    const canvas = document.getElementById('region-distribution-chart');
    if (!canvas) { console.error("Canvas 'region-distribution-chart' no encontrado."); return; }
    const ctx = canvas.getContext('2d');
    if (regionDistributionChartInstance) { regionDistributionChartInstance.destroy(); }

    const colors = getChartColors(); // Obtener colores basados en el tema

    regionDistributionChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{ data: data.data, backgroundColor: colors.doughnutColors, hoverOffset: 4 }] // Colores dinámicos
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed !== null) { label += context.parsed.toFixed(1) + '%'; }
                            return label;
                        }
                    }
                },
                legend: {
                    labels: {
                        color: colors.fontColor // Color de la leyenda
                    }
                }
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const firstElement = elements[0];
                    const regionName = regionDistributionChartInstance.data.labels[firstElement.index];
                    const regionDetails = data.fullData[regionName];
                    if (regionDetails) {
                        showRegionDetails(regionName, regionDetails.departments);
                        updateBreadcrumbs('regionDetail', regionName);
                    }
                }
            }
        }
    });
}

// NUEVA FUNCIÓN: Renderiza el gráfico de ticket promedio por región
function renderAverageTicketByRegionChart(data) {
    const canvas = document.getElementById('average-ticket-by-region-chart');
    if (!canvas) { console.error("Canvas 'average-ticket-by-region-chart' no encontrado."); return; }
    const ctx = canvas.getContext('2d');
    if (averageTicketByRegionChartInstance) { averageTicketByRegionChartInstance.destroy(); }

    const colors = getChartColors(); // Obtener colores basados en el tema

    averageTicketByRegionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Ticket Promedio ($)',
                data: data.data,
                backgroundColor: colors.barChartColor, // Color dinámico
                borderColor: colors.borderColor, // Color dinámico
                borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Ticket Promedio ($)',
                        color: colors.fontColor
                    },
                    ticks: {
                        color: colors.fontColor,
                        callback: function(value) {
                            return `$${value.toFixed(2)}`; // Formatear como moneda
                        }
                    },
                    grid: {
                        color: colors.gridColor
                    }
                },
                x: {
                    ticks: {
                        color: colors.fontColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: $${context.parsed.y.toFixed(2)}`;
                        }
                    }
                },
                legend: {
                    labels: {
                        color: colors.fontColor
                    }
                }
            }
        }
    });
}

/**
 * Muestra los detalles de una región específica (departamentos/ciudades)
 * Ahora incluye una tabla con "mapa de calor" y el gráfico de barras.
 * También muestra el número de pedidos con su propio mapa de calor.
 * @param {string} regionName - Nombre de la región seleccionada.
 * @param {Array<Object>} departmentsData - Array de objetos {name: 'Depto', sales: 1234, numberOfOrders: 56}.
 */
function showRegionDetails(regionName, departmentsData) {
    const regionDetailContainer = document.getElementById('region-detail-container');
    const regionDetailTitle = document.getElementById('region-detail-title');
    const backButton = document.getElementById('back-to-regions-btn');
    const regionChartContainer = document.querySelector('#regions-content .chart-container');
    const averageTicketChartContainer = document.getElementById('average-ticket-by-region-chart-container'); // Ocultar el nuevo gráfico
    // CORRECCIÓN: Obtener departmentTableBody usando el ID correcto del HTML
    const departmentTableBody = document.getElementById('department-sales-table-body');


    if (!regionDetailContainer || !regionDetailTitle || !backButton || !regionChartContainer || !departmentTableBody || !averageTicketChartContainer) {
        console.error("Algunos elementos de detalle de región no encontrados. Asegúrate de que los IDs sean correctos en el HTML.");
        return;
    }

    regionDetailTitle.textContent = `Detalle de Ventas para ${regionName}`;
    regionDetailContainer.classList.remove('hidden');
    backButton.classList.remove('hidden');
    regionChartContainer.classList.add('hidden');
    averageTicketChartContainer.classList.add('hidden'); // Ocultar el nuevo gráfico

    // --- Renderizar la Tabla de Departamentos con Mapa de Calor y Número de Pedidos ---
    departmentTableBody.innerHTML = ''; // Limpiar filas existentes

    // Ordenar departamentos por ventas (opcional, pero ayuda a la visualización)
    departmentsData.sort((a, b) => b.sales - a.sales);

    departmentsData.forEach(dept => {
        // Obtener la clase de color basada en las ventas para el mapa de calor de ventas
        const salesColorClass = getSalesColorClass(dept.sales);
        // Obtener la clase de color basada en los pedidos para el mapa de calor de pedidos
        const ordersColorClass = getOrdersColorClass(dept.numberOfOrders);

        const row = document.createElement('tr');
        row.className = 'table-row';

        row.innerHTML = `
            <td class="table-body-cell font-medium text-gray-900">${dept.name}</td>
            <td class="table-body-cell ${salesColorClass} font-semibold">$${dept.sales.toLocaleString('es-CO')}</td>
            <td class="table-body-cell ${ordersColorClass} font-semibold">${dept.numberOfOrders.toLocaleString('es-CO')}</td>
        `;
        departmentTableBody.appendChild(row);
    });

    // --- Renderizar el Gráfico de Barras de Departamentos ---
    const departmentLabels = departmentsData.map(d => d.name);
    const departmentSales = departmentsData.map(d => d.sales);

    const canvas = document.getElementById('department-sales-chart');
    if (!canvas) { console.error("Canvas 'department-sales-chart' no encontrado."); return; }
    const ctx = canvas.getContext('2d');

    if (departmentSalesChartInstance) {
        departmentSalesChartInstance.destroy();
    }

    const colors = getChartColors(); // Obtener colores basados en el tema

    departmentSalesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: departmentLabels,
            datasets: [{
                label: 'Ventas ($)',
                data: departmentSales,
                backgroundColor: colors.barChartColor, // Color dinámico
                borderColor: colors.borderColor, // Color dinámico
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Ingresos ($)',
                        color: colors.fontColor
                    },
                    ticks: {
                        color: colors.fontColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                },
                x: {
                    ticks: {
                        color: colors.fontColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: $${context.parsed.y.toLocaleString('es-CO')}`;
                        }
                    }
                },
                legend: {
                    labels: {
                        color: colors.fontColor
                    }
                }
            }
        }
    });
}

/**
 * Vuelve a mostrar el gráfico de distribución por región principal.
 */
function showMainRegionsChart() {
    const regionDetailContainer = document.getElementById('region-detail-container');
    const backButton = document.getElementById('back-to-regions-btn');
    const regionChartContainer = document.querySelector('#regions-content .chart-container');
    const averageTicketChartContainer = document.getElementById('average-ticket-by-region-chart-container'); // Mostrar el nuevo gráfico

    if (!regionDetailContainer || !backButton || !regionChartContainer || !averageTicketChartContainer) return;

    regionDetailContainer.classList.add('hidden');
    backButton.classList.add('hidden');
    regionChartContainer.classList.remove('hidden');
    averageTicketChartContainer.classList.remove('hidden'); // Asegurarse de que esté visible en la vista principal de regiones

    if (departmentSalesChartInstance) {
        departmentSalesChartInstance.destroy();
        departmentSalesChartInstance = null;
    }
    renderRegionDistributionChart(allRegionData);
    renderAverageTicketByRegionChart(generateAverageTicketByRegionData(allRegionData.fullData)); // Renderizar el nuevo gráfico
    // Vuelve al breadcrumb de "Regiones"
    updateBreadcrumbs('regions');
}

/**
 * Renderiza la tabla de productos con paginación y ordenamiento.
 * @param {Array} products - La lista completa de productos.
 * @param {string} filterCategory - La categoría por la que filtrar.
 */
function renderTopProductsTable(products, filterCategory) {
    const tbody = document.getElementById('top-products-table-body');
    const pageInfoSpan = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (!tbody || !pageInfoSpan || !prevBtn || !nextBtn) {
        console.error("Elementos de tabla o paginación no encontrados.");
        return;
    }
    tbody.innerHTML = '';

    let filteredProducts = products;
    if (filterCategory !== 'all') {
        filteredProducts = products.filter(product => product.category === filterCategory);
    }

    // NUEVO: Aplicar filtro de búsqueda
    if (currentProductSearchTerm) {
        const searchTermLower = currentProductSearchTerm.toLowerCase();
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTermLower)
        );
    }

    // Aplicar ordenamiento
    filteredProducts.sort((a, b) => {
        const valA = a[currentSortColumn];
        const valB = b[currentSortColumn];

        if (typeof valA === 'string' && typeof valB === 'string') {
            return currentSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return currentSortDirection === 'asc' ? valA - valB : valB - valA;
    });

    // Calcular paginación
    const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);
    // Asegurarse de que currentPage no exceda el total de páginas después de filtrar/buscar
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    } else if (totalPages === 0) {
        currentPage = 1; // Si no hay productos, la página es 1
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    currentPaginatedProducts = paginatedProducts; // Actualizar productos paginados actuales

    paginatedProducts.forEach(product => {
        const row = document.createElement('tr');
        row.className = 'table-row cursor-pointer';
        row.innerHTML = `
            <td class="table-body-cell font-medium text-gray-900">${product.name}</td>
            <td class="table-body-cell text-gray-500">${product.quantitySold.toLocaleString('es-CO')}</td>
            <td class="table-body-cell text-gray-500">$${product.revenueGenerated.toLocaleString('es-CO')}</td>
            <td class="table-body-cell text-gray-500">$${product.costPerUnit !== undefined ? product.costPerUnit.toLocaleString('es-CO') : 'N/A'}</td>
            <td class="table-body-cell text-gray-500">${product.category}</td>
            <td class="table-body-cell flex items-center space-x-2">
                <button class="edit-product-btn px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" data-product-id="${product.id}">
                    Editar
                </button>
                <button class="delete-product-btn px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" data-product-id="${product.id}">
                    Eliminar
                </button>
            </td>
        `;
        // Añadir event listener al botón de editar
        row.querySelector('.edit-product-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el clic en el botón active el evento de la fila
            openEditProductModal(product);
        });
        // Añadir event listener al botón de eliminar
        row.querySelector('.delete-product-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el clic en el botón active el evento de la fila
            deleteProduct(product.id);
        });
        tbody.appendChild(row);
    });

    // Actualizar información de paginación y botones
    pageInfoSpan.textContent = `Página ${currentPage} de ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;

    // Actualizar flechas de ordenamiento
    document.querySelectorAll('.sort-arrow').forEach(arrow => {
        arrow.classList.remove('asc', 'desc');
    });
    const activeArrow = document.querySelector(`.sort-arrow[data-sort-arrow="${currentSortColumn}"]`);
    if (activeArrow) {
        activeArrow.classList.add(currentSortDirection);
    }
}


function openProductDetailModal(product) {
    const modal = document.getElementById('product-detail-modal');
    if (!modal) { console.error("Modal de detalles de producto no encontrado: 'product-detail-modal'"); return; }

    const modalProductName = document.getElementById('modal-product-name');
    if (modalProductName) modalProductName.textContent = `Detalles del Producto: ${product.name}`;
    const modalQuantitySold = document.getElementById('modal-quantity-sold');
    if (modalQuantitySold) modalQuantitySold.textContent = product.quantitySold.toLocaleString('es-CO');
    const modalRevenueGenerated = document.getElementById('modal-revenue-generated');
    if (modalRevenueGenerated) modalRevenueGenerated.textContent = `$${product.revenueGenerated.toLocaleString('es-CO')}`;
    const modalCostPerUnit = document.getElementById('modal-cost-per-unit'); // Nuevo campo
    if (modalCostPerUnit) modalCostPerUnit.textContent = `$${product.costPerUnit !== undefined ? product.costPerUnit.toLocaleString('es-CO') : 'N/A'}`; // Asegura que costPerUnit se muestre o N/A
    const modalCategory = document.getElementById('modal-category');
    if (modalCategory) modalCategory.textContent = product.category;

    const randomDays = getRandomNumber(100, 700);
    const launchDate = new Date();
    launchDate.setDate(launchDate.getDate() - randomDays);
    const modalLaunchDate = document.getElementById('modal-launch-date');
    if (modalLaunchDate) modalLaunchDate.textContent = launchDate.toLocaleDateString('es-CO');

    const productSalesData = generateProductMonthlySalesData();
    const canvas = document.getElementById('modal-product-sales-chart');
    if (!canvas) { console.error("Canvas 'modal-product-sales-chart' no encontrado en el modal."); return; }
    const ctx = canvas.getContext('2d');

    if (modalProductSalesChartInstance) { modalProductSalesChartInstance.destroy(); }

    const colors = getChartColors(); // Obtener colores basados en el tema

    modalProductSalesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: productSalesData.labels,
            datasets: [{
                label: 'Ventas ($)',
                data: productSalesData.data,
                borderColor: colors.lineChartColor, // Color dinámico
                backgroundColor: colors.lineChartColor.replace('rgb', 'rgba').replace(')', ', 0.2)'), // Un poco transparente
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Ingresos ($)',
                        color: colors.fontColor
                    },
                    ticks: {
                        color: colors.fontColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                },
                x: {
                    ticks: {
                        color: colors.fontColor
                    },
                    grid: {
                        color: colors.gridColor
                    }
                }
            },
            plugins: {
                tooltip: { callbacks: { label: function(context) { return `Ventas: $${context.parsed.y.toLocaleString('es-CO')}`; } } },
                legend: {
                    labels: {
                        color: colors.fontColor
                    }
                }
            }
        }
    });

    modal.classList.remove('hidden');
}

function closeProductDetailModal() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) { modal.classList.add('hidden'); }
    // Al cerrar el modal, volver al breadcrumb de "Productos"
    updateBreadcrumbs('products');
}

/**
 * Popula el selector de categoría en el formulario de edición de producto.
 * Incluye categorías predefinidas y las que ya existen en los datos.
 * @param {string} currentCategory - La categoría actual del producto que se está editando.
 */
function populateEditProductCategorySelect(currentCategory) {
    const selectElement = document.getElementById('edit-product-category');
    if (!selectElement) return;

    // Obtener todas las categorías únicas de los productos existentes
    const existingCategories = new Set(allProductsData.map(p => p.category));

    // Combinar categorías predefinidas con las existentes
    const allUniqueCategories = new Set([...predefinedCategories, ...Array.from(existingCategories)]);

    // Limpiar opciones existentes
    selectElement.innerHTML = '';

    // Añadir opciones ordenadas alfabéticamente
    Array.from(allUniqueCategories).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        selectElement.appendChild(option);
    });

    // Añadir la opción "Otra"
    const otherOption = document.createElement('option');
    otherOption.value = 'other';
    otherOption.textContent = 'Otra (especificar)';
    selectElement.appendChild(otherOption);

    // Seleccionar la categoría actual del producto
    if (currentCategory && allUniqueCategories.has(currentCategory)) {
        selectElement.value = currentCategory;
        document.getElementById('edit-new-category-input-container').classList.add('hidden');
    } else if (currentCategory) {
        // Si la categoría actual no está en la lista (es una nueva categoría no predefinida),
        // seleccionar "Otra" y mostrar el campo de texto con la categoría actual.
        selectElement.value = 'other';
        document.getElementById('edit-new-category-input-container').classList.remove('hidden');
        document.getElementById('edit-new-product-category').value = currentCategory;
    } else {
        // Si no hay categoría, seleccionar la primera opción o "Otra"
        selectElement.value = predefinedCategories[0] || 'other';
        document.getElementById('edit-new-category-input-container').classList.add('hidden');
    }

    // Asegurarse de que el input de nueva categoría esté oculto o mostrado correctamente
    const newCategoryInputContainer = document.getElementById('edit-new-category-input-container');
    const newProductCategoryInput = document.getElementById('edit-new-product-category');

    if (selectElement.value === 'other') {
        newCategoryInputContainer.classList.remove('hidden');
        newProductCategoryInput.setAttribute('required', 'true');
    } else {
        newCategoryInputContainer.classList.add('hidden');
        newProductCategoryInput.removeAttribute('required');
        newProductCategoryInput.value = '';
    }
}


/**
 * Abre el modal de edición de producto y precarga los datos.
 * @param {object} product - El objeto producto a editar.
 */
function openEditProductModal(product) {
    const modal = document.getElementById('edit-product-modal');
    if (!modal) { console.error("Modal de edición de producto no encontrado: 'edit-product-modal'"); return; }

    // Almacenar el ID del producto que se está editando
    editingProductId = product.id;

    // Precargar los campos del formulario con los datos del producto
    document.getElementById('edit-product-name').value = product.name;
    document.getElementById('edit-product-quantity-sold').value = product.quantitySold;
    document.getElementById('edit-product-revenue-generated').value = product.revenueGenerated;
    document.getElementById('edit-product-cost-per-unit').value = product.costPerUnit;

    // Popula y selecciona la categoría
    populateEditProductCategorySelect(product.category);

    modal.classList.remove('hidden');
}

/**
 * Cierra el modal de edición de producto.
 */
function closeEditProductModal() {
    const modal = document.getElementById('edit-product-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.querySelector('form').reset(); // Limpiar el formulario al cerrar
        editingProductId = null; // Resetear el ID del producto en edición
    }
}

/**
 * Guarda los cambios de un producto editado.
 */
function saveEditedProduct() {
    if (editingProductId === null) {
        displayMessageModal("Error: No hay producto seleccionado para editar.");
        return;
    }

    const name = document.getElementById('edit-product-name').value;
    const quantitySold = parseInt(document.getElementById('edit-product-quantity-sold').value);
    const revenueGenerated = parseFloat(document.getElementById('edit-product-revenue-generated').value);
    const costPerUnit = parseFloat(document.getElementById('edit-product-cost-per-unit').value);

    const categorySelect = document.getElementById('edit-product-category');
    let category = categorySelect.value;

    // Si se seleccionó "Otra", tomar el valor del nuevo input
    if (category === 'other') {
        const newCategoryInput = document.getElementById('edit-new-product-category');
        category = newCategoryInput.value.trim();
        if (!category) {
            displayMessageModal("Por favor, introduce una nueva categoría.");
            return;
        }
        // Añadir la nueva categoría a la lista predefinida si no existe
        if (!predefinedCategories.includes(category)) {
            predefinedCategories.push(category);
            predefinedCategories.sort(); // Mantener la lista ordenada
        }
    }

    // Validación
    if (!name || isNaN(quantitySold) || isNaN(revenueGenerated) || isNaN(costPerUnit) || !category) {
        displayMessageModal("Por favor, rellena todos los campos correctamente.");
        return;
    }
    if (quantitySold < 0 || revenueGenerated < 0 || costPerUnit < 0) {
        displayMessageModal("Cantidad Vendida, Ingresos Generados y Costo por Unidad no pueden ser números negativos.");
        return;
    }
    if (costPerUnit > (revenueGenerated / quantitySold) && quantitySold > 0) {
         displayMessageModal("El costo por unidad no puede ser mayor que el ingreso por unidad.");
         return;
    }

    // Encontrar el índice del producto en allProductsData
    const productIndex = allProductsData.findIndex(p => p.id === editingProductId);

    if (productIndex !== -1) {
        // Actualizar el producto
        allProductsData[productIndex] = {
            id: editingProductId,
            name: name,
            quantitySold: quantitySold,
            revenueGenerated: revenueGenerated,
            costPerUnit: costPerUnit,
            category: category
        };
        saveProductsToLocalStorage(); // Guardar los datos actualizados
        displayMessageModal(`Producto "${name}" actualizado exitosamente!`, false, null, 2000);

        // Re-renderizar los componentes que muestran datos de productos
        renderTopProductsTable(allProductsData, currentProductFilterCategory);
        populateProductCategoryFilter(); // Actualizar el filtro de categorías
        populateProductCategorySelect(); // Actualizar el selector de añadir producto
        // Filtrar productos para el gráfico basándose en la categoría actual
        const filteredProductsForChartAfterEdit = allProductsData.filter(p => {
            const matchesCategory = currentProductFilterCategory === 'all' || p.category === currentProductFilterCategory;
            const matchesSearch = currentProductSearchTerm === '' || p.name.toLowerCase().includes(currentProductSearchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
        renderProductSalesChart(generateProductSalesData(filteredProductsForChartAfterEdit)); // Actualizar gráfico con filtro actual
        renderKpiCards(generateKPIData()); // Recalcular y renderizar KPIs
        closeEditProductModal(); // Cerrar el modal
    } else {
        displayMessageModal("Error: No se pudo encontrar el producto para actualizar.");
    }
}


function destroyAllMainCharts() {
    console.log("Destruyendo todos los gráficos principales...");
    if (monthlySalesChartInstance) { monthlySalesChartInstance.destroy(); monthlySalesChartInstance = null; }
    if (productSalesChartInstance) { productSalesChartInstance.destroy(); productSalesChartInstance = null; }
    if (regionDistributionChartInstance) { regionDistributionChartInstance.destroy(); regionDistributionChartInstance = null; }
    if (departmentSalesChartInstance) { departmentSalesChartInstance.destroy(); departmentSalesChartInstance = null; }
    if (modalProductSalesChartInstance) { modalProductSalesChartInstance.destroy(); modalProductSalesChartInstance = null; } // También el del modal
    if (averageTicketByRegionChartInstance) { averageTicketByRegionChartInstance.destroy(); averageTicketByRegionChartInstance = null; } // NUEVO: Destruir el gráfico de ticket promedio
}

/**
 * NUEVA FUNCIÓN: Parsea un string numérico, manejando diferentes separadores decimales/miles.
 * Asume que el último separador (punto o coma) es el decimal.
 * @param {string} str - El string numérico a parsear.
 * @returns {number} El número parseado.
 */
function parseNumber(str) {
    str = String(str).trim();
    if (!str) return 0;

    // Eliminar cualquier carácter que no sea un dígito, punto, coma o guion (para números negativos)
    str = str.replace(/[^0-9.,-]/g, '');

    // Detectar si el último separador es una coma o un punto
    let lastCommaIndex = str.lastIndexOf(',');
    let lastPeriodIndex = str.lastIndexOf('.');

    if (lastCommaIndex > lastPeriodIndex) {
        // Si la última coma está después del último punto, la coma es el decimal (ej. "1.234,56")
        str = str.replace(/\./g, ''); // Eliminar todos los puntos (separadores de miles)
        str = str.replace(/,/g, '.'); // Reemplazar la coma decimal por un punto
    } else {
        // Si el último punto está después de la última coma, o no hay comas/puntos,
        // el punto es el decimal (ej. "1,234.56" o "12345")
        str = str.replace(/,/g, ''); // Eliminar todas las comas (separadores de miles)
    }

    return parseFloat(str);
}


// NUEVA FUNCIÓN: Maneja la carga de archivos CSV
function handleCsvFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        displayMessageModal("No se seleccionó ningún archivo.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const csvText = e.target.result;
        try {
            const newProducts = parseCsvToProducts(csvText);
            if (newProducts.length > 0) {
                // Generar IDs únicos para los nuevos productos
                let maxId = allProductsData.length > 0 ? Math.max(...allProductsData.map(p => p.id)) : 0;
                const productsWithIds = newProducts.map(p => ({
                    id: ++maxId, // Asignar un nuevo ID incremental
                    ...p
                }));

                allProductsData.push(...productsWithIds); // Añadir los nuevos productos
                saveProductsToLocalStorage(); // Guardar los datos actualizados

                displayMessageModal(`Archivo CSV cargado y ${newProducts.length} productos añadidos exitosamente.`, false, null, 2000);

                // Re-renderizar la tabla y gráficos
                renderTopProductsTable(allProductsData, currentProductFilterCategory);
                populateProductCategoryFilter();
                populateProductCategorySelect(); // Actualizar el selector de añadir producto
                // Filtrar productos para el gráfico basándose en la categoría y término de búsqueda actual
                const filteredProductsForChartAfterUpload = allProductsData.filter(p => {
                    const matchesCategory = currentProductFilterCategory === 'all' || p.category === currentProductFilterCategory;
                    const matchesSearch = currentProductSearchTerm === '' || p.name.toLowerCase().includes(currentProductSearchTerm.toLowerCase());
                    return matchesCategory && matchesSearch;
                });
                renderProductSalesChart(generateProductSalesData(filteredProductsForChartAfterUpload));
                renderKpiCards(generateKPIData());
            } else {
                displayMessageModal("El archivo CSV no contiene datos de productos válidos o los encabezados no coinciden.");
            }
        } catch (error) {
            console.error("Error al procesar el archivo CSV:", error);
            displayMessageModal("Error al procesar el archivo CSV. Asegúrate de que el formato sea correcto y los encabezados coincidan (Nombre, Cantidad Vendida, Ingresos Generados, Costo por Unidad, Categoría).");
        }
        // Limpiar el input de archivo para permitir cargar el mismo archivo de nuevo si es necesario
        event.target.value = '';
    };
    reader.onerror = () => {
        displayMessageModal("Error al leer el archivo.");
        event.target.value = '';
    };
    reader.readAsText(file);
}

// NUEVA FUNCIÓN: Parsea el texto CSV en un array de objetos de producto
function parseCsvToProducts(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) { // Necesitamos al menos una línea de encabezado y una de datos
        return [];
    }

    // Detectar el delimitador: coma o punto y coma
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const headers = firstLine.split(delimiter).map(header => header.trim().toLowerCase());
    const products = [];

    // Mapeo flexible de encabezados a propiedades del producto
    const headerMap = {
        'nombre': 'name',
        'cantidad vendida': 'quantitySold',
        'ingresos generados': 'revenueGenerated',
        'costo por unidad': 'costPerUnit',
        'categoría': 'category',
        'categoria': 'category' // Para manejar posibles variaciones
    };

    for (let i = 1; i < lines.length; i++) {
        // Manejar campos que pueden contener el delimitador si están entre comillas
        // Esta es una solución simple y no un parser CSV completo.
        // Un parser CSV real manejaría casos más complejos de comillas y escapes.
        const values = lines[i].split(delimiter).map(value => value.trim());

        if (values.length !== headers.length) {
            console.warn(`Advertencia: La fila ${i + 1} tiene un número de columnas diferente al de los encabezados (${values.length} vs ${headers.length}). Se omitirá esta fila.`);
            continue;
        }

        const product = {};
        let isValidProduct = true;

        headers.forEach((header, index) => {
            const propName = headerMap[header]; // Usar el encabezado en minúsculas
            if (propName) {
                let value = values[index];
                // Remover comillas si el campo está entre comillas
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                }

                if (['quantitySold', 'revenueGenerated', 'costPerUnit'].includes(propName)) {
                    const parsedValue = parseNumber(value); // Usar la nueva función de parseo de números
                    if (isNaN(parsedValue)) {
                        console.warn(`Valor inválido para ${propName}: "${values[index]}" en la fila ${i + 1}. Se omitirá este producto.`);
                        isValidProduct = false;
                    }
                    product[propName] = parsedValue;
                } else {
                    product[propName] = value;
                }
            }
        });

        // Validar que los campos esenciales existan y sean válidos
        if (isValidProduct && product.name && !isNaN(product.quantitySold) && !isNaN(product.revenueGenerated) && !isNaN(product.costPerUnit) && product.category) {
            // Asegurar valores numéricos por defecto si no están presentes o son inválidos
            product.quantitySold = product.quantitySold || 0;
            product.revenueGenerated = product.revenueGenerated || 0;
            product.costPerUnit = product.costPerUnit || 0;
            products.push(product);
        } else {
            console.warn(`Producto incompleto o inválido en la fila ${i + 1}. Se omitirá.`);
        }
    }
    return products;
}


// --- 3. Lógica de Carga del Dashboard y Navegación ---

/**
 * Popula el selector de categoría para el filtro de productos.
 * Incluye categorías predefinidas y las que ya existen en los datos.
 */
function populateProductCategoryFilter() {
    const selectElement = document.getElementById('product-category-filter');
    if (!selectElement) return;

    // Obtener todas las categorías únicas de los productos existentes
    const existingCategories = new Set(allProductsData.map(p => p.category));

    // Combinar categorías predefinidas con las existentes
    const allUniqueCategories = new Set([...predefinedCategories, ...Array.from(existingCategories)]);

    // Limpiar opciones existentes
    selectElement.innerHTML = '<option value="all">Todas</option>';

    // Añadir opciones ordenadas alfabéticamente
    Array.from(allUniqueCategories).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        selectElement.appendChild(option);
    });

    // Restaurar la selección actual si existe
    selectElement.value = currentProductFilterCategory;
}

/**
 * Popula el selector de categoría en el formulario de añadir nuevo producto.
 */
function populateProductCategorySelect() {
    const selectElement = document.getElementById('product-category');
    if (!selectElement) return;

    // Limpiar opciones existentes
    selectElement.innerHTML = '';

    // Añadir las categorías predefinidas
    predefinedCategories.sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        selectElement.appendChild(option);
    });

    // Añadir la opción "Otra"
    const otherOption = document.createElement('option');
    otherOption.value = 'other';
    otherOption.textContent = 'Otra (especificar)';
    selectElement.appendChild(otherOption);

    // Seleccionar la primera opción por defecto
    selectElement.value = predefinedCategories[0] || 'other';
    // Asegurarse de que el input de nueva categoría esté oculto al inicio
    document.getElementById('new-category-input-container').classList.add('hidden');
}


/**
 * Muestra u oculta el spinner de carga.
 * @param {boolean} show - True para mostrar, false para ocultar.
 */
function toggleLoadingSpinner(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        if (show) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    }
}

/**
 * Carga los datos y renderiza la página especificada.
 * Añadido control de spinner.
 * @param {string} pageId - ID de la página a cargar.
 */
async function loadPageData(pageId) {
    console.log(`Cargando datos para la página: ${pageId}...`);
    toggleLoadingSpinner(true); // Mostrar spinner

    await simulateDataLoad(); // Simular carga asíncrona de datos

    // Detener cualquier intervalo de auto-actualización si la página no es el dashboard
    if (kpiRefreshInterval) {
        clearInterval(kpiRefreshInterval);
        kpiRefreshInterval = null;
        console.log("Intervalo de actualización de KPIs detenido.");
    }

    destroyAllMainCharts(); // Destruye todos los gráficos al cambiar de página

    const today = new Date();
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        currentDateElement.textContent = today.toLocaleDateString('es-CO', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    } else {
        console.warn("Elemento 'current-date' no encontrado.");
    }

    const regionDetailContainer = document.getElementById('region-detail-container');
    const backButton = document.getElementById('back-to-regions-btn');
    const regionChartContainer = document.querySelector('#regions-content .chart-container');
    const averageTicketChartContainer = document.getElementById('average-ticket-by-region-chart-container'); // Mostrar/Ocultar el nuevo gráfico

    if (regionDetailContainer && backButton && regionChartContainer && averageTicketChartContainer) {
        regionDetailContainer.classList.add('hidden');
        backButton.classList.add('hidden');
        regionChartContainer.classList.remove('hidden');
        averageTicketChartContainer.classList.remove('hidden'); // Asegurarse de que esté visible en la vista principal de regiones
    }

    switch (pageId) {
        case 'dashboard':
            renderKpiCards(generateKPIData());
            renderMonthlySalesChart(generateMonthlySalesData());
            // NUEVO: Reiniciar el intervalo de auto-actualización solo si está habilitado
            if (kpiAutoRefreshEnabled) {
                kpiRefreshInterval = setInterval(() => {
                    console.log("Actualizando KPIs y gráfico de ventas mensuales automáticamente...");
                    renderKpiCards(generateKPIData());
                    renderMonthlySalesChart(generateMonthlySalesData());
                }, KPI_REFRESH_RATE);
            }
            break;
        case 'products':
            currentPage = 1;
            currentSortColumn = 'name';
            currentSortDirection = 'asc';
            populateProductCategoryFilter(); // Asegurarse de que el filtro de productos se actualice
            populateProductCategorySelect(); // Asegurarse de que el selector de añadir producto se actualice
            renderTopProductsTable(allProductsData, currentProductFilterCategory);
            // Filtrar productos para el gráfico basándose en la categoría y término de búsqueda actual
            const filteredProductsForChart = allProductsData.filter(p => {
                const matchesCategory = currentProductFilterCategory === 'all' || p.category === currentProductFilterCategory;
                const matchesSearch = currentProductSearchTerm === '' || p.name.toLowerCase().includes(currentProductSearchTerm.toLowerCase());
                return matchesCategory && matchesSearch;
            });
            const productSales = generateProductSalesData(filteredProductsForChart); // Pasar productos filtrados
            renderProductSalesChart(productSales);
            break;
        case 'regions':
            allRegionData = generateRegionDistributionData();
            renderRegionDistributionChart(allRegionData);
            renderAverageTicketByRegionChart(generateAverageTicketByRegionData(allRegionData.fullData)); // NUEVO: Renderizar el gráfico de ticket promedio
            break;
        default:
            console.warn(`Página desconocida: ${pageId}`);
    }
    console.log(`Datos cargados para la página: ${pageId}.`);
    toggleLoadingSpinner(false); // Ocultar spinner
}

/**
 * Actualiza el estado de los breadcrumbs.
 * @param {string} pageId - ID de la página principal (dashboard, products, regions).
 * @param {string} [detailName] - Nombre del detalle (ej. nombre de la región, nombre del producto).
 */
function updateBreadcrumbs(pageId, detailName = null) {
    breadcrumbsState = [];
    const mainPageLabel = {
        'dashboard': 'Dashboard',
        'products': 'Productos',
        'regions': 'Regiones'
    }[pageId];

    breadcrumbsState.push({ label: mainPageLabel, pageId: pageId, section: 'main' });

    if (detailName) {
        let detailLabel = '';
        let detailPageId = '';
        if (pageId === 'products') {
            detailLabel = `Detalle: ${detailName}`;
            detailPageId = 'productDetail'; // Un ID ficticio para el detalle del producto
        } else if (pageId === 'regions') {
            detailLabel = `Región: ${detailName}`;
            detailPageId = 'regionDetail'; // Un ID ficticio para el detalle de la región
        }
        breadcrumbsState.push({ label: detailLabel, pageId: detailPageId, section: 'detail' });
    }

    renderBreadcrumbs();
}

function renderBreadcrumbs() {
    const breadcrumbsContainer = document.getElementById('breadcrumbs');
    if (!breadcrumbsContainer) {
        console.error("Contenedor de breadcrumbs no encontrado.");
        return;
    }
    breadcrumbsContainer.innerHTML = '';

    breadcrumbsState.forEach((crumb, index) => {
        const li = document.createElement('li');
        li.className = 'breadcrumb-item';

        if (index < breadcrumbsState.length - 1) {
            // No es el último elemento, es un enlace navegable
            const link = document.createElement('a');
            link.href = `#${crumb.pageId}`;
            link.textContent = crumb.label;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                // Si es un crumb de la página principal, simplemente navega
                if (crumb.section === 'main') {
                    showPage(crumb.pageId);
                } else if (crumb.pageId === 'regionDetail') {
                    // Si es un drill-down de región, volvemos al nivel de regiones
                    showMainRegionsChart();
                }
                // Ajusta el estado de los breadcrumbs al hacer clic
                breadcrumbsState = breadcrumbsState.slice(0, index + 1);
                renderBreadcrumbs();
            });
            li.appendChild(link);
        } else {
            // Es el último elemento, solo texto (activo)
            li.textContent = crumb.label;
            li.classList.add('active-breadcrumb');
        }

        breadcrumbsContainer.appendChild(li);

        // Añadir separador si no es el último elemento
        if (index < breadcrumbsState.length - 1) {
            const separatorLi = document.createElement('li');
            separatorLi.className = 'breadcrumb-item';
            separatorLi.innerHTML = '&nbsp;'; // Espacio para el separador
            breadcrumbsContainer.appendChild(separatorLi);
        }
    });
}


function showPage(pageId) {
    console.log(`Cambiando a la página: ${pageId}`);
    currentActivePageId = pageId; // Actualizar la página activa
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });

    const activePage = document.getElementById(`${pageId}-content`);
    if (activePage) {
        activePage.classList.remove('hidden');
        loadPageData(pageId);
    } else {
        console.error(`Contenido de la página '${pageId}-content' no encontrado.`);
    }

    document.querySelectorAll('.sidebar-link').forEach(link => {
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    updateBreadcrumbs(pageId); // Actualizar breadcrumbs al cambiar de página
}

// Función para eliminar un producto
function deleteProduct(productId) {
    // Filtrar el array para remover el producto con el ID dado
    const initialLength = allProductsData.length;
    allProductsData = allProductsData.filter(product => product.id !== productId);

    if (allProductsData.length < initialLength) {
        saveProductsToLocalStorage(); // Guardar los datos actualizados
        displayMessageModal(`Producto eliminado exitosamente.`, false, null, 2000);
        // Re-renderizar la tabla y el gráfico de productos para reflejar los cambios
        renderTopProductsTable(allProductsData, currentProductFilterCategory);
        populateProductCategoryFilter(); // Actualizar el filtro de categorías por si una categoría desapareció
        populateProductCategorySelect(); // Re-poblar el selector de añadir producto
        // Filtrar productos para el gráfico basándose en la categoría y término de búsqueda actual
        const filteredProductsForChartAfterDelete = allProductsData.filter(p => {
            const matchesCategory = currentProductFilterCategory === 'all' || p.category === currentProductFilterCategory;
            const matchesSearch = currentProductSearchTerm === '' || p.name.toLowerCase().includes(currentProductSearchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
        renderProductSalesChart(generateProductSalesData(filteredProductsForChartAfterDelete)); // Actualizar gráfico con filtro actual
        // IMPORTANTE: Recalcular y renderizar los KPIs después de eliminar un producto
        renderKpiCards(generateKPIData());
    } else {
        displayMessageModal("Error: No se pudo encontrar el producto para eliminar.");
    }
}

/**
 * Elimina todos los productos de la tabla.
 */
function clearAllProductsData() {
    displayMessageModal(
        "¿Estás seguro de que quieres eliminar TODOS los productos de la tabla? Esta acción no se puede deshacer.",
        true, // Es un modal de confirmación
        () => { // Callback si el usuario confirma
            allProductsData = []; // Vaciar el array de productos
            saveProductsToLocalStorage(); // Guardar el estado vacío
            displayMessageModal(`Todos los productos han sido eliminados.`, false, null, 2000);

            // Re-renderizar todos los componentes afectados
            renderTopProductsTable(allProductsData, currentProductFilterCategory);
            populateProductCategoryFilter();
            populateProductCategorySelect(); // Re-poblar el selector de añadir producto
            // Filtrar productos para el gráfico (estará vacío)
            const filteredProductsForChartAfterClear = allProductsData.filter(p => {
                const matchesCategory = currentProductFilterCategory === 'all' || p.category === currentProductFilterCategory;
                const matchesSearch = currentProductSearchTerm === '' || p.name.toLowerCase().includes(currentProductSearchTerm.toLowerCase());
                return matchesCategory && matchesSearch;
            });
            renderProductSalesChart(generateProductSalesData(filteredProductsForChartAfterClear));
            renderKpiCards(generateKPIData());
        }
    );
}

/**
 * Elimina solo los productos que se muestran en la página actual de la tabla.
 */
function deleteCurrentPageProducts() {
    if (currentPaginatedProducts.length === 0) {
        displayMessageModal("No hay productos en la página actual para eliminar.");
        return;
    }

    displayMessageModal(
        "¿Estás seguro de que quieres eliminar los productos de la PÁGINA ACTUAL? Esta acción no se puede deshacer.",
        true, // Es un modal de confirmación
        () => { // Callback si el usuario confirma
            const idsToDelete = new Set(currentPaginatedProducts.map(p => p.id));
            const initialLength = allProductsData.length;

            allProductsData = allProductsData.filter(product => !idsToDelete.has(product.id));

            if (allProductsData.length < initialLength) {
                saveProductsToLocalStorage(); // Guardar los datos actualizados
                displayMessageModal(`Productos de la página actual eliminados exitosamente.`, false, null, 2000);
                // Re-renderizar la tabla y gráficos
                renderTopProductsTable(allProductsData, currentProductFilterCategory);
                populateProductCategoryFilter();
                populateProductCategorySelect(); // Re-poblar el selector de añadir producto
                // Filtrar productos para el gráfico basándose en la categoría y término de búsqueda actual
                const filteredProductsForChartAfterPageDelete = allProductsData.filter(p => {
                    const matchesCategory = currentProductFilterCategory === 'all' || p.category === currentProductFilterCategory;
                    const matchesSearch = currentProductSearchTerm === '' || p.name.toLowerCase().includes(currentProductSearchTerm.toLowerCase());
                    return matchesCategory && matchesSearch;
                });
                renderProductSalesChart(generateProductSalesData(filteredProductsForChartAfterPageDelete));
                renderKpiCards(generateKPIData());
            } else {
                displayMessageModal("Error: No se pudieron eliminar los productos de la página actual.");
            }
        }
    );
}

// NUEVO: Función para alternar la auto-actualización de KPIs
function toggleKpiAutoRefresh() {
    kpiAutoRefreshEnabled = !kpiAutoRefreshEnabled;
    const kpiRefreshStatusSpan = document.getElementById('kpi-refresh-status');
    if (kpiRefreshStatusSpan) {
        kpiRefreshStatusSpan.textContent = `Auto-actualizar: ${kpiAutoRefreshEnabled ? 'ON' : 'OFF'}`;
    }
    localStorage.setItem('kpiAutoRefreshEnabled', kpiAutoRefreshEnabled); // Guardar preferencia

    // Si se desactiva, limpiar el intervalo. Si se activa y estamos en el dashboard, iniciar.
    if (kpiRefreshInterval) {
        clearInterval(kpiRefreshInterval);
        kpiRefreshInterval = null;
    }
    if (kpiAutoRefreshEnabled && currentActivePageId === 'dashboard') {
        kpiRefreshInterval = setInterval(() => {
            console.log("Actualizando KPIs y gráfico de ventas mensuales automáticamente...");
            renderKpiCards(generateKPIData());
            renderMonthlySalesChart(generateMonthlySalesData());
        }, KPI_REFRESH_RATE);
    }
    displayMessageModal(`Auto-actualización de KPIs: ${kpiAutoRefreshEnabled ? 'Activada' : 'Desactivada'}`, false, null, 2000);
}


// Función de inicialización para agrupar las llamadas iniciales y event listeners
function initDashboard() {
    // Inicia en el dashboard
    showPage('dashboard');

    // Inicializar breadcrumbs
    renderBreadcrumbs();

    // Event listeners para la navegación del sidebar
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.dataset.page;
            if (pageId) {
                showPage(pageId);
            }
        });
    });

    // Event listener para el botón de recargar datos
    const reloadDataBtn = document.getElementById('reload-data-btn');
    if (reloadDataBtn) {
        reloadDataBtn.addEventListener('click', () => {
            loadPageData(currentActivePageId); // Recargar datos de la página actual
        });
    }

    // Event listener para el botón de cambio de tema
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            // Guardar preferencia del tema en localStorage
            if (document.body.classList.contains('dark-theme')) {
                localStorage.setItem('theme', 'dark');
            } else {
                localStorage.setItem('theme', 'light');
            }
            // Importante: Recargar la página actual para que los gráficos apliquen los nuevos colores
            loadPageData(currentActivePageId);
        });
    }

    // Cargar preferencia de tema al inicio
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
    }

    // NUEVO: Cargar preferencia de auto-actualización de KPIs al inicio
    const storedKpiAutoRefresh = localStorage.getItem('kpiAutoRefreshEnabled');
    if (storedKpiAutoRefresh !== null) {
        kpiAutoRefreshEnabled = JSON.parse(storedKpiAutoRefresh);
    }
    const kpiRefreshStatusSpan = document.getElementById('kpi-refresh-status');
    if (kpiRefreshStatusSpan) {
        kpiRefreshStatusSpan.textContent = `Auto-actualizar: ${kpiAutoRefreshEnabled ? 'ON' : 'OFF'}`;
    }

    // NUEVO: Event listener para el botón de alternar auto-actualización de KPIs
    const toggleKpiRefreshBtn = document.getElementById('toggle-kpi-refresh-btn');
    if (toggleKpiRefreshBtn) {
        toggleKpiRefreshBtn.addEventListener('click', toggleKpiAutoRefresh);
    }


    // Event listener para el filtro de rango de fechas
    const dateFilter = document.getElementById('date-range-filter');
    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            console.log(`Filtro de fecha cambiado a: ${dateFilter.value}. Recargando datos de la página actual...`);
            loadPageData(currentActivePageId); // Recargar datos de la página actual
        });
    } else {
        console.warn("Selector de filtro de fecha no encontrado.");
    }

    // Event listener para el filtro de categoría de producto
    const productCategoryFilter = document.getElementById('product-category-filter');
    if (productCategoryFilter) {
        productCategoryFilter.addEventListener('change', (event) => {
            currentProductFilterCategory = event.target.value;
            currentPage = 1; // Resetear a la primera página al cambiar el filtro
            renderTopProductsTable(allProductsData, currentProductFilterCategory);
            // Filtrar productos para el gráfico basándose en la nueva categoría y término de búsqueda
            const filteredProductsForChart = allProductsData.filter(p => {
                const matchesCategory = currentProductFilterCategory === 'all' || p.category === currentProductFilterCategory;
                const matchesSearch = currentProductSearchTerm === '' || p.name.toLowerCase().includes(currentProductSearchTerm.toLowerCase());
                return matchesCategory && matchesSearch;
            });
            renderProductSalesChart(generateProductSalesData(filteredProductsForChart)); // Actualizar gráfico con el nuevo filtro
        });
    } else {
        console.warn("Selector de filtro de categoría de producto no encontrado.");
    }

    // NUEVO: Event listener para el campo de búsqueda de productos
    const productSearchInput = document.getElementById('product-search-input');
    if (productSearchInput) {
        productSearchInput.addEventListener('input', (event) => {
            currentProductSearchTerm = event.target.value.trim();
            currentPage = 1; // Resetear a la primera página al cambiar el término de búsqueda
            renderTopProductsTable(allProductsData, currentProductFilterCategory);
            // Filtrar productos para el gráfico basándose en la categoría y término de búsqueda actual
            const filteredProductsForChart = allProductsData.filter(p => {
                const matchesCategory = currentProductFilterCategory === 'all' || p.category === currentProductFilterCategory;
                const matchesSearch = currentProductSearchTerm === '' || p.name.toLowerCase().includes(currentProductSearchTerm.toLowerCase());
                return matchesCategory && matchesSearch;
            });
            renderProductSalesChart(generateProductSalesData(filteredProductsForChart)); // Actualizar gráfico con el nuevo filtro
        });
    } else {
        console.warn("Campo de búsqueda de productos no encontrado.");
    }

    // Event listener para el botón "Volver a Regiones"
    const backToRegionsBtn = document.getElementById('back-to-regions-btn');
    if (backToRegionsBtn) {
        backToRegionsBtn.addEventListener('click', showMainRegionsChart);
    } else {
        console.warn("Botón 'back-to-regions-btn' no encontrado.");
    }

    // Event listeners para el modal de detalles de producto
    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeProductDetailModal);
    } else {
        console.warn("Botón de cerrar modal no encontrado.");
    }

    const productDetailModal = document.getElementById('product-detail-modal');
    if (productDetailModal) {
        // REMOVED: productDetailModal.addEventListener('click', (event) => { if (event.target === productDetailModal) { closeProductDetailModal(); } });
    } else {
        console.warn("Contenedor del modal de detalles de producto no encontrado.");
    }

    // Event listeners para el modal de edición de producto
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', closeEditProductModal);
    } else {
        console.warn("Botón de cerrar modal de edición no encontrado.");
    }

    const saveEditedProductBtn = document.getElementById('save-edited-product-btn');
    if (saveEditedProductBtn) {
        saveEditedProductBtn.addEventListener('click', saveEditedProduct);
    } else {
        console.warn("Botón de guardar cambios de edición no encontrado.");
    }

    const editProductModal = document.getElementById('edit-product-modal');
    if (editProductModal) {
        // REMOVED: editProductModal.addEventListener('click', (event) => { if (event.target === editProductModal) { closeEditProductModal(); } });
    } else {
        console.warn("Contenedor del modal de edición de producto no encontrado.");
    }

    // Event listener para el select de categoría en el modal de edición
    const editProductCategorySelect = document.getElementById('edit-product-category');
    const editNewCategoryInputContainer = document.getElementById('edit-new-category-input-container');
    const editNewProductCategoryInput = document.getElementById('edit-new-product-category');

    if (editProductCategorySelect && editNewCategoryInputContainer && editNewProductCategoryInput) {
        editProductCategorySelect.addEventListener('change', () => {
            if (editProductCategorySelect.value === 'other') {
                editNewCategoryInputContainer.classList.remove('hidden');
                editNewProductCategoryInput.setAttribute('required', 'true');
            } else {
                editNewCategoryInputContainer.classList.add('hidden');
                editNewProductCategoryInput.removeAttribute('required');
                editNewProductCategoryInput.value = ''; // Limpiar el input cuando se oculta
            }
        });
    } else {
        console.warn("Elementos de categoría de edición no encontrados.");
    }

    // Event listeners para paginación de la tabla de productos
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');

    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTopProductsTable(allProductsData, currentProductFilterCategory);
            }
        });
        nextPageBtn.addEventListener('click', () => {
            const filteredProducts = currentProductFilterCategory === 'all' ? allProductsData : allProductsData.filter(p => p.category === currentProductFilterCategory);
            const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTopProductsTable(allProductsData, currentProductFilterCategory);
            }
        });
    } else {
        console.warn("Botones de paginación no encontrados.");
    }

    // Event listeners para ordenamiento de la tabla de productos
    document.querySelectorAll('#products-content th[data-sort-by]').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sortBy;
            if (currentSortColumn === column) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = column;
                currentSortDirection = 'asc'; // Por defecto asc cuando se cambia de columna
            }
            renderTopProductsTable(allProductsData, currentProductFilterCategory);
        });
    });

    // --- Event Listener para el botón de Exportar CSV ---
    const exportProductsCsvBtn = document.getElementById('export-products-xml-btn');
    if (exportProductsCsvBtn) {
        exportProductsCsvBtn.addEventListener('click', () => {
            if (currentPaginatedProducts.length > 0) {
                const csvContent = convertProductsToCsv(currentPaginatedProducts);
                downloadFile('productos_pagina_actual.csv', csvContent, 'text/csv');
                console.log("Archivo productos_pagina_actual.csv generado y descargado.");
            } else {
                displayMessageModal("No hay datos de productos para exportar en la página actual.");
            }
        });
    } else {
        console.warn("Botón 'export-products-xml-btn' (o su equivalente para CSV) no encontrado. Asegúrate de que el ID en tu HTML sea correcto.");
    }

    // --- Event Listener para el formulario de Añadir Producto ---
    const addProductForm = document.getElementById('add-product-form');
    const productCategorySelect = document.getElementById('product-category');
    const newCategoryInputContainer = document.getElementById('new-category-input-container');
    const newProductCategoryInput = document.getElementById('new-product-category');

    if (addProductForm && productCategorySelect && newCategoryInputContainer && newProductCategoryInput) {
        // Populate the category select initially
        populateProductCategorySelect();

        // Event listener for category select change
        productCategorySelect.addEventListener('change', () => {
            if (productCategorySelect.value === 'other') {
                newCategoryInputContainer.classList.remove('hidden');
                newProductCategoryInput.setAttribute('required', 'true');
            } else {
                newCategoryInputContainer.classList.add('hidden');
                newProductCategoryInput.removeAttribute('required');
                newProductCategoryInput.value = ''; // Clear the input when hidden
            }
        });

        // Obtener los campos de input
        const quantitySoldInput = document.getElementById('product-quantity-sold');
        const costPerUnitInput = document.getElementById('product-cost-per-unit');
        const revenueGeneratedInput = document.getElementById('product-revenue-generated');

        // Función para calcular y actualizar los ingresos generados
        const calculateRevenue = () => {
            const quantity = parseFloat(quantitySoldInput.value) || 0;
            const cost = parseFloat(costPerUnitInput.value) || 0;
            const revenue = quantity * cost;
            revenueGeneratedInput.value = revenue.toFixed(2); // Formatear a 2 decimales
        };

        // Añadir event listeners a los campos de cantidad vendida y costo por unidad
        if (quantitySoldInput) {
            quantitySoldInput.addEventListener('input', calculateRevenue);
        }
        if (costPerUnitInput) {
            costPerUnitInput.addEventListener('input', calculateRevenue);
        }


        addProductForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Evitar el envío por defecto del formulario

            const name = document.getElementById('product-name').value;
            const quantitySold = parseInt(quantitySoldInput.value);
            const revenueGenerated = parseFloat(revenueGeneratedInput.value); // Usar el valor calculado
            const costPerUnit = parseFloat(costPerUnitInput.value);
            let category = productCategorySelect.value;

            // Si se seleccionó "Otra", tomar el valor del nuevo input
            if (category === 'other') {
                category = newProductCategoryInput.value.trim();
                if (!category) {
                    displayMessageModal("Por favor, introduce una nueva categoría.");
                    return;
                }
                // Añadir la nueva categoría a la lista predefinida si no existe
                if (!predefinedCategories.includes(category)) {
                    predefinedCategories.push(category);
                    predefinedCategories.sort(); // Mantener la lista ordenada
                }
            }

            // Validación básica
            if (!name || isNaN(quantitySold) || isNaN(revenueGenerated) || isNaN(costPerUnit) || !category) {
                displayMessageModal("Por favor, rellena todos los campos correctamente.");
                return;
            }
            if (quantitySold < 0 || revenueGenerated < 0 || costPerUnit < 0) {
                displayMessageModal("Cantidad Vendida, Ingresos Generados y Costo por Unidad no pueden ser números negativos.");
                return;
            }
            if (costPerUnit > (revenueGenerated / quantitySold) && quantitySold > 0) {
                 displayMessageModal("El costo por unidad no puede ser mayor que el ingreso por unidad.");
                 return;
            }


            // Generar un ID único simple (puedes usar una estrategia más robusta si es necesario)
            const newProductId = allProductsData.length > 0 ? Math.max(...allProductsData.map(p => p.id)) + 1 : 1;

            const newProduct = {
                id: newProductId,
                name: name,
                quantitySold: quantitySold,
                revenueGenerated: revenueGenerated,
                costPerUnit: costPerUnit, // Añadir el costo al nuevo producto
                category: category
            };

            allProductsData.push(newProduct);
            saveProductsToLocalStorage(); // Guardar los datos actualizados

            // Re-renderizar la tabla de productos para mostrar el nuevo producto
            renderTopProductsTable(allProductsData, currentProductFilterCategory);
            populateProductCategoryFilter(); // Actualizar el filtro de categorías
            populateProductCategorySelect(); // Re-poblar el selector de añadir producto para incluir la nueva categoría
            // Filtrar productos para el gráfico basándose en la categoría y término de búsqueda actual
            const filteredProductsForChartAfterAdd = allProductsData.filter(p => {
                const matchesCategory = currentProductFilterCategory === 'all' || p.category === currentProductFilterCategory;
                const matchesSearch = currentProductSearchTerm === '' || p.name.toLowerCase().includes(currentProductSearchTerm.toLowerCase());
                return matchesCategory && matchesSearch;
            });
            renderProductSalesChart(generateProductSalesData(filteredProductsForChartAfterAdd)); // Actualizar gráfico con filtro actual
            renderKpiCards(generateKPIData()); // IMPORTANTE: Recalcular y renderizar los KPIs

            // Limpiar el formulario
            addProductForm.reset();
            displayMessageModal(`Producto "${name}" añadido exitosamente!`, false, null, 2000);
        });
    } else {
        console.warn("Formulario 'add-product-form' o elementos de categoría no encontrados.");
    }

    // Event listener para el input de archivo CSV
    const csvFileInput = document.getElementById('csv-file-input');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleCsvFileUpload);
    } else {
        console.warn("Input de archivo CSV no encontrado: 'csv-file-input'.");
    }

    // Event listener para el botón de eliminar todos los productos
    const clearProductsBtn = document.getElementById('clear-products-btn');
    if (clearProductsBtn) {
        clearProductsBtn.addEventListener('click', clearAllProductsData);
    } else {
        console.warn("Botón 'clear-products-btn' no encontrado.");
    }

    // NUEVO: Event listener para el botón de eliminar productos de la página actual
    const deletePageProductsBtn = document.getElementById('delete-current-page-products-btn');
    if (deletePageProductsBtn) {
        deletePageProductsBtn.addEventListener('click', deleteCurrentPageProducts);
    } else {
        console.warn("Botón 'delete-current-page-products-btn' no encontrado.");
    }
}

// Llama a la función de inicialización cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    const storedData = localStorage.getItem('allProductsData');
    if (storedData === null) { // Solo generar si no hay nada almacenado (primer inicio)
        console.log("No se encontraron productos en localStorage, generando datos simulados.");
        allProductsData = generateTopProductsData();
        saveProductsToLocalStorage();
    } else {
        // Los datos existen, cargarlos.
        try {
            allProductsData = JSON.parse(storedData);
            // Si allProductsData es un array vacío, significa que fue borrado intencionalmente.
            // No es necesario regenerar datos en este caso.
            if (allProductsData.length === 0) {
                console.log("Productos cargados desde localStorage (tabla vacía).");
            } else {
                // Asegura que todos los productos tengan la propiedad costPerUnit para compatibilidad
                allProductsData = allProductsData.map(product => {
                    if (product.costPerUnit === undefined || product.costPerUnit === 0) {
                        const simulatedCost = product.quantitySold > 0
                            ? getRandomNumber(product.revenueGenerated / product.quantitySold * 0.4, product.revenueGenerated / product.quantitySold * 0.8, 2)
                            : getRandomNumber(1, 10, 2);
                        return { ...product, costPerUnit: simulatedCost };
                    }
                    return product;
                });
                console.log("Productos cargados desde localStorage.");
            }
        } catch (e) {
            console.error("Error al cargar productos desde localStorage:", e);
            displayMessageModal("Advertencia: No se pudieron cargar los productos guardados. Se usarán datos nuevos.");
            allProductsData = generateTopProductsData(); // Regenerar si hay un error de parseo
            saveProductsToLocalStorage();
        }
    }
    initDashboard(); // Llama a la función de inicialización del dashboard
});
