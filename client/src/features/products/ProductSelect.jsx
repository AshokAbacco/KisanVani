import { forwardRef, useEffect, useState } from 'react';
import { catalogApi } from '../../services';
import { Field } from '../../components/forms/Field';

let cache = null;
/** Loads the active catalogue once per session (it is small and rarely changes). */
export const loadCatalogue = async () => {
  if (!cache) cache = catalogApi.products({ limit: 100, sortBy: 'name', sortOrder: 'asc' }).then((r) => r.data).catch((e) => {
    cache = null;
    throw e;
  });
  return cache;
};
export const clearCatalogueCache = () => {
  cache = null;
};

/** <select> of catalogue products grouped by category. Works with react-hook-form register(). */
const ProductSelect = forwardRef(function ProductSelect({ label = 'Product', error, required, exclude = [], className, ...rest }, ref) {
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState(null);
  useEffect(() => {
    loadCatalogue()
      .then(setProducts)
      .catch(() => setLoadError('Could not load the product list'));
  }, []);
  const groups = products.reduce((acc, p) => {
    if (exclude.includes(p.id)) return acc;
    (acc[p.category.name] = acc[p.category.name] || []).push(p);
    return acc;
  }, {});
  return (
    <Field label={label} error={error || loadError} required={required} className={className}>
      <select ref={ref} className={`input ${error ? 'input-error' : ''}`} {...rest}>
        <option value="">{products.length ? 'Choose a product' : 'Loading…'}</option>
        {Object.entries(groups).map(([cat, list]) => (
          <optgroup key={cat} label={cat}>
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji ? `${p.emoji} ` : ''}
                {p.name}
                {p.localName ? ` (${p.localName})` : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </Field>
  );
});

export default ProductSelect;
