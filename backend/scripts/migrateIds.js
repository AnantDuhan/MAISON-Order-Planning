/**
 * Re-key documents from the old Snowflake ids (19-digit numeric strings) to
 * the new 8-character short ids produced by utils/generateId.
 *
 * `_id` is immutable in MongoDB, so a re-key is: insert a clone under the new
 * id, repoint every reference across every collection to the new id, then
 * delete the original. References are repointed *between* the insert and the
 * delete, so at no point do they dangle — they resolve to the old doc before
 * the switch and the new doc after it.
 *
 * ORDER (parents before the things that point at them):
 *   users -> products -> orders -> returns -> refunds -> reorders -> plusmemberships
 *
 * Collection names are read from the Mongoose models themselves, not hard
 * coded, so they always match what the running app reads/writes. (Note: the
 * plusMembership model registers as 'Subscription', so its collection is
 * `subscriptions`.)
 *
 * SAFE BY DEFAULT: a bare run is a DRY RUN and writes nothing. It reports how
 * many documents would be re-keyed and how many references would move.
 * Re-runnable: documents whose _id already has the new short-id shape are
 * skipped, so a second --apply is a no-op.
 *
 * USAGE
 *   node backend/scripts/migrateIds.js            # dry run — reports only
 *   node backend/scripts/migrateIds.js --apply    # performs the migration
 *
 * Take a database backup before --apply.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../config/config.env') });

const generateId = require('../utils/generateId');
const { ALPHABET, LENGTH } = generateId;

const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');
const Return = require('../models/return');
const Refund = require('../models/refund');
const Reorder = require('../models/reorder');
const PlusMembership = require('../models/plusMembership');
const Review = require('../models/review');

const APPLY = process.argv.includes('--apply');

// Resolve real collection names from the models.
const C = {
    users: User.collection.collectionName,
    products: Product.collection.collectionName,
    orders: Order.collection.collectionName,
    returns: Return.collection.collectionName,
    refunds: Refund.collection.collectionName,
    reorders: Reorder.collection.collectionName,
    plusmemberships: PlusMembership.collection.collectionName,
    reviews: Review.collection.collectionName,
};

/**
 * Which fields, in which collections, hold a reference to each target
 * collection's _id. Each entry names the collection to update, the field, and
 * the reference shape:
 *   'scalar'      — top-level string field equals the id
 *   'array-scalar'— array of strings, one element equals the id
 *   'array-elem'  — array of subdocuments, subdoc.<sub> equals the id
 *
 * Migration order is the key order below.
 */
const PLAN = [
    {
        target: C.users,
        refs: [
            { coll: C.products, field: 'user', kind: 'scalar' },
            { coll: C.products, field: 'reviews', sub: 'user', kind: 'array-elem' },
            { coll: C.orders, field: 'user', kind: 'scalar' },
            { coll: C.reviews, field: 'user', kind: 'scalar' },
            { coll: C.plusmemberships, field: 'user', kind: 'scalar' },
        ],
    },
    {
        target: C.products,
        refs: [
            { coll: C.orders, field: 'orderItems', sub: 'product', kind: 'array-elem' },
            { coll: C.returns, field: 'products', sub: 'product', kind: 'array-elem' },
            { coll: C.reviews, field: 'product', kind: 'scalar' },
            { coll: C.users, field: 'wishlist', sub: 'product', kind: 'array-elem' },
        ],
    },
    {
        target: C.orders,
        refs: [
            { coll: C.returns, field: 'order', kind: 'scalar' },
            { coll: C.refunds, field: 'order', kind: 'scalar' },
            { coll: C.reorders, field: 'originalOrder', kind: 'scalar' },
        ],
    },
    {
        target: C.returns,
        refs: [{ coll: C.orders, field: 'return', kind: 'array-scalar' }],
    },
    {
        target: C.refunds,
        refs: [{ coll: C.orders, field: 'refund', kind: 'array-scalar' }],
    },
    { target: C.reorders, refs: [] },
    { target: C.plusmemberships, refs: [] },
];

const looksMigrated = id =>
    typeof id === 'string' &&
    id.length === LENGTH &&
    [...id].every(ch => ALPHABET.includes(ch));

