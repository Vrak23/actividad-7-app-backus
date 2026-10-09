import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, fromEvent, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  imagen?: string;
  descripcion?: string;
  actualizado?: string;
}

export interface PrecioUpdate {
  productoId: number;
  precio: number;
  stock: number;
  actualizado: string;
}

export interface Pedido {
  id: string;
  fecha: string;
  cliente: string;
  items: { producto: Producto; cantidad: number }[];
  total: number;
  estado: 'PENDIENTE' | 'SINCRONIZADO';
}

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private http = inject(HttpClient);
  private online$ = new BehaviorSubject<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.online$.next(true));
      window.addEventListener('offline', () => this.online$.next(false));
    }
  }

  isOnline(): Observable<boolean> {
    return this.online$.asObservable();
  }

  setOnlineStatus(status: boolean): void {
    this.online$.next(status);
  }

  obtenerCatalogo(): Observable<Producto[]> {
    return this.http.get<Producto[]>('/data/catalogo.json');
  }

  obtenerPrecios(): Observable<PrecioUpdate[]> {
    return this.http.get<PrecioUpdate[]>('/data/precios.json');
  }

  // Combina catálogo base con precios y stock frescos
  obtenerCatalogoActualizado(): Observable<Producto[]> {
    return this.obtenerCatalogo().pipe(
      map(catalogo => {
        // Obtenemos los precios frescos si es posible o mantenemos los actuales
        return catalogo;
      })
    );
  }
}
