# Informe — El Galpón del Costo
### Tienda web de abarrotes con servicio externo (Supabase: PostgreSQL + PostgREST + Auth)

> Plantilla consolidada por el **Integrante 5**. Cada integrante completa **su sección** con:
> **objetivo**, **cómo funciona** y **capturas**. No cambiar los títulos para que el índice quede igual.

## Índice
1. Introducción y arquitectura
2. Módulo 1 — API REST con CRUD (Integrante 1)
3. Módulo 2 — Mapa interactivo (Integrante 2)
4. Módulo 3 — Migración y almacenamiento persistente (Integrante 3)
5. Módulo 4 — Login / Register con roles (Integrante 4)
6. Módulo 5 — Integración, monitoreo, diseño adaptable y pruebas (Integrante 5)
7. Conclusiones
8. Anexos: archivos entregados

---

## 1. Introducción y arquitectura

El Galpón del Costo vende abarrotes por unidad y por mayor en tres sedes de Lima (Miraflores, San Isidro
y Callao). La página es una aplicación de una sola página (HTML + Bootstrap + JavaScript) que usa
**Supabase** como servicio externo:

```
Navegador (index.html + js/main.js + js/pages/*.js)
   │  supabase-js (clave publishable)
   ▼
Supabase ── PostgREST (API REST automática de cada tabla/vista)
         ── Auth (cuentas, sesiones)
         ── PostgreSQL (tablas, vistas, funciones, RLS)
Leaflet ── OpenStreetMap (mapa de sedes)
```

La seguridad no depende de la página: la aplican las **reglas RLS** de la base según el rol de quien consulta.

**Roles.** El enunciado pide *administrador* y *operador*. Tenemos **cliente**, **asesor** y
**administrador**: el **asesor cumple la función de operador**, porque atiende pedidos y solicitudes
(solo los suyos) sin acceso a inventario, proveedores ni gestión del equipo.

| Rol | Puede |
|---|---|
| Visitante | Ver catálogo, sedes y equipo comercial |
| Cliente | Comprar, ver sus pedidos, pedir asesor mayorista |
| Asesor (operador) | Ver y atender sus solicitudes y pedidos asignados |
| Administrador | Todo: indicadores, monitoreo, CRUD de productos, pedidos, proveedores y equipo |

## 2. Módulo 1 — API REST con CRUD *(Integrante 1)*

**Objetivo:** _completar_

**Cómo funciona:** _completar (PostgREST + supabase-js; ejemplos de `select`, `insert`, `update`, `delete`)_

**Tabla de endpoints:**

| Método | Endpoint (PostgREST) | supabase-js | Rol | Descripción |
|---|---|---|---|---|
| GET | `/rest/v1/productos` | `db.from("productos").select()` | Público | _completar_ |
| … | | | | |

**Capturas:** _completar_

## 3. Módulo 2 — Mapa interactivo *(Integrante 2)*

**Objetivo:** _completar_ · **Cómo funciona:** _completar_ · **Capturas:** _completar_

## 4. Módulo 3 — Migración y almacenamiento persistente *(Integrante 3)*

**Objetivo:** _completar_ · **Cómo funciona:** _completar (orden de los scripts 01–06, vistas, RLS, datos de prueba)_ · **Capturas:** _completar_

## 5. Módulo 4 — Login / Register con roles *(Integrante 4)*

**Objetivo:** _completar_ · **Cómo funciona:** _completar (Auth + `perfiles.rol`, páginas protegidas)_ · **Capturas:** _completar_

## 6. Módulo 5 — Integración, monitoreo, diseño adaptable y pruebas *(Integrante 5)*

### Objetivo
Unir los cuatro módulos en una sola aplicación que funcione sobre la misma base, vigilar su
funcionamiento (monitoreo), asegurar que se use bien en celular, tablet y escritorio, y comprobarlo
con un plan de pruebas por rol.

### Cómo funciona

