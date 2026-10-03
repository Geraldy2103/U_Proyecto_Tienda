# Base de datos en Supabase

La página usa una base de datos propia en [Supabase](https://supabase.com) (PostgreSQL + API + login).

## Modelo de datos

```
sedes (3) ──< directores (máx. 3 por sede) ──< asesores (máx. 10 en total)
                                                   │
perfiles ──< pedidos ──< pedido_detalle            │
   │            └── idasesor (solo pedidos mayoristas) ┘
   └──< solicitudes_mayoristas ── idasesor

categorias ──< productos >── proveedores (solo admin)
                (costo, stock, stock mínimo)
```

| Tabla / vista | Para qué sirve |
|---|---|
| `categorias`, `productos` | Catálogo de la tienda, con proveedor, **costo (simulado)**, stock y stock mínimo. La columna `costo` no la puede leer el público (permiso por columna) |
| `productos_admin` (vista) | Productos con costo, precio final y ganancia unitaria; solo devuelve filas al admin |
| `proveedores` | Proveedores (solo los ve el admin). La relación producto-proveedor es la de la base Northwind |
| `resumen_proveedores` (vista) | Por proveedor: productos, productos por reponer, unidades vendidas, ventas y margen |
| `productos_por_reponer` (vista) | Productos en su stock mínimo o por debajo, con el contacto del proveedor |
| `sedes` | Miraflores, San Isidro y Callao |
| `directores` | Directores de venta: máximo 3 por sede |
| `asesores` | Asesores comerciales: máximo 10; cada uno pertenece a un director (y a su sede) |
| `perfiles` | Rol de cada cuenta: `cliente` o `admin` |
| `pedidos`, `pedido_detalle` | Ventas. Se registran con la función `confirmar_pedido` |
| `solicitudes_mayoristas` | Clientes que pidieron hablar con un asesor (12+ unidades por producto) |
| `resumen_asesores` (vista) | Solicitudes, pedidos y ventas de cada asesor |
| `ventas_por_sede` (vista) | Ventas minoristas y mayoristas por sede |

### Reglas que aplica la base de datos (no solo la página)

- Máximo **3 directores por sede** y **10 asesores** en total (triggers).
- No se puede borrar un director que todavía tiene asesores.
- Una solicitud mayorista solo acepta productos con **12 unidades o más**.
- `confirmar_pedido` calcula precios y total con los precios del catálogo (el navegador no los puede
  cambiar) y solo permite asignar un asesor si el pedido es mayorista; en ese caso la venta queda en
  la sede del asesor.
- `confirmar_pedido` también **descuenta el stock** y rechaza el pedido si no alcanza. Guarda el
  costo de cada producto para calcular el margen. Si el admin anula un pedido, el stock se devuelve.
- Visitantes: solo leen el catálogo y el equipo comercial. Clientes: ven sus propios pedidos y
  solicitudes. Admin: ve y modifica todo.

## Archivos

| Archivo | Qué hace |
|---|---|
| `01_esquema.sql` | Crea tablas, reglas, roles, la función de pedidos y las vistas de indicadores |
| `02_datos.sql` | Datos iniciales: 8 categorías, 81 productos, 29 proveedores, 3 sedes, 9 directores, 10 asesores |
| `03_demo.sql` | **Opcional.** 80 pedidos y solicitudes de ejemplo para que los Indicadores tengan datos |

## Pasos (en Supabase > SQL Editor > New query)

1. Pegar todo `01_esquema.sql` → **Run** (si pregunta por operaciones destructivas: **Run query**).
2. Pegar todo `02_datos.sql` → **Run**.
3. Volver a darte el rol admin (cambia el correo):

   ```sql
   update perfiles set rol = 'admin'
   where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
   ```

4. *(Opcional)* Pegar `03_demo.sql` → **Run**. Necesita que exista al menos una cuenta.

Datos de conexión (van en `js/main.js`): **Project Settings → API Keys** → Project URL y la clave
**publishable**. Son públicas a propósito; la seguridad la dan las reglas de la base.

> ⚠️ **Nunca** pongas en la página ni compartas la **secret / service_role key** ni la contraseña
> de la base: con ellas se saltan todas las reglas de seguridad.

## Notas

- Volver a ejecutar `01_esquema.sql` borra todas las tablas (incluidos pedidos y solicitudes). Las
  cuentas de usuario se conservan, pero el rol admin hay que asignarlo otra vez (paso 3).
- Para quitar solo los datos de demostración: `delete from pedidos; delete from solicitudes_mayoristas;`
- El plan gratuito **pausa el proyecto tras 1 semana sin uso**. Se reactiva desde el panel de
  Supabase con **Restore project**; conviene hacerlo antes de una presentación.
- Las imágenes todavía se leen del servidor del curso; en una fase posterior se subirán a
  Supabase Storage.
