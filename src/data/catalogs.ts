import type { BizType, Catalog, Category, OptionChoice, OptionGroup, Product } from '../types';

const one = (name: string, choices: OptionChoice[]): OptionGroup => ({ name, type: 'one', min: 1, max: 1, choices });
const c = (label: string, add = 0, scoops?: number): OptionChoice => (scoops ? { label, add, scoops } : { label, add });

const milk: OptionGroup[] = [
  one('Leche', [c('Entera'), c('Deslactosada'), c('Almendras', 1500)]),
  one('Tamaño', [c('8 oz'), c('12 oz', 1500)]),
];

const flavors = ['Vainilla', 'Chocolate', 'Fresa', 'Arequipe', 'Ron con pasas', 'Maracuyá', 'Mora', 'Chicle'].map((f) => c(f));

const scoopOpts: OptionGroup[] = [
  one('Tamaño', [c('1 bola', 0, 1), c('2 bolas', 3500, 2), c('3 bolas', 6500, 3)]),
  { name: 'Sabores', type: 'many', min: 1, max: 'scoops', choices: flavors },
  { name: 'Toppings', type: 'many', min: 0, max: 3, choices: [c('Chispas', 1000), c('Salsa de chocolate', 1500), c('Crema chantilly', 1500), c('Maní', 1000)] },
];

const burgerExtras: OptionGroup = {
  name: 'Adicionales', type: 'many', min: 0, max: 3,
  choices: [c('Tocineta', 3000), c('Queso extra', 2000), c('Huevo', 1500), c('Jalapeños', 1000)],
};

