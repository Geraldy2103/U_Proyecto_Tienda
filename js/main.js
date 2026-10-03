"use strict"

window.API_URL = "https://servicios.campus.pe/" /*"window.API_URL" es una variable global que contiene la URL de la API.*/

/* ---------- Funciones compartidas (las usan todos los js/pages/*.js) ---------- */

/* Pide un recurso a la API y devuelve el JSON.
   fetch() solo falla si no hay red; si el servidor responde 404 o 500 no lanza error,
   por eso revisamos response.ok y lanzamos el error nosotros. */
const obtenerJSON = (url) => {
    return fetch(url).then(response => {
        if (!response.ok) {
            throw new Error("Error " + response.status + " al leer " + url)
        }
        return response.json()
    })
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
}

/* Muestra un aviso pequeño abajo a la derecha que desaparece solo (Toast de Bootstrap) */
const mostrarNotificacion = (texto) => {
    const contenedor = document.getElementById("contenedor-notificaciones")
    const toast = document.createElement("div")
    toast.className = "toast align-items-center text-bg-dark border-0"
    toast.setAttribute("role", "status")
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body"><i class="fa-solid fa-check"></i> ${texto}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
        </div>`
    contenedor.appendChild(toast)
    toast.addEventListener("hidden.bs.toast", () => toast.remove()) // al ocultarse, se borra del HTML
    bootstrap.Toast.getOrCreateInstance(toast, { delay: 2500 }).show()
}

/* Abre una sección del menú desde el código, por ejemplo irAPagina("Tienda") */
const irAPagina = (etiqueta) => {
    mainNav.querySelector(`a[data-etiqueta="${etiqueta}"]`).click()
}
/* 
etiqueta es el nombre de la opción que quieres mostrar al usuario.
pagina es la ruta del archivo HTML al que quieres ir cuando el usuario haga clic.
*/

const menuItems = [
    {etiqueta: "Inicio",       pagina: "pages/inicio.html"},
    {etiqueta: "Nosotros",     pagina: "pages/nosotros.html"},
    {etiqueta: "Inversiones",  pagina: "pages/inversiones.html"},
    {etiqueta: "Proveedores",  pagina: "pages/proveedores.html", codigo: "js/pages/proveedores.js"},
    {etiqueta: "Empleados",    pagina: "pages/empleados.html", codigo: "js/pages/empleados.js"},
    {etiqueta: "Tienda",       pagina: "pages/tienda.html", codigo: "js/pages/tienda.js"},
    {etiqueta: "Directores",   pagina: "pages/directores.html", codigo: "js/pages/directores.js"},
    {etiqueta: "Carrito",      pagina: "pages/carrito.html", codigo: "js/pages/carrito.js"}
]

const mainNav = document.getElementById("main-nav")
const mainContent = document.getElementById("main-content")

menuItems.forEach(item => {
    const menuLI = document.createElement("li")
    menuLI.className = "nav-item"
    const menuA = document.createElement("a")
    menuA.className = "nav-link"
    menuA.textContent = item.etiqueta
    menuA.dataset.etiqueta = item.etiqueta /*data-etiqueta="Tienda": lo usa irAPagina() para encontrar el enlace*/
    if (item.etiqueta === "Carrito") { /*al enlace del carrito le agregamos el contador de productos*/
        menuA.innerHTML += ` <span class="badge rounded-pill text-bg-danger" id="contador-carrito"></span>`
    }
    menuLI.appendChild(menuA)
    mainNav.appendChild(menuLI)
    
    menuA.addEventListener("click", () => {
        mainNav.querySelectorAll("a").forEach(mli => mli.classList.remove("active"))
        menuA.classList.add("active")
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
    })
})


actualizarContadorCarrito() /*muestra el número correcto si ya había productos guardados en esta pestaña*/
mainNav.querySelector("li:first-child a").click()
/*mainNav.querySelector("li:first-child a") busca el elemento <a> que está dentro del primer <li> de mainNav.
.click() hace clic automáticamente sobre ese <a>, como si el usuario hubiera hecho clic con el mouse.*/

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