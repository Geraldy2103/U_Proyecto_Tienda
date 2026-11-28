// Servidor estático mínimo para probar la tienda en http://localhost:5500 (sin dependencias)
const http = require("http")
const fs = require("fs")
const path = require("path")

const raiz = path.resolve(__dirname, "..")
const tipos = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2"
}

http.createServer((req, res) => {
    const ruta = decodeURIComponent(req.url.split("?")[0])
    let archivo = path.join(raiz, ruta === "/" ? "index.html" : ruta)
    if (!archivo.startsWith(raiz)) { res.writeHead(403); return res.end() }
    fs.readFile(archivo, (error, datos) => {
        if (error) { res.writeHead(404); return res.end("No encontrado") }
        res.writeHead(200, { "Content-Type": tipos[path.extname(archivo)] || "application/octet-stream", "Cache-Control": "no-cache" })
        res.end(datos)
    })
}).listen(5500, () => console.log("Tienda en http://localhost:5500"))
