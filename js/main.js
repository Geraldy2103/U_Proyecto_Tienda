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
        pagina: "pages/proveedores.html", codigo: "js/pages/proveedores.js", rol: "admin", grupo: "intranet"},
    {etiqueta: "Directores",   texto: "Directores de venta", seccion: "Equipo comercial", icono: "fa-user-tie",
        pagina: "pages/directores.html", codigo: "js/pages/directores.js", rol: "admin", grupo: "intranet"},
    {etiqueta: "Asesores",     texto: "Asesores comerciales", seccion: "Equipo comercial", icono: "fa-users",
        pagina: "pages/asesores-admin.html", codigo: "js/pages/asesores-admin.js", rol: "admin", grupo: "intranet"}
]

/* La página de ingreso se abre desde "Mi cuenta" */
const paginaIngresar = {etiqueta: "Ingresar", pagina: "pages/login.html", codigo: "js/pages/login.js"}
const mainContent = document.getElementById("main-content")
const zonaCuenta = document.getElementById("zona-cuenta")
const menuCategorias = document.getElementById("menu-categorias")
const menuSecciones = document.getElementById("menu-secciones")
const menuLateral = document.getElementById("menu-lateral")

/* Número distinto cada vez que se abre la tienda (se usa para no leer scripts viejos de la caché) */
const VERSION_CARGA = Date.now()

/* Lo que la Tienda debe mostrar al abrirse: una categoría o el resultado de una búsqueda.
   Lo llenan el panel lateral (☰) y el buscador; lo lee tienda.js. */
const filtroTienda = { idcategoria: null, texto: "" }

/* ¿El usuario actual puede ver esta página? */
const puedeVer = (item) =>
    item.rol === "admin" ? esAdmin() || (item.asesor === true && esAsesor()) :
    item.rol === "asesor" ? esAsesor() : true

/* Nombre de una opción de la intranet según quién la ve */
const textoMenu = (item) => esAsesor() && item.textoAsesor ? item.textoAsesor : item.texto
/* Título del bloque de intranet */
const tituloIntranet = () => esAsesor() ? "Zona del asesor" : "Intranet"

/* Carga una página dentro de <main> */
const cargarPagina = (item) => {
    // marca como "active" los enlaces de la página abierta
    document.querySelectorAll("[data-etiqueta]").forEach(a => a.classList.toggle("active", a.dataset.etiqueta === item.etiqueta))
    bootstrap.Offcanvas.getOrCreateInstance(menuLateral).hide()   // cierra el panel ☰ si estaba abierto
    window.scrollTo(0, 0)

    if (!puedeVer(item)) { // protección extra: aunque alguien llame irAPagina("Directores") sin ser admin
        mainContent.innerHTML = `<section class="padded"><div class="container">
            ${mensajeError("No tienes acceso a esta sección.")}</div></section>`
        return
    }
    if (item.rol === "cuenta" && usuarioActual === null) { // ej. "Mis pedidos" sin haber ingresado
        mostrarNotificacion("Inicia sesión para continuar", "fa-circle-info")
        irAPagina("Ingresar")
        return
    }

    /*fetch() significa básicamente:"Ve a buscar este recurso."
      cache "no-cache": pregunta siempre al servidor si hay una versión nueva (si no, el navegador
      podría mostrar una copia vieja de la sección después de actualizar la página)*/
    fetch(item.pagina, { cache: "no-cache" })
    .then(response => {
        if (!response.ok) { /*si el archivo no existe (404) no seguimos*/
            throw new Error("No se encontró " + item.pagina)
        }
        return response.text() /*response.text() convierte el contenido en texto.*/
    })
    .then(data => {  /*"Cuando termine lo anterior, recibe el resultado y llámalo data."*/
        mainContent.innerHTML = data  /*"Mete el contenido de data dentro de mainContent como HTML."*/

        if(item.codigo){ /*"Si item.codigo existe, entonces..."*/
            const codigoPagina = document.createElement("script")
            // "?v=..." cambia en cada carga de la tienda: así el navegador no usa una copia vieja del script
            codigoPagina.setAttribute("src", item.codigo + "?v=" + VERSION_CARGA) /*<script src="js/pages/proveedores.js"></script> -- "Busca el archivo js/pages/proveedores.js, cárgalo y ejecuta el JavaScript que contiene."*/
            mainContent.appendChild(codigoPagina)
        }
    })
    .catch(error => { /*si algo falló arriba, mostramos un aviso en lugar de dejar la página en blanco*/
        console.error(error)
        mainContent.innerHTML = `
        <section class="padded">
            <div class="container">
                ${mensajeError("No se pudo cargar la sección " + item.etiqueta + ". Intenta nuevamente.")}
            </div>
        </section>`
    })
}