**a) Integración.** Todas las secciones se cargan dentro de `index.html` por `main.js`
(`irAPagina()`), comparten la conexión `db` de Supabase, las funciones comunes (`obtenerDatos`,
`escaparHTML`, `soles`) y la sesión del usuario (`usuarioActual`). Al probar todo junto se encontró y corrigió:

| Problema encontrado | Corrección |
|---|---|
| El mapa tenía las sedes escritas a mano, distintas a las de la base | `mapa.js` ahora lee la tabla `sedes` (la misma que usan Checkout y Directores) y sus coordenadas; con respaldo si la base no responde |
| El texto del mapa se insertaba sin escapar | Se usa `escaparHTML()` como en el resto de la app |
| El mapa no mostraba las 3 sedes en pantallas pequeñas | `fitBounds()` ajusta el zoom a las 3 sedes |

**b) Monitoreo** (`js/main.js`, `pages/monitoreo-admin.html`, `supabase/06_monitoreo.sql`)

1. **Registro automático de errores.** Cualquier error de JavaScript, promesa sin `catch` o error que
   devuelva la base (`obtenerDatos`) se registra con fecha, sección y navegador:
   - en el navegador (`sessionStorage`, últimos 50) y
   - en la tabla `registro_eventos` de Supabase. Por RLS **cualquiera puede insertar** (solo a su nombre)
     pero **solo el admin puede leer o borrar**. Máximo 20 envíos por sesión para no saturar la base.
2. **Estado del sistema** (Intranet → *Monitoreo y alertas*). Prueba en vivo cada servicio externo
   y mide su tiempo de respuesta (verde = en línea, ámbar = lento > 1,5 s, rojo = falla):

   | Chequeo | Qué prueba |
   |---|---|
   | Base de datos (API REST) | PostgREST responde y cuenta los productos |
   | Inicio de sesión (Auth) | El token de la sesión es válido |
   | Permisos por rol (RLS) | El admin sí ve los proveedores (que el público no ve) |
   | Funciones de la base (RPC) | `indicadores_diarios()` responde |
   | Mapa (OpenStreetMap) | Las imágenes del mapa cargan |
   | Registro de errores | La tabla `registro_eventos` existe |

3. **Resumen técnico** con la función `estado_sistema()` (solo admin): tamaño de la base, clientes,
   asesores, pedidos de hoy y errores de las últimas 24 h.
4. **Alertas del negocio** (ya existentes): productos agotados o por reponer y pedidos por atender;
   la página se actualiza sola cada minuto.

**c) Diseño adaptable.** Bootstrap 5 (rejilla y puntos de quiebre `sm/md/lg`) + reglas propias en
`css/style.css`. Revisado en 375 px, 768 px y 1280 px: ninguna página tiene scroll horizontal; en
celular la barra de categorías pasa al menú ☰, el buscador baja a una segunda fila, las tablas se
deslizan dentro de su recuadro y el mapa ajusta su alto a la pantalla. Se corrigió un desborde de 12 px
en *Nosotros*.

**d) Pruebas de todo junto.** Plan por rol en `docs/PRUEBAS.md` (visitante, cliente, asesor/operador,
administrador y diseño adaptable), con resultado esperado y estado de cada caso.

### Capturas
_Pegar:_ (1) Monitoreo con los 6 chequeos en verde · (2) Errores registrados · (3) Tienda en celular ·
(4) Mapa en celular · (5) Página "No tienes acceso" para un rol sin permiso.

## 7. Conclusiones
_Completar entre todos._

## 8. Anexos: archivos entregados

| Carpeta / archivo | Contenido |
|---|---|
| `index.html`, `css/`, `js/`, `pages/`, `img/` | Código de la aplicación |
| `supabase/01_esquema.sql` … `06_monitoreo.sql` | Scripts SQL (tablas, vistas, RLS, datos, monitoreo) |
| `supabase/LEEME.md` | Cómo instalar la base |
| `docs/PRUEBAS.md` | Plan y resultados de pruebas |
| `docs/INFORME.md` / PPT | Este informe y la presentación |
