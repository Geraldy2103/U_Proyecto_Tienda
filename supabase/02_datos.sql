-- =====================================================================
-- Ideas Digitales | Tienda — Datos iniciales
-- Catálogo copiado (solo lectura) de servicios.campus.pe. El equipo comercial usa
-- nombres y fotos de los empleados del curso (sin sueldos ni claves); correos ficticios.
-- Ejecutar DESPUÉS de 01_esquema.sql, en Supabase > SQL Editor.
-- =====================================================================

-- categorias: 8 registros
insert into categorias (idcategoria, nombre, descripcion, foto) overriding system value values
    (1, 'Bebidas', 'Gaseosas, café, té, cervezas y maltas', 'https://servicios.campus.pe/imagenes/categorias/bebidas.jpg'),
    (6, 'Carnes', 'Carnes preparadas', 'https://servicios.campus.pe/imagenes/categorias/carnes.jpg'),
    (2, 'Condimentos', 'Salsas dulces y picantes, delicias, comida para untar', 'https://servicios.campus.pe/imagenes/categorias/condimentos.jpg'),
    (7, 'Frutas/Verduras', 'Frutas secas y queso de soja', 'https://servicios.campus.pe/imagenes/categorias/frutas.jpg'),
    (5, 'Granos/Cereales', 'Pan, galletas, pasta y cereales', 'https://servicios.campus.pe/imagenes/categorias/granos.jpg'),
    (4, 'Lácteos', 'Quesos, leches y yogures frescos', 'https://servicios.campus.pe/imagenes/categorias/lacteos.jpg'),
    (8, 'Pescados/Mariscos', 'Pescados, mariscos y algas', 'https://servicios.campus.pe/imagenes/categorias/pescados.jpg'),
    (3, 'Repostería', 'Postres, dulces y pan dulce', 'https://servicios.campus.pe/imagenes/categorias/reposteria.jpg');

