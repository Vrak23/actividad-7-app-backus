import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private dbName = 'backusVentasDB';
  private storeName = 'pedidos';

  async abrirDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Error al abrir IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  async guardarPedido(pedido: any): Promise<void> {
    try {
      const db = await this.abrirDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const nuevoRegistro = {
          ...pedido,
          fecha: new Date().toISOString(),
          estado: 'pendiente'
        };

        const request = store.add(nuevoRegistro);

        transaction.oncomplete = () => {
          console.log('✅ Registro guardado exitosamente en IndexedDB:', nuevoRegistro);
          resolve();
        };

        transaction.onerror = () => {
          console.error('❌ Error en la transacción de IndexedDB:', transaction.error);
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('Error general al guardar en StorageService:', error);
    }
  }
}
