import { useMemo, useState } from 'react';
import type { OptionGroup, Product, ProductIconName } from '../types';
import { sortedCategories, useCurrentUser, useStore } from '../store';
import { can } from '../data/roles';
import { money } from '../lib/format';
import { deleteProductImage, saveProductImage, useImageUrl } from '../lib/images';
import { Icon } from '../components/Icon';
import { ProductIcon } from '../components/ProductIcon';
import { ProductThumb } from '../components/ProductArt';
import { Brand } from '../components/Brand';
import { ModuleNav } from '../components/ModuleNav';
import { NoAccess } from '../components/NoAccess';
import { Dialog } from '../components/Dialog';

const ICONS: ProductIconName[] = ['cup', 'glass', 'plate', 'bowl', 'croissant', 'cake', 'roll', 'bread', 'cone', 'popsicle', 'tub', 'burger', 'fries', 'pizza'];
const TINTS = ['#EFE6DC', '#F4E7CF', '#F6EED0', '#E5ECD7', '#E2ECDA', '#E0EEF0', '#E6EEF6', '#E8E4EE', '#EFE3EC', '#F4E0DE', '#EFDCD4', '#E9DFD8'];

const digits = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 9);
  return d ? parseInt(d, 10) : 0;
};

export function Menu() {
  const user = useCurrentUser();
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const [cat, setCat] = useState('todo');
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState('');
  const [catsOpen, setCatsOpen] = useState(false);

  const cats = useMemo(() => sortedCategories(categories), [categories]);
  if (!can(user?.role, 'menu')) {
    return <div className="app"><main className="main"><header className="header"><Brand sub="Menú" /></header><NoAccess what="el menú" /><ModuleNav current="menu" /></main></div>;
  }

  const q = query.trim().toLowerCase();
  const rows = [...products]
    .sort((a, b) => a.sort - b.sort)
    .filter((p) => (cat === 'todo' || p.cat === cat) && (!q || p.name.toLowerCase().includes(q)));
  const product = products.find((p) => p.id === sel) ?? rows[0];
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? 'Sin categoría';

  const create = () => {
    const target = cat !== 'todo' ? cat : cats[0]?.id;
    if (!target) return setCatsOpen(true);
    const id = addProduct({ name: 'Producto nuevo', desc: '', price: 0, cat: target, icon: 'plate', tint: TINTS[products.length % TINTS.length], active: false });
    setSel(id);
    setQuery('');
  };

  return (
    <div className="app">
      <main className="main">
        <header className="header">
          <Brand title="Menú" icon={<Icon name="image" size={22} />} sub={`${products.filter((p) => p.active).length} productos a la venta de ${products.length}`} />
          <label className="search">
            <Icon name="search" size={18} />
            <input type="search" aria-label="Buscar producto" placeholder="Buscar producto" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className="btn btn-primary" onClick={create}><Icon name="plus" size={18} stroke={2.4} /> Nuevo producto</button>
        </header>

        <nav className="chips" aria-label="Categorías">
          <button type="button" className="chip" aria-pressed={cat === 'todo'} onClick={() => setCat('todo')}>Todo <span className="count">{products.length}</span></button>
          {cats.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
              {c.name} <span className="count">{products.filter((p) => p.cat === c.id).length}</span>
            </button>
          ))}
          <button type="button" className="chip" onClick={() => setCatsOpen(true)} style={{ background: 'var(--bg)' }}><Icon name="pencil" size={16} /> Categorías</button>
        </nav>

        <section className="card col" aria-label="Productos" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', gap: 0 }}>
          <div className="scroll">
            {rows.length === 0 && <div className="empty"><strong>No hay productos aquí</strong><span>Crea uno con “Nuevo producto”.</span></div>}
            {rows.map((p) => (
              <button key={p.id} type="button" className="list-row" aria-pressed={product?.id === p.id} onClick={() => setSel(p.id)}>
                <ProductThumb product={p} />
                <span className="col grow" style={{ gap: 2 }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{p.name}</span>
                  <span className="small" style={{ color: 'var(--ink-3)' }}>
                    {catName(p.cat)}{p.opts?.length ? ` · ${p.opts.length} grupo${p.opts.length === 1 ? '' : 's'} de opciones` : ''}{p.imageId ? '' : ' · sin foto'}
                  </span>
                </span>
                <span className="num" style={{ fontSize: '1rem', fontWeight: 800, minWidth: 90, textAlign: 'right' }}>{money(p.price)}</span>
                <span className={`tag ${p.active ? 'tag-ok' : ''}`} style={{ minWidth: 96, justifyContent: 'center' }}>{p.active ? 'A la venta' : 'Oculto'}</span>
              </button>
            ))}
          </div>
        </section>

        <ModuleNav current="menu" />
      </main>

      <aside className="aside" aria-label="Editar producto">
        {product ? <ProductEditor key={product.id} product={product} onDeleted={() => setSel('')} /> : (
          <div className="empty"><Icon name="image" size={40} stroke={1.6} /><strong>Sin productos</strong><span>Crea el primero con “Nuevo producto”.</span></div>
        )}
      </aside>

      {catsOpen && <CategoriesDialog onClose={() => setCatsOpen(false)} />}
    </div>
  );
}

