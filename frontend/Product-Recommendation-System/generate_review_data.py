import pandas as pd
import random
import numpy as np

# --- Configuration ---
NUM_ROWS = 5000
OUTPUT_FILE = 'reviews.csv'

print(f"Starting data generation for {NUM_ROWS} reviews...")

# --- Data for Generation ---
PRODUCT_CATALOG = {
    # Electronics: Products here share words like 'battery', 'screen', 'performance'
    'ELEC_001': {'name': 'Smartphone Alpha', 'keywords': ['screen', 'battery', 'camera', 'performance', 'apps', 'fast']},
    'ELEC_002': {'name': 'Laptop Pro', 'keywords': ['keyboard', 'trackpad', 'performance', 'screen', 'lightweight', 'battery']},
    'ELEC_003': {'name': 'Wireless Earbuds', 'keywords': ['sound', 'bass', 'noise cancelling', 'fit', 'case', 'battery']},
    'ELEC_004': {'name': 'Smartwatch Z', 'keywords': ['display', 'heart rate', 'apps', 'battery', 'steps', 'notifications']},
    'ELEC_005': {'name': '4K TV', 'keywords': ['picture quality', 'smart tv', 'remote', 'sound', 'hdr', 'size']},

    # Kitchen: Products here share words like 'easy to clean', 'powerful'
    'KIT_001': {'name': 'Espresso Machine', 'keywords': ['coffee', 'espresso', 'frother', 'brew', 'hot', 'easy to clean']},
    'KIT_002': {'name': 'Power Blender', 'keywords': ['smoothie', 'powerful', 'motor', 'blades', 'crushes ice', 'easy to clean']},
    'KIT_003': {'name': 'Air Fryer', 'keywords': ['crispy', 'healthy', 'basket size', 'fast', 'easy to clean', 'cooking']},
    'KIT_004': {'name': 'Stand Mixer', 'keywords': ['baking', 'dough', 'attachments', 'powerful', 'bowl', 'mixing']},

    # Books: Products here share words like 'plot', 'characters', 'story'
    'BOOK_001': {'name': 'The Galactic Drift', 'keywords': ['plot', 'characters', 'world-building', 'sci-fi', 'ending', 'story']},
    'BOOK_002': {'name': 'Shadows of the Past', 'keywords': ['suspense', 'twist', 'mystery', 'characters', 'gripping', 'plot']},
    'BOOK_003': {'name': 'Cooking for Beginners', 'keywords': ['recipes', 'easy', 'instructions', 'photos', 'ingredients', 'delicious']},

    # Home & Garden
    'HOME_001': {'name': 'LED Desk Lamp', 'keywords': ['bright', 'light', 'adjustable', 'design', 'sturdy', 'modes']},
    'HOME_002': {'name': 'Ergonomic Office Chair', 'keywords': ['comfort', 'support', 'wheels', 'adjustable', 'lumbar', 'assembly']},
    'HOME_003': {'name': 'Robot Vacuum', 'keywords': ['cleaning', 'suction', 'mapping', 'app', 'battery', 'quiet']},

    # Sports & Outdoors
    'SPORT_001': {'name': 'Yoga Mat Pro', 'keywords': ['grip', 'cushion', 'thick', 'non-slip', 'durable', 'lightweight']},
    'SPORT_002': {'name': '2-Person Tent', 'keywords': ['waterproof', 'setup', 'lightweight', 'space', 'zippers', 'durable']},
    'SPORT_003': {'name': 'Dumbbell Set', 'keywords': ['weights', 'grip', 'versatile', 'durable', 'storage', 'set']}
}

REVIEW_TEMPLATES = {
    'positive': [
        "Absolutely love the {name}! The {keyword} is fantastic.",
        "Excellent product. The {keyword} works perfectly and exceeded my expectations.",
        "Five stars! The {keyword} is top-notch and the quality is amazing.",
        "A great purchase. Very happy with the {keyword} and overall performance.",
        "The {name} is brilliant. I'm particularly impressed with its {keyword}."
    ],
    'neutral': [
        "It's an okay {name}. The {keyword} is decent for the price.",
        "Does the job. The {keyword} is as described, nothing more, nothing less.",
        "Not bad, not great. The {keyword} could be better, but it's acceptable.",
    ],
    'negative': [
        "Very disappointed with the {keyword}. It stopped working after a week.",
        "Would not recommend this {name}. The {keyword} is of poor quality.",
        "A terrible purchase. The {keyword} is flimsy and broke easily.",
        "Expected more from this {name}. The {keyword} was a real letdown."
    ]
}

product_ids = list(PRODUCT_CATALOG.keys())

# --- Generation Loop ---
all_reviews = []
for i in range(NUM_ROWS):
    # Choose a random product
    product_id = random.choice(product_ids)
    product_info = PRODUCT_CATALOG[product_id]

    # Generate a user ID and rating
    user_id = f"user_{random.randint(1000, 99999)}"
    # Skew ratings to be more realistic (mostly positive)
    rating = np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.05, 0.15, 0.4, 0.35])

    # Choose a template based on the rating
    if rating >= 4:
        template_type = 'positive'
    elif rating == 3:
        template_type = 'neutral'
    else:
        template_type = 'negative'

    # Select a random template and keyword to build the comment
    template = random.choice(REVIEW_TEMPLATES[template_type])
    keyword = random.choice(product_info['keywords'])
    comment = template.format(name=product_info['name'], keyword=keyword)

    # Add a small chance of a missing comment to test .dropna()
    if random.random() < 0.01: # 1% chance
        comment = None

    all_reviews.append({
        'product_id': product_id,
        'user_id': user_id,
        'rating': rating,
        'comment': comment
    })

# --- Create and Save DataFrame ---
reviews_df = pd.DataFrame(all_reviews)

# Shuffle the dataframe to make it look more natural
reviews_df = reviews_df.sample(frac=1).reset_index(drop=True)

reviews_df.to_csv(OUTPUT_FILE, index=False)

print(f"✅ Success! Generated '{OUTPUT_FILE}' with {len(reviews_df)} rows.")
print("\nFile preview:")
print(reviews_df.head())