/* Abre una sección desde el código, por ejemplo irAPagina("Tienda") */
const irAPagina = (etiqueta) => {
    const item = [...menuItems, paginaIngresar].find(i => i.etiqueta === etiqueta)
    cargarPagina(item)
}

/* Abre la Tienda en una categoría (desde el panel ☰) */
const verCategoria = (idcategoria) => {
    filtroTienda.idcategoria = idcategoria
    filtroTienda.texto = ""
    irAPagina("Tienda")
}

/* ---------- Buscador del encabezado ---------- */
const txtBuscar = document.getElementById("txt-buscar")
document.getElementById("form-buscar").addEventListener("submit", (event) => {
    event.preventDefault()
    const texto = txtBuscar.value.trim()
    if (texto.length < 2) {
        mostrarNotificacion("Escribe al menos 2 letras para buscar", "fa-circle-info")
        return
    }
    filtroTienda.texto = texto
    filtroTienda.idcategoria = null
    irAPagina("Tienda")
})

/* ---------- Categorías: barra verde (escritorio) y panel lateral ☰ (se leen una vez de la base) ---------- */
const barraCategorias = document.getElementById("barra-categorias")
const CATEGORIAS_EN_BARRA = 6   // las demás van dentro de "Más"

obtenerDatos(db.from("categorias_con_total").select("idcategoria, nombre, total").order("nombre"))
    .then(categorias => {
        // Panel lateral: todas
        menuCategorias.innerHTML = categorias.map(c => `
            <li><a data-categoria="${c.idcategoria}">${escaparHTML(c.nombre)} <small>${c.total}</small></a></li>`).join("") +
            `<li><a data-categoria=""><strong>Ver todo el catálogo</strong> <i class="fa-solid fa-arrow-right small"></i></a></li>`

        // Barra verde: las primeras + "Más ▾" con el resto, Mayoristas y Nosotros
        const resto = categorias.slice(CATEGORIAS_EN_BARRA)
        barraCategorias.innerHTML = categorias.slice(0, CATEGORIAS_EN_BARRA).map(c =>
            `<li><a class="enlace-categoria" data-categoria="${c.idcategoria}">${escaparHTML(c.nombre)}</a></li>`).join("") + `
            <li class="dropdown">
                <a class="enlace-categoria dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">Más</a>
                <ul class="dropdown-menu dropdown-menu-end">
                    ${resto.map(c => `<li><a class="dropdown-item" data-categoria="${c.idcategoria}">${escaparHTML(c.nombre)}</a></li>`).join("")}
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" onclick="irAPagina('Mayoristas')">Compras mayoristas</a></li>
                    <li><a class="dropdown-item" onclick="irAPagina('Nosotros')">Nosotros</a></li>
                </ul>
            </li>`

        document.querySelectorAll("#menu-categorias a, #barra-categorias [data-categoria]").forEach(a =>
            a.addEventListener("click", () => verCategoria(a.dataset.categoria ? Number(a.dataset.categoria) : null)))
    })
    .catch(error => {
        console.error(error)
        menuCategorias.innerHTML = `<li class="small text-body-secondary">No se pudieron cargar las categorías.</li>`
    })

