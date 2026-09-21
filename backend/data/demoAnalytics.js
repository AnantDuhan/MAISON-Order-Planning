const demoAnalytics = {
    summary: {
        revenue: 284750,
        orders: 126,
        units: 238,
        discountGiven: 18450,
        returned: 9,
        avgOrderValue: 2260.71,
        returnRate: 7.14
    },

    revenueSeries: [
        {
            period: '2026-01',
            revenue: 32400,
            orders: 14
        },
        {
            period: '2026-02',
            revenue: 38750,
            orders: 17
        },
        {
            period: '2026-03',
            revenue: 42100,
            orders: 19
        },
        {
            period: '2026-04',
            revenue: 46750,
            orders: 21
        },
        {
            period: '2026-05',
            revenue: 52950,
            orders: 25
        },
        {
            period: '2026-06',
            revenue: 71800,
            orders: 30
        }
    ],

    statusBreakdown: [
        {
            status: 'Delivered',
            count: 74
        },
        {
            status: 'Shipped',
            count: 27
        },
        {
            status: 'Processing',
            count: 18
        },
        {
            status: 'Cancelled',
            count: 7
        }
    ],

    topProducts: [
        {
            name: 'Classic Linen Shirt',
            revenue: 75600,
            units: 42
        },
        {
            name: 'Essential Cotton Trousers',
            revenue: 61250,
            units: 35
        },
        {
            name: 'Signature Overshirt',
            revenue: 53200,
            units: 28
        },
        {
            name: 'Premium Oxford Shirt',
            revenue: 43200,
            units: 24
        },
        {
            name: 'Relaxed Fit Chinos',
            revenue: 37800,
            units: 21
        }
    ],

    categoryRevenue: [
        {
            category: 'Shirts',
            revenue: 78200,
            units: 46
        },
        {
            category: 'Trousers',
            revenue: 69400,
            units: 38
        },
        {
            category: 'Overshirts',
            revenue: 53200,
            units: 28
        },
        {
            category: 'Outerwear',
            revenue: 41800,
            units: 19
        },
        {
            category: 'Accessories',
            revenue: 42150,
            units: 31
        }
    ],

    returnReasons: [
        {
            reason: 'Size / Fit',
            count: 4
        },
        {
            reason: 'Changed Mind',
            count: 2
        },
        {
            reason: 'Product Not as Expected',
            count: 1
        },
        {
            reason: 'Damaged',
            count: 1
        },
        {
            reason: 'Wrong Item',
            count: 1
        }
    ],

    couponUsage: [
        {
            code: 'WELCOME10',
            orders: 18,
            revenue: 42600,
            discount: 4720
        },
        {
            code: 'MAISON15',
            orders: 14,
            revenue: 38900,
            discount: 5850
        },
        {
            code: 'SUMMER10',
            orders: 11,
            revenue: 27450,
            discount: 3120
        },
        {
            code: 'FIRSTORDER',
            orders: 9,
            revenue: 19800,
            discount: 2180
        }
    ]
};

module.exports = demoAnalytics;