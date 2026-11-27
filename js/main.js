"use strict"

/* ---------- Conexión con la base de datos (Supabase) ---------- */
/* La URL y la clave "publishable" son públicas a propósito: lo que cada visitante puede hacer
   lo deciden las reglas de seguridad de la base (ver supabase/01_esquema.sql).
   NUNCA poner aquí la clave "secret" / "service_role". */
const SUPABASE_URL = "https://jihuusyseitojyboxkqb.supabase.co"
const SUPABASE_CLAVE = "sb_publishable_H1VxMhB0pJOt2sCptESbqw_gDyCAz2I"
const db = supabase.createClient(SUPABASE_URL, SUPABASE_CLAVE) /*"db" es el objeto con el que consultamos las tablas*/

/* Imagen que se muestra cuando un producto no tiene foto */
const IMAGEN_SIN_FOTO = "https://servicios.campus.pe/imagenes/nofoto.jpg"

/* ---------- Funciones compartidas (las usan todos los js/pages/*.js) ---------- */

/* Ejecuta una consulta de Supabase y devuelve solo los datos.
   Supabase no lanza error si algo falla: responde { data, error }.
   Si viene un error lo lanzamos nosotros, así funciona el .catch() de cada página.
   Ejemplo: obtenerDatos(db.from("proveedores").select("*")) */
const obtenerDatos = (consulta) => {
    return consulta.then(({ data, error }) => {
        if (error) {
            throw error
        }
        return data
    })
}

/* Convierte un error de la base de datos en un mensaje para el usuario.
   P0001 = mensaje escrito por nosotros en la base (ej. "La sede ya tiene 3 directores...")
   23503 = el registro está relacionado con otros (ej. borrar un director que tiene asesores) */
const mensajeDeLaBase = (error, porDefecto) => {
    if (error && error.code === "P0001") return error.message
    if (error && error.code === "23503") return "No se puede completar: el registro está relacionado con otros datos."
    return porDefecto
}

/* Formato de moneda: 1234.5 -> "S/ 1,234.50" */
const soles = (monto) => "S/ " + Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* .select() al final de un insert/update/delete devuelve las filas afectadas.
   Si no se afectó ninguna (por ejemplo, el usuario no tiene permiso) lo tratamos como error. */
const verificarCambio = (filas) => {
    if (filas.length === 0) {
        throw new Error("No se modificó ningún registro (¿falta permiso de administrador?)")
    }
    return filas
}

/* Devuelve el HTML de una alerta roja de Bootstrap con el texto indicado */
const mensajeError = (texto) => `
    <div class="alert alert-danger mb-0" role="alert">
        <i class="fa-solid fa-triangle-exclamation"></i> ${texto}
    </div>`

/* Convierte un texto en algo seguro para meterlo con innerHTML.
   Si alguien escribe "<script>" como nombre, se verá como texto y no se ejecutará. */
const escaparHTML = (texto) => {
    const div = document.createElement("div")
    div.textContent = texto
    return div.innerHTML
}

/* Lee el carrito guardado en sessionStorage.
   Si no hay nada devuelve [] y si el texto guardado está dañado (JSON inválido)
   lo borra y también devuelve [], así la página no se rompe. */
const leerCarrito = () => {
    try {
        return JSON.parse(sessionStorage.getItem("carritocompras")) || []
    } catch (error) {
        console.error("Carrito dañado, se reinicia", error)
        sessionStorage.removeItem("carritocompras")
        return []
    }
}

/* Compra mayorista: 12 unidades o más de un mismo producto (SKU).
   La base de datos revisa la misma regla al guardar una solicitud. */
const MINIMO_MAYORISTA = 12

/* Productos del carrito que cumplen la cantidad mayorista */
const productosMayoristas = () => leerCarrito().filter(item => item.cantidad >= MINIMO_MAYORISTA)

/* Guarda el carrito en sessionStorage (o lo borra si quedó vacío)
   y actualiza el número que aparece junto a "Carrito" en el menú. */
