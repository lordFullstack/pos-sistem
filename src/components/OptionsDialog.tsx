import { useState } from 'react';
import type { Product, Selection } from '../types';
import { defaultSelection, maxFor, missingGroups, selectionNote, toggleOption, unitPrice } from '../lib/cart';
import { money } from '../lib/format';
import { Dialog } from './Dialog';

/** Elegir tamaño, sabores, término, adicionales… antes de agregar un producto. */
export function OptionsDialog({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (sel: Selection) => void }) {
  const [sel, setSel] = useState<Selection>(() => defaultSelection(product));
  const missing = missingGroups(product, sel);
  const note = selectionNote(product, sel);
  return (
    <Dialog
      title={product.name}
      subtitle={`${product.desc} · desde ${money(product.price)}`}
      onClose={onClose}
      footer={
        <>
          <span className="grow" style={{ fontSize: '0.8125rem', color: 'var(--ink-2)', lineHeight: 1.4 }}>
            {missing.length ? `Falta elegir: ${missing.join(', ')}` : note || 'Sin opciones adicionales'}
          </span>
          <button type="button" className="btn btn-primary" style={{ height: '3.5rem', padding: '0 1.5rem', fontSize: '1.0625rem', borderRadius: '1rem' }} disabled={missing.length > 0} onClick={() => onAdd(sel)}>
            Agregar · {money(unitPrice(product, sel))}
          </button>
        </>
      }
    >
      {(product.opts ?? []).map((g, gi) => {
        const chosen = sel[gi] ?? [];
        const max = maxFor(product, sel, g);
        const full = g.type === 'many' && chosen.length >= max;
        const isMissing = g.min > 0 && chosen.length < g.min;
        let hint = 'Elige 1';
        if (g.type === 'many') hint = (g.min > 0 ? (max === 1 ? 'Elige 1' : `Elige hasta ${max}`) : `Opcional · hasta ${max}`) + ` · ${chosen.length}/${max}`;
        return (
          <div key={g.name} role="group" aria-label={g.name} className="col" style={{ gap: '0.625rem', paddingTop: '0.25rem' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800 }}>{g.name}</span>
              <span className={`tag ${isMissing ? 'tag-warn' : ''}`}>{hint}</span>
            </div>
            <div className="chips">
              {g.choices.map((c, ci) => {
                const active = chosen.includes(ci);
                return (
                  <button key={c.label} type="button" className="opt" aria-pressed={active} disabled={!active && full} onClick={() => setSel(toggleOption(product, sel, gi, ci))}>
                    {c.label}
                    {c.add > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8 }}>+{money(c.add)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </Dialog>
  );
}