-- productos: 81 registros
insert into productos (idproducto, nombre, precio, preciorebajado, imagenchica, idcategoria) overriding system value values
    (1, 'Té Dharamsala Hibiscus Detox', 18, null, 'https://servicios.campus.pe/imagenes/productos/small/foto1.jpg', 1),
    (2, 'Cerveza Tibetana Green Barley', 19, null, 'https://servicios.campus.pe/imagenes/productos/small/foto2.jpg', 1),
    (3, 'Sirope de Anís Cherry Rocher', 10, null, 'https://servicios.campus.pe/imagenes/productos/small/foto3.jpg', 2),
    (4, 'Especias Cajun Tone''s Blend', 22, null, 'https://servicios.campus.pe/imagenes/productos/small/foto4.jpg', 2),
    (5, 'Mezcla Base Gumbo Tony Chachere', 21.35, null, 'https://servicios.campus.pe/imagenes/productos/small/foto5.jpg', 2),
    (6, 'Mermelada Buggy Grandma''s Jam', 25, null, 'https://servicios.campus.pe/imagenes/productos/small/foto6.jpg', 2),
    (7, 'Peras Secas Herbaila California', 30, null, 'https://servicios.campus.pe/imagenes/productos/small/foto7.jpg', 7),
    (8, 'Salsa de Arándanos Wood''s', 40, 30, 'https://servicios.campus.pe/imagenes/productos/small/foto8.jpg', 2),
    (9, 'Corte de Buey Wagyu Mishi Kobe', 97, 80, 'https://servicios.campus.pe/imagenes/productos/small/foto9.jpg', 6),
    (10, 'Filetes Pez Espada Wilder Hawaii', 31, null, 'https://servicios.campus.pe/imagenes/productos/small/foto10.jpg', 8),
    (11, 'Queso Cabrales Cueva del Molín', 21, null, 'https://servicios.campus.pe/imagenes/productos/small/foto11.jpg', 4),
    (12, 'Queso Gruyere La Quesera', 38, 30, 'https://servicios.campus.pe/imagenes/productos/small/foto12.jpg', 4),
    (13, 'Algas Shio Konbu Segawa', 6, null, 'https://servicios.campus.pe/imagenes/productos/small/foto13.jpg', 8),
    (14, 'Judías Verdes Redondas Ybarra', 23.25, null, 'https://servicios.campus.pe/imagenes/productos/small/foto14.jpg', 7),
    (15, 'Salsa de Soja Kikkoman Menos Sal', 15.5, null, 'https://servicios.campus.pe/imagenes/productos/small/foto15.jpg', 2),
    (16, 'Pastel Pavlova Dulcea Strawberry', 17.45, null, 'https://servicios.campus.pe/imagenes/productos/small/foto16.jpg', 3),
    (17, 'Cordero Lechal New Zealand Box', 39, 26, 'https://servicios.campus.pe/imagenes/productos/small/foto17.jpg', 6),
    (18, 'Langostinos Tigre Tassal Aussie', 62.5, 40, 'https://servicios.campus.pe/imagenes/productos/small/foto18.jpg', 8),
    (19, 'Surtido Galletas Delacre Tea Time', 9.2, null, 'https://servicios.campus.pe/imagenes/productos/small/foto19.jpg', 3),
    (20, 'Mermelada Captain Rodney''s', 81, 60, 'https://servicios.campus.pe/imagenes/productos/small/foto20.jpg', 3),
    (21, 'Bollos Surtidos Hospitality Dubai', 10, null, 'https://servicios.campus.pe/imagenes/productos/small/foto21.jpg', 3),
    (22, 'Pan Plano Sueco Mjälloms Tunnbröd', 21, null, 'https://servicios.campus.pe/imagenes/productos/small/foto22.jpg', 5),
    (23, 'Pan Centeno Oroweat Dark Rye', 9, null, 'https://servicios.campus.pe/imagenes/productos/small/foto23.jpg', 5),
    (24, 'Refresco Guaraná Antarctica Black', 4.5, null, 'https://servicios.campus.pe/imagenes/productos/small/foto24.jpg', 1),
    (25, 'Crema Gam''s Dubai Chocolate', 14, null, 'https://servicios.campus.pe/imagenes/productos/small/foto25.jpg', 3),
    (26, 'Gomitas Pacific CBD Gummy Bears', 31.23, null, 'https://servicios.campus.pe/imagenes/productos/small/foto26.jpg', 3),
    (27, 'Bombones Finos Schoggi Benter', 43.9, 24, 'https://servicios.campus.pe/imagenes/productos/small/foto27.jpg', 3),
    (28, 'Chucrut Carroll''s Sauerkraut', 45.6, 20, 'https://servicios.campus.pe/imagenes/productos/small/foto28.jpg', 7),
    (29, 'Salchicha Wolf Thüringer Bratwurst', 123.79, 100, 'https://servicios.campus.pe/imagenes/productos/small/foto29.jpg', 6),
    (30, 'Filetes de Arenque Elitney en Aceite', 25.89, null, 'https://servicios.campus.pe/imagenes/productos/small/foto30.jpg', 8),
    (31, 'Queso Gorgonzola Giovanni Colombo', 12.5, null, 'https://servicios.campus.pe/imagenes/productos/small/foto31.jpg', 4),
    (32, 'Queso Mascarpone Selección Mundial', 32, null, 'https://servicios.campus.pe/imagenes/productos/small/foto32.jpg', 4),
    (33, 'Queso de Cabra Natural Los Tilos', 2.5, null, 'https://servicios.campus.pe/imagenes/productos/small/foto33.jpg', 4),
    (34, 'Cerveza Sasquatch Stout Old Yale', 14, null, 'https://servicios.campus.pe/imagenes/productos/small/foto34.jpg', 1),
    (35, 'Cerveza Negra Imperial Fuller''s', 18, null, 'https://servicios.campus.pe/imagenes/productos/small/foto35.jpg', 1),
    (36, 'Arenque en Salsa de Vino Blue Hill', 19, null, 'https://servicios.campus.pe/imagenes/productos/small/foto36.jpg', 8),
    (37, 'Salmón Ahumado Gravad Gourmar', 26, null, 'https://servicios.campus.pe/imagenes/productos/small/foto37.jpg', 8),
    (38, 'Vino Tinto Blaye-Côtes de Bordeaux', 163.5, 120, 'https://servicios.campus.pe/imagenes/productos/small/foto38.jpg', 1),
    (39, 'Licor Chartreuse Liqueur 1605', 18, null, 'https://servicios.campus.pe/imagenes/productos/small/foto39.jpg', 1),
    (40, 'Carne de Cangrejo Chicken of Sea', 18.4, null, 'https://servicios.campus.pe/imagenes/productos/small/foto40.jpg', 8),
    (41, 'Sopa de Almeja Campbell''s Chunky', 9.65, null, 'https://servicios.campus.pe/imagenes/productos/small/foto41.jpg', 8),
    (42, 'Tallarines Estilo Singapur Tesco', 14, null, 'https://servicios.campus.pe/imagenes/productos/small/foto42.jpg', 5),
    (43, 'Café Blanco Oriental Kopi Durian', 46, 23, 'https://servicios.campus.pe/imagenes/productos/small/foto43.jpg', 1),
    (44, 'Azúcar de Palma Gula Melaka Mini', 19.45, null, 'https://servicios.campus.pe/imagenes/productos/small/foto44.jpg', 2),
    (45, 'Arenque Ahumado King Oscar', 9.5, null, 'https://servicios.campus.pe/imagenes/productos/small/foto45.jpg', 8),
    (46, 'Arenque en Salsa ICA Skärgårds', 12, null, 'https://servicios.campus.pe/imagenes/productos/small/foto46.jpg', 8),
    (47, 'Galletas Holandesas Albert Heijn', 9.5, null, 'https://servicios.campus.pe/imagenes/productos/small/foto47.jpg', 3),
    (48, 'Tableta Hollandse Chocolade', 12.75, null, 'https://servicios.campus.pe/imagenes/productos/small/foto48.jpg', 3),
    (49, 'Regaliz Ecológico SaludViva', 20, null, 'https://servicios.campus.pe/imagenes/productos/small/foto49.jpg', 3),
    (50, 'Chocolate Blanco Clavileño', 16.25, null, 'https://servicios.campus.pe/imagenes/productos/small/foto50.jpg', 3),
    (51, 'Rodajas de Manzana Artesano', 53, 27, 'https://servicios.campus.pe/imagenes/productos/small/foto51.jpg', 7),
    (52, 'Quinua y Lentejas Fillo''s Sofrito', 7, null, 'https://servicios.campus.pe/imagenes/productos/small/foto52.jpg', 5),
    (53, 'Empanadas Mix Cocktail Como en Casa', 32.8, 28, 'https://servicios.campus.pe/imagenes/productos/small/foto53.jpg', 6),
    (54, 'Pasteles de Carne Holland''s Pasties', 7.45, null, 'https://servicios.campus.pe/imagenes/productos/small/foto54.jpg', 6),
    (55, 'Paté Chinois Jonathan Garnier', 24, null, 'https://servicios.campus.pe/imagenes/productos/small/foto55.jpg', 6),
    (56, 'Gnocchi Chicche Fontaneto', 38, 24, 'https://servicios.campus.pe/imagenes/productos/small/foto56.jpg', 5),
    (57, 'Ravioli Veganos D''Angelo Bio', 19.5, null, 'https://servicios.campus.pe/imagenes/productos/small/foto57.jpg', 5),
    (58, 'Caracoles Borgoña Hanseatik', 13.25, null, 'https://servicios.campus.pe/imagenes/productos/small/foto58.jpg', 8),
    (59, 'Queso Raclette Suizo Mifroma', 55, 30, 'https://servicios.campus.pe/imagenes/productos/small/foto59.jpg', 4),
    (60, 'Queso Camembert Ile de France', 34, 28, 'https://servicios.campus.pe/imagenes/productos/small/foto60.jpg', 4),
    (61, 'Sirope de Arce Williams Family', 28.5, null, 'https://servicios.campus.pe/imagenes/productos/small/foto61.jpg', 2),
    (62, 'Tarta Sucre à la Crème St Donat', 49.3, 25, 'https://servicios.campus.pe/imagenes/productos/small/foto62.jpg', 3),
    (63, 'Paté Vegetal Argeta Lentil Tartar', 43.9, 23, 'https://servicios.campus.pe/imagenes/productos/small/foto63.jpg', 7),
    (64, 'Bollos Semmel Knödel Echt Feld', 33.25, 30, 'https://servicios.campus.pe/imagenes/productos/small/foto64.jpg', 5),
    (65, 'Salsa Picante Crystal Louisiana', 21.05, null, 'https://servicios.campus.pe/imagenes/productos/small/foto65.jpg', 2),
    (66, 'Sazonador Louisiana Cajun Seasoning', 17, null, 'https://servicios.campus.pe/imagenes/productos/small/foto66.jpg', 2),
    (67, 'Cerveza Lumberjack Canadian IPA', 14, null, 'https://servicios.campus.pe/imagenes/productos/small/foto67.jpg', 1),
    (68, 'Pan Escocés Mothers Pride Plain', 12.5, null, 'https://servicios.campus.pe/imagenes/productos/small/foto68.jpg', 3),
    (69, 'Queso Noruego Gudbrandsdalsost', 36, 24, 'https://servicios.campus.pe/imagenes/productos/small/foto69.jpg', 4),
    (70, 'Cerveza Rascals Outback NEIPA', 15, null, 'https://servicios.campus.pe/imagenes/productos/small/foto70.jpg', 1),
    (71, 'Queso Noruego Fløtemysost Tine', 21.5, null, 'https://servicios.campus.pe/imagenes/productos/small/foto71.jpg', 4),
    (72, 'Mozzarella Giovanni Fior di Latte', 34.8, 30, 'https://servicios.campus.pe/imagenes/productos/small/foto72.jpg', 4),
    (73, 'Caviar Rojo ICA Stenbitsrom', 15, null, 'https://servicios.campus.pe/imagenes/productos/small/foto73.jpg', 8),
    (74, 'Tofu Sedoso Clearspring Organic', 10, null, 'https://servicios.campus.pe/imagenes/productos/small/foto74.jpg', 7),
    (75, 'Cerveza Heineken He150ken 1L', 7.75, null, 'https://servicios.campus.pe/imagenes/productos/small/foto75.jpg', 1),
    (76, 'Licor Kajo Arctic Cloudberry', 18, null, 'https://servicios.campus.pe/imagenes/productos/small/foto76.jpg', 1),
    (77, 'Pesto de 7 Hierbas Kornmayer''s', 13, null, 'https://servicios.campus.pe/imagenes/productos/small/foto77.jpg', 2),
    (78, 'Leche Evaporada GLORIA Light', 27.7, null, null, 4),
    (79, 'Pack FRUGOS Néctar Manzana', 8, null, null, 1),
    (80, 'Pack Jamón Pizza BRAEDT Queso', 13.4, null, null, 6),
    (81, 'Cerveza TRES CRUCES Lager', 29.9, null, null, 1);