/* Secciones del panel (☰) y "Mi cuenta". Se vuelve a llamar al iniciar o cerrar sesión. */
const dibujarMenu = () => {
    const delGrupo = (grupo) => menuItems.filter(item => item.grupo === grupo && puedeVer(item))
    const seccion = (titulo, items) => `
        <p class="titulo-seccion">${titulo}</p>
        <ul class="lista-menu">
            ${items.map(item => `<li><a data-etiqueta="${item.etiqueta}" onclick="irAPagina('${item.etiqueta}')">${item.etiqueta}</a></li>`).join("")}
        </ul>`
    // Intranet: un bloque por sección (Resumen, Ventas, Inventario, Equipo comercial), en el orden del menú
    const intranet = delGrupo("intranet")
    const secciones = [...new Set(intranet.map(item => item.seccion))]
    const enlaceIntranet = (item) => `<li><a data-etiqueta="${item.etiqueta}" onclick="irAPagina('${item.etiqueta}')">
        <span><i class="fa-solid ${item.icono} fa-fw"></i> ${textoMenu(item)}</span></a></li>`
    menuSecciones.innerHTML = seccion("Conócenos", delGrupo("mas")) +
        (intranet.length ? `
        <div class="bloque-intranet">
            <p class="titulo-intranet"><i class="fa-solid fa-lock"></i> ${tituloIntranet()}</p>
            ${secciones.map(nombre => `
                <p class="titulo-seccion">${nombre}</p>
                <ul class="lista-menu">${intranet.filter(item => item.seccion === nombre).map(enlaceIntranet).join("")}</ul>`).join("")}
        </div>` : "")

    if (usuarioActual === null) {
        zonaCuenta.innerHTML = `
            <a class="accion dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fa-regular fa-user"></i><span>Ingresar</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" onclick="irAPagina('Ingresar')">Iniciar sesión</a></li>
                <li><a class="dropdown-item" onclick="irAPagina('Ingresar')">Crear cuenta</a></li>
            </ul>`
    } else {
        /* Intranet dentro del menú de cuenta: todas sus opciones, agrupadas por sección y en dos columnas */
        const intranetEnCuenta = () => {
            const items = menuItems.filter(item => item.grupo === "intranet" && puedeVer(item))
            const secciones = [...new Set(items.map(item => item.seccion))]
            return `<hr class="dropdown-divider">
                <div class="intranet-cuenta">
                    <p class="titulo-intranet-cuenta"><i class="fa-solid fa-lock"></i> ${tituloIntranet()}</p>
                    <div class="columnas-intranet">
                        ${secciones.map(nombre => `
                        <div>
                            <p class="seccion-intranet-cuenta">${nombre}</p>
                            ${items.filter(item => item.seccion === nombre).map(item => `
                            <a class="dropdown-item" data-etiqueta="${item.etiqueta}" onclick="irAPagina('${item.etiqueta}')">
                                <i class="fa-solid ${item.icono} fa-fw"></i> ${textoMenu(item)}</a>`).join("")}
                        </div>`).join("")}
                    </div>
                </div>`
        }
        const iniciales = usuarioActual.nombre.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase()
        zonaCuenta.innerHTML = `
            <a class="accion dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <span class="avatar-mini">${escaparHTML(iniciales)}</span><span>${escaparHTML(usuarioActual.nombre.split(" ")[0])}</span>
            </a>
            <div class="dropdown-menu dropdown-menu-end menu-cuenta">
                <div class="cabecera-cuenta">
                    <span class="avatar">${escaparHTML(iniciales)}</span>
                    <div>
                        <strong>${escaparHTML(usuarioActual.nombre)}</strong>
                        <small>${escaparHTML(usuarioActual.correo)}</small>
                        ${esAdmin() ? `<span class="rol-cuenta"><i class="fa-solid fa-lock"></i> Administrador</span>` :
                          esAsesor() ? `<span class="rol-cuenta"><i class="fa-solid fa-handshake"></i> Asesor comercial</span>` : ""}
                    </div>
                </div>
                <a class="dropdown-item" onclick="irAPagina('Mis pedidos')">
                    <i class="fa-solid fa-receipt fa-fw"></i> Mis pedidos <span class="contador-menu" id="contador-pedidos-cuenta" hidden></span>
                </a>
                <a class="dropdown-item" onclick="irAPagina('Carrito')">
                    <i class="fa-solid fa-cart-shopping fa-fw"></i> Mi carrito <span class="contador-menu" id="contador-carrito-cuenta" hidden></span>
                </a>
                <a class="dropdown-item" onclick="irAPagina('Mayoristas')">
                    <i class="fa-solid fa-boxes-stacked fa-fw"></i> Compras mayoristas
                </a>
                ${esAdmin() || esAsesor() ? intranetEnCuenta() : ""}
                <hr class="dropdown-divider">
                <a class="dropdown-item salir" id="btn-cerrar-sesion"><i class="fa-solid fa-right-from-bracket fa-fw"></i> Cerrar sesión</a>
            </div>`
        document.getElementById("btn-cerrar-sesion").addEventListener("click", cerrarSesion)
        actualizarResumenCuenta()
    }
    actualizarContadorCarrito()
}

