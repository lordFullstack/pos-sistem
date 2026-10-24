import type { ProductTemplate } from '../types';
import { useImageUrl } from '../lib/images';
import { ProductIcon } from './ProductIcon';

/** Foto del producto si tiene; si no, su ícono. */
export function ProductThumb({ product, size = 56, radius = 12 }: { product: ProductTemplate & { imageId?: string }; size?: number; radius?: number }) {
  const url = useImageUrl(product.imageId);
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flex: '0 0 auto', background: product.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a3b32' }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ProductIcon name={product.icon} size={Math.round(size * 0.6)} />}
    </span>
  );
}
