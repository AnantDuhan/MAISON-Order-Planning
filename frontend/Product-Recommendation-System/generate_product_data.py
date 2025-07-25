import pandas as pd
import random
import uuid

# --- Configuration ---
NUM_ROWS = 7000
OUTPUT_FILE = 'products.csv'

print(f"Generating {NUM_ROWS} random product entries...")

# --- Word Pools for Random Generation ---
CATEGORIES = ['Electronics', 'Home & Kitchen', 'Books', 'Clothing', 'Sports & Outdoors', 'Beauty', 'Toys & Games', 'Automotive', 'Health', 'Garden']

ADJECTIVES = ['Premium', 'Compact', 'Wireless', 'Heavy-Duty', 'Ergonomic', 'Smart', 'Eco-Friendly', 'Digital', 'Portable', 'Professional', 'Sleek', 'Durable', 'Lightweight', 'Advanced', 'Classic']

NOUNS = {
    'Electronics': ['Headphones', 'Speaker', 'Keyboard', 'Mouse', 'Monitor', 'Charger', 'Camera', 'Drone', 'Tablet', 'Router'],
    'Home & Kitchen': ['Blender', 'Coffee Maker', 'Vacuum', 'Lamp', 'Cookware Set', 'Organizer', 'Air Fryer', 'Toaster', 'Microwave'],
    'Books': ['Novel', 'Cookbook', 'Biography', 'Textbook', 'Guide', 'Journal', 'Thriller', 'Fantasy Series'],
    'Clothing': ['T-Shirt', 'Jacket', 'Jeans', 'Sneakers', 'Hat', 'Socks', 'Hoodie', 'Pants'],
    'Sports & Outdoors': ['Water Bottle', 'Tent', 'Backpack', 'Yoga Mat', 'Dumbbell', 'Bicycle', 'Hiking Boots', 'Fitness Tracker'],
    'Beauty': ['Moisturizer', 'Shampoo', 'Lipstick', 'Foundation', 'Serum', 'Face Wash', 'Sunscreen'],
    'Toys & Games': ['Board Game', 'Action Figure', 'Puzzle', 'Building Blocks', 'RC Car', 'Card Game'],
    'Automotive': ['Car Wax', 'Tire Inflator', 'Seat Cover', 'Dash Cam', 'Phone Mount', 'Air Freshener'],
    'Health': ['Vitamin C', 'Protein Powder', 'Electric Toothbrush', 'Pill Organizer', 'First-Aid Kit'],
    'Garden': ['Hose', 'Gardening Gloves', 'Pruning Shears', 'Planter Pot', 'Weed Killer']
}

DESCRIPTIVE_PHRASES = [
    'features the latest technology', 'is designed for modern life', 'is built to last with high-quality materials',
    'is perfect for both beginners and experts', 'offers unparalleled performance and reliability', 'is a must-have for every household',
    'combines elegant style and powerful functionality', 'is incredibly easy to use and maintain', 'is the ultimate solution for your daily needs',
    'provides excellent value for your money', 'is engineered for maximum efficiency'
]

# --- Generation Loop ---
products_list = []
for _ in range(NUM_ROWS):
    # Select a category and a corresponding noun for the product
    category = random.choice(CATEGORIES)
    noun = random.choice(NOUNS[category])
    
    # Create a random name and description
    adj = random.choice(ADJECTIVES)
    name = f"{adj} {noun}"
    
    # Combine two different phrases for a more varied description
    desc_phrase1 = random.choice(DESCRIPTIVE_PHRASES)
    desc_phrase2 = random.choice(DESCRIPTIVE_PHRASES)
    while desc_phrase1 == desc_phrase2: # Ensure phrases are not identical
        desc_phrase2 = random.choice(DESCRIPTIVE_PHRASES)
    description = f"This amazing {name.lower()} {desc_phrase1}. Furthermore, it {desc_phrase2}."
    
    # Generate a unique product ID using UUID
    product_id = f"PROD-{str(uuid.uuid4())[:8].upper()}"
    
    products_list.append({
        'product_id': product_id,
        'name': name,
        'description': description,
        'category': category
    })

# --- Introduce some missing data to test your script's .dropna() ---
for _ in range(int(NUM_ROWS * 0.01)): # Make 1% of rows have a missing value
    idx_to_null = random.randint(0, NUM_ROWS - 1)
    col_to_null = random.choice(['name', 'description', 'category'])
    products_list[idx_to_null][col_to_null] = None

# --- Create and Save DataFrame ---
products_df = pd.DataFrame(products_list)

# Shuffle the dataframe to ensure random distribution of products and nulls
products_df = products_df.sample(frac=1).reset_index(drop=True)

products_df.to_csv(OUTPUT_FILE, index=False)

print(f"✅ Success! Generated '{OUTPUT_FILE}' with {NUM_ROWS} rows.")
print("\nFile preview:")
print(products_df.head())