/* Números del menú de cuenta: pedidos en curso (consulta liviana) y unidades del carrito */
const actualizarResumenCuenta = () => {
    const contadorPedidos = document.getElementById("contador-pedidos-cuenta")
    const contadorCarrito = document.getElementById("contador-carrito-cuenta")
    if (!contadorPedidos || usuarioActual === null) return
    const unidades = leerCarrito().reduce((t, i) => t + i.cantidad, 0)
    contadorCarrito.textContent = unidades
    contadorCarrito.hidden = unidades === 0
    obtenerDatos(db.from("pedidos").select("idpedido, estado").eq("idusuario", usuarioActual.id)
            .in("estado", ["por_cotizar", "cotizado", "registrado"]))
        .then(enCurso => {
            const porPagar = enCurso.filter(p => p.estado === "cotizado").length
            contadorPedidos.textContent = porPagar ? `${porPagar} por pagar` : `${enCurso.length} en curso`
            contadorPedidos.classList.toggle("urgente", porPagar > 0)
            contadorPedidos.hidden = enCurso.length === 0
        })
        .catch(error => console.error(error))
}

/* Al abrir la página: primero vemos si hay sesión, luego armamos el menú y mostramos Inicio */
cargarUsuario().then(() => {
    dibujarMenu()
    irAPagina("Inicio")
})

class HeaderComponent extends HTMLElement { /*"HeaderComponent" es el nombre de la clase que define el componente personalizado. "extends HTMLElement" significa que este componente es un tipo especial de elemento HTML.*/
    connectedCallback() {/*Cuando mi <header-component> aparezca en la página, ejecuta este código*/
        const titulo = this.getAttribute("titulo") /* Obtiene el valor del atributo "titulo" */
        const frase = this.getAttribute("frase") /* Obtiene el valor del atributo "frase" */
 /*"this.innerHTML" es el contenido HTML que estará dentro de <header-component> en la página.*/
        this.innerHTML = `  
        <header id="main-header">
            <div class="container">
                <h1>${titulo}</h1>
                ${frase ? `<p>${frase}</p>` : ""}
            </div>
        </header>
        `
    }
}
customElements.define("header-component", HeaderComponent) /*Cuando veas <header-component>, utiliza la clase HeaderComponent*/


/* ---------- Favoritos (❤️) ----------
   Se guardan en este navegador (localStorage). Si el navegador no permite guardar, simplemente no se recuerdan. */
const leerFavoritos = () => {
    try { return JSON.parse(localStorage.getItem("favoritos")) || [] } catch (error) { return [] }
}
const esFavorito = (idproducto) => leerFavoritos().includes(idproducto)
const alternarFavorito = (idproducto) => {
    const favoritos = leerFavoritos()
    const nuevos = favoritos.includes(idproducto) ? favoritos.filter(id => id !== idproducto) : [...favoritos, idproducto]
    try { localStorage.setItem("favoritos", JSON.stringify(nuevos)) } catch (error) { /* sin almacenamiento */ }
    return nuevos.includes(idproducto)
}

/* Un solo "escucha" para todos los corazones de la página */
document.addEventListener("click", (event) => {
    const boton = event.target.closest(".btn-favorito")
    if (!boton) return
    const marcado = alternarFavorito(Number(boton.dataset.id))
    boton.classList.toggle("marcado", marcado)
    boton.querySelector("i").className = marcado ? "fa-solid fa-heart" : "fa-regular fa-heart"
    boton.setAttribute("aria-pressed", marcado)
})

