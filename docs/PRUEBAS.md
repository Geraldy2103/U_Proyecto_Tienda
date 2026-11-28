# Plan de pruebas integrales — El Galpón del Costo

Responsable: **Integrante 5** (integración, monitoreo, diseño adaptable y pruebas).
Objetivo: comprobar que los 4 módulos funcionan **juntos** sobre la misma base de datos:

| Módulo | Integrante | Qué se prueba en conjunto |
|---|---|---|
| API REST / CRUD (PostgREST + supabase-js) | 1 | Productos y pedidos se leen y modifican desde la página |
| Mapa (Leaflet + OpenStreetMap) | 2 | Las sedes del mapa salen de la tabla `sedes` |
| Migración SQL (tablas, vistas, RLS, datos) | 3 | Los scripts crean todo y la app se conecta |
| Login / Register con roles | 4 | Cada rol ve solo sus páginas |

> **Roles:** el enunciado pide *administrador* y *operador*. Nosotros tenemos **cliente**, **asesor**
> y **administrador**; el **asesor cumple la función de operador** (atiende pedidos y solicitudes,
> pero solo los suyos y sin acceso a inventario, proveedores ni equipo comercial).

## 0. Preparación

1. En Supabase > SQL Editor ejecutar, en orden: `01_esquema.sql`, `02_datos.sql`, `05_rol_asesor.sql`,
   `04_indicadores_diarios.sql`, `06_monitoreo.sql` y (opcional) `03_demo.sql`.
2. Crear 3 cuentas desde **Ingresar → Crear cuenta**: `cliente`, `asesor` y `admin`.
3. Dar el rol admin a una (`update perfiles set rol='admin' ...`, ver `supabase/LEEME.md`) y, como admin,
   usar **Asesores comerciales → Dar acceso** para la cuenta del asesor (su correo debe estar en `asesores`).
4. Abrir la página con un servidor local (Live Server de VS Code, o `node .claude/servidor-local.js`
   → http://localhost:5500). **No** abrir `index.html` con doble clic: `fetch()` no funciona con `file://`.

Marcar cada caso con ✅ / ❌ y pegar la captura en el informe.

## 1. Visitante (sin sesión)

| # | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| V1 | Catálogo desde la base | Abrir Tienda | Se listan los productos con precio y stock (lectura pública por RLS) | ✅ |
| V2 | Búsqueda | Escribir "leche" y Enter | Solo productos que coinciden | |
| V3 | Mapa de sedes | ☰ → Conócenos → Sedes | 3 marcadores (Miraflores, San Isidro, Callao) con la dirección de la tabla `sedes`; al tocar una sede el mapa se acerca | ✅ |
| V4 | Compra sin cuenta | Tocar "Agregar" en un producto | Aviso "Inicia sesión…" y se abre Ingresar | |
| V5 | Página protegida | En consola: `irAPagina("Indicadores")` | "No tienes acceso a esta sección." | ✅ |
| V6 | RLS de costos | En consola: `await db.from("proveedores").select("*")` | Error de permiso / 0 filas: el público no ve proveedores | ✅ |

## 2. Cliente

| # | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| C1 | Registro | Crear cuenta con nombre, correo y clave | Sesión abierta, menú con iniciales, rol cliente | |
| C2 | Login erróneo | Clave incorrecta | "Correo o contraseña incorrectos." | |
| C3 | Carrito | Agregar 2 productos, cambiar cantidades | Contador del menú se actualiza; no permite más que el stock | |
| C4 | Pedido (CRUD: crear) | Finalizar compra → recojo en sede → pagar con tarjeta 4111 1111 1111 1111 | Pedido "En preparación"; el stock del producto baja | |
| C5 | Delivery | Finalizar compra con delivery a Lima | Envío S/ 10 calculado por la base | |
| C6 | Mis pedidos | Abrir Mis pedidos | Solo aparecen **sus** pedidos (RLS) | |
| C7 | Sin intranet | Abrir menú de cuenta | No aparece la sección Intranet | |
| C8 | Mayorista | 12+ unidades de un producto → Asesores → elegir asesor | Solicitud enviada al asesor elegido | |

## 3. Asesor (operador)

| # | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| A1 | Login | Ingresar con la cuenta del asesor | Abre "Mi panel comercial" | |
| A2 | Solo lo suyo | Mis solicitudes / Mis pedidos asignados | Solo los asignados a ese asesor | |
| A3 | Atender | Cambiar el estado de una solicitud | Se guarda; el cliente lo ve en Mis pedidos | |
| A4 | Sin admin | `irAPagina("Productos")` | "No tienes acceso a esta sección." | |

## 4. Administrador

| # | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| D1 | Login | Ingresar como admin | Abre Indicadores; menú Intranet completo | |
| D2 | CRUD productos | Crear, editar precio/stock y eliminar un producto | Cambios visibles al instante en la Tienda | |
| D3 | CRUD pedidos | Pedidos → marcar entregado / anular | Al anular, el stock vuelve | |
| D4 | Equipo | Crear un 4.º director en una sede | La base lo rechaza (máx. 3 por sede) | |
| D5 | **Monitoreo** | Intranet → Monitoreo y alertas | 6 chequeos "En línea", resumen del sistema y alertas de stock/pedidos | |
| D6 | **Registro de errores** | Como visitante, en consola: `obtenerDatos(db.from("no_existe").select())`; luego como admin abrir Monitoreo | El error aparece en "Errores registrados" con la sección y la hora | |

## 5. Diseño adaptable

Probar en 375 px (celular), 768 px (tablet) y 1280 px (escritorio) con las herramientas de desarrollo (F12 → 📱).

| # | Caso | Resultado esperado | Estado |
|---|---|---|---|
| R1 | Ninguna página tiene scroll horizontal | El ancho de la página = ancho de la pantalla (revisado en todas las públicas y de la intranet) | ✅ |
| R2 | Menú en celular | Barra de categorías se cambia por ☰; buscador en segunda fila | ✅ |
| R3 | Tablas de la intranet | Se deslizan dentro de su recuadro, sin romper la página | ✅ |
| R4 | Mapa | Alto adaptable (300–480 px); al tocar una sede en celular se desplaza al mapa | ✅ |
| R5 | Nosotros | Corregido: la fila con separación `g-5` se salía 12 px en celular | ✅ |

## 6. Resultados de la integración (lo que se corrigió)

- **Mapa ↔ base de datos:** el mapa tenía las sedes escritas a mano con direcciones genéricas. Ahora lee la
  tabla `sedes` (misma fuente que Checkout y Directores), usa `latitud/longitud` si existen
  (`06_monitoreo.sql`) y tiene respaldo si la base no responde. También escapa el texto (seguridad XSS).
- **Diseño adaptable:** desborde horizontal en *Nosotros* corregido; mapa con alto adaptable;
  tablas y avisos compactos en celular.
- **Monitoreo:** registro automático de errores (JavaScript y base de datos) y panel de estado del sistema.
