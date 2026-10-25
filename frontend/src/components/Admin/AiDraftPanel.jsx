import React, { useState } from 'react';
import axios from 'axios';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import ButtonSpinner from '../layout/ButtonSpinner';
import { useFeature } from '../../context/FeatureFlagsContext';

/**
 * "Draft with AI" for the new-product form. Sends the chosen photos (and any
 * notes) to the server, shows the suggestion, and only changes the form when
 * the admin clicks Use. Nothing is saved here.
 */
const AiDraftPanel = ({ images, category, onApply, onApplyColours }) => {
    const enabled = useFeature('aiProductDrafts');
    const [notes, setNotes] = useState('');
    const [draft, setDraft] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!enabled) return null;

    const run = async () => {
        setLoading(true);
        setError('');
        try {
            const form = new FormData();
            images.slice(0, 4).forEach(image => form.append('photos', image));
            if (category) form.set('category', category);
            if (notes.trim()) form.set('notes', notes.trim());
            const { data } = await axios.post('/api/v1/admin/ai/product-draft', form);
            setDraft(data.draft);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not draft this listing');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='border border-dashed border-brass/60 p-5'>
            <div className='flex items-center gap-2'>
                <AutoAwesomeIcon fontSize='small' className='text-brass' />
                <p className='font-sans text-sm text-ink'>Draft with AI</p>
            </div>
            <p className='mt-1 font-sans text-xs text-ink-faint'>
                Writes a name, description, SEO text and colours from the first four photos. You review everything before it’s saved.
            </p>

            <textarea
                rows='2'
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={600}
                placeholder='Facts the photos can’t show (optional): material, fit, dimensions…'
                className='mt-4 w-full resize-none border border-line bg-transparent p-3 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none'
            />

            <button type='button' className='btn-outline mt-3' disabled={loading || !images.length} onClick={run}>
                {loading ? (<><ButtonSpinner /> Drafting…</>) : !images.length ? 'Choose photos first' : draft ? 'Draft again' : 'Draft with AI'}
            </button>
            {error && <p className='mt-3 font-sans text-xs text-danger'>{error}</p>}

            {draft && (
                <div className='mt-5 space-y-3 border-t border-line pt-5 font-sans text-sm'>
                    <p className='font-serif text-lg text-ink'>{draft.name}</p>
                    {draft.category && <p className='text-xs text-ink-faint'>Category: {draft.category}</p>}
                    <div className='space-y-2 whitespace-pre-line text-ink-soft'>{draft.description}</div>
                    <div className='border border-line p-3 text-xs'>
                        <p className='text-ink-faint'>Search result preview</p>
                        <p className='mt-1 text-brass'>{draft.metaTitle}</p>
                        <p className='mt-1 text-ink-soft'>{draft.metaDescription}</p>
                    </div>
                    {draft.uncertain.length > 0 && (
                        <div className='text-xs text-ink-soft'>
                            <p className='text-ink'>Check before publishing</p>
                            <ul className='mt-1 list-disc pl-5'>
                                {draft.uncertain.map(item => <li key={item}>{item}</li>)}
                            </ul>
                        </div>
                    )}
                    <div className='flex flex-wrap gap-3 pt-2'>
                        <button type='button' className='btn-solid' onClick={() => onApply(draft)}>
                            Use text
                        </button>
                        {draft.colours.length > 0 && (
                            <button type='button' className='btn-outline' onClick={() => onApplyColours(draft.colours)}>
                                <span className='mr-2 inline-flex gap-1'>
                                    {draft.colours.map(c => (
                                        <span key={c.value} className='inline-block h-3 w-3 border border-line' style={{ background: c.hex || '#CBB79A' }} />
                                    ))}
                                </span>
                                Use colours: {draft.colours.map(c => c.value).join(', ')}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiDraftPanel;
