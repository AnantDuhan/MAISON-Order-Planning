import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const field = 'border border-line bg-transparent px-3 py-2 font-sans text-sm text-ink outline-none focus:border-brass';
const input = `w-full ${field}`;
const comboKey = (options, selection) => options.map(o => `${o.name}=${selection[o.name]}`).join('|');

/** Every combination of the option values, keeping data from matching existing variants. */
const generate = (options, existing) => {
    const usable = options.filter(o => o.name.trim() && o.values.length);
    if (!usable.length) return [];
    let combos = [{}];
    for (const option of usable) {
        combos = combos.flatMap(c => option.values.map(v => ({ ...c, [option.name]: v.value })));
    }
    const old = new Map(existing.map(v => [comboKey(usable, v.options || {}), v]));
    return combos.map(selection => {
        const prev = old.get(comboKey(usable, selection));
        return prev
            ? { ...prev, options: selection }
            : { options: selection, Stock: 0, price: '', sku: '', active: true };
    });
};

/**
 * Options (Size, Colour…) and their variants for the admin product form.
 * value = { options, variants }; when options is empty the product is simple.
 */
const VariantEditor = ({ category, value, onChange }) => {
    const { options, variants } = value;
    const [template, setTemplate] = useState([]);
    const [draft, setDraft] = useState({}); // option index -> text being typed
    const [bulkStock, setBulkStock] = useState('');

    useEffect(() => {
        if (!category) return;
        axios.get('/api/v1/admin/product-options/template', { params: { category } })
            .then(({ data }) => setTemplate(data.options || []))
            .catch(() => setTemplate([]));
    }, [category]);

    const setOptions = next => onChange({ options: next, variants: generate(next, variants) });
    const updateOption = (i, patch) => setOptions(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));
    const addValue = i => {
        const text = (draft[i] || '').trim();
        if (!text) return;
        const option = options[i];
        if (option.values.some(v => v.value.toLowerCase() === text.toLowerCase())) return;
        updateOption(i, { values: [...option.values, { value: text, ...(option.kind === 'color' && { hex: '#CBB79A' }) }] });
        setDraft({ ...draft, [i]: '' });
    };

    const totalStock = useMemo(() => variants.filter(v => v.active !== false)
        .reduce((n, v) => n + (Number(v.Stock) || 0), 0), [variants]);

    const setVariant = (i, patch) => onChange({ options, variants: variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });

    if (!options.length) {
        return (
            <div className='border border-dashed border-line p-5'>
                <p className='font-sans text-sm text-ink'>Sizes, colours or other options</p>
                <p className='mt-1 font-sans text-xs text-ink-faint'>
                    Add options if customers choose between versions of this product. Each combination gets its own stock.
                </p>
                <div className='mt-4 flex flex-wrap gap-3'>
                    {template.length > 0 && (
                        <button type='button' className='btn-solid' onClick={() => setOptions(template.map(o => ({ ...o, values: [...o.values] })))}>
                            Use {template.map(o => o.name).join(' + ')}
                        </button>
                    )}
                    <button type='button' className='btn-outline' onClick={() => setOptions([{ name: '', kind: 'text', values: [] }])}>
                        Add an option
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className='border border-line p-5'>
            <div className='flex items-baseline justify-between gap-3'>
                <p className='font-sans text-sm text-ink'>Options</p>
                <button type='button' onClick={() => onChange({ options: [], variants: [] })} className='font-sans text-xs text-ink-faint hover:text-danger'>
                    Remove all options
                </button>
            </div>

            <div className='mt-4 space-y-5'>
                {options.map((option, i) => (
                    <div key={i} className='space-y-3 border-b border-line pb-5 last:border-b-0 last:pb-0'>
                        <div className='grid grid-cols-[1fr_120px_auto] gap-2'>
                            <input className={input} placeholder='Option name, e.g. Size' value={option.name}
                                onChange={e => updateOption(i, { name: e.target.value })} />
                            <select className={input} value={option.kind} onChange={e => updateOption(i, { kind: e.target.value })}>
                                <option value='size'>Size</option>
                                <option value='color'>Colour</option>
                                <option value='text'>Other</option>
                            </select>
                            <button type='button' aria-label={`Remove option ${option.name}`} className='px-2 text-ink-faint hover:text-danger'
                                onClick={() => setOptions(options.filter((_, j) => j !== i))}>✕</button>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                            {option.values.map((v, k) => (
                                <span key={v.value} className='inline-flex items-center gap-2 border border-line bg-surface-2 px-2 py-1 font-sans text-sm text-ink'>
                                    {option.kind === 'color' && (
                                        <input type='color' aria-label={`${v.value} colour`} value={v.hex || '#CBB79A'}
                                            onChange={e => updateOption(i, { values: option.values.map((x, m) => (m === k ? { ...x, hex: e.target.value } : x)) })}
                                            className='h-5 w-5 cursor-pointer border-0 bg-transparent p-0' />
                                    )}
                                    {v.value}
                                    <button type='button' aria-label={`Remove ${v.value}`} className='text-ink-faint hover:text-danger'
                                        onClick={() => updateOption(i, { values: option.values.filter((_, m) => m !== k) })}>×</button>
                                </span>
                            ))}
                            <input className={`${field} w-40`} placeholder='Add value ↵' value={draft[i] || ''}
                                onChange={e => setDraft({ ...draft, [i]: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addValue(i); } }}
                                onBlur={() => addValue(i)} />
                        </div>
                    </div>
                ))}
            </div>
            {options.length < 3 && (
                <button type='button' className='mt-4 font-sans text-sm text-brass hover:underline'
                    onClick={() => setOptions([...options, { name: '', kind: 'text', values: [] }])}>
                    + Add another option
                </button>
            )}

            {variants.length > 0 && (
                <div className='mt-6'>
                    <div className='flex flex-wrap items-end justify-between gap-3'>
                        <p className='font-sans text-sm text-ink'>
                            {variants.length} variant{variants.length === 1 ? '' : 's'} · {totalStock} in stock
                        </p>
                        <div className='flex items-center gap-2'>
                            <input className={`${field} w-24`} type='number' min='0' placeholder='Stock' value={bulkStock}
                                onChange={e => setBulkStock(e.target.value)} />
                            <button type='button' className='btn-outline !px-3 !py-2'
                                onClick={() => bulkStock !== '' && onChange({ options, variants: variants.map(v => ({ ...v, Stock: Number(bulkStock) })) })}>
                                Set all
                            </button>
                        </div>
                    </div>
                    <div className='mt-3 max-h-96 overflow-auto border border-line'>
                        <table className='w-full font-sans text-sm'>
                            <thead className='sticky top-0 bg-surface text-left text-xs text-ink-faint'>
                                <tr>
                                    <th className='px-3 py-2 font-normal'>Variant</th>
                                    <th className='px-3 py-2 font-normal'>Stock</th>
                                    <th className='px-3 py-2 font-normal'>Price (blank = base)</th>
                                    <th className='px-3 py-2 font-normal'>SKU</th>
                                    <th className='px-3 py-2 font-normal'>On sale</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-line'>
                                {variants.map((v, i) => (
                                    <tr key={comboKey(options, v.options)} className={v.active === false ? 'opacity-50' : ''}>
                                        <td className='whitespace-nowrap px-3 py-2 text-ink'>{Object.values(v.options).join(' / ')}</td>
                                        <td className='px-3 py-2'><input className={`${field} w-20`} type='number' min='0' value={v.Stock}
                                            onChange={e => setVariant(i, { Stock: e.target.value === '' ? '' : Number(e.target.value) })} /></td>
                                        <td className='px-3 py-2'><input className={`${field} w-28`} type='number' min='1' value={v.price ?? ''}
                                            onChange={e => setVariant(i, { price: e.target.value })} /></td>
                                        <td className='px-3 py-2'><input className={`${field} w-32`} value={v.sku || ''}
                                            onChange={e => setVariant(i, { sku: e.target.value })} /></td>
                                        <td className='px-3 py-2 text-center'><input type='checkbox' className='accent-[#A07C4B]' checked={v.active !== false}
                                            onChange={e => setVariant(i, { active: e.target.checked })} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

/** Values to put in the multipart form. */
export const variantFormFields = ({ options, variants }) => ({
    options: JSON.stringify(options.filter(o => o.name.trim() && o.values.length)),
    variants: JSON.stringify(variants.map(v => ({ ...v, Stock: Number(v.Stock) || 0 }))),
});

export const variantTotalStock = variants => variants.filter(v => v.active !== false)
    .reduce((n, v) => n + (Number(v.Stock) || 0), 0);

export default VariantEditor;
