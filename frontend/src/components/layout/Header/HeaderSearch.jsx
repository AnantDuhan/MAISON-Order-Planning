import React, { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router';
import axios from 'axios';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

/**
 * Product search with suggestions as you type. Used in the desktop header
 * (a slim underlined field) and on phones (a full-width field under the logo).
 */
const HeaderSearch = ({ variant = 'desktop', placeholder = 'Search', onSearched }) => {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const debouncedKeyword = useDebounce(keyword, 300);

    useEffect(() => {
        const query = debouncedKeyword.trim();
        if (!query) {
            setSuggestions([]);
            setOpen(false);
            return undefined;
        }
        let active = true;
        axios.get(`/api/v1/products/autocomplete?query=${encodeURIComponent(query)}`)
            .then(({ data }) => {
                if (!active) return;
                setSuggestions(data.data || []);
                setOpen(true);
            })
            .catch(() => active && setSuggestions([]));
        return () => {
            active = false;
        };
    }, [debouncedKeyword]);

    const done = () => {
        setOpen(false);
        onSearched?.();
    };

    const submit = e => {
        e.preventDefault();
        if (!keyword.trim()) return;
        navigate(`/search?keyword=${encodeURIComponent(keyword.trim())}`);
        done();
    };

    const pick = suggestion => {
        setKeyword(suggestion.name);
        navigate(`/product/${suggestion.id}`);
        done();
    };

    const phone = variant === 'phone';

    return (
        <form role='search' className='relative' onSubmit={submit}>
            <label className={phone
                ? 'flex h-11 items-center gap-3 border border-line bg-surface px-4 focus-within:border-brass'
                : 'flex items-center gap-2 border-b border-line focus-within:border-brass'}
            >
                <FaSearch className='shrink-0 text-ink-faint' size={13} aria-hidden='true' />
                <span className='sr-only'>Search products</span>
                <input
                    type='search'
                    enterKeyHint='search'
                    placeholder={placeholder}
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    onFocus={() => suggestions.length && setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 200)}
                    className={phone
                        ? 'w-full min-w-0 bg-transparent font-sans text-[16px] text-ink placeholder:text-ink-faint focus:outline-none'
                        : 'w-28 bg-transparent py-2 font-sans text-sm text-ink placeholder:text-ink-faint transition-all duration-500 ease-luxe focus:w-44 focus:outline-none'}
                />
            </label>
            {open && suggestions.length > 0 && (
                <ul className={`absolute top-full z-50 mt-2 border border-line bg-surface py-2 shadow-luxe ${phone ? 'inset-x-0' : 'right-0 w-64'}`}>
                    {suggestions.map(s => (
                        <li
                            key={s.id}
                            onMouseDown={() => pick(s)}
                            className='cursor-pointer px-4 py-2.5 font-sans text-sm text-ink-soft transition-colors hover:bg-surface-2 hover:text-brass'
                        >
                            {s.name}
                        </li>
                    ))}
                </ul>
            )}
        </form>
    );
};

export default HeaderSearch;