/* ---------- Tarjeta de producto (la misma en Tienda e Inicio) ---------- */
/* Devuelve el HTML de la tarjeta. El botón "Agregar" lleva data-id con el código del producto. */
const tarjetaProducto = (item) => {
    const precioFinal = item.preciorebajado ? item.preciorebajado : item.precio
    const descuento = item.preciorebajado ? Math.round((1 - item.preciorebajado / item.precio) * 100) : 0
    const agotado = item.stock === 0
    const favorito = esFavorito(item.idproducto)
    const estadoStock = agotado ? `<span>Agotado</span>` :
        item.stock <= item.stock_minimo ? `<span class="text-danger">Últimas ${item.stock} unidades</span>` : ""
    return `
        <div class="col">
            <div class="card card-producto ${agotado ? "producto-agotado" : ""}">
                ${descuento > 0 ? `<span class="etiqueta-descuento">-${descuento}%</span>` : ""}
                <button type="button" class="btn-favorito ${favorito ? "marcado" : ""}" data-id="${item.idproducto}"
                    aria-label="Favorito" aria-pressed="${favorito}"><i class="${favorito ? "fa-solid" : "fa-regular"} fa-heart"></i></button>
                <div class="foto">
                    <img src="${item.imagenchica || IMAGEN_SIN_FOTO}" alt="${escaparHTML(item.nombre)}" loading="lazy">
                </div>
                <div class="card-body">
                    <h3 class="nombre" title="${escaparHTML(item.nombre)}">${escaparHTML(item.nombre)}</h3>
                    <div><span class="precio">${soles(precioFinal)}</span>
                        ${descuento > 0 ? `<span class="precio-anterior">${soles(item.precio)}</span>` : ""}</div>
                    <div class="estado-stock">${estadoStock}</div>
                    <button class="btn btn-primary btn-sm w-100 btn-agregar" data-id="${item.idproducto}" ${agotado ? "disabled" : ""}>
                        ${agotado ? "Sin stock" : `Agregar <i class="fa-solid fa-cart-shopping"></i>`}
                    </button>
                </div>
            </div>
        </div>`
}

/* Conecta los botones "Agregar" de un contenedor con su lista de productos */
const activarBotonesAgregar = (contenedor, productos) => {
    contenedor.querySelectorAll(".btn-agregar").forEach(boton =>
        boton.addEventListener("click", () =>
            agregarItemCarrito(productos.find(p => p.idproducto == boton.dataset.id), 1)))
}

/* Estados de un pedido: texto para mostrar, plural para los filtros y clase de color */
const ESTADOS_PEDIDO = {
    por_cotizar: { texto: "Por cotizar", plural: "Por cotizar", clase: "estado-alerta" },
    cotizado:    { texto: "Pendiente de pago", plural: "Por pagar", clase: "estado-alerta" },
    registrado:  { texto: "En preparación", plural: "En preparación", clase: "estado-info" },
    entregado:   { texto: "Entregado",  plural: "Entregados",  clase: "estado-ok" },
    anulado:     { texto: "Anulado",    plural: "Anulados",    clase: "estado-anulado" }
}

/* "Recojo en sede Miraflores" o "Delivery a Surco, Lima Metropolitana · 1 día" */
const textoEntrega = (p) => p.entrega === "delivery" ?
    `Delivery a ${escaparHTML(p.distrito || "")}, ${escaparHTML(p.departamento || "")}${p.plazo ? " · " + escaparHTML(p.plazo) : ""}` :
    `Recojo en sede ${escaparHTML(p.sedes ? p.sedes.nombre : "")}`

/* ---------- Formulario de pago (SIMULADO) ----------
   Se usa en "Finalizar compra" y para pagar un pedido cotizado en "Mis pedidos".
   IMPORTANTE: los datos de la tarjeta solo se revisan aquí, en el navegador. Nunca se envían
   a la base de datos ni se guardan: al servidor solo llega el método ("tarjeta" o "yape").
   Devuelve { validar() } -> { ok, metodo, error } */
