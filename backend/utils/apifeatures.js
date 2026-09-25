// Only these fields can be filtered on from the query string, and only with
// these comparison operators. Everything else in req.query is ignored, so a
// request can't filter on internal fields (isDemo, user, ...) or inject
// arbitrary MongoDB operators.
const FILTERABLE_FIELDS = {
    category: 'string',
    price: 'number',
    ratings: 'number',
};
const RANGE_OPERATORS = ['gt', 'gte', 'lt', 'lte'];

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class ApiFeatures {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr || {};
    }

    search() {
        const { keyword } = this.queryStr;
        if (typeof keyword === 'string' && keyword.trim()) {
            // Escaped + length-capped: user input is matched literally and
            // can't be used for catastrophic-backtracking regexes.
            this.query = this.query.find({
                name: { $regex: escapeRegex(keyword.trim().slice(0, 100)), $options: 'i' },
            });
        }
        return this;
    }

    filter() {
        const conditions = {};

        for (const [field, type] of Object.entries(FILTERABLE_FIELDS)) {
            const raw = this.queryStr[field];
            if (raw === undefined || raw === '') continue;

            if (type === 'string') {
                if (typeof raw === 'string') conditions[field] = raw;
                continue;
            }

            if (raw !== null && typeof raw === 'object') {
                const range = {};
                for (const op of RANGE_OPERATORS) {
                    const n = Number(raw[op]);
                    if (raw[op] !== undefined && Number.isFinite(n)) range[`$${op}`] = n;
                }
                if (Object.keys(range).length) conditions[field] = range;
            } else if (Number.isFinite(Number(raw))) {
                conditions[field] = Number(raw);
            }
        }

        this.query = this.query.find(conditions);
        return this;
    }

    pagination(resultPerPage) {
        const perPage = Number(resultPerPage) || 8;
        const currentPage = Math.max(1, Number(this.queryStr.page) || 1);

        this.query = this.query.limit(perPage).skip(perPage * (currentPage - 1));

        return this;
    }
}

module.exports = ApiFeatures;
