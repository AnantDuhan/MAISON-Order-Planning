/**
 * A small, table-driven state machine for documents with a status field.
 *
 * Each lifecycle (order, return, refund) is declared once as data: its
 * states, which states each one may move to, who may make that move, an
 * optional guard, and what changes on entering a state (timestamps and the
 * like). This is the State pattern's intent, with states as plain objects
 * instead of a class per state: a Mongoose document is reloaded on every
 * request, so its state is a string, and the table is the single source of
 * truth for what may happen next.
 *
 * Side effects that are async or touch other documents (emails, stock,
 * invoices, sockets) do not live here; services call `transition` and then
 * do their work, so the rules stay pure and easy to test.
 *
 *   const refund = defineLifecycle({
 *       name: 'refund', field: 'status', initial: 'Initiated',
 *       states: {
 *           Initiated: { to: { Refunded: { by: ['admin'] } } },
 *           Refunded: { terminal: true, enter: (doc, { at }) => { doc.completedAt = at; } },
 *       },
 *   });
 *   refund.transition(doc, 'Refunded', { by: 'admin' });  // or throws TransitionError
 */

class TransitionError extends Error {
    /**
     * @param {string} message  safe to show to the person who asked
     * @param {{lifecycle: string, from: string, to: string, code: string}} details
     */
    constructor(message, { lifecycle, from, to, code, statusCode = 409 }) {
        super(message);
        this.name = 'TransitionError';
        this.statusCode = statusCode;
        this.lifecycle = lifecycle;
        this.from = from;
        this.to = to;
        this.code = code;
    }
}

const ACTORS = ['admin', 'customer', 'system'];

/**
 * @param {object} spec
 * @param {string} spec.name     used in messages ("order", "return", "refund")
 * @param {string} spec.field    the document's status field
 * @param {string} spec.initial  status of a new document
 * @param {Object<string, {terminal?: boolean, label?: string,
 *     enter?: (doc, ctx) => void,
 *     to?: Object<string, {by: string[], guard?: (doc, ctx) => (string|null|undefined)}>}>} spec.states
 */
const defineLifecycle = ({ name, field, initial, states }) => {
    if (!states[initial]) throw new Error(`${name} lifecycle: initial state "${initial}" is not declared`);
    for (const [state, def] of Object.entries(states)) {
        for (const [target, edge] of Object.entries(def.to || {})) {
            if (!states[target]) throw new Error(`${name} lifecycle: ${state} → ${target}, but ${target} is not declared`);
            if (!Array.isArray(edge.by) || !edge.by.length || edge.by.some(a => !ACTORS.includes(a))) {
                throw new Error(`${name} lifecycle: ${state} → ${target} needs "by" from ${ACTORS.join(', ')}`);
            }
        }
        if (def.terminal && Object.keys(def.to || {}).length) {
            throw new Error(`${name} lifecycle: terminal state ${state} cannot have exits`);
        }
    }

    const current = doc => doc?.[field] || initial;
    const label = state => states[state]?.label || state;

    /** Why `doc` can't move to `to` (as `ctx.by`), or null when it can. */
    const reasonAgainst = (doc, to, ctx = {}) => {
        const from = current(doc);
        const fromDef = states[from];
        if (!states[to]) {
            return { code: 'UNKNOWN_STATE', statusCode: 400, message: `"${to}" is not a ${name} status` };
        }
        if (!fromDef) {
            return { code: 'UNKNOWN_CURRENT_STATE', message: `This ${name} is in an unrecognised status (${from}) and can't be changed here` };
        }
        if (fromDef.terminal) {
            return { code: 'TERMINAL', message: `This ${name} is ${label(from).toLowerCase()} and can't be changed` };
        }
        const edge = fromDef.to?.[to];
        if (!edge) {
            return { code: 'NOT_ALLOWED', message: `A ${name} can't go from ${label(from)} to ${label(to)}` };
        }
        if (!edge.by.includes(ctx.by || 'system')) {
            return { code: 'NOT_PERMITTED', statusCode: 403, message: `${label(to)} is set automatically, not by hand` };
        }
        const blocked = edge.guard?.(doc, ctx);
        if (blocked) return { code: 'GUARD', message: blocked };
        return null;
    };

    const lifecycle = {
        name,
        field,
        initial,
        states: Object.keys(states),
        label,
        current,
        isTerminal: state => Boolean(states[state]?.terminal),

        /** Statuses `by` may move a document in `state` to (guards not applied). */
        next: (state, { by = 'admin' } = {}) =>
            Object.entries(states[state]?.to || {})
                .filter(([, edge]) => edge.by.includes(by))
                .map(([target]) => target),

        /** Statuses this document may move to now, guards applied. */
        nextFor: (doc, ctx = {}) =>
            Object.keys(states[current(doc)]?.to || {}).filter(to => !reasonAgainst(doc, to, ctx)),

        can: (doc, to, ctx = {}) => !reasonAgainst(doc, to, ctx),

        /** @throws {TransitionError} */
        assertCan: (doc, to, ctx = {}) => {
            const reason = reasonAgainst(doc, to, ctx);
            if (reason) throw new TransitionError(reason.message, { lifecycle: name, from: current(doc), to, ...reason });
        },

        /**
         * Move `doc` to `to`: check the table, set the field, run the target
         * state's `enter`. Asking for the state it is already in is a no-op
         * (changed: false), so retries and double clicks are harmless.
         * Does not save.
         * @returns {{from: string, to: string, changed: boolean}}
         * @throws {TransitionError}
         */
        transition: (doc, to, ctx = {}) => {
            const from = current(doc);
            if (from === to && states[to]) return { from, to, changed: false };
            lifecycle.assertCan(doc, to, ctx);
            const at = ctx.at instanceof Date ? ctx.at : new Date();
            doc[field] = to;
            states[to].enter?.(doc, { ...ctx, from, at });
            return { from, to, changed: true };
        },

        /** The table as plain data, for docs, admin screens and tests. */
        describe: () => Object.fromEntries(Object.entries(states).map(([state, def]) => [state, {
            terminal: Boolean(def.terminal),
            to: Object.fromEntries(Object.entries(def.to || {}).map(([target, edge]) => [target, [...edge.by]])),
        }])),
    };
    return lifecycle;
};

module.exports = { defineLifecycle, TransitionError };
