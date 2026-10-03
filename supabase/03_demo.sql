-- =====================================================================
-- Ideas Digitales | Tienda — Datos de DEMOSTRACIÓN (opcional)
-- Crea pedidos y solicitudes de ejemplo de los últimos 90 días para que la página
-- de Indicadores tenga información que mostrar.
-- Requisitos: haber ejecutado 01 y 02, y tener al menos UNA cuenta creada en la página
-- (los pedidos de ejemplo se registran a nombre de esa cuenta).
-- Para quitarlos:  delete from pedidos;  delete from solicitudes_mayoristas;
-- =====================================================================

do $$
declare
    v_cliente   uuid := (select id from perfiles order by (rol = 'cliente') desc limit 1);
    v_pedido    integer;
    v_asesor    integer;
    v_sede      integer;
    v_mayorista boolean;
    v_fecha     timestamptz;
    i           integer;
begin
    if v_cliente is null then
        raise exception 'Primero crea una cuenta en la página (Ingresar > Crear cuenta).';
    end if;

    perform setseed(0.42);  -- siempre los mismos números "aleatorios"

    for i in 1..80 loop
        v_mayorista := random() < 0.35;
        v_fecha     := now() - (random() * interval '90 days');

        if v_mayorista then
            -- algunos asesores reciben más pedidos que otros (para que el ranking sea interesante)
            v_asesor := 1 + floor(power(random(), 1.6) * 10)::int;
            select d.idsede into v_sede from asesores a join directores d using (iddirector) where a.idasesor = v_asesor;
        else
            v_asesor := null;
            v_sede   := 1 + floor(random() * 3)::int;
        end if;

        insert into pedidos (idusuario, idsede, idasesor, tipo, fecha, estado)
            values (v_cliente, v_sede, v_asesor, case when v_mayorista then 'mayorista' else 'minorista' end,
                    v_fecha, case when random() < 0.8 then 'entregado' else 'registrado' end)
            returning idpedido into v_pedido;

        -- 1 a 4 productos distintos; mayorista: 12 a 60 unidades, minorista: 1 a 5
        -- (los pedidos de demostración no descuentan stock: es un historial ya repuesto)
        insert into pedido_detalle (idpedido, idproducto, nombre, precio, costo, cantidad)
            select v_pedido, p.idproducto, p.nombre, coalesce(nullif(p.preciorebajado, 0), p.precio),
                   p.costo,
                   case when v_mayorista then 12 + floor(random() * 49)::int else 1 + floor(random() * 5)::int end
            from (select * from productos order by random() limit 1 + floor(random() * 4)::int) p;

        update pedidos set total = (select sum(subtotal) from pedido_detalle where idpedido = v_pedido)
            where idpedido = v_pedido;

        -- cada pedido mayorista viene de una solicitud; además hay solicitudes que no se concretaron
        if v_mayorista or random() < 0.15 then
            insert into solicitudes_mayoristas (idusuario, idasesor, productos, mensaje, estado, fecha)
                select v_cliente, coalesce(v_asesor, 1 + floor(random() * 10)::int),
                       jsonb_build_array(jsonb_build_object('idproducto', p.idproducto, 'nombre', p.nombre,
                                         'precio', p.precio, 'cantidad', 12 + floor(random() * 30)::int)),
                       'Solicitud de demostración',
                       case when v_mayorista then 'atendida' else 'pendiente' end,
                       v_fecha - interval '1 day'
                from (select * from productos order by random() limit 1) p;
        end if;
    end loop;
end;
$$;

-- Resumen
select sede, pedidos, ventas, ventas_minoristas, ventas_mayoristas from ventas_por_sede order by ventas desc;
