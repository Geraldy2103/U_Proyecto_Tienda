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
    if (!contador) return // el menú todavía no se ha dibujado
    const unidades = leerCarrito().reduce((suma, item) => suma + item.cantidad, 0)
    contador.textContent = unidades
    contador.style.display = unidades > 0 ? "inline-block" : "none" // si está vacío no se muestra
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
        irAPagina(esAdmin() ? "Directores" : "Tienda")
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
rol: "admin" = solo la ven los administradores (intranet). Sin rol = la ve todo el mundo.
oculto: true = no aparece en el menú; se abre con un botón (por ejemplo "Mayoristas").
*/
const menuItems = [
    {etiqueta: "Inicio",       pagina: "pages/inicio.html"},
    {etiqueta: "Nosotros",     pagina: "pages/nosotros.html"},
    {etiqueta: "Inversiones",  pagina: "pages/inversiones.html"},
    {etiqueta: "Tienda",       pagina: "pages/tienda.html", codigo: "js/pages/tienda.js"},
    {etiqueta: "Carrito",      pagina: "pages/carrito.html", codigo: "js/pages/carrito.js"},
    {etiqueta: "Asesores comerciales", pagina: "pages/asesores.html", codigo: "js/pages/asesores.js", oculto: true},
    // Intranet (solo admin)
    {etiqueta: "Proveedores",  pagina: "pages/proveedores.html", codigo: "js/pages/proveedores.js", rol: "admin"},
    {etiqueta: "Directores",   pagina: "pages/directores.html", codigo: "js/pages/directores.js", rol: "admin"},
    {etiqueta: "Solicitudes",  pagina: "pages/solicitudes.html", codigo: "js/pages/solicitudes.js", rol: "admin"}
]

/* La página de ingreso no va en el menú principal: se abre con el botón "Ingresar" de la derecha */
const paginaIngresar = {etiqueta: "Ingresar", pagina: "pages/login.html", codigo: "js/pages/login.js"}

const mainNav = document.getElementById("main-nav")
const navUsuario = document.getElementById("nav-usuario")
const mainContent = document.getElementById("main-content")

/* ¿El usuario actual puede ver esta página? */
const puedeVer = (item) => item.rol !== "admin" || esAdmin()

/* Carga una página dentro de <main> */
const cargarPagina = (item) => {
    // marca como "active" el enlace de la página abierta
    document.querySelectorAll("#navbarNav a").forEach(a => a.classList.toggle("active", a.dataset.etiqueta === item.etiqueta))

    if (!puedeVer(item)) { // protección extra: aunque alguien llame irAPagina("Directores") sin ser admin
        mainContent.innerHTML = `<section class="padded"><div class="container">
            ${mensajeError("Esta sección es solo para administradores.")}</div></section>`
        return
    }

    fetch(item.pagina) /*fetch() significa básicamente:"Ve a buscar este recurso."*/
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

/* Crea un enlace del menú. Se usa para las opciones de la izquierda y para "Ingresar" */
const crearEnlace = (item) => {
    const menuLI = document.createElement("li")
    menuLI.className = "nav-item"
    const menuA = document.createElement("a")
    menuA.className = "nav-link"
    menuA.textContent = item.etiqueta
    menuA.dataset.etiqueta = item.etiqueta /*data-etiqueta="Tienda": sirve para marcar el enlace activo*/
    if (item.etiqueta === "Carrito") { /*al enlace del carrito le agregamos el contador de productos*/
        menuA.innerHTML += ` <span class="badge rounded-pill text-bg-danger" id="contador-carrito"></span>`
    }
    if (item.rol === "admin") { /*las opciones de la intranet llevan un candado*/
        menuA.innerHTML = `<i class="fa-solid fa-lock"></i> ` + menuA.innerHTML
    }
    menuA.addEventListener("click", () => cargarPagina(item))
    menuLI.appendChild(menuA)
    return menuLI
}

/* Arma el menú según quién está conectado. Se vuelve a llamar al iniciar o cerrar sesión. */
const dibujarMenu = () => {
    mainNav.innerHTML = ""
    menuItems.filter(item => puedeVer(item) && !item.oculto).forEach(item => mainNav.appendChild(crearEnlace(item)))

    navUsuario.innerHTML = ""
    if (usuarioActual === null) {
        navUsuario.appendChild(crearEnlace(paginaIngresar))
    } else {
        navUsuario.innerHTML = `
            <li class="nav-item">
                <span class="navbar-text me-2">
                    <i class="fa-regular fa-user"></i> ${escaparHTML(usuarioActual.nombre)}
                    ${esAdmin() ? `<span class="badge text-bg-dark">Admin</span>` : ""}
                </span>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="btn-cerrar-sesion"><i class="fa-solid fa-right-from-bracket"></i> Salir</a>
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
                <p>${frase}</p>
            </div>
        </header>
        `
    }
}
customElements.define("header-component", HeaderComponent) /*Cuando veas <header-component>, utiliza la clase HeaderComponent*/


const agregarItemCarrito = (nuevoItem, cantidad) => {
    if (usuarioActual === null) { /*para comprar hay que tener cuenta*/
        mostrarNotificacion("Inicia sesión para agregar productos al carrito", "fa-circle-info")
        irAPagina("Ingresar")
        return
    }
    const precioFinal = nuevoItem.preciorebajado ? nuevoItem.preciorebajado : nuevoItem.precio
    
    const itemCarrito = {                   //esto es un objeto json
        idproducto: nuevoItem.idproducto,
        nombre: nuevoItem.nombre,
        precio: precioFinal,
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