-- 1. TABLA DE USUARIOS (Para el Login y control de permisos)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contrasena TEXT NOT NULL, -- Aquí irá la contraseña encriptada (hasheada)
    rol VARCHAR(20) NOT NULL DEFAULT 'cajero', -- 'admin' o 'cajero'
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE PRODUCTOS (Inventario)
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_barras VARCHAR(50) UNIQUE, -- Puede ser nulo si el producto no tiene código
    nombre VARCHAR(150) NOT NULL,
    precio_compra NUMERIC(10, 2) NOT NULL, -- NUMERIC evita errores de centavos que tiene FLOAT
    precio_venta NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE VENTAS (La cabecera del ticket: quién compró, cuándo y cuánto)
CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- Cajero que hizo la venta
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DETALLE DE VENTAS (El cuerpo del ticket: la lista de productos de cada venta)
CREATE TABLE detalle_ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE, -- Se conecta con la venta padre
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT, -- No deja borrar un producto si ya se vendió
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL -- Guarda el precio exacto al que se vendió ese día
);

-- 1. Agregamos una regla estricta para que solo existan los roles 'admin' y 'cajero'
ALTER TABLE usuarios 
ADD CONSTRAINT chk_rol_valido CHECK (rol IN ('admin', 'cajero'));

-- 2. Insertamos el primer Administrador de prueba
INSERT INTO usuarios (nombre, usuario, contrasena, rol) 
VALUES ('Administrador Principal', 'admin', 'admin123', 'admin');

-- 3. Insertamos el primer Cajero de prueba
INSERT INTO usuarios (nombre, usuario, contrasena, rol) 
VALUES ('Juan Pérez', 'juan_cajero', 'cajero123', 'cajero');

SELECT id, nombre, usuario, rol, creado_en FROM usuarios;

INSERT INTO productos (codigo_barras, nombre, precio_compra, precio_venta, stock, stock_minimo)
VALUES 
('7501055300075', 'Coca-Cola Original 600ml', 12.00, 18.00, 50, 10),
('7501011122420', 'Papas Sabritas Sal 45g', 11.50, 17.00, 30, 5),
('7501003102321', 'Leche Entera Lala 1L', 19.00, 26.00, 20, 8);