const crearFormularioPago = (contenedor) => {
    contenedor.innerHTML = `
        <div class="form-pago">
            <div class="row g-3 mb-3">
                <div class="col-sm-6">
                    <label class="opcion-tarjeta">
                        <input type="radio" name="metodo-pago" value="tarjeta" checked>
                        <span><strong><i class="fa-regular fa-credit-card"></i> Tarjeta</strong>
                            <small>Crédito o débito</small></span>
                    </label>
                </div>
                <div class="col-sm-6">
                    <label class="opcion-tarjeta">
                        <input type="radio" name="metodo-pago" value="yape">
                        <span><strong><i class="fa-solid fa-mobile-screen-button"></i> Yape</strong>
                            <small>Paga con tu celular</small></span>
                    </label>
                </div>
            </div>

            <div class="pago-tarjeta">
                <div class="row g-3">
                    <div class="col-12">
                        <label class="form-label">Número de tarjeta</label>
                        <input type="text" class="form-control campo-numero" inputmode="numeric" autocomplete="off"
                            maxlength="19" placeholder="0000 0000 0000 0000">
                    </div>
                    <div class="col-12">
                        <label class="form-label">Nombre como figura en la tarjeta</label>
                        <input type="text" class="form-control campo-nombre" autocomplete="off" maxlength="60">
                    </div>
                    <div class="col-6">
                        <label class="form-label">Vencimiento</label>
                        <input type="text" class="form-control campo-vence" inputmode="numeric" autocomplete="off"
                            maxlength="5" placeholder="MM/AA">
                    </div>
                    <div class="col-6">
                        <label class="form-label">CVV</label>
                        <input type="password" class="form-control campo-cvv" inputmode="numeric" autocomplete="off"
                            maxlength="4" placeholder="•••">
                    </div>
                </div>
                <p class="small text-body-secondary mt-2 mb-0">Para probar puedes usar la tarjeta de prueba 4111 1111 1111 1111.</p>
            </div>

            <div class="pago-yape" hidden>
                <div class="d-flex flex-wrap gap-3 align-items-center mb-3">
                    <div class="qr-yape" aria-hidden="true"><i class="fa-solid fa-qrcode"></i></div>
                    <div class="small">
                        Yapea el total a <strong>El Galpón del Costo</strong><br>
                        Celular <strong>999 000 111</strong> <span class="text-body-secondary">(número de ejemplo)</span><br>
                        Luego escribe tu celular y el código de aprobación que te muestra Yape.
                    </div>
                </div>
                <div class="row g-3">
                    <div class="col-sm-6">
                        <label class="form-label">Tu celular Yape</label>
                        <input type="tel" class="form-control campo-celular" inputmode="numeric" maxlength="9" placeholder="9XXXXXXXX">
                    </div>
                    <div class="col-sm-6">
                        <label class="form-label">Código de aprobación</label>
                        <input type="text" class="form-control campo-codigo" inputmode="numeric" maxlength="6" placeholder="6 dígitos">
                    </div>
                </div>
            </div>

            <p class="aviso-simulado"><i class="fa-solid fa-lock"></i> Pago simulado del prototipo: no se realiza ningún
                cobro y los datos de tu tarjeta no se envían ni se guardan.</p>
        </div>`

    const campo = (clase) => contenedor.querySelector(clase)
    const metodo = () => contenedor.querySelector("input[name=metodo-pago]:checked").value
    const soloNumeros = (texto) => texto.replace(/\D/g, "")

    // Mostrar el formulario del método elegido
    contenedor.querySelectorAll("input[name=metodo-pago]").forEach(radio =>
        radio.addEventListener("change", () => {
            campo(".pago-tarjeta").hidden = metodo() !== "tarjeta"
            campo(".pago-yape").hidden = metodo() !== "yape"
        }))

    // Formatos mientras se escribe: "4111 1111 ..." y "MM/AA"
    campo(".campo-numero").addEventListener("input", (e) =>
        e.target.value = soloNumeros(e.target.value).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 "))
    campo(".campo-vence").addEventListener("input", (e) => {
        const n = soloNumeros(e.target.value).slice(0, 4)
        e.target.value = n.length > 2 ? n.slice(0, 2) + "/" + n.slice(2) : n
    })
    ;[".campo-cvv", ".campo-celular", ".campo-codigo"].forEach(c =>
        campo(c).addEventListener("input", (e) => e.target.value = soloNumeros(e.target.value)))

    /* Algoritmo de Luhn: el dígito de control que tienen todas las tarjetas reales */
    const numeroValido = (numero) => {
        let suma = 0
        numero.split("").reverse().forEach((d, i) => {
            let n = Number(d)
            if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9 }
            suma += n
        })
        return numero.length >= 13 && suma % 10 === 0
    }

    const marcar = (elemento, valido) => elemento.classList.toggle("is-invalid", !valido)

    const validar = () => {
        if (metodo() === "tarjeta") {
            const numero = soloNumeros(campo(".campo-numero").value)
            const [mes, anio] = campo(".campo-vence").value.split("/").map(Number)
            const hoy = new Date()
            const venceOk = mes >= 1 && mes <= 12 && anio >= 0 &&
                new Date(2000 + anio, mes, 0) >= new Date(hoy.getFullYear(), hoy.getMonth(), 1)
            const checks = [
                [campo(".campo-numero"), numeroValido(numero)],
                [campo(".campo-nombre"), campo(".campo-nombre").value.trim().length >= 3],
                [campo(".campo-vence"), venceOk],
                [campo(".campo-cvv"), /^\d{3,4}$/.test(campo(".campo-cvv").value)]
            ]
            checks.forEach(([el, ok]) => marcar(el, ok))
            return checks.every(([, ok]) => ok) ? { ok: true, metodo: "tarjeta" } :
                { ok: false, error: "Revisa los datos de la tarjeta (número, nombre, vencimiento y CVV)." }
        }
        const celularOk = /^9\d{8}$/.test(campo(".campo-celular").value)
        const codigoOk = /^\d{6}$/.test(campo(".campo-codigo").value)
        marcar(campo(".campo-celular"), celularOk)
        marcar(campo(".campo-codigo"), codigoOk)
        return celularOk && codigoOk ? { ok: true, metodo: "yape" } :
            { ok: false, error: "Escribe tu celular Yape (9 dígitos) y el código de aprobación (6 dígitos)." }
    }

    return { validar }
}

