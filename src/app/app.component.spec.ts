/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { CatalogoService } from './services/catalogo.service';
import { SwUpdate } from '@angular/service-worker';
import { of } from 'rxjs';

describe('AppComponent', () => {
  const mockCatalogoService = {
    isOnline: () => of(true),
    obtenerCatalogo: () => of([
      { id: 1, nombre: 'Cerveza Cristal 650ml', categoria: 'Cervezas', precio: 6.5, stock: 120 }
    ]),
    obtenerPrecios: () => of([
      { productoId: 1, precio: 6.5, stock: 120, actualizado: '10:00' }
    ])
  };

  const mockSwUpdate = {
    isEnabled: false,
    versionUpdates: of()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: CatalogoService, useValue: mockCatalogoService },
        { provide: SwUpdate, useValue: mockSwUpdate }
      ]
    }).compileComponents();
  });

  it('debe crear el componente principal', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('debe inicializar el catálogo de productos', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(app.productos.length).toBeGreaterThan(0);
    expect(app.productos[0].nombre).toBe('Cerveza Cristal 650ml');
  });

  it('debe permitir agregar productos al carrito', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    const prod = app.productos[0];
    
    app.agregarAlCarrito(prod);
    expect(app.carrito.length).toBe(1);
    expect(app.carrito[0].cantidad).toBe(1);
    expect(app.calcularTotal()).toBe(6.5);
  });
});
