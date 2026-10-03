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
            <div class="toast-body"><i class="fa-solid ${icono}"></i> ${texto}</div>
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
grupo: dónde aparece en el menú, ordenado por relevancia para vender:
   "principal" = a la vista (Tienda primero), "mas" = dentro de "Más ▾",
   "intranet" = dentro de "Intranet ▾" (solo admin). Sin grupo = no está en el menú
   (Inicio se abre con el logo, Carrito con el ícono 🛒, Asesores con el botón "Mayoristas").
rol: "admin" = solo la pueden abrir los administradores.
*/
const menuItems = [
    {etiqueta: "Tienda",       pagina: "pages/tienda.html", codigo: "js/pages/tienda.js", grupo: "principal", icono: "fa-basket-shopping"},
    {etiqueta: "Mayoristas",   pagina: "pages/mayoristas.html", grupo: "principal", icono: "fa-boxes-stacked"},
    {etiqueta: "Nosotros",     pagina: "pages/nosotros.html", grupo: "mas"},
    {etiqueta: "Inicio",       pagina: "pages/inicio.html", codigo: "js/pages/inicio.js"},
    {etiqueta: "Carrito",      pagina: "pages/carrito.html", codigo: "js/pages/carrito.js"},
    {etiqueta: "Asesores comerciales", pagina: "pages/asesores.html", codigo: "js/pages/asesores.js"},
    // Intranet (solo admin)
    {etiqueta: "Indicadores",  pagina: "pages/indicadores.html", codigo: "js/pages/indicadores.js", rol: "admin", grupo: "intranet", icono: "fa-chart-pie"},
    {etiqueta: "Directores",   pagina: "pages/directores.html", codigo: "js/pages/directores.js", rol: "admin", grupo: "intranet", icono: "fa-user-tie"},
    {etiqueta: "Asesores",     pagina: "pages/asesores-admin.html", codigo: "js/pages/asesores-admin.js", rol: "admin", grupo: "intranet", icono: "fa-users"},
    {etiqueta: "Solicitudes",  pagina: "pages/solicitudes.html", codigo: "js/pages/solicitudes.js", rol: "admin", grupo: "intranet", icono: "fa-inbox"},
    {etiqueta: "Proveedores",  pagina: "pages/proveedores.html", codigo: "js/pages/proveedores.js", rol: "admin", grupo: "intranet", icono: "fa-truck"}
]

/* La página de ingreso se abre con el botón "Ingresar" de la derecha */
const paginaIngresar = {etiqueta: "Ingresar", pagina: "pages/login.html", codigo: "js/pages/login.js"}

const mainNav = document.getElementById("main-nav")
const navUsuario = document.getElementById("nav-usuario")
const mainContent = document.getElementById("main-content")
const menuColapsable = document.getElementById("navbarNav")

/* ¿El usuario actual puede ver esta página? */
const puedeVer = (item) => item.rol !== "admin" || esAdmin()

/* Carga una página dentro de <main> */
const cargarPagina = (item) => {
    // marca como "active" el enlace de la página abierta (y su menú desplegable, si está dentro de uno)
    document.querySelectorAll(".navbar [data-etiqueta]").forEach(a => a.classList.toggle("active", a.dataset.etiqueta === item.etiqueta))
    document.querySelectorAll(".navbar .dropdown").forEach(menu =>
        menu.querySelector(".dropdown-toggle").classList.toggle("active", !!menu.querySelector(".dropdown-item.active")))
    // en celular, al elegir una opción se cierra el menú ☰
    bootstrap.Collapse.getOrCreateInstance(menuColapsable, { toggle: false }).hide()
    window.scrollTo(0, 0)

    if (!puedeVer(item)) { // protección extra: aunque alguien llame irAPagina("Directores") sin ser admin
        mainContent.innerHTML = `<section class="padded"><div class="container">
            ${mensajeError("Esta sección es solo para administradores.")}</div></section>`
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

/* Enlace de la barra: <li><a class="nav-link">...</a></li> */
const crearEnlace = (item, destacado) => {
    const menuLI = document.createElement("li")
    menuLI.className = "nav-item"
    menuLI.innerHTML = `<a class="nav-link ${destacado ? "enlace-destacado" : ""}" data-etiqueta="${item.etiqueta}">
        ${item.icono ? `<i class="fa-solid ${item.icono}"></i> ` : ""}${item.etiqueta}</a>`
    menuLI.querySelector("a").addEventListener("click", () => cargarPagina(item))
    return menuLI
}

/* Menú desplegable de Bootstrap ("Más ▾", "Intranet ▾") con varias páginas */
const crearDesplegable = (titulo, items) => {
    const menuLI = document.createElement("li")
    menuLI.className = "nav-item dropdown"
    menuLI.innerHTML = `
        <a class="nav-link dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">${titulo}</a>
        <ul class="dropdown-menu">
            ${items.map(item => `<li><a class="dropdown-item" data-etiqueta="${item.etiqueta}">
                ${item.icono ? `<i class="fa-solid ${item.icono} fa-fw"></i> ` : ""}${item.etiqueta}</a></li>`).join("")}
        </ul>`
    menuLI.querySelectorAll(".dropdown-item").forEach(a =>
        a.addEventListener("click", () => irAPagina(a.dataset.etiqueta)))
    return menuLI
}

/* Arma el menú según quién está conectado. Se vuelve a llamar al iniciar o cerrar sesión. */
const dibujarMenu = () => {
    const delGrupo = (grupo) => menuItems.filter(item => item.grupo === grupo && puedeVer(item))

    // Izquierda, por relevancia: Tienda (destacada), Mayoristas, Más ▾ y, para el admin, Intranet ▾
    mainNav.innerHTML = ""
    delGrupo("principal").forEach((item, posicion) => mainNav.appendChild(crearEnlace(item, posicion === 0)))
    mainNav.appendChild(crearDesplegable("Más", delGrupo("mas")))
    if (esAdmin()) {
        mainNav.appendChild(crearDesplegable(`<i class="fa-solid fa-lock"></i> Intranet`, delGrupo("intranet")))
    }

    // Derecha: "Ingresar" o el menú de la cuenta
    navUsuario.innerHTML = ""
    if (usuarioActual === null) {
        navUsuario.appendChild(crearEnlace({ ...paginaIngresar, icono: "fa-user" }))
    } else {
        navUsuario.innerHTML = `
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fa-regular fa-user"></i> Hola, ${escaparHTML(usuarioActual.nombre.split(" ")[0])}
                    ${esAdmin() ? `<span class="badge text-bg-dark">Admin</span>` : ""}
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><span class="dropdown-item-text small text-body-secondary">${escaparHTML(usuarioActual.correo)}</span></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" id="btn-cerrar-sesion"><i class="fa-solid fa-right-from-bracket fa-fw"></i> Salir</a></li>
                </ul>
            </li>`
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
    const estadoStock = agotado ? `<span class="text-body-secondary"><i class="fa-solid fa-ban"></i> Agotado</span>` :
        item.stock <= item.stock_minimo ? `<span class="text-danger"><i class="fa-solid fa-fire"></i> ¡Solo quedan ${item.stock}!</span>` :
        `<span class="text-success"><i class="fa-solid fa-check"></i> Disponible</span>`
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
                        <i class="fa-solid fa-cart-plus"></i> ${agotado ? "Sin stock" : "Agregar"}
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