function ProductEditor({ product: p, onDeleted }: { product: Product; onDeleted: () => void }) {
  const categories = useStore((s) => s.categories);
  const update = useStore((s) => s.updateProduct);
  const remove = useStore((s) => s.deleteProduct);
  const photo = useImageUrl(p.imageId);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [optsOpen, setOptsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<Product>) => update(p.id, patch);
  const missing = !p.name.trim() ? 'Ponle un nombre.' : p.price <= 0 ? 'Ponle un precio mayor a $0.' : '';

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setPhotoError('');
    try {
      const id = await saveProductImage(file);
      const old = p.imageId;
      set({ imageId: id });
      if (old) await deleteProductImage(old);
    } catch (e) {
      setPhotoError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <>
      <div className="col" style={{ gap: 8 }}>
        <span className="label">Foto</span>
        <div style={{ position: 'relative', height: 180, borderRadius: 16, overflow: 'hidden', background: p.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a3b32' }}>
          {photo ? <img src={photo} alt={`Foto de ${p.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ProductIcon name={p.icon} size={72} />}
          {busy && <span className="tag" style={{ position: 'absolute', top: 10, left: 10 }}>Procesando foto…</span>}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <label className="btn btn-md grow" style={{ position: 'relative', cursor: 'pointer' }}>
            <Icon name="upload" size={18} /> {p.imageId ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/*" aria-label={`Subir foto de ${p.name}`} disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void onPhoto(f); }}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          </label>
          {p.imageId && (
            <button type="button" className="btn btn-md btn-danger" onClick={async () => { const old = p.imageId!; set({ imageId: undefined }); await deleteProductImage(old); }}>Quitar</button>
          )}
        </div>
        <span className="small" style={{ color: photoError ? 'var(--bad-ink)' : 'var(--ink-3)' }}>
          {photoError || 'Desde la tablet puedes tomarla con la cámara. Se guarda achicada (máx. 800 px) para que la app vaya rápido.'}
        </span>
      </div>

      {!p.imageId && (
        <div className="col" style={{ gap: 8 }}>
          <span className="label">Sin foto, se muestra este ícono y color</span>
          <div className="chips" style={{ gap: 6 }}>
            {ICONS.map((ic) => (
              <button key={ic} type="button" className="icon-btn" aria-pressed={p.icon === ic} aria-label={`Ícono ${ic}`} onClick={() => set({ icon: ic })}
                style={{ width: 40, height: 40, boxShadow: p.icon === ic ? 'var(--ring-active)' : 'var(--shadow-ring)', color: '#4a3b32' }}>
                <ProductIcon name={ic} size={24} />
              </button>
            ))}
          </div>
          <div className="chips" style={{ gap: 6 }}>
            {TINTS.map((t) => (
              <button key={t} type="button" aria-pressed={p.tint === t} aria-label={`Color de fondo ${t}`} onClick={() => set({ tint: t })}
                style={{ width: 32, height: 32, borderRadius: 999, border: 0, background: t, boxShadow: p.tint === t ? '0 0 0 2px var(--ink)' : 'var(--shadow-ring)' }} />
            ))}
          </div>
        </div>
      )}

      <label className="field"><span className="label">Nombre</span><input className="input" value={p.name} onChange={(e) => set({ name: e.target.value })} /></label>
      <label className="field"><span className="label">Descripción corta</span><input className="input" value={p.desc} onChange={(e) => set({ desc: e.target.value })} placeholder="Ej. Pan artesanal" /></label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label className="field">
          <span className="label">Precio</span>
          <span className="row" style={{ height: 48, padding: '0 14px', borderRadius: 12, background: 'var(--bg)', gap: 4 }}>
            <span style={{ fontWeight: 800, color: 'var(--ink-3)' }}>$</span>
            <input className="num grow" inputMode="numeric" value={p.price ? money(p.price).slice(1) : ''} placeholder="0"
              onChange={(e) => set({ price: digits(e.target.value) })}
              style={{ border: 0, outline: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 800, minWidth: 0, height: 44 }} />
          </span>
        </label>
        <label className="field">
          <span className="label">Categoría</span>
          <select className="input" value={p.cat} onChange={(e) => set({ cat: e.target.value })}>
            {sortedCategories(categories).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: 'var(--bg)' }}>
        <span className="col" style={{ gap: 2 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Opciones</span>
          <span className="small" style={{ color: 'var(--ink-3)' }}>
            {p.opts?.length ? p.opts.map((g) => g.name).join(', ') : 'Sin opciones: se agrega directo a la orden'}
          </span>
        </span>
        <button type="button" className="btn btn-sm btn-white" onClick={() => setOptsOpen(true)}>Editar</button>
      </div>

      {missing && p.active && <div className="notice notice-warn"><Icon name="warning" size={16} /> {missing}</div>}
      <button type="button" role="switch" aria-checked={p.active} disabled={!!missing && !p.active}
        onClick={() => set({ active: !p.active })}
        className="row" style={{ justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: 0, borderRadius: 12, background: 'var(--bg)', textAlign: 'left' }}>
        <span className="col" style={{ gap: 2 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>A la venta en la caja</span>
          <span className="small" style={{ color: 'var(--ink-3)' }}>{missing && !p.active ? missing : 'Apágalo si se acabó o es de temporada.'}</span>
        </span>
        <span className="switch" aria-hidden="true" />
      </button>

      <div style={{ marginTop: 'auto' }}>
        {confirmDelete ? (
          <div className="notice notice-warn" role="alertdialog" aria-label="Confirmar borrado" style={{ fontWeight: 600 }}>
            <span className="grow">¿Borrar “{p.name}”? Las ventas pasadas no cambian.</span>
            <button type="button" className="btn btn-sm btn-white" onClick={() => setConfirmDelete(false)}>No</button>
            <button type="button" className="btn btn-sm" style={{ background: '#8a3b12', color: '#fff' }}
              onClick={async () => { const img = p.imageId; remove(p.id); onDeleted(); if (img) await deleteProductImage(img); }}>Borrar</button>
          </div>
        ) : (
          <button type="button" className="btn btn-md btn-danger" style={{ width: '100%' }} onClick={() => setConfirmDelete(true)}><Icon name="trash" size={16} /> Borrar producto</button>
        )}
      </div>

      {optsOpen && <OptionsEditor product={p} onClose={() => setOptsOpen(false)} onSave={(opts) => { set({ opts: opts.length ? opts : undefined }); setOptsOpen(false); }} />}
    </>
  );
}

/* ---------- Editor de opciones ---------- */

function groupProblem(g: OptionGroup): string | null {
  if (!g.name.trim()) return 'Cada grupo necesita un nombre.';
  if (!g.choices.length) return `“${g.name}” necesita al menos una opción.`;
  if (g.choices.some((c) => !c.label.trim())) return `Hay opciones sin nombre en “${g.name}”.`;
  if (typeof g.max === 'number' && g.type === 'many' && g.max < Math.max(1, g.min)) return `En “${g.name}” el máximo no puede ser menor que el mínimo.`;
  return null;
}

function OptionsEditor({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (opts: OptionGroup[]) => void }) {
  const [groups, setGroups] = useState<OptionGroup[]>(() => structuredClone(product.opts ?? []));
  const problem = groups.map(groupProblem).find(Boolean) ?? null;
  const patch = (gi: number, p: Partial<OptionGroup>) => setGroups(groups.map((g, i) => (i === gi ? { ...g, ...p } : g)));
  const patchChoice = (gi: number, ci: number, p: Partial<OptionGroup['choices'][number]>) =>
    patch(gi, { choices: groups[gi].choices.map((c, i) => (i === ci ? { ...c, ...p } : c)) });

  return (
    <Dialog title={`Opciones de ${product.name}`} subtitle="Lo que el cajero elige al agregar el producto: tamaño, término, sabores, adicionales…" onClose={onClose} width="44rem"
      footer={
        <>
          <span className="grow small" style={{ color: problem ? 'var(--bad-ink)' : 'var(--ink-3)', fontWeight: problem ? 700 : 400 }}>{problem ?? 'Los precios extra se suman al precio base.'}</span>
          <button type="button" className="btn btn-primary btn-md" disabled={!!problem} onClick={() => onSave(groups)}>Guardar opciones</button>
        </>
      }>
      {groups.length === 0 && <span className="muted">Este producto no tiene opciones.</span>}
      {groups.map((g, gi) => (
        <div key={gi} className="card col" style={{ padding: 16, gap: 12 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <input className="input grow" style={{ flex: '1 1 12rem' }} value={g.name} placeholder="Nombre del grupo (ej. Tamaño)" aria-label="Nombre del grupo" onChange={(e) => patch(gi, { name: e.target.value })} />
            <div className="seg" style={{ width: 240 }}>
              <button type="button" aria-pressed={g.type === 'one'} onClick={() => patch(gi, { type: 'one', max: 1, min: g.min ? 1 : 0 })}>Elige una</button>
              <button type="button" aria-pressed={g.type === 'many'} onClick={() => patch(gi, { type: 'many', max: g.max === 'scoops' ? 'scoops' : Math.max(2, Number(g.max) || 2) })}>Varias</button>
            </div>
            <button type="button" className="icon-btn" aria-label={`Quitar grupo ${g.name}`} onClick={() => setGroups(groups.filter((_, i) => i !== gi))}><Icon name="trash" size={16} /></button>
          </div>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <button type="button" role="switch" aria-checked={g.min > 0} onClick={() => patch(gi, { min: g.min > 0 ? 0 : 1 })}
              className="row" style={{ gap: 10, border: 0, background: 'transparent', padding: 0, fontSize: '0.8125rem', fontWeight: 700 }}>
              <span className="switch" aria-hidden="true" /> Obligatorio
            </button>
            {g.type === 'many' && (g.max === 'scoops' ? (
              <span className="small" style={{ color: 'var(--ink-3)' }}>Máximo según el tamaño elegido (bolas)</span>
            ) : (
              <label className="row small" style={{ gap: 8, fontWeight: 700 }}>
                Máximo
                <input className="input num" style={{ width: 70, height: 36 }} inputMode="numeric" value={g.max} onChange={(e) => patch(gi, { max: Math.max(1, digits(e.target.value) || 1) })} />
              </label>
            ))}
          </div>
          <div className="col" style={{ gap: 6 }}>
            {g.choices.map((c, ci) => (
              <div key={ci} className="row" style={{ gap: 8 }}>
                <input className="input grow" style={{ height: 40 }} value={c.label} placeholder="Opción (ej. Grande)" aria-label="Nombre de la opción" onChange={(e) => patchChoice(gi, ci, { label: e.target.value })} />
                <span className="row" style={{ height: 40, padding: '0 10px', borderRadius: 10, background: 'var(--bg)', gap: 4, width: 130 }}>
                  <span className="small" style={{ fontWeight: 800, color: 'var(--ink-3)' }}>+$</span>
                  <input className="num grow" inputMode="numeric" aria-label="Precio extra" value={c.add ? money(c.add).slice(1) : ''} placeholder="0" onChange={(e) => patchChoice(gi, ci, { add: digits(e.target.value) })}
                    style={{ border: 0, outline: 'none', background: 'transparent', fontWeight: 700, minWidth: 0 }} />
                </span>
                <button type="button" className="icon-btn" style={{ width: 40, height: 40 }} aria-label={`Quitar opción ${c.label}`} onClick={() => patch(gi, { choices: g.choices.filter((_, i) => i !== ci) })}><Icon name="x" size={16} /></button>
              </div>
            ))}
            <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => patch(gi, { choices: [...g.choices, { label: '', add: 0 }] })}><Icon name="plus" size={14} stroke={2.4} /> Agregar opción</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-md btn-white" onClick={() => setGroups([...groups, { name: '', type: 'one', min: 1, max: 1, choices: [{ label: '', add: 0 }] }])}>
        <Icon name="plus" size={16} stroke={2.4} /> Agregar grupo de opciones
      </button>
    </Dialog>
  );
}

/* ---------- Categorías ---------- */

function CategoriesDialog({ onClose }: { onClose: () => void }) {
  const categories = useStore((s) => s.categories);
  const add = useStore((s) => s.addCategory);
  const rename = useStore((s) => s.renameCategory);
  const del = useStore((s) => s.deleteCategory);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  return (
    <Dialog title="Categorías" subtitle="Son las pestañas de la caja." onClose={onClose} width="30rem">
      {sortedCategories(categories).map((c) => (
        <div key={c.id} className="row" style={{ gap: 8 }}>
          <input className="input grow" value={c.name} aria-label="Nombre de la categoría" onChange={(e) => rename(c.id, e.target.value)} />
          <button type="button" className="icon-btn" aria-label={`Borrar categoría ${c.name}`} onClick={() => setError(del(c.id) ?? '')}><Icon name="trash" size={16} /></button>
        </div>
      ))}
      {error && <div className="notice notice-warn" role="alert"><Icon name="warning" size={16} /> {error}</div>}
      <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) { add(name.trim()); setName(''); setError(''); } }}>
        <input className="input grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva categoría (ej. Almuerzos)" aria-label="Nueva categoría" />
        <button type="submit" className="btn btn-primary btn-md" disabled={!name.trim()}>Agregar</button>
      </form>
    </Dialog>
  );
}
