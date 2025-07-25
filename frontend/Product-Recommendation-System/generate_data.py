# generate_data.py

import pandas as pd
import numpy as np
from tqdm import tqdm

# --- Configuration ---
# You can change these values to generate a dataset of any size.
NUM_USERS = 200000       # Set the number of users (2 lakhs)
NUM_PRODUCTS = 5000      # Total number of unique products
NUM_RATINGS = 5000000    # 5 million ratings (approx. 25 ratings per user)
FILE_NAME = "ratings_large.csv"

print(f"Generating a dataset with {NUM_USERS} users, {NUM_PRODUCTS} products, and {NUM_RATINGS} ratings...")

# Generate unique user and product IDs
user_ids = np.arange(1, NUM_USERS + 1)
product_ids = np.arange(1001, 1001 + NUM_PRODUCTS)

# --- Generate Data efficiently ---
# Create arrays for each column
# This is much faster than appending to a list in a loop for large datasets.
print("Step 1/4: Generating random user IDs...")
users_col = np.random.choice(user_ids, size=NUM_RATINGS, replace=True)

print("Step 2/4: Generating random product IDs...")
products_col = np.random.choice(product_ids, size=NUM_RATINGS, replace=True)

print("Step 3/4: Generating random ratings...")
ratings_col = np.random.randint(1, 6, size=NUM_RATINGS) # Ratings from 1 to 5

# --- Create and Clean DataFrame ---
print("Step 4/4: Assembling and cleaning the data...")
df = pd.DataFrame({
    'user_id': users_col,
    'product_id': products_col,
    'rating': ratings_col
})

# Remove duplicate user-product pairs, as a user typically rates a product only once.
df.drop_duplicates(subset=['user_id', 'product_id'], inplace=True)

# --- Save to CSV ---
print(f"Saving the dataset to '{FILE_NAME}'...")
df.to_csv(FILE_NAME, index=False)

print("\nDataset generation complete!")
print(f"File '{FILE_NAME}' created with {len(df)} unique ratings.")