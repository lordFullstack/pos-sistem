import type { BizType, InventoryItem } from '../types';

type Seed = [id: string, name: string, cat: string, unit: InventoryItem['unit'], stock: number, min: number, usedIn: string];

export const INVENTORY_CATS: Record<string, string> = {
  bebidas: 'Café y bebidas',
  frescos: 'Frutas y verduras',
  lacteos: 'Panadería y lácteos',
  carnes: 'Carnes y proteínas',
  secos: 'Secos y abarrotes',
  empaques: 'Empaques',
};

const SEEDS: Record<BizType, Seed[]> = {
  cafe: [
    ['cafe', 'Café en grano', 'bebidas', 'kg', 6.5, 3, 'Espresso, Cappuccino, Latte'],
    ['leche', 'Leche entera', 'bebidas', 'L', 8, 12, 'Cappuccino, Latte'],
    ['almendra', 'Leche de almendras', 'bebidas', 'L', 3, 4, 'Bebidas con leche vegetal'],
    ['te', 'Té negro en hebras', 'bebidas', 'kg', 1.2, 0.5, 'Té negro'],
    ['aguacate', 'Aguacate', 'frescos', 'und', 0, 10, 'Tostada de aguacate'],
    ['fresas', 'Fresas', 'frescos', 'kg', 0.8, 2, 'Bowl de yogur, Jugo de frutos rojos'],
    ['espinaca', 'Espinaca', 'frescos', 'kg', 2.5, 1.5, 'Jugo verde'],
    ['pan', 'Pan artesanal', 'lacteos', 'und', 14, 10, 'Tostada de aguacate'],
    ['croissant', 'Croissant congelado', 'lacteos', 'und', 22, 15, 'Croissant'],
    ['yogur', 'Yogur griego', 'lacteos', 'kg', 2.5, 2, 'Bowl de yogur'],
    ['vasos', 'Vasos 12 oz', 'empaques', 'und', 140, 100, 'Bebidas para llevar'],
    ['tapas', 'Tapas 12 oz', 'empaques', 'und', 60, 100, 'Bebidas para llevar'],
  ],
  resto: [
    ['res', 'Carne de res', 'carnes', 'kg', 9, 6, 'Churrasco, Bandeja paisa'],
    ['pollo', 'Pollo', 'carnes', 'kg', 4, 8, 'Arroz con pollo, Sancocho, Ajiaco'],
    ['chicharron', 'Chicharrón', 'carnes', 'kg', 2.5, 2, 'Bandeja paisa'],
    ['papa', 'Papa', 'frescos', 'kg', 18, 10, 'Sancocho, Ajiaco, Churrasco'],
    ['limon', 'Limón', 'frescos', 'kg', 1, 3, 'Limonada de coco'],
    ['lechuga', 'Lechuga', 'frescos', 'und', 6, 4, 'Ensalada César'],
    ['frijol', 'Fríjol', 'secos', 'kg', 7, 5, 'Bandeja paisa'],
    ['arroz', 'Arroz', 'secos', 'kg', 20, 10, 'Bandeja paisa, Arroz con pollo'],
    ['coco', 'Crema de coco', 'secos', 'L', 0, 2, 'Limonada de coco'],
    ['cerveza', 'Cerveza nacional', 'bebidas', 'und', 48, 24, 'Cerveza'],
    ['gaseosa', 'Gaseosa 350 ml', 'bebidas', 'und', 30, 24, 'Gaseosa'],
    ['domicilio', 'Empaques para llevar', 'empaques', 'und', 40, 50, 'Pedidos para llevar'],
  ],
  helado: [
    ['base', 'Base de helado', 'lacteos', 'L', 22, 15, 'Todos los helados'],
    ['vainilla', 'Helado de vainilla', 'lacteos', 'L', 6, 4, 'Conos, vasos, malteadas'],
    ['chocolate', 'Helado de chocolate', 'lacteos', 'L', 3, 4, 'Conos, vasos, malteadas'],
    ['fresa', 'Helado de fresa', 'lacteos', 'L', 4.5, 4, 'Conos, vasos, malteadas'],
    ['arequipe', 'Helado de arequipe', 'lacteos', 'L', 0, 3, 'Conos, vasos'],
    ['barquillos', 'Barquillos', 'secos', 'und', 180, 100, 'Cono'],
    ['chispas', 'Chispas de colores', 'secos', 'kg', 0.6, 0.5, 'Toppings'],
    ['salsa', 'Salsa de chocolate', 'secos', 'L', 1, 2, 'Toppings, Banana split'],
    ['banano', 'Banano', 'frescos', 'und', 12, 10, 'Banana split'],
    ['vasos', 'Vasos de helado', 'empaques', 'und', 90, 100, 'Vaso de helado'],
    ['litros', 'Envases de litro', 'empaques', 'und', 25, 20, 'Litro de helado'],
    ['cucharas', 'Cucharas', 'empaques', 'und', 400, 200, 'Todos'],
  ],
  pan: [
    ['harina', 'Harina de trigo', 'secos', 'kg', 50, 30, 'Panes y hojaldre'],
    ['azucar', 'Azúcar', 'secos', 'kg', 12, 10, 'Tortas, roscones'],
    ['levadura', 'Levadura', 'secos', 'kg', 0.8, 1, 'Panes'],
    ['mantequilla', 'Mantequilla', 'lacteos', 'kg', 6, 5, 'Croissant, hojaldre'],
    ['queso', 'Queso costeño', 'lacteos', 'kg', 2, 4, 'Pandebono, almojábana'],
    ['huevos', 'Huevos', 'lacteos', 'und', 120, 90, 'Tortas, mantecada'],
    ['leche', 'Leche', 'lacteos', 'L', 10, 8, 'Café con leche, chocolate'],
    ['arequipe', 'Arequipe', 'secos', 'kg', 0, 2, 'Roscón de arequipe'],
    ['cafe', 'Café molido', 'bebidas', 'kg', 2, 1, 'Café con leche'],
    ['chocolate', 'Chocolate de mesa', 'bebidas', 'kg', 1.5, 1, 'Chocolate caliente'],
    ['bolsas', 'Bolsas de papel', 'empaques', 'und', 300, 200, 'Todos'],
    ['cajas', 'Cajas para torta', 'empaques', 'und', 8, 10, 'Torta entera'],
  ],
  rapida: [
    ['carne', 'Carne para hamburguesa', 'carnes', 'und', 60, 40, 'Hamburguesas'],
    ['pollo', 'Pollo apanado', 'carnes', 'und', 18, 20, 'Hamburguesa de pollo'],
    ['salchicha', 'Salchichas', 'carnes', 'und', 70, 50, 'Perro caliente, Salchipapa'],
    ['tocineta', 'Tocineta', 'carnes', 'kg', 1.5, 1, 'Adicionales'],
    ['alitas', 'Alitas', 'carnes', 'kg', 0, 4, 'Alitas x6'],
    ['pan', 'Pan de hamburguesa', 'lacteos', 'und', 50, 40, 'Hamburguesas'],
    ['queso', 'Queso tajado', 'lacteos', 'kg', 2, 1.5, 'Hamburguesas, pizza'],
    ['papa', 'Papa precocida', 'frescos', 'kg', 15, 10, 'Papas, Salchipapa'],
    ['salsas', 'Salsas surtidas', 'secos', 'L', 4, 3, 'Todos'],
    ['gaseosa', 'Gaseosa 400 ml', 'bebidas', 'und', 20, 24, 'Gaseosa, Combo'],
    ['cajas', 'Cajas para llevar', 'empaques', 'und', 120, 100, 'Pedidos para llevar'],
    ['vasos', 'Vasos 16 oz', 'empaques', 'und', 80, 60, 'Bebidas'],
  ],
};

export function seedInventory(type: BizType): InventoryItem[] {
  return SEEDS[type].map(([id, name, cat, unit, stock, min, usedIn]) => ({ id, name, cat, unit, stock, min, usedIn }));
}

export function stepFor(unit: InventoryItem['unit']): number {
  if (unit === 'kg') return 0.5;
  if (unit === 'L') return 1;
  return 5;
}

export type StockStatus = 'ok' | 'low' | 'out';

export function stockStatus(item: InventoryItem): StockStatus {
  if (item.stock <= 0) return 'out';
  if (item.stock < item.min) return 'low';
  return 'ok';
}