const guardarCarrito = (carrito) => {
    if (carrito.length > 0) {
        sessionStorage.setItem("carritocompras", JSON.stringify(carrito)) //sessionStorage solo guarda texto, por eso JSON.stringify
    } else {
        sessionStorage.removeItem("carritocompras")
    }
    actualizarContadorCarrito()
}

/* Suma las cantidades de todos los productos (2 tés + 1 café = 3) y lo muestra en el menú */
const actualizarContadorCarrito = () => {
    const contador = document.getElementById("contador-carrito")
    const unidades = leerCarrito().reduce((suma, item) => suma + item.cantidad, 0)
    contador.textContent = unidades
    contador.style.display = unidades > 0 ? "inline-block" : "none" // si está vacío no se muestra
    document.getElementById("btn-carrito-nav").title = unidades > 0 ? `Carrito: ${unidades} unidad(es)` : "Carrito vacío"
    const enCuenta = document.getElementById("contador-carrito-cuenta")
    if (enCuenta) { enCuenta.textContent = unidades; enCuenta.hidden = unidades === 0 }
}

/* Muestra un aviso pequeño abajo a la derecha que desaparece solo (Toast de Bootstrap) */
const mostrarNotificacion = (texto, icono = "fa-check") => {
    const contenedor = document.getElementById("contenedor-notificaciones")
    const toast = document.createElement("div")
    toast.className = "toast align-items-center text-bg-dark border-0"
    toast.setAttribute("role", "status")
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body"><i class="fa-solid ${icono}"></i>&nbsp; ${texto}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
        </div>`
    contenedor.appendChild(toast)
    toast.addEventListener("hidden.bs.toast", () => toast.remove()) // al ocultarse, se borra del HTML
    bootstrap.Toast.getOrCreateInstance(toast, { delay: 2500 }).show()
}

/* ---------- Sesión del usuario ---------- */

/* null si nadie inició sesión; si no: { id, correo, nombre, rol } (rol = "cliente" o "admin") */
let usuarioActual = null

const esAdmin = () => usuarioActual !== null && usuarioActual.rol === "admin"
const esAsesor = () => usuarioActual !== null && usuarioActual.rol === "asesor"

/* Pregunta a Supabase si hay una sesión abierta y lee el rol del usuario en la tabla perfiles.
   Supabase recuerda la sesión en el navegador, por eso sigue abierta al recargar la página. */
const cargarUsuario = () => {
    return db.auth.getSession().then(({ data }) => {
        const sesion = data.session
        if (!sesion) {
            usuarioActual = null
            return
        }
        const usuario = sesion.user
        return obtenerDatos(db.from("perfiles").select("nombre, rol").eq("id", usuario.id).single())
            .then(perfil => {
                usuarioActual = { id: usuario.id, correo: usuario.email, nombre: perfil.nombre || usuario.email, rol: perfil.rol }
                if (perfil.rol !== "asesor") return
                // el asesor necesita su código para filtrar sus pedidos y solicitudes
                return obtenerDatos(db.rpc("mi_idasesor")).then(id => {
                    if (id === null) usuarioActual.rol = "cliente"   // su correo ya no está en la tabla asesores
                    else usuarioActual.idasesor = id
                })
            })
            .catch(error => { // si no se pudo leer el perfil, por seguridad lo tratamos como cliente
                console.error(error)
                usuarioActual = { id: usuario.id, correo: usuario.email, nombre: usuario.email, rol: "cliente" }
            })
    })
}

/* Se llama desde login.js cuando el usuario ingresa correctamente */
const alIniciarSesion = () => {
    return cargarUsuario().then(() => {
        dibujarMenu()
        mostrarNotificacion(`Hola, ${escaparHTML(usuarioActual.nombre)}`)
        irAPagina(esAdmin() ? "Indicadores" : esAsesor() ? "Mi panel" : "Tienda")
    })
}

const cerrarSesion = () => {
    db.auth.signOut().then(() => {
        usuarioActual = null
        guardarCarrito([]) // el carrito era de esa persona: se vacía al salir
        dibujarMenu()
        mostrarNotificacion("Cerraste sesión")
        irAPagina("Inicio")
    })
}


/* ---------- Menú y navegación ---------- */
/*
etiqueta es el nombre de la opción que quieres mostrar al usuario.
pagina es la ruta del archivo HTML al que quieres ir cuando el usuario haga clic.
codigo es el JavaScript de esa página (opcional).
grupo: dónde aparece en el panel lateral (☰): "mas" = sección "Conócenos",
   "intranet" = sección "Intranet" (solo admin). Sin grupo = se abre desde otro lugar
   (Inicio con el logo, Tienda con las categorías o el buscador, Carrito con 🛒, etc.).
rol: "admin" = solo administradores; "asesor" = solo asesores; "cuenta" = hay que haber iniciado sesión.
asesor: true = una página admin que el asesor también abre, pero viendo solo lo suyo
   (la base de datos lo filtra); textoAsesor es el nombre que ve el asesor en el menú.
*/
const menuItems = [
    {etiqueta: "Inicio",       pagina: "pages/inicio.html", codigo: "js/pages/inicio.js"},
    {etiqueta: "Tienda",       pagina: "pages/tienda.html", codigo: "js/pages/tienda.js"},
    {etiqueta: "Carrito",      pagina: "pages/carrito.html", codigo: "js/pages/carrito.js"},
    {etiqueta: "Mis pedidos",  pagina: "pages/mis-pedidos.html", codigo: "js/pages/mis-pedidos.js", rol: "cuenta"},
    {etiqueta: "Finalizar compra", pagina: "pages/checkout.html", codigo: "js/pages/checkout.js", rol: "cuenta"},
    {etiqueta: "Asesores comerciales", pagina: "pages/asesores.html", codigo: "js/pages/asesores.js"},
    {etiqueta: "Mayoristas",   pagina: "pages/mayoristas.html", grupo: "mas"},
    {etiqueta: "Sedes", pagina: "pages/mapa.html", codigo: "js/pages/mapa.js", grupo: "mas"},
    {etiqueta: "Nosotros",     pagina: "pages/nosotros.html", grupo: "mas"},
    // Intranet (solo admin)
    /* Intranet (solo admin). "texto" es lo que se ve en el menú; "etiqueta" es el nombre interno
       que usa el código (irAPagina("Productos"), etc.). "seccion" agrupa las opciones en el panel ☰. */
    {etiqueta: "Mi panel",     texto: "Mi panel comercial", seccion: "Resumen", icono: "fa-gauge",
        pagina: "pages/panel-asesor.html", codigo: "js/pages/panel-asesor.js", rol: "asesor", grupo: "intranet"},
    {etiqueta: "Indicadores",  texto: "Indicadores del negocio", seccion: "Resumen", icono: "fa-chart-line",
        pagina: "pages/indicadores.html", codigo: "js/pages/indicadores.js", rol: "admin", grupo: "intranet"},
    {etiqueta: "Monitoreo",    texto: "Alertas del día", seccion: "Resumen", icono: "fa-bell",
        pagina: "pages/monitoreo-admin.html", codigo: "js/pages/monitoreo-admin.js", rol: "admin", grupo: "intranet"},
    {etiqueta: "Pedidos",      texto: "Pedidos de clientes", seccion: "Ventas", icono: "fa-receipt",
        pagina: "pages/pedidos-admin.html", codigo: "js/pages/pedidos-admin.js", rol: "admin", grupo: "intranet",
        asesor: true, textoAsesor: "Mis pedidos asignados"},
    {etiqueta: "Solicitudes",  texto: "Solicitudes mayoristas", seccion: "Ventas", icono: "fa-inbox",
        pagina: "pages/solicitudes.html", codigo: "js/pages/solicitudes.js", rol: "admin", grupo: "intranet",
        asesor: true, textoAsesor: "Mis solicitudes"},
    {etiqueta: "Productos",    texto: "Productos y precios", seccion: "Inventario", icono: "fa-box",
        pagina: "pages/productos-admin.html", codigo: "js/pages/productos-admin.js", rol: "admin", grupo: "intranet"},
    {etiqueta: "Proveedores",  texto: "Proveedores", seccion: "Inventario", icono: "fa-truck",
        pagina: "pages/proveedores.html", codigo: "js/pages/proveedores.js", rol: "admin", grupo: "intranet
