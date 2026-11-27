(() => {
    const aviso = document.getElementById("aviso-mapa")
    const lista = document.getElementById("lista-sedes")

    // Coordenadas aproximadas: cámbialas por las reales de cada sede
    const sedes = [
        { nombre: "Callao", direccion: "Callao, Lima", lat: -12.0566, lng: -77.1181 },
        { nombre: "San Isidro", direccion: "San Isidro, Lima", lat: -12.0977, lng: -77.0365 },
        { nombre: "Miraflores", direccion: "Miraflores, Lima", lat: -12.1219, lng: -77.0297 }
    ]

    // Leaflet se carga una sola vez desde cdnjs (mapa libre de OpenStreetMap, sin clave)
    const cargarLeaflet = () => new Promise((resolver, rechazar) => {
        if (window.L) return resolver()
        const css = document.createElement("link")
        css.rel = "stylesheet"
        css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"
        document.head.appendChild(css)
        const js = document.createElement("script")
        js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
        js.onload = resolver
        js.onerror = rechazar
        document.head.appendChild(js)
    })

    cargarLeaflet()
        .then(() => {
            const mapa = L.map("mapa-sedes").setView([-12.09, -77.07], 11)
            L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap"
            }).addTo(mapa)

            lista.innerHTML = ""
            sedes.forEach(sede => {
                const marcador = L.marker([sede.lat, sede.lng]).addTo(mapa)
                marcador.bindPopup(`<strong>${sede.nombre}</strong><br>${sede.direccion}`)

                const boton = document.createElement("button")
                boton.type = "button"
                boton.className = "list-group-item list-group-item-action"
                boton.innerHTML = `<strong>${sede.nombre}</strong><br><small>${sede.direccion}</small>`
                boton.addEventListener("click", () => {
                    mapa.flyTo([sede.lat, sede.lng], 15)
                    marcador.openPopup()
                })
                lista.appendChild(boton)
            })
        })
        .catch(error => {
            console.error(error)
            aviso.innerHTML = mensajeError("No se pudo cargar el mapa. Intenta nuevamente.")
        })
})()
