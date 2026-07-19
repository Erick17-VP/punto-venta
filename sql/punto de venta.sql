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

-- Creación de la tabla de clientes reales
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conectamos la venta con un cliente (es NULLABLE por si es venta al público general)
ALTER TABLE ventas 
ADD COLUMN cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;

-- 1. Aseguramos que la tabla de clientes tenga su ID automático y fecha de registro
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Creamos la tabla de ventas (El corazón del conteo de clientes frecuentes)
CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id) ON DELETE SET NULL, -- Si es "Público General", aquí se guardará como NULL
    total DECIMAL(10, 2) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Tabla de Productos (Se queda igual porque su ID sí es un número entero SERIAL)
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE NOT NULL,
    sku VARCHAR(50) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    precio_compra DECIMAL(10, 2) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Agregamos la columna 'sku' que te faltaba en tu tabla de productos original
ALTER TABLE productos ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE;

-- 2. Creamos la tabla 'detalle_ventas' (en singular, como tu diseño) adaptada a UUIDs
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT, -- 👈 ¡Corregido a UUID!
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL
);