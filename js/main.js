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
        irAPagina(esAdmin() ? "Indicadores" : "Tienda")
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
rol: "admin" = solo administradores; "cuenta" = hay que haber iniciado sesión.
*/
const menuItems = [
    {etiqueta: "Inicio",       pagina: "pages/inicio.html", codigo: "js/pages/inicio.js"},
    {etiqueta: "Tienda",       pagina: "pages/tienda.html", codigo: "js/pages/tienda.js"},
    {etiqueta: "Carrito",      pagina: "pages/carrito.html", codigo: "js/pages/carrito.js"},
    {etiqueta: "Mis pedidos",  pagina: "pages/mis-pedidos.html", codigo: "js/pages/mis-pedidos.js", rol: "cuenta"},
    {etiqueta: "Asesores comerciales", pagina: "pages/asesores.html", codigo: "js/pages/asesores.js"},
    {etiqueta: "Mayoristas",   pagina: "pages/mayoristas.html", grupo: "mas"},
    {etiqueta: "Nosotros",     pagina: "pages/nosotros.html", grupo: "mas"},
    // Intranet (solo admin)
    {etiqueta: "Indicadores",  pagina: "pages/indicadores.html", codigo: "js/pages/indicadores.js", rol: "admin", grupo: "intranet"},
    {etiqueta: "Directores",   pagina: "pages/directores.html", codigo: "js/pages/directores.js", rol: "admin", grupo: "intranet"},
    {etiqueta: "Asesores",     pagina: "pages/asesores-admin.html", codigo: "js/pages/asesores-admin.js", rol: "admin", grupo: "intranet"},
    {etiqueta: "Solicitudes",  pagina: "pages/solicitudes.html", codigo: "js/pages/solicitudes.js", rol: "admin", grupo: "intranet"},
    {etiqueta: "Proveedores",  pagina: "pages/proveedores.html", codigo: "js/pages/proveedores.js", rol: "admin", grupo: "intranet"}
]

/* La página de ingreso se abre desde "Mi cuenta" */
const paginaIngresar = {etiqueta: "Ingresar", pagina: "pages/login.html", codigo: "js/pages/login.js"}

const mainContent = document.getElementById("main-content")
const zonaCuenta = document.getElementById("zona-cuenta")
const menuCategorias = document.getElementById("menu-categorias")
const menuSecciones = document.getElementById("menu-secciones")
const menuLateral = document.getElementById("menu-lateral")

/* Lo que la Tienda debe mostrar al abrirse: una categoría o el resultado de una búsqueda.
   Lo llenan el panel lateral (☰) y el buscador; lo lee tienda.js. */
const filtroTienda = { idcategoria: null, texto: "" }

/* ¿El usuario actual puede ver esta página? */
const puedeVer = (item) => item.rol !== "admin" || esAdmin()

/* Carga una página dentro de <main> */
const cargarPagina = (item) => {
    // marca como "active" los enlaces de la página abierta
    document.querySelectorAll("[data-etiqueta]").forEach(a => a.classList.toggle("active", a.dataset.etiqueta === item.etiqueta))
    bootstrap.Offcanvas.getOrCreateInstance(menuLateral).hide()   // cierra el panel ☰ si estaba abierto
    window.scrollTo(0, 0)

    if (!puedeVer(item)) { // protección extra: aunque alguien llame irAPagina("Directores") sin ser admin
        mainContent.innerHTML = `<section class="padded"><div class="container">
            ${mensajeError("Esta sección es solo para administradores.")}</div></section>`
        return
    }
    if (item.rol === "cuenta" && usuarioActual === null) { // ej. "Mis pedidos" sin haber ingresado
        mostrarNotificacion("Inicia sesión para ver tus pedidos", "fa-circle-info")
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
            codigoPagina.setAttribute("src", item.codigo) /*<script src="js/pages/proveedores.js"></script> -- "Busca el archivo js/pages/proveedores.js, cárgalo y ejecuta el JavaScript que contiene."*/
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

/* ---------- Panel lateral: categorías (se leen una vez de la base) ---------- */
obtenerDatos(db.from("categorias_con_total").select("idcategoria, nombre, total").order("nombre"))
    .then(categorias => {
        menuCategorias.innerHTML = categorias.map(c => `
            <li><a data-categoria="${c.idcategoria}">${escaparHTML(c.nombre)} <small>${c.total}</small></a></li>`).join("") +
            `<li><a data-categoria=""><strong>Ver todo el catálogo</strong> <i class="fa-solid fa-arrow-right small"></i></a></li>`
        menuCategorias.querySelectorAll("a").forEach(a =>
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
    menuSecciones.innerHTML = seccion("Conócenos", delGrupo("mas")) +
        (esAdmin() ? seccion(`<i class="fa-solid fa-lock"></i> Intranet`, delGrupo("intranet")) : "")

    if (usuarioActual === null) {
        zonaCuenta.innerHTML = `
            <a class="accion dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fa-regular fa-user"></i><span>Mi cuenta</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" onclick="irAPagina('Ingresar')">Iniciar sesión</a></li>
                <li><a class="dropdown-item" onclick="irAPagina('Ingresar')">Crear cuenta</a></li>
            </ul>`
    } else {
        zonaCuenta.innerHTML = `
            <a class="accion dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fa-regular fa-user"></i><span>${escaparHTML(usuarioActual.nombre.split(" ")[0])}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
                <li><span class="dropdown-item-text small text-body-secondary">${escaparHTML(usuarioActual.correo)}</span></li>
                <li><a class="dropdown-item" onclick="irAPagina('Mis pedidos')">Mis pedidos</a></li>
                ${esAdmin() ? `<li><a class="dropdown-item" onclick="irAPagina('Indicadores')">Intranet</a></li>` : ""}
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" id="btn-cerrar-sesion">Cerrar sesión</a></li>
            </ul>`
        document.getElementById("btn-cerrar-sesion").addEventListener("click", cerrarSesion)
    }
    actualizarContadorCarrito()
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


/* ---------- Tarjeta de producto (la misma en Tienda e Inicio) ---------- */
/* Devuelve el HTML de la tarjeta. El botón "Agregar" lleva data-id con el código del producto. */
const tarjetaProducto = (item) => {
    const precioFinal = item.preciorebajado ? item.preciorebajado : item.precio
    const descuento = item.preciorebajado ? Math.round((1 - item.preciorebajado / item.precio) * 100) : 0
    const agotado = item.stock === 0
    const estadoStock = agotado ? `<span>Agotado</span>` :
        item.stock <= item.stock_minimo ? `<span class="text-danger">Últimas ${item.stock} unidades</span>` :
        `<span>Disponible</span>`
    return `
        <div class="col">
            <div class="card card-producto ${agotado ? "producto-agotado" : ""}">
                ${descuento > 0 ? `<span class="etiqueta-descuento">-${descuento}%</span>` : ""}
                <div class="foto">
                    <img src="${item.imagenchica || IMAGEN_SIN_FOTO}" alt="${escaparHTML(item.nombre)}" loading="lazy">
                </div>
                <div class="card-body">
                    <h3 class="nombre" title="${escaparHTML(item.nombre)}">${escaparHTML(item.nombre)}</h3>
                    <div><span class="precio">${soles(precioFinal)}</span>
                        ${descuento > 0 ? `<span class="precio-anterior">${soles(item.precio)}</span>` : ""}</div>
                    <div class="estado-stock">${estadoStock}</div>
                    <button class="btn btn-primary btn-sm w-100 btn-agregar" data-id="${item.idproducto}" ${agotado ? "disabled" : ""}>
                        ${agotado ? "Sin stock" : "Agregar al carrito"}
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