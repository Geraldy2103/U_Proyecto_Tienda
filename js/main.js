"use strict"

/* 
const menuItems = [
    "Inicio", "Nosotros", "Inversiones", "Proveedores", "Empleados", "Tienda"
]
*/
window.API_URL = "https://servicios.campus.pe/" /*"window.API_URL" es una variable global que contiene la URL de la API.*/
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
    menuLI.appendChild(menuA)
    mainNav.appendChild(menuLI)
    
    menuA.addEventListener("click", () => {
        mainNav.querySelectorAll("a").forEach(mli => mli.classList.remove("active"))
        menuA.classList.add("active")
        fetch(item.pagina) /*fetch() significa básicamente:"Ve a buscar este recurso."*/
        .then(response => response.text())/*response representa la respuesta que recibió el navegador, response.text() convierte el contenido en texto.*/
        .then(data => {  /*"Cuando termine lo anterior, recibe el resultado y llámalo data."*/ 
            mainContent.innerHTML = data  /*"Mete el contenido de data dentro de mainContent como HTML."*/ 


            if(item.codigo){ /*"Si item.codigo existe, entonces..."*/ 
                const codigoPagina = document.createElement("script")
                codigoPagina.setAttribute("src", item.codigo) /*<script src="js/pages/proveedores.js"></script> -- "Busca el archivo js/pages/proveedores.js, cárgalo y ejecuta el JavaScript que contiene."*/
                mainContent.appendChild(codigoPagina)
            }
        })
    })
})


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
    const carrito = JSON.parse(sessionStorage.getItem("carritocompras")) || []  //Crea la constante carrito con los productos guardados en sessionStorage; si todavía no hay productos guardados, usa un array vacío
    //parse: Convierte un texto JSON en un objeto/array de JavaScript
    
    const index = carrito.findIndex(item => item.idproducto === itemCarrito.idproducto) /*"carrito.findIndex()" busca el índice del primer elemento que cumpla la condición. La condición es que el idproducto del item en carrito sea igual al idproducto del itemCarrito que queremos agregar. Si no encuentra ningún elemento que cumpla la condición, devuelve -1.*/
    if(index == -1){ /*Si index es diferente de -1, significa que ya existe un producto con el mismo idproducto en el carrito.*/
        carrito.push(itemCarrito) /*Si el producto ya existe, simplemente sumamos la cantidad del nuevo itemCarrito a la cantidad existente en el carrito.*/
    } else {
        carrito[index].cantidad += itemCarrito.cantidad
    }

    sessionStorage.setItem("carritocompras",JSON.stringify(carrito))  //sessionStorage solo guarda valores como string (texto). No guarda objetos JavaScript directamente.
    /*Piensa que sessionStorage es como una cajita de almacenamiento del navegador donde puedes guardar información mientras la pestaña/sesión está activa.
    setItem() significa:"Guarda algo". Tiene esta estructura:sessionStorage.setItem("clave", "valor")
    guarda JSON.stringify(carrito) usando la clave "carritocompras". 
    JSON.stringify() Convierte este objeto/array de JavaScript en un texto JSON
    carga carrito, todo el paquete en sessionStorage, es paquete por paquete, */
    
}