const run = async () => {
    const uri = process.env.DB_HOSTED_URI;
    if (!uri) {
        console.error('No DB_URI / DB_HOSTED_URI found in env. Aborting.');
        process.exit(1);
    }

    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    console.log(`Connected. Mode: ${APPLY ? 'APPLY (will write)' : 'DRY RUN (read only)'}\n`);

    // Track ids handed out this run so two docs can never collide.
    const issued = new Set();

    const freshId = async collection => {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const candidate = generateId();
            if (issued.has(candidate)) continue;
            const clash = await collection.findOne({ _id: candidate }, { projection: { _id: 1 } });
            if (!clash) {
                issued.add(candidate);
                return candidate;
            }
        }
    };

    const uniqueFields = async collection => {
        const indexes = await collection.listIndexes().toArray();
        return [
            ...new Set(
                indexes
                    .filter(index => index.unique && index.name !== '_id_')
                    .flatMap(index => Object.keys(index.key))
            ),
        ];
    };

    const temporaryValue = (value, newId, field) => {
        if (typeof value === 'number') return Date.now() + issued.size + 1;
        if (typeof value === 'string') return `__migration_${field}_${newId}`;
        if (value instanceof Date) return new Date(0);
        return `__migration_${field}_${newId}`;
    };

    const countRef = async ({ coll, field, sub, kind }, oldId) => {
        const c = db.collection(coll);
        if (kind === 'array-elem') return c.countDocuments({ [`${field}.${sub}`]: oldId });
        return c.countDocuments({ [field]: oldId });
    };

    const applyRef = async ({ coll, field, sub, kind }, oldId, newId) => {
        const c = db.collection(coll);
        if (kind === 'scalar') {
            const r = await c.updateMany({ [field]: oldId }, { $set: { [field]: newId } });
            return r.modifiedCount;
        }
        if (kind === 'array-scalar') {
            const r = await c.updateMany(
                { [field]: oldId },
                { $set: { [`${field}.$[el]`]: newId } },
                { arrayFilters: [{ el: oldId }] }
            );
            return r.modifiedCount;
        }
        // array-elem
        const r = await c.updateMany(
            { [`${field}.${sub}`]: oldId },
            { $set: { [`${field}.$[e].${sub}`]: newId } },
            { arrayFilters: [{ [`e.${sub}`]: oldId }] }
        );
        return r.modifiedCount;
    };

    let totalDocs = 0;
    let totalRefs = 0;

    for (const { target, refs } of PLAN) {
        const coll = db.collection(target);
        const docs = await coll.find({}, { projection: { _id: 1 } }).toArray();

        const toMigrate = docs.filter(d => !looksMigrated(d._id));
        const skipped = docs.length - toMigrate.length;

        console.log(
            `${target}: ${docs.length} doc(s), ${toMigrate.length} to re-key` +
            (skipped ? `, ${skipped} already short-id (skipped)` : '')
        );

        for (const { _id: oldId } of toMigrate) {
            totalDocs += 1;

            if (!APPLY) {
                // Report reference impact without writing.
                let refCount = 0;
                for (const ref of refs) refCount += await countRef(ref, oldId);
                totalRefs += refCount;
                if (refCount) {
                    const parts = [];
                    for (const ref of refs) {
                        const n = await countRef(ref, oldId);
                        if (n) parts.push(`${ref.coll}.${ref.field}${ref.sub ? '.' + ref.sub : ''}=${n}`);
                    }
                    console.log(`  ${oldId} -> (new)   refs: ${parts.join(', ')}`);
                }
                continue;
            }

            const newId = await freshId(coll);
            const original = await coll.findOne({ _id: oldId });
            const fields = await uniqueFields(coll);
            const temporary = {};
            for (const field of fields) {
                temporary[field] = temporaryValue(original[field], newId, field);
            }

            try {
                // Unique indexes require the old document's values to be free
                // before the clone can be inserted.
                await coll.updateOne({ _id: oldId }, { $set: temporary });

                // 1. insert clone under the new id
                await coll.insertOne({ ...original, _id: newId });

                // 2. repoint every reference old -> new (refs now resolve to the clone)
                let moved = 0;
                for (const ref of refs) moved += await applyRef(ref, oldId, newId);
                totalRefs += moved;

                // 3. delete the original
                await coll.deleteOne({ _id: oldId });

                console.log(`  ${oldId} -> ${newId}   (${moved} ref(s) moved)`);
            } catch (error) {
                const restore = Object.fromEntries(
                    Object.keys(temporary)
                        .filter(field => original[field] !== undefined)
                        .map(field => [field, original[field]])
                );
                const unset = Object.fromEntries(
                    Object.keys(temporary)
                        .filter(field => original[field] === undefined)
                        .map(field => [field, ''])
                );
                const update = {};
                if (Object.keys(restore).length) update.$set = restore;
                if (Object.keys(unset).length) update.$unset = unset;
                if (Object.keys(update).length) {
                    await coll.updateOne({ _id: oldId }, update);
                }
                throw error;
            }
        }
    }

    console.log('');
    if (APPLY) {
        console.log(`Migration complete. ${totalDocs} document(s) re-keyed, ${totalRefs} reference(s) moved.`);
    } else {
        console.log(
            `${totalDocs} document(s) would be re-keyed, ${totalRefs} reference(s) would move.\n` +
            'Re-run with --apply to perform the migration (back up first).'
        );
    }

    await mongoose.disconnect();
};

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