-- proveedores: 29 registros
insert into proveedores (idproveedor, nombreempresa, nombrecontacto, cargocontacto, direccion, ciudad, region, codigopostal, pais, telefono, fax) overriding system value values
    (1, 'Tiendas Charlotte', 'Charlotte Cooper', 'Gerente de compras', '88 Gilbert St.', 'Londres', null, 'EC1 4SD', 'Reino Unido', '(171) 555-2222', null),
    (2, 'New Orleans Cajun Delights', 'Shelley Burke', 'Administrador de pedidos', 'P.O. Box 78934', 'New Orleans', 'LA', '70117', 'Estados Unidos', '(100) 555-4888', '12'),
    (3, 'Grandma Kelly''s Homestead', 'Regina Murphy', 'Representante de ventas', '707 Oxford Rd.', 'Ann Arbor', 'MI', '48104', 'Estados Unidos', '(313) 555-5735', '(313) 555-3349'),
    (4, 'Tokyo Traders', 'Yoshi Nagase', 'Gerente de marketing', '9-8 SekimaiMusashino-shi', 'Tokyo', null, '100', 'Japón', '(03) 3555-5011', '(015) - 634'),
    (5, 'Cooperativa de Quesos ''Las Cabras''', 'Antonio del Valle Saavedra ', 'Administrador de exportaciones', 'Calle del Rosal 4', 'Oviedo', 'Asturias', '33007', 'España', '(98) 598 76 54', null),
    (6, 'Mayumi''s', 'Mayumi Ohno', 'Representante de marketing', '92 Setsuko
Chuo-ku', 'Osaka', null, '545', 'Japón', '(06) 431-7877', null),
    (7, 'Pavlova, Ltd.', 'Ian Devling', 'Gerente de marketing', '74 Rose St.
Moonie Ponds', 'Melbourne', 'Victoria', '3058', 'Australia', '(03) 444-2343', '(03) 444-6588'),
    (8, 'Specialty Biscuits, Ltd.', 'Peter Wilson', 'Representante de ventas', '29 King''s Way', 'Manchester', null, 'M14 GSD', 'Reino Unido', '(161) 555-4448', null),
    (9, 'PB Knäckebröd AB', 'Lars Peterson', 'Agente de ventas', 'Kaloadagatan 13', 'Göteborg', null, 'S-345 67', 'Suecia', '031-987 65 43', '031-987 65 91'),
    (10, 'Refrescos Americanas LTDA', 'Carlos Diaz', 'Gerente de marketing', 'Av. das Americanas 12.890', 'São Paulo', null, '5442', 'Brasil', '(11) 555 4640', null),
    (11, 'Heli Süßwaren GmbH & Co. KG', 'Petra Winkler', 'Gerente de ventas', 'Tiergartenstraße 5', 'Berlín', null, '10785', 'Alemania', '(010) 9984510', null),
    (12, 'Plutzer Lebensmittelgroßmärkte AG', 'Martin Bein', 'Ger. marketing internacional', 'Bogenallee 51', 'Frankfurt', null, '60439', 'Alemania', '(069) 992755', null),
    (13, 'Nord-Ost-Fisch Handelsgesellschaft mbH', 'Sven Petersen', 'Coordinador de mercados', 'Frahmredder 112a', 'Cuxhaven', null, '27478', 'Alemania', '(04721) 8713', '(04721) 8714'),
    (14, 'Formaggi Fortini s.r.l.', 'Elio Rossi', 'Representante de ventas', 'Viale Dante, 75', 'Ravenna', null, '48100', 'Italia', '(0544) 60323', '(0544) 60603'),
    (15, 'Norske Meierier', 'Beate Vileid', 'Gerente de marketing', 'Hatlevegen 5', 'Sandvika', null, '1320', 'Noruega', '(0)2-953010', null),
    (16, 'Bigfoot Breweries', 'Cheryl Saylor', 'Repr. de cuentas regional', '3400 - 8th Avenue
Suite 210', 'Bend', 'OR', '97101', 'Estados Unidos', '(503) 555-9931', null),
    (17, 'Svensk Sjöföda AB', 'Michael Björn', 'Representante de ventas', 'Brovallavägen 231', 'Stockholm', null, 'S-123 45', 'Suecia', '08-123 45 67', null),
    (18, 'Aux joyeux ecclésiastiques', 'Guylène Nodier', 'Gerente de ventas', '203, Rue des Francs-Bourgeois', 'París', null, '75004', 'Francia', '(1) 03.83.00.68', '(1) 03.83.00.62'),
    (19, 'New England Seafood Cannery', 'Robb Merchant', 'Agente de cuentas al por mayor', 'Order Processing Dept.
2100 Paul Revere Blvd.', 'Boston', 'MA', '2134', 'Estados Unidos', '(617) 555-3267', '(617) 555-3389'),
    (20, 'Leka Trading', 'Chandra Leka', 'Propietario', '471 Serangoon Loop, Suite #402', 'Singapore', null, '512', 'Singapur', '555-8787', null),
    (21, 'Lyngbysild', 'Niels Petersen', 'Gerente de ventas', 'Lyngbysild
Fiskebakken 10', 'Lyngby', null, '2800', 'Dinamarca', '43844108', '43844115'),
    (22, 'Zaanse Snoepfabriek', 'Dirk Luchte', 'Gerente de contabilidad', 'Verkoop
Rijnweg 22', 'Zaandam', null, '9999 ZZ', 'Holanda', '(12345) 1212', '(12345) 1210'),
    (23, 'Karkki Oy', 'Anne Heikkonen', 'Gerente de producción', 'Valtakatu 12', 'Lappeenranta', null, '53120', 'Finlandia', '(953) 10956', null),
    (24, 'G''day, Mate', 'Wendy Mackenzie', 'Representante de ventas', '170 Prince Edward Parade
Hunter''s Hill', 'Sydney', 'NSW', '2042', 'Australia', '(02) 555-5914', '(02) 555-4873'),
    (25, 'Ma Maison', 'Jean-Guy Lauzon', 'Gerente de marketing', '2960 Rue St. Laurent', 'Montréal', 'Québec', 'H1J 1C3', 'Canadá', '(514) 555-9022', null),
    (26, 'Pasta Buttini s.r.l.', 'Giovanni Giudici', 'Administrador de pedidos', 'Via dei Gelsomini, 153', 'Salerno', null, '84100', 'Italia', '(089) 6547665', '(089) 6547667'),
    (27, 'Escargots Nouveaux', 'Marie Delamare', 'Gerente de ventas', '22, rue H. Voiron', 'Montceau', null, '71300', 'Francia', '85.57.00.07', null),
    (28, 'Gai pâturage', 'Eliane Noz', 'Representante de ventas', 'Bat. B
3, rue des Alpes', 'Annecy', null, '74000', 'Francia', '38.76.98.06', '38.76.98.58'),
    (29, 'Forêts d''érables', 'Chantal Goulet', 'Gerente de contabilidad', '148 rue Chasseur', 'Ste-Hyacinthe', 'Québec', 'J2S 7S8', 'Canadá', '(514) 555-2955', '(514) 555-2921');

-- sedes: 3 registros
insert into sedes (idsede, nombre, direccion, distrito) overriding system value values
    (1, 'Miraflores', 'Av. José Larco 1150', 'Miraflores'),
    (2, 'San Isidro', 'Av. Camino Real 1050', 'San Isidro'),
    (3, 'Callao', 'Av. Sáenz Peña 600', 'Callao');

-- directores: 9 registros
insert into directores (iddirector, nombres, apellidos, correo, foto, idsede) overriding system value values
    (1, 'Gigi', 'Hadid', 'gigi.hadid@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/gigi_hadid.jpg', 1),
    (2, 'Joan', 'Smalls', 'joan.smalls@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/joan_smalls.jpg', 1),
    (3, 'Kendall', 'Jenner', 'kendall.jenner@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/kendall_jenner.jpg', 1),
    (4, 'Alexander', 'Skarsgård', 'alexander.skarsgard@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/alexander_skarsgard.jpg', 2),
    (5, 'Rosie', 'Huntington', 'rosie.huntington@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/rosie_huntington.jpg', 2),
    (6, 'Brooklyn', 'Decker', 'brooklyn.decker@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/brooklyn_decker.jpg', 2),
    (7, 'Taylor', 'Swift', 'taylor.swift@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/taylor_swift.jpg', 3),
    (8, 'Liu', 'Wen', 'liu.wen@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/liu_wen.jpg', 3),
    (9, 'Ryan', 'Reynolds', 'ryan.reynolds@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/ryan_reynolds.jpg', 3);

-- asesores: 10 registros
insert into asesores (idasesor, nombres, apellidos, correo, foto, iddirector) overriding system value values
    (1, 'Nicholas', 'Galitzine', 'nicholas.galitzine@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/nicholas_galitzine.jpg', 1),
    (2, 'Regé-Jean', 'Page', 'rege-jean.page@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/rege-jean_page.jpg', 1),
    (3, 'Kaia', 'Gerber', 'kaia.gerber@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/kaia_garber.jpg', 2),
    (4, 'Kate', 'Upton', 'kate.upton@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/kate_upton.jpg', 3),
    (5, 'Ryan', 'Gosling', 'ryan.gosling@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/ryan_gosling.jpg', 4),
    (6, 'Dua', 'Lipa', 'dua.lipa@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/dua_lipa.jpg', 5),
    (7, 'Jennie', 'Kim', 'jennie.kim@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/jennie_kim.jpg', 6),
    (8, 'Romee', 'Strijd', 'romee.strijd@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/romee_strijd.jpg', 7),
    (9, 'Sana', 'Minatozaki', 'sana.minatozaki@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/sana_minatozaki.jpg', 8),
    (10, 'Glen', 'Powell', 'glen.powell@ideasdigitales.pe', 'https://servicios.campus.pe/imagenes/empleados/glen_powell.jpg', 9);

-- Los autonuméricos siguen después del último código cargado
select setval(pg_get_serial_sequence('categorias', 'idcategoria'), (select max(idcategoria) from categorias));
select setval(pg_get_serial_sequence('productos', 'idproducto'), (select max(idproducto) from productos));
select setval(pg_get_serial_sequence('proveedores', 'idproveedor'), (select max(idproveedor) from proveedores));
select setval(pg_get_serial_sequence('sedes', 'idsede'), (select max(idsede) from sedes));
select setval(pg_get_serial_sequence('directores', 'iddirector'), (select max(iddirector) from directores));
select setval(pg_get_serial_sequence('asesores', 'idasesor'), (select max(idasesor) from asesores));
