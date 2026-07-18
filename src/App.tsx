import { useState } from "react";
import "./App.css";

function App() {
  // Este estado guardará cuál pantalla/módulo está viendo el usuario
  const [moduloActual, setModuloActual] = useState("ventas");

  return (
    <div className="app-container">
      
      {/* 🧭 MENÚ LATERAL (SIDEBAR) */}
      <aside className="sidebar">
        <h2>🛒 POS Venta</h2>
        <nav>
          <button 
            className={moduloActual === "ventas" ? "active" : ""} 
            onClick={() => setModuloActual("ventas")}
          >
            💻 Nueva Venta
          </button>
          <button 
            className={moduloActual === "inventario" ? "active" : ""} 
            onClick={() => setModuloActual("inventario")}
          >
            📦 Inventario
          </button>
          <button 
            className={moduloActual === "clientes" ? "active" : ""} 
            onClick={() => setModuloActual("clientes")}
          >
            👥 Clientes
          </button>
        </nav>
      </aside>

      {/* 🖥️ CONTENIDO PRINCIPAL DINÁMICO */}
      <main className="main-content">
        
        {moduloActual === "ventas" && (
          <div className="module-card">
            <h3>💻 Módulo de Ventas</h3>
            <p>Aquí se escanearán los productos, se calculará el total y se procesará el cobro.</p>
          </div>
        )}

        {moduloActual === "inventario" && (
          <div className="module-card">
            <h3>📦 Gestión de Inventario</h3>
            <p>Aquí podrás dar de alta nuevos productos, editar precios, códigos de barra y revisar el stock disponible.</p>
          </div>
        )}

        {moduloActual === "clientes" && (
          <div className="module-card">
            <h3>👥 Control de Clientes</h3>
            <p>Aquí administrarás el registro de clientes para aplicarles descuentos o créditos.</p>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;