const agregarItemCarrito = (nuevoItem, cantidad) => {
    if (usuarioActual === null) { /*para comprar hay que tener cuenta*/
        mostrarNotificacion("Inicia sesión para agregar productos al carrito", "fa-circle-info")
        irAPagina("Ingresar")
        return
    }
    const precioFinal = nuevoItem.preciorebajado ? nuevoItem.preciorebajado : nuevoItem.precio
    const enCarrito = (leerCarrito().find(item => item.idproducto === nuevoItem.idproducto) || { cantidad: 0 }).cantidad
    if (enCarrito + cantidad > nuevoItem.stock) { /*no se puede pedir más de lo que hay*/
        mostrarNotificacion(`Solo hay ${nuevoItem.stock} unidades de ${escaparHTML(nuevoItem.nombre)}`, "fa-circle-info")
        return
    }
    
    const itemCarrito = {                   //esto es un objeto json
        idproducto: nuevoItem.idproducto,
        nombre: nuevoItem.nombre,
        precio: precioFinal,
        stock: nuevoItem.stock,             // para no pasar del stock en el carrito (la base también lo revisa)
        cantidad: cantidad
    }
    const carrito = leerCarrito()  //productos guardados en sessionStorage; si todavía no hay ninguno, un array vacío
    
    const index = carrito.findIndex(item => item.idproducto === itemCarrito.idproducto) /*"carrito.findIndex()" busca el índice del primer elemento que cumpla la condición. La condición es que el idproducto del item en carrito sea igual al idproducto del itemCarrito que queremos agregar. Si no encuentra ningún elemento que cumpla la condición, devuelve -1.*/
    if(index === -1){ /*index -1 significa que el producto todavía no está en el carrito: lo agregamos.*/
        carrito.push(itemCarrito)
    } else {          /*si ya existe, solo sumamos la cantidad nueva a la que ya tenía.*/
        carrito[index].cantidad += itemCarrito.cantidad
    }

    guardarCarrito(carrito)
    /*Piensa que sessionStorage es como una cajita de almacenamiento del navegador donde puedes guardar información mientras la pestaña/sesión está activa.
    setItem() significa:"Guarda algo". Tiene esta estructura:sessionStorage.setItem("clave", "valor")
    guardarCarrito() guarda JSON.stringify(carrito) usando la clave "carritocompras".
    JSON.stringify() Convierte este objeto/array de JavaScript en un texto JSON*/

    mostrarNotificacion(`${escaparHTML(itemCarrito.nombre)} se agregó al carrito`)
}
