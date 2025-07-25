import pandas as pd
import pickle

# --- 1. Load All Pre-Trained Models ---
print("⚙️ Loading pre-trained recommendation models...")

try:
    # Load Content-Based Model files
    content_sim_matrix = pickle.load(open('content_similarity.pkl', 'rb'))
    content_products_df = pickle.load(open('content_products.pkl', 'rb'))

    # Load Collaborative Filtering Model files
    cf_sim_matrix = pickle.load(open('cf_similarity.pkl', 'rb'))
    cf_product_map = pickle.load(open('cf_product_map.pkl', 'rb'))
except FileNotFoundError as e:
    print(f"❌ Error: Model file not found. Make sure '{e.filename}' exists.")
    print("Please run the training scripts first to generate the .pkl files.")
    exit()

print("✅ Models loaded successfully.")


# --- 2. Define All Recommendation Functions ---

def get_content_recommendations(product_id, top_n=5):
    """Gets recommendations based on product content similarity."""
    if product_id not in content_products_df['product_id'].values:
        print(f"⚠️ Content-Based: Product ID '{product_id}' not found.")
        return []
    
    # Get the index of the product that matches the ID
    idx = content_products_df.index[content_products_df['product_id'] == product_id].tolist()[0]
    
    # Get the pairwise similarity scores of all products with that product
    sim_scores = list(enumerate(content_sim_matrix[idx]))
    
    # Sort the products based on the similarity scores
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    
    # Get the scores of the top_n most similar products (excluding itself)
    sim_scores = sim_scores[1:top_n+1]
    
    # Get the product indices
    product_indices = [i[0] for i in sim_scores]
    
    # Return the top_n most similar product IDs
    return content_products_df['product_id'].iloc[product_indices].tolist()


def get_collaborative_recommendations(product_id, top_n=5):
    """Gets recommendations based on user rating similarity (item-based CF)."""
    if product_id not in cf_product_map.index:
        # This is the "cold start" problem
        return []

    # Get the internal index of the product
    product_idx = cf_product_map[product_id]
    
    # Get similarity scores
    sim_scores = list(enumerate(cf_sim_matrix[product_idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    sim_scores = sim_scores[1:top_n+1]
    
    # Get product indices and convert back to product IDs
    product_indices = [i[0] for i in sim_scores]
    recommended_ids = cf_product_map.iloc[product_indices].index.tolist()
    
    return recommended_ids


def get_hybrid_recommendations(product_id, top_n=5):
    """
    Generates hybrid recommendations, falling back to content-based
    if collaborative filtering fails due to a cold start.
    """
    print(f"\n-> Getting hybrid recommendations for: {product_id}")
    
    # 1. Try Collaborative Filtering first
    cf_recs = get_collaborative_recommendations(product_id, top_n)
    
    if cf_recs:
        print("✅ Found recommendations using Collaborative Filtering.")
        return cf_recs
    else:
        # 2. If CF fails, fall back to Content-Based Filtering
        print("⚠️ CF failed (cold start). Falling back to Content-Based Filtering.")
        content_recs = get_content_recommendations(product_id, top_n)
        if content_recs:
             print("✅ Found recommendations using Content-Based Filtering.")
        else:
             print(f"❌ No recommendations found for '{product_id}' from any model.")
        return content_recs


# --- 3. Example Usage ---
if __name__ == '__main__':
    # --- Test Case 1: A product with ratings (should use CF) ---
    # Pick a product ID that you know has ratings in reviews.csv
    # For this example, we'll use a common one from the generator script.
    # Replace 'ELEC_001' with a real ID from your data.
    test_id_with_ratings = 'ELEC_001' 
    recommendations1 = get_hybrid_recommendations(test_id_with_ratings, top_n=5)
    print("Final Recommendations:", recommendations1)
    
    print("\n" + "="*50 + "\n")

    # --- Test Case 2: A product without ratings (should use Content-Based) ---
    # Pick a product ID that you know exists but has no ratings.
    # Replace 'BOOK_003' with a real ID from your data that fits this case.
    test_id_without_ratings = 'BOOK_003'
    recommendations2 = get_hybrid_recommendations(test_id_without_ratings, top_n=5)
    print("Final Recommendations:", recommendations2)