# Presentación — estructura (consolidada por el Integrante 5)

Una diapositiva por integrante + apertura y cierre. Cada uno arma la suya con este formato:
**título · 3 puntos · 1 captura · 1 frase para defenderla**.

| # | Diapositiva | Quién |
|---|---|---|
| 1 | Portada: El Galpón del Costo — tienda web con Supabase | Integrante 5 |
| 2 | Arquitectura: navegador → supabase-js → PostgREST / Auth / PostgreSQL + Leaflet; roles (asesor = operador) | Integrante 5 |
| 3 | API REST y CRUD de productos y pedidos + tabla de endpoints | Integrante 1 |
| 4 | Mapa interactivo de sedes (Leaflet / OpenStreetMap) | Integrante 2 |
| 5 | Migración: scripts SQL, vistas, RLS y datos de prueba | Integrante 3 |
| 6 | Login / Register con roles y páginas protegidas | Integrante 4 |
| 7 | Integración, monitoreo y diseño adaptable | Integrante 5 |
| 8 | Pruebas de todo junto (resultados por rol) | Integrante 5 |
| 9 | Demo en vivo y conclusiones | Todos |

## Diapositiva 7 — Integración, monitoreo y diseño adaptable (Integrante 5)

- **Integración:** un solo `index.html` carga cada módulo; todos comparten la conexión a Supabase y la
  sesión. El mapa ahora lee las sedes de la base (antes estaban escritas a mano).
- **Monitoreo:** errores de la página y de la base quedan en `registro_eventos` (solo el admin los lee);
  panel con 6 chequeos en vivo (API, Auth, RLS, RPC, mapa, registro) y tiempos de respuesta.
- **Diseño adaptable:** probado en celular, tablet y escritorio; sin scroll horizontal.
- *Captura:* panel de Monitoreo con los chequeos en verde.
- *Frase de defensa:* "Si algo falla en el navegador de cualquier cliente, el administrador lo ve en el
  monitoreo con la hora y la sección donde ocurrió."

## Diapositiva 8 — Pruebas de todo junto

- 4 perfiles probados: visitante, cliente, asesor (operador) y administrador.
- Cada rol solo ve lo suyo: lo impone la base (RLS), no solo la página.
- *Captura:* tabla de resultados de `docs/PRUEBAS.md` y la pantalla "No tienes acceso".

## Guion de la demo (3 min)

1. Visitante: Tienda → Sedes (mapa) → intentar comprar → pide iniciar sesión.
2. Cliente: compra con tarjeta de prueba → Mis pedidos.
3. Asesor: Mi panel → atender su solicitud.
4. Admin: Productos (editar stock) → Monitoreo (estado en verde, errores registrados).
5. F12 → vista celular para mostrar el diseño adaptable.

> Antes de presentar: entrar a Supabase y pulsar **Restore project** si está pausado (plan gratuito).
