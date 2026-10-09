import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SwUpdate } from '@angular/service-worker';
import { CatalogoService, Producto, PrecioUpdate, Pedido } from './services/catalogo.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private catalogoService = inject(CatalogoService);
  private swUpdate = inject(SwUpdate);

  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  cargando: boolean = true;
  errorMensaje: string = '';
  
  isOnline: boolean = true;
  categoriaSeleccionada: string = 'TODAS';
  busquedaTexto: string = '';
  
  // Carrito de pedidos
  carrito: { producto: Producto; cantidad: number }[] = [];
  nombreCliente: string = '';
  pedidos: Pedido[] = [];
  mostrarCarrito: boolean = false;
  mostrarModalTecnico: boolean = false;

  // Estado del Service Worker
  swActivo: boolean = false;
  swMensaje: string = '';
  ultimaActualizacionPrecios: string = '2026-10-01 09:00';

  ngOnInit(): void {
    this.verificarConectividad();
    this.cargarDatos();
    this.verificarServiceWorker();
    this.cargarPedidosGuardados();
  }

  verificarConectividad(): void {
    this.catalogoService.isOnline().subscribe(online => {
      const eraOffline = !this.isOnline && online;
      this.isOnline = online;
      if (eraOffline) {
        this.sincronizarPedidosPendientes();
      }
    });
  }

  toggleModoConexion(): void {
    const nuevoEstado = !this.isOnline;
    this.catalogoService.setOnlineStatus(nuevoEstado);
  }

  verificarServiceWorker(): void {
    if (this.swUpdate.isEnabled) {
      this.swActivo = true;
      this.swMensaje = 'Angular Service Worker (ngsw-worker.js) registrado y activo.';
      
      this.swUpdate.versionUpdates.subscribe(evt => {
        if (evt.type === 'VERSION_READY') {
          if (confirm('Nueva versión disponible de Backus Ventas. ¿Desea actualizar?')) {
            window.location.reload();
          }
        }
      });
    } else {
      this.swActivo = false;
      this.swMensaje = 'Service Worker inactivo (modo desarrollo o navegador no compatible).';
    }
  }

  cargarDatos(): void {
    this.cargando = true;
    this.catalogoService.obtenerCatalogo().subscribe({
      next: (data) => {
        this.productos = data;
        this.filtrarProductos();
        this.cargando = false;
        
        // Intentar actualizar precios en segundo plano (Freshness)
        this.actualizarPreciosFrescos();
      },
      error: (err) => {
        console.error('Error al cargar catálogo:', err);
        this.errorMensaje = 'No se pudo cargar el catálogo. Verifique si está en caché o la red.';
        this.cargando = false;
      }
    });
  }

  actualizarPreciosFrescos(): void {
    this.catalogoService.obtenerPrecios().subscribe({
      next: (precios) => {
        precios.forEach(p => {
          const item = this.productos.find(prod => prod.id === p.productoId);
          if (item) {
            item.precio = p.precio;
            item.stock = p.stock;
            item.actualizado = p.actualizado;
          }
        });
        this.ultimaActualizacionPrecios = new Date().toLocaleTimeString();
        this.filtrarProductos();
      },
      error: (err) => {
        console.warn('No se pudo obtener precios frescos de la red; usando datos en caché:', err);
      }
    });
  }

  filtrarProductos(): void {
    this.productosFiltrados = this.productos.filter(prod => {
      const coincideCat = this.categoriaSeleccionada === 'TODAS' || 
                           prod.categoria.toLowerCase() === this.categoriaSeleccionada.toLowerCase();
      const coincideBusqueda = prod.nombre.toLowerCase().includes(this.busquedaTexto.toLowerCase()) ||
                               prod.categoria.toLowerCase().includes(this.busquedaTexto.toLowerCase());
      return coincideCat && coincideBusqueda;
    });
  }

  seleccionarCategoria(cat: string): void {
    this.categoriaSeleccionada = cat;
    this.filtrarProductos();
  }

  // Métodos de Carrito y Pedidos Offline
  agregarAlCarrito(producto: Producto): void {
    const itemExistente = this.carrito.find(item => item.producto.id === producto.id);
    if (itemExistente) {
      if (itemExistente.cantidad < producto.stock) {
        itemExistente.cantidad++;
      } else {
        alert('Límite de stock alcanzado para ' + producto.nombre);
      }
    } else {
      this.carrito.push({ producto, cantidad: 1 });
    }
  }

  removerDelCarrito(id: number): void {
    this.carrito = this.carrito.filter(item => item.producto.id !== id);
  }

  cambiarCantidad(id: number, delta: number): void {
    const item = this.carrito.find(i => i.producto.id === id);
    if (item) {
      const nuevaCantidad = item.cantidad + delta;
      if (nuevaCantidad > 0 && nuevaCantidad <= item.producto.stock) {
        item.cantidad = nuevaCantidad;
      } else if (nuevaCantidad === 0) {
        this.removerDelCarrito(id);
      }
    }
  }

  calcularTotal(): number {
    return this.carrito.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0);
  }

  totalItemsCarrito(): number {
    return this.carrito.reduce((sum, item) => sum + item.cantidad, 0);
  }

  registrarPedido(): void {
    if (!this.nombreCliente.trim()) {
      alert('Por favor ingrese el nombre de la bodega o cliente.');
      return;
    }

    if (this.carrito.length === 0) {
      alert('El carrito de compras está vacío.');
      return;
    }

    const nuevoPedido: Pedido = {
      id: 'PED-' + Math.floor(100000 + Math.random() * 900000),
      fecha: new Date().toLocaleString(),
      cliente: this.nombreCliente.trim(),
      items: [...this.carrito],
      total: this.calcularTotal(),
      estado: this.isOnline ? 'SINCRONIZADO' : 'PENDIENTE'
    };

    this.pedidos.unshift(nuevoPedido);
    this.guardarPedidos();
    
    const msg = this.isOnline 
      ? `¡Pedido ${nuevoPedido.id} enviado exitosamente al servidor central de Backus!`
      : `¡Pedido ${nuevoPedido.id} guardado localmente (OFFLINE)! Se sincronizará automáticamente al volver a tener señal.`;
    
    alert(msg);

    this.carrito = [];
    this.nombreCliente = '';
    this.mostrarCarrito = false;
  }

  sincronizarPedidosPendientes(): void {
    const pendientes = this.pedidos.filter(p => p.estado === 'PENDIENTE');
    if (pendientes.length > 0) {
      pendientes.forEach(p => p.estado = 'SINCRONIZADO');
      this.guardarPedidos();
      alert(`[Sincronización PWA] Se sincronizaron ${pendientes.length} pedido(s) pendientes al recuperar la conexión.`);
    }
  }

  guardarPedidos(): void {
    try {
      localStorage.setItem('backus_pedidos', JSON.stringify(this.pedidos));
    } catch (e) {
      console.error('Error guardando en almacenamiento local:', e);
    }
  }

  cargarPedidosGuardados(): void {
    try {
      const data = localStorage.getItem('backus_pedidos');
      if (data) {
        this.pedidos = JSON.parse(data);
      }
    } catch (e) {
      console.error('Error leyendo pedidos:', e);
    }
  }
}