export const CATALOGS: Record<BizType, Catalog> = {
  cafe: {
    type: 'cafe', label: 'Cafetería', defaultName: 'Tu Café', defaultMode: 'mesa', hasTables: false, dineInLabel: 'En mesa',
    hint: 'Bebidas con opciones de leche y tamaño; venta en mesa o para llevar.',
    cats: [['bebidas', 'Bebidas'], ['desayunos', 'Desayunos'], ['panaderia', 'Panadería'], ['postres', 'Postres']],
    items: [
      { id: 'espresso', name: 'Espresso', desc: 'Doble · café de origen', price: 4500, cat: 'bebidas', icon: 'cup', tint: '#EFE6DC' },
      { id: 'cappuccino', name: 'Cappuccino', desc: 'Leche a elección', price: 7000, cat: 'bebidas', icon: 'cup', tint: '#F2E9DF', opts: milk },
      { id: 'latte', name: 'Latte', desc: 'Leche a elección', price: 7500, cat: 'bebidas', icon: 'cup', tint: '#F1E6D6', opts: milk },
      { id: 'te', name: 'Té negro', desc: 'Infusión en hebras', price: 4000, cat: 'bebidas', icon: 'cup', tint: '#EDE3D3' },
      { id: 'verde', name: 'Jugo verde', desc: 'Detox natural', price: 7000, cat: 'bebidas', icon: 'glass', tint: '#E2ECDA' },
      { id: 'frutos', name: 'Jugo de frutos rojos', desc: 'Sin azúcar añadida', price: 7000, cat: 'bebidas', icon: 'glass', tint: '#F4E0DE' },
      { id: 'tostada', name: 'Tostada de aguacate', desc: 'Pan artesanal', price: 12000, cat: 'desayunos', icon: 'plate', tint: '#E5ECD7' },
      { id: 'yogur', name: 'Bowl de yogur', desc: 'Granola y frutos', price: 9500, cat: 'desayunos', icon: 'bowl', tint: '#EFE3EC' },
      { id: 'croissant', name: 'Croissant', desc: 'De mantequilla', price: 5500, cat: 'panaderia', icon: 'croissant', tint: '#F4E7CF' },
      { id: 'pandebono', name: 'Pandebono', desc: 'Recién horneado', price: 3500, cat: 'panaderia', icon: 'roll', tint: '#F3EAD4' },
      { id: 'brownie', name: 'Brownie', desc: 'Chocolate 70%', price: 6000, cat: 'postres', icon: 'cake', tint: '#E9DFD8' },
      { id: 'cheesecake', name: 'Cheesecake', desc: 'Frutos del bosque', price: 8500, cat: 'postres', icon: 'cake', tint: '#F3E4E2' },
    ],
  },
  resto: {
    type: 'resto', label: 'Restaurante', defaultName: 'Tu Restaurante', defaultMode: 'mesa', hasTables: true, dineInLabel: 'En mesa',
    hint: 'Mesas, comandas a cocina y opciones por plato (término, acompañante).',
    cats: [['platos', 'Platos fuertes'], ['sopas', 'Sopas'], ['bebidas', 'Bebidas'], ['postres', 'Postres']],
    items: [
      { id: 'bandeja', name: 'Bandeja paisa', desc: 'Frijoles, chicharrón y arepa', price: 32000, cat: 'platos', icon: 'plate', tint: '#F1E6D6' },
      {
        id: 'churrasco', name: 'Churrasco', desc: '300 g a la parrilla', price: 38000, cat: 'platos', icon: 'plate', tint: '#EFDCD4',
        opts: [
          one('Término', [c('Azul'), c('Término medio'), c('Tres cuartos'), c('Bien asado')]),
          one('Acompañante', [c('Papa a la francesa'), c('Ensalada'), c('Arroz')]),
        ],
      },
      { id: 'arrozpollo', name: 'Arroz con pollo', desc: 'Con papa criolla', price: 22000, cat: 'platos', icon: 'plate', tint: '#F4EBCF' },
      { id: 'cesar', name: 'Ensalada César', desc: 'Pollo y crutones', price: 19000, cat: 'platos', icon: 'bowl', tint: '#E5ECD7' },
      { id: 'sancocho', name: 'Sancocho', desc: 'De gallina', price: 24000, cat: 'sopas', icon: 'bowl', tint: '#F2E8D5' },
      { id: 'ajiaco', name: 'Ajiaco', desc: 'Con crema y alcaparras', price: 26000, cat: 'sopas', icon: 'bowl', tint: '#F3EDCF' },
      { id: 'limonada', name: 'Limonada de coco', desc: 'Vaso de 16 oz', price: 9000, cat: 'bebidas', icon: 'glass', tint: '#E8F0E2' },
      {
        id: 'jugo', name: 'Jugo natural', desc: 'Fruta de temporada', price: 7000, cat: 'bebidas', icon: 'glass', tint: '#F6E5D3',
        opts: [one('Fruta', [c('Mango'), c('Mora'), c('Lulo'), c('Maracuyá')]), one('Preparación', [c('En agua'), c('En leche', 1000)])],
      },
      { id: 'gaseosa', name: 'Gaseosa', desc: 'Botella 350 ml', price: 4500, cat: 'bebidas', icon: 'glass', tint: '#E8E4EE' },
      { id: 'cerveza', name: 'Cerveza', desc: 'Nacional', price: 7000, cat: 'bebidas', icon: 'glass', tint: '#F4EBCF' },
      { id: 'natas', name: 'Postre de natas', desc: 'Receta de la casa', price: 8000, cat: 'postres', icon: 'cake', tint: '#F2EADF' },
      { id: 'tresleches', name: 'Tres leches', desc: 'Porción', price: 8500, cat: 'postres', icon: 'cake', tint: '#F4ECE4' },
    ],
  },
  helado: {
    type: 'helado', label: 'Heladería', defaultName: 'Tu Heladería', defaultMode: 'llevar', hasTables: false, dineInLabel: 'Para comer aquí',
    hint: 'Bolas, sabores y toppings por producto; venta por litro para llevar.',
    cats: [['helados', 'Helados'], ['paletas', 'Paletas'], ['postres', 'Postres'], ['bebidas', 'Bebidas']],
    items: [
      { id: 'cono', name: 'Cono', desc: 'Barquillo artesanal', price: 5500, cat: 'helados', icon: 'cone', tint: '#F6E7D3', opts: scoopOpts },
      { id: 'vaso', name: 'Vaso de helado', desc: 'Con cuchara', price: 5500, cat: 'helados', icon: 'bowl', tint: '#F3E1E8', opts: scoopOpts },
      {
        id: 'litro', name: 'Litro de helado', desc: 'Para llevar', price: 28000, cat: 'helados', icon: 'tub', tint: '#E6EEF6',
        opts: [{ name: 'Sabores', type: 'many', min: 1, max: 2, choices: flavors }],
      },
      { id: 'banana', name: 'Banana split', desc: 'Tres bolas y banano', price: 16000, cat: 'postres', icon: 'bowl', tint: '#F6EED0' },
      { id: 'copa', name: 'Copa brownie', desc: 'Brownie con helado', price: 14000, cat: 'postres', icon: 'cake', tint: '#E9DFD8' },
      { id: 'waffle', name: 'Waffle con helado', desc: 'Dos bolas', price: 15000, cat: 'postres', icon: 'plate', tint: '#F4E7CF' },
      { id: 'paletaagua', name: 'Paleta de agua', desc: 'Mango, mora o limón', price: 3500, cat: 'paletas', icon: 'popsicle', tint: '#E0EEF0' },
      { id: 'paletacrema', name: 'Paleta de crema', desc: 'Cubierta de chocolate', price: 4500, cat: 'paletas', icon: 'popsicle', tint: '#EFE3DA' },
      {
        id: 'malteada', name: 'Malteada', desc: 'Vaso de 16 oz', price: 12000, cat: 'bebidas', icon: 'glass', tint: '#EDE0F0',
        opts: [one('Sabor', [c('Vainilla'), c('Chocolate'), c('Fresa'), c('Arequipe')])],
      },
      { id: 'afogato', name: 'Affogato', desc: 'Espresso con vainilla', price: 9000, cat: 'bebidas', icon: 'cup', tint: '#EFE6DC' },
      { id: 'agua', name: 'Agua', desc: 'Botella 600 ml', price: 3000, cat: 'bebidas', icon: 'glass', tint: '#E3EDF2' },
      { id: 'galleta', name: 'Galleta de la casa', desc: 'Para acompañar', price: 2500, cat: 'postres', icon: 'roll', tint: '#F3EAD4' },
    ],
  },
  pan: {
    type: 'pan', label: 'Panadería', defaultName: 'Tu Panadería', defaultMode: 'llevar', hasTables: false, dineInLabel: 'Para comer aquí',
    hint: 'Venta rápida por unidad o paquete, para llevar y encargos.',
    cats: [['panes', 'Panes'], ['hojaldre', 'Hojaldre y dulces'], ['tortas', 'Tortas'], ['bebidas', 'Bebidas']],
    items: [
      {
        id: 'frances', name: 'Pan francés', desc: 'Recién horneado', price: 1000, cat: 'panes', icon: 'bread', tint: '#F4E7CF',
        opts: [one('Cantidad', [c('1 unidad'), c('Paquete x6', 5000), c('Paquete x12', 10000)])],
      },
      { id: 'tajado', name: 'Pan tajado', desc: 'Integral o blanco', price: 7500, cat: 'panes', icon: 'bread', tint: '#F1E6D6' },
      { id: 'pandebono', name: 'Pandebono', desc: 'Con queso costeño', price: 2000, cat: 'panes', icon: 'roll', tint: '#F3EAD4' },
      { id: 'almojabana', name: 'Almojábana', desc: 'Tradicional', price: 2000, cat: 'panes', icon: 'roll', tint: '#F6EED0' },
      { id: 'croissant', name: 'Croissant', desc: 'De mantequilla', price: 4500, cat: 'hojaldre', icon: 'croissant', tint: '#F4E7CF' },
      { id: 'roscon', name: 'Roscón de arequipe', desc: 'Con azúcar', price: 4500, cat: 'hojaldre', icon: 'roll', tint: '#F2E8D5' },
      { id: 'mantecada', name: 'Mantecada', desc: 'Porción', price: 3000, cat: 'hojaldre', icon: 'cake', tint: '#F4ECE4' },
      {
        id: 'torta', name: 'Torta por porción', desc: 'Del día', price: 6000, cat: 'tortas', icon: 'cake', tint: '#F3E4E2',
        opts: [one('Sabor', [c('Chocolate'), c('Zanahoria'), c('Tres leches', 1000), c('Naranja')])],
      },
      { id: 'tortaentera', name: 'Torta entera', desc: 'Para 12 personas', price: 65000, cat: 'tortas', icon: 'cake', tint: '#EFE3EC' },
      {
        id: 'cafeleche', name: 'Café con leche', desc: 'Vaso de 9 oz', price: 3500, cat: 'bebidas', icon: 'cup', tint: '#EFE6DC',
        opts: [one('Tamaño', [c('9 oz'), c('12 oz', 1000)])],
      },
      { id: 'chocolate', name: 'Chocolate caliente', desc: 'Con queso', price: 5000, cat: 'bebidas', icon: 'cup', tint: '#E9DFD8' },
      { id: 'jugocaja', name: 'Jugo en caja', desc: '200 ml', price: 2500, cat: 'bebidas', icon: 'glass', tint: '#F6E5D3' },
    ],
  },
  rapida: {
    type: 'rapida', label: 'Comidas rápidas', defaultName: 'Tu Local', defaultMode: 'llevar', hasTables: false, dineInLabel: 'Para comer aquí',
    hint: 'Combos, adicionales y pedidos para llevar o a domicilio.',
    cats: [['hamburguesas', 'Hamburguesas'], ['perros', 'Perros y salchipapas'], ['acompanantes', 'Acompañantes'], ['bebidas', 'Bebidas']],
    items: [
      {
        id: 'clasica', name: 'Hamburguesa clásica', desc: 'Carne 150 g y queso', price: 18000, cat: 'hamburguesas', icon: 'burger', tint: '#F1E6D6',
        opts: [one('Término', [c('Término medio'), c('Bien asada')]), burgerExtras],
      },
      { id: 'doble', name: 'Hamburguesa doble', desc: 'Dos carnes', price: 25000, cat: 'hamburguesas', icon: 'burger', tint: '#EFDCD4', opts: [burgerExtras] },
      { id: 'pollo', name: 'Hamburguesa de pollo', desc: 'Pollo apanado', price: 19000, cat: 'hamburguesas', icon: 'burger', tint: '#F4EBCF', opts: [burgerExtras] },
      {
        id: 'combo', name: 'Combo clásico', desc: 'Hamburguesa, papas y gaseosa', price: 26000, cat: 'hamburguesas', icon: 'burger', tint: '#E5ECD7',
        opts: [one('Bebida', [c('Gaseosa'), c('Limonada', 1500), c('Malteada', 5000)])],
      },
      { id: 'perro', name: 'Perro caliente', desc: 'Con ripio y salsas', price: 14000, cat: 'perros', icon: 'plate', tint: '#F6E5D3' },
      { id: 'salchipapa', name: 'Salchipapa', desc: 'Para compartir', price: 15000, cat: 'perros', icon: 'fries', tint: '#F4E7CF' },
      {
        id: 'papas', name: 'Papas a la francesa', desc: 'Con salsas', price: 7000, cat: 'acompanantes', icon: 'fries', tint: '#F6EED0',
        opts: [one('Tamaño', [c('Pequeñas'), c('Grandes', 3000)])],
      },
      {
        id: 'alitas', name: 'Alitas x6', desc: 'Con apio', price: 19000, cat: 'acompanantes', icon: 'plate', tint: '#EFDCD4',
        opts: [one('Salsa', [c('BBQ'), c('Picante'), c('Miel mostaza')])],
      },
      { id: 'pizza', name: 'Pizza personal', desc: 'Jamón y queso', price: 16000, cat: 'acompanantes', icon: 'pizza', tint: '#F3E4E2' },
      { id: 'gaseosa', name: 'Gaseosa', desc: 'Botella 400 ml', price: 4500, cat: 'bebidas', icon: 'glass', tint: '#E8E4EE' },
      { id: 'limonada', name: 'Limonada', desc: 'Natural', price: 6000, cat: 'bebidas', icon: 'glass', tint: '#E8F0E2' },
      {
        id: 'malteada', name: 'Malteada', desc: '16 oz', price: 12000, cat: 'bebidas', icon: 'glass', tint: '#EDE0F0',
        opts: [one('Sabor', [c('Vainilla'), c('Chocolate'), c('Fresa')])],
      },
    ],
  },
};

export const BIZ_TYPES: BizType[] = ['cafe', 'resto', 'helado', 'pan', 'rapida'];

/** Menú inicial de un tipo de negocio, listo para editarse. */
export function seedMenu(type: BizType): { categories: Category[]; products: Product[] } {
  const cat = CATALOGS[type];
  return {
    categories: cat.cats.map(([id, name], i) => ({ id, name, sort: i })),
    products: cat.items.map((p, i) => ({ ...p, active: true, sort: i })),
  };
}
