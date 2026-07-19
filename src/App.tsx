import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import "./App.css";

interface Usuario { id: string; nombre: string; usuario: string; rol: string; }
interface Cliente { id: string; nombre: string; telefono: string; correo: string; }
interface Producto {
  id: string;
  codigo_barras: string | null;
  sku: string | null;
  nombre: string;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
}
interface ItemCarrito { producto: Producto; cantidad: number; }
interface VentaHistorial {
  id: string;
  total: number;
  fecha_venta: string;
  cliente_nombre: string | null;
  usuario_nombre: string | null;
}

function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usuarioActivo, setUsuarioActivo] = useState<Usuario | null>(null);
  const [pestanaActiva, setPestanaActiva] = useState("nueva-venta");
  const [errorConexion, setErrorConexion] = useState<string | null>(null);

  // Login
  const [inputUsuario, setInputUsuario] = useState("");
  const [inputContrasena, setInputContrasena] = useState("");

  // Clientes e Inventario
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busquedaInventario, setBusquedaInventario] = useState("");

  // Formularios de registro / Edición de Producto
  const [editandoProductoId, setEditandoProductoId] = useState<string | null>(null);
  const [prodCodigo, setProdCodigo] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodNombre, setProdNombre] = useState("");
  const [prodPrecioCompra, setProdPrecioCompra] = useState("");
  const [prodPrecioVenta, setProdPrecioVenta] = useState("");
  const [prodStock, setProdStock] = useState("");
  
  const [cliNombre, setCliNombre] = useState("");
  const [cliTelefono, setCliTelefono] = useState("");
  const [cliCorreo, setCliCorreo] = useState("");

  // Nuevo Empleado (Panel Admin)
  const [empNombre, setEmpNombre] = useState("");
  const [empUsuario, setEmpUsuario] = useState("");
  const [empContrasena, setEmpContrasena] = useState("");
  const [empRol, setEmpRol] = useState("cajero");

  // Carrito, Caja y Calculadora de Cambio
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [buscadorVentas, setBuscadorVentas] = useState("");
  const [sugerencias, setSugerencias] = useState<Producto[]>([]); 
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState("");
  const [esFrecuente, setEsFrecuente] = useState(false);
  const [visitasCliente, setVisitasCliente] = useState(0);
  const [pagaCon, setPagaCon] = useState(""); // 💵 Estado para la calculadora de cambio

  // Historial y Corte
  const [historialVentas, setHistorialVentas] = useState<VentaHistorial[]>([]);
  const [filtroFechaHistorial, setFiltroFechaHistorial] = useState(new Date().toISOString().split('T')[0]);

  // Modales
  const [ticketActual, setTicketActual] = useState<{
    id: string;
    cajero: string;
    cliente: string;
    items: ItemCarrito[];
    subtotal: number;
    descuento: number;
    total: number;
    pagaCon: number;
    cambio: number;
    fecha: string;
  } | null>(null);

  const [corteActual, setCorteActual] = useState<{
    fecha: string;
    totalDinero: number;
    totalTransacciones: number;
    cajero: string;
  } | null>(null);

  const subtotal = carrito.reduce((acc, item) => acc + (item.producto.precio_venta * item.cantidad), 0);
  const porcentajeDescuento = esFrecuente ? (subtotal > 500 ? 15 : 5) : 0;
  const dineroDescontado = subtotal * (porcentajeDescuento / 100);
  const totalFinal = subtotal - dineroDescontado;
  
  // 💵 Cálculo automático del cambio en tiempo real
  const cambioCalculado = pagaCon && Number(pagaCon) >= totalFinal ? Number(pagaCon) - totalFinal : 0;

  const [listaUsuarios, setListaUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    async function conectarDB() {
      try {
        const session = await Database.load("postgres://postgres:58481702@localhost:5432/punto_venta");
        setDb(session);
      } catch (error: any) {
        setErrorConexion(String(error));
      }
    }
    conectarDB();
  }, []);

  useEffect(() => {
    if (!db) return;
    cargarClientes();
    cargarProductos();
    if (pestanaActiva === "historial") cargarHistorial();
    if (pestanaActiva === "usuarios") cargarEmpleados();
  }, [pestanaActiva, db]);

  const cargarClientes = async () => {
    try {
      const res = await db!.select<Cliente[]>("SELECT id, nombre, telefono, correo FROM clientes ORDER BY creado_en DESC");
      setClientes(res);
    } catch (error) { console.error(error); }
  };

  const cargarProductos = async () => {
    try {
      const res = await db!.select<Producto[]>("SELECT id, codigo_barras, sku, nombre, precio_compra, precio_venta, stock, stock_minimo FROM productos ORDER BY nombre ASC");
      setProductos(res);
    } catch (error) { console.error(error); }
  };

  const cargarHistorial = async () => {
    try {
      const res = await db!.select<VentaHistorial[]>(`
        SELECT v.id, v.total, v.fecha_venta, c.nombre as cliente_nombre, u.nombre as usuario_nombre
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        ORDER BY v.fecha_venta DESC
      `);
      setHistorialVentas(res);
    } catch (error) { console.error(error); }
  };

  const manejarInputBuscadorVentas = (texto: string) => {
    setBuscadorVentas(texto);
    if (!texto.trim()) {
      setSugerencias([]);
      return;
    }
    const filtrados = productos.filter(p => 
      p.nombre.toLowerCase().includes(texto.toLowerCase()) ||
      (p.codigo_barras && p.codigo_barras.includes(texto)) ||
      (p.sku && p.sku.toLowerCase().includes(texto.toLowerCase()))
    );
    setSugerencias(filtrados.slice(0, 5));
  };

  const agregarAlCarrito = (producto: Producto) => {
    const itemExistente = carrito.find(item => item.producto.id === producto.id);
    const cantidadActual = itemExistente ? itemExistente.cantidad : 0;

    if (cantidadActual + 1 > producto.stock) {
      alert(`⚠️ Stock insuficiente. Solo quedan ${producto.stock} unidades.`);
      return;
    }

    if (itemExistente) {
      setCarrito(carrito.map(item => item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { producto, cantidad: 1 }]);
    }
    setBuscadorVentas("");
    setSugerencias([]);
  };

  const cambiarCantidadCarrito = (id: string, nuevaCantidad: number, maxStock: number) => {
    if (nuevaCantidad <= 0) {
      setCarrito(carrito.filter(item => item.producto.id !== id));
      return;
    }
    if (nuevaCantidad > maxStock) return alert("⚠️ Excede las existencias del almacén.");
    setCarrito(carrito.map(item => item.producto.id === id ? { ...item, cantidad: nuevaCantidad } : item));
  };

  const manejarSeleccionCliente = async (id: string) => {
    setClienteSeleccionadoId(id);
    if (!id) { setEsFrecuente(false); setVisitasCliente(0); return; }
    const resultado = await db!.select<{ count: string }[]>("SELECT COUNT(*) as count FROM ventas WHERE cliente_id = $1::uuid", [id]);
    const visitas = Number(resultado[0].count);
    setVisitasCliente(visitas);
    setEsFrecuente(visitas >= 3);
  };

  const finalizarCobro = async () => {
    if (carrito.length === 0) return alert("El ticket está vacío.");
    if (!pagaCon || Number(pagaCon) < totalFinal) {
      return alert("⚠️ Monto recibido insuficiente o no ingresado.");
    }
    
    try {
      const idClienteParam = clienteSeleccionadoId === "" ? null : clienteSeleccionadoId;
      const idUsuarioParam = usuarioActivo?.id || null;

      // 🛠️ CONSTRUCCIÓN DINÁMICA: Evita enviar valores 'null' que confundan a Postgres con tipo jsonb
      const campos = ["total"];
      const valores = ["$1"];
      const params: any[] = [totalFinal];

      if (idUsuarioParam) {
        campos.push("usuario_id");
        params.push(idUsuarioParam);
        valores.push(`$${params.length}::uuid`);
      }
      if (idClienteParam) {
        campos.push("cliente_id");
        params.push(idClienteParam);
        valores.push(`$${params.length}::uuid`);
      }

      const sqlVenta = `INSERT INTO ventas (${campos.join(", ")}) VALUES (${valores.join(", ")})`;
      await db!.execute(sqlVenta, params);
      
      const ultimaVenta = await db!.select<{ id: string; fecha_venta: string }[]>("SELECT id, fecha_venta FROM ventas ORDER BY fecha_venta DESC LIMIT 1");
      const ventaId = ultimaVenta[0].id;
      const ventaFecha = ultimaVenta[0].fecha_venta;

      for (const item of carrito) {
        await db!.execute(
          "INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES ($1::uuid, $2::uuid, $3, $4)",
          [ventaId, item.producto.id, item.cantidad, item.producto.precio_venta]
        );
        await db!.execute("UPDATE productos SET stock = stock - $1 WHERE id = $2::uuid", [item.cantidad, item.producto.id]);
      }

      setTicketActual({
        id: ventaId.substring(0, 8).toUpperCase(),
        cajero: usuarioActivo?.nombre || "Cajero General",
        cliente: clientes.find(c => c.id === clienteSeleccionadoId)?.nombre || "Público General",
        items: [...carrito],
        subtotal,
        descuento: dineroDescontado,
        total: totalFinal,
        pagaCon: Number(pagaCon),
        cambio: cambioCalculado,
        fecha: new Date(ventaFecha).toLocaleString()
      });

      setCarrito([]);
      setClienteSeleccionadoId("");
      setEsFrecuente(false);
      setVisitasCliente(0);
      setPagaCon(""); // Limpiar la calculadora de cambio
      cargarProductos();
    } catch (error) {
      alert("❌ Error en Cobro: " + String(error));
    }
  };

  const procesarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return alert("Base de datos desconectada.");
    try {
      const resultado = await db.select<Usuario[]>(
        "SELECT id, nombre, usuario, rol FROM usuarios WHERE usuario = $1 AND contrasena = md5($2)", 
        [inputUsuario, inputContrasena]
      );
      if (resultado.length > 0) {
        setUsuarioActivo(resultado[0]);
        setIsLoggedIn(true);
        setPestanaActiva("nueva-venta");
      } else {
        alert("❌ Credenciales incorrectas.");
      }
    } catch (error) { alert("❌ Error: " + String(error)); }
  };

  // ✏️ GUARDAR O ACTUALIZAR PRODUCTO (Mantenimiento de almacén)
  const guardarOActualizarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const codigo = prodCodigo.trim() === "" ? null : prodCodigo.trim();
      const sku = prodSku.trim() === "" ? null : prodSku.trim();

      if (editandoProductoId) {
        // Modo Edición
        await db!.execute(
          "UPDATE productos SET codigo_barras=$1, sku=$2, nombre=$3, precio_compra=$4, precio_venta=$5, stock=$6 WHERE id=$7::uuid",
          [codigo, sku, prodNombre.trim(), Number(prodPrecioCompra), Number(prodPrecioVenta), Number(prodStock), editandoProductoId]
        );
        alert("📦 Producto actualizado correctamente.");
        setEditandoProductoId(null);
      } else {
        // Modo Registro Nuevo
        await db!.execute(
          "INSERT INTO productos (codigo_barras, sku, nombre, precio_compra, precio_venta, stock, stock_minimo) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [codigo, sku, prodNombre.trim(), Number(prodPrecioCompra), Number(prodPrecioVenta), prodStock === "" ? 0 : Number(prodStock), 5]
        );
        alert("📦 Producto registrado en almacén.");
      }

      setProdCodigo(""); setProdSku(""); setProdNombre(""); setProdPrecioCompra(""); setProdPrecioVenta(""); setProdStock("");
      cargarProductos();
    } catch (error) { alert("❌ Error Almacén: " + String(error)); }
  };

  // ✏️ Cargar datos en el formulario para editar
  const iniciarEdicion = (p: Producto) => {
    setEditandoProductoId(p.id);
    setProdCodigo(p.codigo_barras || "");
    setProdSku(p.sku || "");
    setProdNombre(p.nombre);
    setProdPrecioCompra(String(p.precio_compra));
    setProdPrecioVenta(String(p.precio_venta));
    setProdStock(String(p.stock));
  };

  // ❌ ELIMINAR PRODUCTO
  const eliminarProducto = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar definitivamente "${nombre}" del almacén?`)) return;
    try {
      await db!.execute("DELETE FROM productos WHERE id = $1::uuid", [id]);
      alert("🗑️ Producto eliminado.");
      cargarProductos();
    } catch (error) {
      alert("❌ No se puede eliminar el producto porque ya tiene ventas registradas.");
    }
  };

  const registrarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db!.execute(
        "INSERT INTO clientes (nombre, telefono, correo) VALUES ($1, $2, $3)", 
        [cliNombre.trim(), cliTelefono.trim() || null, cliCorreo.trim() || null]
      );
      alert("✅ Cliente guardado con éxito.");
      setCliNombre(""); setCliTelefono(""); setCliCorreo("");
      cargarClientes();
    } catch (error) {
      alert("❌ Error Clientes: " + String(error));
    }
  };

  const registrarEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db!.execute(
        "INSERT INTO usuarios (nombre, usuario, contrasena, rol) VALUES ($1, $2, md5($3), $4)",
        [empNombre.trim(), empUsuario.trim(), empContrasena, empRol]
      );
      alert("👤 Nuevo empleado incorporado al sistema.");
      setEmpNombre(""); setEmpUsuario(""); setEmpContrasena(""); setEmpRol("cajero");
      cargarEmpleados();
    } catch (error) {
      alert("❌ Error al crear empleado: " + String(error));
    }
  };

  const cargarEmpleados = async () => {
    try {
      const res = await db!.select<Usuario[]>("SELECT id, nombre, usuario, rol FROM usuarios ORDER BY nombre ASC");
      setListaUsuarios(res);
    } catch (error) { console.error(error); }
  };

  const ventasFiltradasDia = historialVentas.filter(v => v.fecha_venta.includes(filtroFechaHistorial));
  const ingresosTotalesDelDia = ventasFiltradasDia.reduce((acc, v) => acc + Number(v.total), 0);

  if (!isLoggedIn) {
    return (
      <div className="contenedor-login">
        <form onSubmit={procesarLogin} className="tarjeta-login">
          <h2>🔒 Acceso Seguro POS</h2>
          {errorConexion && (
            <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#f87171", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px", textAlign: "center" }}>
              <strong>Fallo de Conexión:</strong> {errorConexion}
            </div>
          )}
          <input type="text" placeholder="Usuario" value={inputUsuario} onChange={(e) => setInputUsuario(e.target.value)} required />
          <input type="password" placeholder="Contraseña" value={inputContrasena} onChange={(e) => setInputContrasena(e.target.value)} required />
          <button type="submit">Ingresar Protegido</button>
        </form>
      </div>
    );
  }

  return (
    <div className="contenedor-app">
      <aside className="sidebar">
        <h2>🛒 POS Master</h2>
        <button onClick={() => setPestanaActiva("nueva-venta")} className={pestanaActiva === "nueva-venta" ? "active" : ""}>💻 Caja de Ventas</button>
        <button onClick={() => setPestanaActiva("historial")} className={pestanaActiva === "historial" ? "active" : ""}>📋 Historial y Corte</button>
        <button onClick={() => setPestanaActiva("inventario")} className={pestanaActiva === "inventario" ? "active" : ""}>📦 Almacén</button>
        <button onClick={() => setPestanaActiva("clientes")} className={pestanaActiva === "clientes" ? "active" : ""}>👥 Clientes</button>
        
        {usuarioActivo?.rol === "admin" && (
          <button onClick={() => setPestanaActiva("usuarios")} className={pestanaActiva === "usuarios" ? "active" : ""}>⚙️ Personal</button>
        )}
        
        <button onClick={() => { setIsLoggedIn(false); setCarrito([]); }} className="btn-salir">Cerrar Sesión</button>
      </aside>

      <main className="contenido">
        
        {/* CAJA DE VENTAS */}
        {pestanaActiva === "nueva-venta" && (
          <div className="panel">
            <h2>💻 Módulo de Ventas Activo</h2>
            <div style={{ position: "relative", marginBottom: "20px" }}>
              <input 
                type="text" 
                placeholder="🔍 Escribe el nombre, SKU o escanea el código..."
                value={buscadorVentas}
                onChange={e => manejarInputBuscadorVentas(e.target.value)}
                style={{ width: "100%", padding: "14px", background: "#1e293b", color: "white", border: "1px solid #475569", borderRadius: "8px", fontSize: "16px" }}
                autoFocus
              />
              {sugerencias.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, width: "100%", background: "#1e293b", border: "1px solid #475569", borderRadius: "0 0 8px 8px", zIndex: 10 }}>
                  {sugerencias.map(p => (
                    <div key={p.id} onClick={() => agregarAlCarrito(p)} style={{ padding: "12px 20px", cursor: "pointer", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between" }} className="opcion-sugerencia">
                      <span><strong>{p.nombre}</strong> <small>({p.sku || "Sin SKU"})</small></span>
                      <span style={{color: "#3b82f6"}}>${p.precio_venta.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "25px" }}>
              <div style={{ flex: 2, background: "#1e293b", padding: "20px", borderRadius: "8px" }}>
                <h3>🛒 Productos en el Ticket</h3>
                <table>
                  <thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th>Quitar</th></tr></thead>
                  <tbody>
                    {carrito.map(item => (
                      <tr key={item.producto.id}>
                        <td>{item.producto.nombre}</td>
                        <td>${item.producto.precio_venta.toFixed(2)}</td>
                        <td>
                          <input type="number" value={item.cantidad} onChange={e => cambiarCantidadCarrito(item.producto.id, Number(e.target.value), item.producto.stock)} style={{ width: "60px", background: "#334155", color: "white", border: "none", padding: "6px", textAlign: "center" }} />
                        </td>
                        <td>${(item.producto.precio_venta * item.cantidad).toFixed(2)}</td>
                        <td><button onClick={() => cambiarCantidadCarrito(item.producto.id, 0, 0)} style={{ background: "#ef4444", border: "none", color: "white", padding: "4px 8px", cursor: "pointer" }}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ flex: 1, background: "#1e293b", padding: "20px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "15px" }}>
                <h3>Asignar Cliente</h3>
                <select value={clienteSeleccionadoId} onChange={(e) => manejarSeleccionCliente(e.target.value)} style={{ width: "100%", padding: "10px", background: "#334155", color: "white", border: "1px solid #475569" }}>
                  <option value="">-- Público General --</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <div style={{ background: "#0f172a", padding: "12px", borderRadius: "6px" }}>
                  <p>📋 Historial compras: <strong>{visitasCliente}</strong></p>
                  <p>Estado: {esFrecuente ? <span style={{ color: "#22c55e" }}>🌟 VIP Frecuente</span> : <span>Estándar</span>}</p>
                </div>
                
                {/* 💵 CALCULADORA DE CAMBIO INTEGRADA */}
                <div style={{ background: "#0f172a", padding: "15px", borderRadius: "6px", border: "1px solid #334155" }}>
                  <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "5px" }}>💵 Efectivo Recibido:</label>
                  <input 
                    type="number" 
                    placeholder="$ Paga con..." 
                    value={pagaCon}
                    onChange={e => setPagaCon(e.target.value)}
                    style={{ width: "100%", padding: "8px", background: "#1e293b", color: "white", border: "1px solid #475569", borderRadius: "4px", fontSize: "16px", fontWeight: "bold" }}
                  />
                  {pagaCon && Number(pagaCon) >= totalFinal && (
                    <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", color: "#eab308", fontWeight: "bold" }}>
                      <span>Cambio a entregar:</span>
                      <span>${cambioCalculado.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: "1px solid #334155", paddingTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px", color: "#3b82f6", fontWeight: "bold" }}>
                    <span>Total:</span> <span>${totalFinal.toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={finalizarCobro} style={{ width: "100%", padding: "14px", background: "#22c55e", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}>💵 Procesar Pago</button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORIAL Y CORTE */}
        {pestanaActiva === "historial" && (
          <div className="panel">
            <h2>📋 Auditoría y Arqueo Diario</h2>
            <div style={{ display: "flex", gap: "20px", marginBottom: "25px" }}>
              <div style={{ flex: 1, background: "#0f172a", padding: "20px", borderRadius: "8px", borderLeft: "5px solid #22c55e" }}>
                <h4 style={{ margin: 0, color: "#94a3b8" }}>💰 Flujo de Efectivo en Caja</h4>
                <p style={{ fontSize: "32px", fontWeight: "bold", color: "#22c55e", margin: "10px 0" }}>${ingresosTotalesDelDia.toFixed(2)}</p>
                <button onClick={() => setCorteActual({ fecha: filtroFechaHistorial, totalDinero: ingresosTotalesDelDia, totalTransacciones: ventasFiltradasDia.length, cajero: usuarioActivo?.nombre || "Encargado" })} style={{ padding: "10px", background: "#eab308", border: "none", fontWeight: "bold", cursor: "pointer", width: "100%" }}>🔒 Imprimir Corte de Caja</button>
              </div>
              <div style={{ flex: 1, background: "#0f172a", padding: "20px", borderRadius: "8px" }}>
                <h4>📅 Examinar Fecha</h4>
                <input type="date" value={filtroFechaHistorial} onChange={e => setFiltroFechaHistorial(e.target.value)} style={{ padding: "8px", background: "#1e293b", color: "white", border: "1px solid #475569" }} />
              </div>
            </div>
            <table>
              <thead><tr><th>Folio Venta</th><th>Hora</th><th>Cajero</th><th>Cliente</th><th>Total</th></tr></thead>
              <tbody>
                {ventasFiltradasDia.map(v => (
                  <tr key={v.id}>
                    <td><code>{v.id.substring(0,8).toUpperCase()}</code></td>
                    <td>{new Date(v.fecha_venta).toLocaleTimeString()}</td>
                    <td>{v.usuario_nombre}</td>
                    <td>{v.cliente_nombre || "Público General"}</td>
                    <td style={{color: "#22c55e", fontWeight: "bold"}}>${Number(v.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ALMACÉN CON EDICIÓN Y ELIMINACIÓN */}
        {pestanaActiva === "inventario" && (
          <div className="panel">
            <h2>📦 Panel de Inventario Automático</h2>
            <div style={{ display: "flex", gap: "20px" }}>
              <form onSubmit={guardarOActualizarProducto} className="formulario-box" style={{ minWidth: '280px' }}>
                <h3>{editandoProductoId ? "✏️ Editar Artículo" : "Agregar Artículo"}</h3>
                <input type="text" placeholder="Código de Barras" value={prodCodigo} onChange={e => setProdCodigo(e.target.value)} />
                <input type="text" placeholder="SKU del Producto" value={prodSku} onChange={e => setProdSku(e.target.value)} />
                <input type="text" placeholder="Nombre Comercial *" value={prodNombre} onChange={e => setProdNombre(e.target.value)} required />
                <input type="number" step="0.01" placeholder="Costo Compra *" value={prodPrecioCompra} onChange={e => setProdPrecioCompra(e.target.value)} required />
                <input type="number" step="0.01" placeholder="Precio Venta *" value={prodPrecioVenta} onChange={e => setProdPrecioVenta(e.target.value)} required />
                <input type="number" placeholder="Existencias Iniciales" value={prodStock} onChange={e => setProdStock(e.target.value)} />
                
                <button type="submit" style={{ background: editandoProductoId ? "#eab308" : "#22c55e", color: editandoProductoId ? "black" : "white" }}>
                  {editandoProductoId ? "💾 Actualizar Cambios" : "💾 Guardar en Almacén"}
                </button>
                {editandoProductoId && (
                  <button type="button" onClick={() => { setEditandoProductoId(null); setProdCodigo(""); setProdSku(""); setProdNombre(""); setProdPrecioCompra(""); setProdPrecioVenta(""); setProdStock(""); }} style={{ background: "#64748b", color: "white", marginTop: "5px", width: "100%" }}>
                    Cancelar Edición
                  </button>
                )}
              </form>
              <div style={{ flex: 1 }}>
                <input type="text" placeholder="🔍 Filtrar inventario..." value={busquedaInventario} onChange={e => setBusquedaInventario(e.target.value)} style={{ width: "100%", padding: "10px", background: "#1e293b", color: "white", border: "1px solid #475569", marginBottom: "15px" }} />
                <table>
                  <thead><tr><th>SKU / Barras</th><th>Descripción</th><th>Precio Venta</th><th>Existencia</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {productos.filter(p => p.nombre.toLowerCase().includes(busquedaInventario.toLowerCase())).map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.sku || "S/S"}</strong><br/><small>{p.codigo_barras || "S/C"}</small></td>
                        <td>{p.nombre}</td>
                        <td>${p.precio_venta.toFixed(2)}</td>
                        <td style={{ fontWeight: "bold", color: p.stock <= p.stock_minimo ? "#ef4444" : "white" }}>{p.stock} pz</td>
                        <td>
                          {/* ⚙️ BOTONES DE CONTROL DE INVENTARIO */}
                          <button onClick={() => iniciarEdicion(p)} style={{ background: "#3b82f6", color: "white", border: "none", padding: "4px 8px", cursor: "pointer", marginRight: "5px", borderRadius: "4px" }}>✏️</button>
                          <button onClick={() => eliminarProducto(p.id, p.nombre)} style={{ background: "#ef4444", color: "white", border: "none", padding: "4px 8px", cursor: "pointer", borderRadius: "4px" }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {pestanaActiva === "clientes" && (
          <div className="panel">
            <h2>👥 Altas de Clientes</h2>
            <div style={{ display: "flex", gap: "20px" }}>
              <form onSubmit={registrarCliente} className="formulario-box">
                <h3>Identificación de Cliente</h3>
                <input type="text" placeholder="Nombre y Apellido *" value={cliNombre} onChange={e => setCliNombre(e.target.value)} required />
                <input type="text" placeholder="Teléfono de Contacto" value={cliTelefono} onChange={e => setCliTelefono(e.target.value)} />
                <input type="email" placeholder="Correo Electrónico" value={cliCorreo} onChange={e => setCliCorreo(e.target.value)} />
                <button type="submit">💾 Guardar Cliente</button>
              </form>
              <div style={{ flex: 1 }}>
                <table style={{width: "100%"}}>
                  <thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th></tr></thead>
                  <tbody>
                    {clientes.map((c, idx) => (
                      <tr key={idx}><td>{c.nombre}</td><td>{c.telefono || "N/A"}</td><td>{c.correo || "N/A"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PERSONAL */}
        {pestanaActiva === "usuarios" && usuarioActivo?.rol === "admin" && (
          <div className="panel">
            <h2>⚙️ Control Centralizado de Personal</h2>
            <div style={{ display: "flex", gap: "30px", alignItems: "flex-start" }}>
              <form onSubmit={registrarEmpleado} className="formulario-box" style={{ minWidth: "280px" }}>
                <h3>Contratar / Dar de Alta Personal</h3>
                <input type="text" placeholder="Nombre Completo *" value={empNombre} onChange={e => setEmpNombre(e.target.value)} required />
                <input type="text" placeholder="Usuario de Acceso (ej: ana_caja) *" value={empUsuario} onChange={e => setEmpUsuario(e.target.value)} required />
                <input type="password" placeholder="Contraseña Inicial *" value={empContrasena} onChange={e => setEmpContrasena(e.target.value)} required />
                <select value={empRol} onChange={e => setEmpRol(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "12px", background: "#1e293b", color: "white" }}>
                  <option value="cajero">Cajero Estándar</option>
                  <option value="admin">Administrador del Sistema</option>
                </select>
                <button type="submit" style={{ background: "#3b82f6" }}>➕ Registrar Empleado</button>
              </form>

              <div style={{ flex: 1 }}>
                <h3>Plantilla de Empleados Activos</h3>
                <table>
                  <thead><tr><th>Nombre Empleado</th><th>ID Usuario</th><th>Rango / Rol</th></tr></thead>
                  <tbody>
                    {listaUsuarios.map((u, i) => (
                      <tr key={i}>
                        <td>{u.nombre}</td>
                        <td><code>{u.usuario}</code></td>
                        <td><span className={`badge ${u.rol}`} style={{ background: u.rol === 'admin' ? '#ef4444' : '#22c55e', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{u.rol.toUpperCase()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* TICKET DE COMPRA MEJORADO CON CÁLCULO DE CAMBIO */}
      {ticketActual && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div style={{ background: "white", color: "black", padding: "25px", borderRadius: "8px", width: "320px", fontFamily: "monospace" }}>
            <div style={{ textAlign: "center", borderBottom: "1px dashed black", paddingBottom: "10px" }}>
              <h3>🧾 TICKET DE COMPRA</h3>
              <p>Folio: #{ticketActual.id}</p>
              <p>{ticketActual.fecha}</p>
            </div>
            <div style={{ padding: "10px 0", borderBottom: "1px dashed black", fontSize: "12px" }}>
              <p><strong>Cajero:</strong> {ticketActual.cajero}</p>
              <p><strong>Cliente:</strong> {ticketActual.cliente}</p>
            </div>
            <div style={{ padding: "10px 0", borderBottom: "1px dashed black", fontSize: "12px" }}>
              {ticketActual.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{item.producto.nombre.substring(0, 18)} x{item.cantidad}</span>
                  <span>${(item.producto.precio_venta * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 0", fontSize: "13px", borderBottom: "1px dashed black" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal:</span><span>${ticketActual.subtotal.toFixed(2)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "red" }}><span>Descuento:</span><span>-${ticketActual.descuento.toFixed(2)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "15px", marginTop: "4px" }}><span>TOTAL:</span><span>${ticketActual.total.toFixed(2)}</span></div>
            </div>
            {/* 💵 DETALLE DE CAMBIO EN TICKET */}
            <div style={{ padding: "10px 0", fontSize: "13px", color: "#555" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Efectivo:</span><span>${ticketActual.pagaCon.toFixed(2)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: "green" }}><span>Cambio:</span><span>${ticketActual.cambio.toFixed(2)}</span></div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <button onClick={() => window.print()} style={{ flex: 1, padding: "8px", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>🖨️ Imprimir</button>
              <button onClick={() => setTicketActual(null)} style={{ flex: 1, padding: "8px", background: "#64748b", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ARQUEO DE CAJA */}
      {corteActual && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 101 }}>
          <div style={{ background: "white", color: "black", padding: "25px", borderRadius: "8px", width: "320px", fontFamily: "monospace" }}>
            <div style={{ textAlign: "center", borderBottom: "1px dashed black", paddingBottom: "10px" }}>
              <h3>📦 CORTE DE CAJA</h3>
              <p>Fecha: {corteActual.fecha}</p>
            </div>
            <div style={{ padding: "15px 0", borderBottom: "1px dashed black", fontSize: "13px" }}>
              <p><strong>Auditor:</strong> {corteActual.cajero}</p>
              <p><strong>Transacciones:</strong> {corteActual.totalTransacciones} ventas</p>
              <h2 style={{ textAlign: "right", margin: "10px 0 0 0" }}>Total: ${corteActual.totalDinero.toFixed(2)}</h2>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => window.print()} style={{ flex: 1, padding: "8px", background: "#eab308", color: "black", border: "none", borderRadius: "4px", cursor: "pointer" }}>🖨️ Imprimir</button>
              <button onClick={() => setCorteActual(null)} style={{ flex: 1, padding: "8px", background: "#64748b", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;