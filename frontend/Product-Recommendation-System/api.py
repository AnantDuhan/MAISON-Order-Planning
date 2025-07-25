# api.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
import pickle
import pandas as pd

# Load environment variables
load_dotenv()

# --- Load All Models and Data ---
try:
    # 1. Collaborative Filtering Model
    with open('recommendation_model.pkl', 'rb') as f:
        collab_model = pickle.load(f)
    ratings_df = pd.read_csv('ratings.csv')
    all_product_ids_collab = ratings_df['product_id'].unique()

    # 2. Content-Based Model
    with open('content_similarity.pkl', 'rb') as f:
        content_sim_matrix = pickle.load(f)
    with open('content_products.pkl', 'rb') as f:
        content_df = pickle.load(f)

    # 3. Review-Based Model
    with open('review_similarity.pkl', 'rb') as f:
        review_sim_matrix = pickle.load(f)
    with open('review_products.pkl', 'rb') as f:
        review_df = pickle.load(f)

except FileNotFoundError as e:
    print(f"Error loading model files: {e}")
    print("Please ensure all .pkl and .csv files are in the same directory.")
    exit()

# --- Initialize Flask App ---
app = Flask(__name__)
cors_origin = os.getenv('CORS_ORIGIN', '*')
CORS(app, origins=[cors_origin])


# --- Helper Functions for Recommendations ---
def get_content_recommendations(product_id, top_n=5):
    try:
        idx = content_df.index[content_df['product_id'] == product_id].tolist()[0]
        sim_scores = list(enumerate(content_sim_matrix[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)[1:top_n+1]
        product_indices = [i[0] for i in sim_scores]
        return content_df['product_id'].iloc[product_indices].tolist()
    except IndexError:
        return []

def get_review_recommendations(product_id, top_n=5):
    try:
        idx = review_df.index[review_df['product_id'] == product_id].tolist()[0]
        sim_scores = list(enumerate(review_sim_matrix[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)[1:top_n+1]
        product_indices = [i[0] for i in sim_scores]
        return review_df['product_id'].iloc[product_indices].tolist()
    except IndexError:
        return []


# --- API Endpoints ---
@app.route('/recommend', methods=['GET'])
def get_collaborative_recommendations():
    # This endpoint remains for your collaborative filtering model
    product_id_str = request.args.get('product_id')
    # ... (existing collaborative filtering logic) ...
    return jsonify({"message": "Collaborative endpoint not fully shown for brevity"})


@app.route('/content-recommend', methods=['GET'])
def get_hybrid_content_recommendations():
    """
    Recommends products by combining content-based and review-based models.
    """
    product_id_str = request.args.get('product_id')

    if not product_id_str:
        return jsonify({"error": "product_id query parameter is required"}), 400

    try:
        product_id = int(product_id_str)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid product_id format"}), 400

    # Get recommendations from both models
    content_recs = get_content_recommendations(product_id, top_n=5)
    review_recs = get_review_recommendations(product_id, top_n=5)

    # Combine the results and remove duplicates
    combined_recs = list(dict.fromkeys(content_recs + review_recs))
    
    # Ensure the original product is not in the list
    final_recs = [rec for rec in combined_recs if rec != product_id]

    return jsonify({"recommendations": final_recs[:6]}) # Return up to 6 recommendations


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(port=port, debug=False)