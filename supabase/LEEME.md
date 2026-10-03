# Base de datos en Supabase

La página ya no usa la API del curso (`servicios.campus.pe`): usa una base de datos propia en
[Supabase](https://supabase.com) (PostgreSQL + API + login).

## Archivos

| Archivo | Qué hace |
|---|---|
| `01_esquema.sql` | Crea las tablas, los roles (`cliente` / `admin`) y las reglas de seguridad |
| `02_datos.sql` | Carga los datos iniciales (8 categorías, 81 productos, 40 directores, 29 proveedores, 24 empleados) |

## Pasos para crear la base (una sola vez)

1. Entrar a <https://supabase.com> → **Start your project** → iniciar sesión con GitHub.
2. **New project**
   - Name: `ideas-digitales-tienda`
   - Database Password: pulsar **Generate a password** y guardarla en un lugar seguro
     (no se usa en la página, pero se necesita para administrar la base).
   - Region: **South America (São Paulo)** (la más cercana a Perú).
   - Pulsar **Create new project** y esperar 1–2 minutos.
3. Menú izquierdo → **SQL Editor** → **New query** → pegar todo `01_esquema.sql` → **Run**.
   Debe decir *Success. No rows returned*.
4. **New query** otra vez → pegar todo `02_datos.sql` → **Run**.
5. Comprobar: menú izquierdo → **Table Editor** → deben aparecer las tablas con datos.
6. Copiar los datos de conexión: **Project Settings** (engranaje) → **API Keys** / **Data API**:
   - **Project URL** (algo como `https://abcdxyz.supabase.co`)
   - **anon / publishable key** (empieza con `eyJ...` o `sb_publishable_...`)

   Estos dos valores **sí pueden ir en el código de la página** (son públicos; la seguridad la dan
   las reglas del paso 3).

> ⚠️ **Nunca** pongas en la página ni compartas la **service_role / secret key** ni la contraseña
> de la base: con ellas se saltan todas las reglas de seguridad.

## Cómo volverse administrador

Las cuentas nuevas siempre se crean como `cliente`. Para que una cuenta sea `admin`, después de
registrarla en la página se ejecuta en el **SQL Editor** (cambiando el correo):

```sql
update perfiles set rol = 'admin'
where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
```

## Notas

- Si vuelves a ejecutar `01_esquema.sql`, se borran todas las tablas y los roles; luego hay que
  ejecutar de nuevo `02_datos.sql` y volver a asignar el admin.
- El plan gratuito **pausa el proyecto tras 1 semana sin uso**. Se reactiva desde el panel de
  Supabase con **Restore project**; conviene hacerlo antes de una presentación.
- Las imágenes todavía se leen del servidor del curso; en una fase posterior se subirán a
  Supabase Storage.
