/**
 * Migration: numeric reference fields -> strings
 *
 * WHY
 * ---
 * Every model declares `_id: String`, but several reference fields were
 * declared `type: Number`. Mongoose therefore cast those refs to numbers on
 * write while the documents they point at have string _ids. The *values* are
 * intact (Snowflake ids fit inside Number.MAX_SAFE_INTEGER and round-trip
 * exactly), but MongoDB compares BSON types strictly, so any $lookup or
 * populate() across them silently matches nothing.
 *
 * The schemas are now fixed, which makes new writes correct. This script
 * repairs documents written before that change.
 *
 * USAGE
 * -----
 *   node backend/scripts/fixRefTypes.js            # dry run — reports only
 *   node backend/scripts/fixRefTypes.js --apply    # performs the update
 *
 * The dry run touches nothing. Take a database backup before --apply.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../config/config.env') });
dotenv.config({ path: path.join(__dirname, '../config/.env') });

const APPLY = process.argv.includes('--apply');

// collection -> dotted paths that should hold string ids
const TARGETS = [
    { collection: 'orders', fields: ['user', 'orderItems.product'] },
    { collection: 'products', fields: ['user', 'reviews.user'] },
    { collection: 'refunds', fields: ['order'] },
    { collection: 'returns', fields: ['order', 'products.product'] },
    { collection: 'reorders', fields: ['originalOrder'] },
    { collection: 'plusmemberships', fields: ['user'] },
];

const run = async () => {
    const uri = process.env.DB_URI || process.env.DB_HOSTED_URI;
    if (!uri) {
        console.error('No DB_URI / DB_HOSTED_URI found in env. Aborting.');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log(`Connected. Mode: ${APPLY ? 'APPLY (will write)' : 'DRY RUN (read only)'}\n`);

    let grandTotal = 0;

    for (const { collection, fields } of TARGETS) {
        const coll = mongoose.connection.db.collection(collection);

        const exists = await coll.countDocuments({}, { limit: 1 });
        if (!exists) {
            console.log(`${collection}: empty or absent, skipped`);
            continue;
        }

        for (const field of fields) {
            const isNested = field.includes('.');
            const numericFilter = { [field]: { $type: 'number' } };
            const affected = await coll.countDocuments(numericFilter);

            if (!affected) {
                console.log(`${collection}.${field}: already string ✓`);
                continue;
            }

            grandTotal += affected;
            console.log(
                `${collection}.${field}: ${affected} document(s) hold a numeric ref` +
                (APPLY ? ' — converting…' : '')
            );

            if (!APPLY) continue;

            if (!isNested) {
                // Simple top-level path: convert in one aggregation-pipeline update.
                await coll.updateMany(numericFilter, [
                    { $set: { [field]: { $toString: `$${field}` } } },
                ]);
            } else {
                // Array element path, e.g. orderItems.product — rebuild the array.
                const [arrayPath, subPath] = field.split('.');
                await coll.updateMany(numericFilter, [
                    {
                        $set: {
                            [arrayPath]: {
                                $map: {
                                    input: `$${arrayPath}`,
                                    as: 'el',
                                    in: {
                                        $mergeObjects: [
                                            '$$el',
                                            { [subPath]: { $toString: `$$el.${subPath}` } },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                ]);
            }

            const left = await coll.countDocuments(numericFilter);
            console.log(`  -> done, ${left} remaining`);
        }
    }

    console.log('');
    if (!grandTotal) {
        console.log('Nothing to migrate — every reference is already a string.');
    } else if (APPLY) {
        console.log(`Migration complete. ${grandTotal} document(s) examined and converted.`);
    } else {
        console.log(
            `${grandTotal} document(s) would be converted.\n` +
            'Re-run with --apply to perform the update (back up first).'
        );
    }

    await mongoose.disconnect();
};

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
