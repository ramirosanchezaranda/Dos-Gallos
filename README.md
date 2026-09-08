# Dos Gallos — Control de stock

App web (PWA) para la pollería Dos Gallos: carga de ventas leyendo el ticket
de la balanza, control de stock, gastos, facturas y pendientes.

## Arrancar

```bash
npm install
cp .env.example .env    # completar con las credenciales de Supabase
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build` | build de producción |
| `npm test` | tests del parser de tickets |
| `npm run test:watch` | tests en modo watch |

## Cómo funciona la carga de ventas

La balanza **no imprime el nombre del producto**. Su ticket es así:

```
        DOS GALLOS
   23 DE JUNIO 4417
FECHA:02/02/14      T.1508
HORA: 08:30

  0.430kg @ 4000.00$/kg
                1720.00$
01 ART.  TOTAL =  1720.00$
```

Solo peso, precio por kilo e importe. Por eso el flujo es:

1. **Foto del ticket** desde el celular.
2. **Preprocesado** (`src/lib/ocr/preprocess.ts`): gris + umbral adaptativo.
   Sin esto el OCR falla sobre papel térmico fotografiado con sombra.
3. **OCR** (`src/lib/ocr/`): Tesseract.js en el navegador, detrás de una
   interfaz intercambiable por si más adelante se enchufa IA de visión.
4. **Parser** (`src/lib/ticket/parseTicket.ts`): extrae peso, $/kg, importe,
   total, número de ticket y código de barras.
5. **El usuario elige el producto** buscando por nombre o de la lista. El
   precio leído se usa solo para ordenar la lista, nunca para decidir.
6. **Confirmar** → `registrar_venta()` en Postgres: venta + ítems + descuento
   de stock en una sola transacción.

### Por qué el producto se elige a mano

Al cargar el catálogo real quedaron **7 precios compartidos por 18 productos**:

| Precio | Productos |
|---|---|
| $12.000 | Chorizo · Papas caritas · Papas noisette · Salchichón Viena |
| $9.500 | Cortes de jamón · Mila de soja y espinaca · Morcilla |
| $4.900 | Pata y muslo · Pollo entero · Provoleta |
| $8.300 | Costillitas de cerdo · Pechito de cerdo |
| $9.900 | Bondiola · Medallones (Espinaca / JyQ) |
| $11.000 | Hamburguesa de pollo · Nuggets (Granjys) |
| $13.000 | Arrollado de pollo · Matambre |

El precio por sí solo no alcanza para identificar el producto, así que la app
lo sugiere pero no lo decide.

### Ofertas

Cada producto tiene un segundo precio opcional (`precio_oferta`) más la
condición que hay que cumplir (`oferta_detalle`, del estilo "Llevando 2").

`precio_oferta` es **siempre un precio unitario**: el maple de huevos a 2×$10.000
se carga como $5.000 con la condición "Llevando 2", no como $10.000. Así el
subtotal del renglón sigue siendo `cantidad × precio` sin casos especiales.

En la venta, el selector ordena por el precio más cercano mirando los dos, y el
renglón muestra un interruptor lista/oferta. Si los dos precios son iguales gana
la oferta: cobra el mismo importe y deja registrado que se aplicó.

### La red de seguridad del parser

El ticket imprime tres números ligados por `peso × precio = importe`. Si el
OCR arruina uno, los otros dos lo reconstruyen. Eso, más la validación contra
el total y el contador de artículos, da el nivel de confianza que se muestra
en la pantalla de revisión.

## Base de datos

Proyecto Supabase `dos-gallos-stock` (región `sa-east-1`).

```
categorias · productos · movimientos_stock
ventas · venta_items
proveedores · gastos · facturas
tareas
```

RLS activo en todas las tablas. No alcanza con estar autenticado: hay que
figurar en `miembros`, que se carga a mano desde el panel de Supabase. La app
está en una URL pública, así que registrarse por su cuenta no da acceso a nada.

La venta se registra con la función `registrar_venta(p_items, ...)`, que es
transaccional y `SECURITY INVOKER`, o sea que también pasa por RLS.

Para regenerar los tipos desde el esquema:

```bash
npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
```

## Marca

Colores y tipografía tomados de los materiales de la pollería:

| Token | Valor |
|---|---|
| `verde-800` | `#104018` — fondo de tarjetas y barra inferior |
| `verde-700` | `#14451C` — verde del logo, botones |
| `verde-900` | `#0F2B14` — texto |
| `hueso` | `#FDFFFD` — fondo |
| `alerta` | `#C2410C` — stock bajo, vencimientos |

Tipografía: **Poppins**. Definida como variable CSS en `src/index.css`, así
que cambiarla es editar una línea.

## Estructura

```
src/
├── components/     UI compartida (layout, nav, selector de producto)
├── hooks/          auth y acceso a datos con TanStack Query
├── lib/
│   ├── ocr/        preprocesado y motor de OCR intercambiable
│   ├── ticket/     parser del ticket + tests
│   ├── formato.ts  números y fechas en formato argentino
│   └── supabase.ts cliente
├── pages/          una por sección
└── types/          tipos del dominio
```
