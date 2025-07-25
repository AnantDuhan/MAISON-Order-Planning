import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pickle

print("Loading review data...")
reviews_df = pd.read_csv('reviews.csv').dropna()

print("Aggregating reviews per product...")
product_reviews = reviews_df.groupby('product_id')['comment'].apply(lambda x: ' '.join(x)).reset_index()

print("Vectorizing review content using TF-IDF...")
tfidf = TfidfVectorizer(stop_words='english')
tfidf_matrix = tfidf.fit_transform(product_reviews['comment'])

print("Calculating cosine similarity matrix...")
cosine_sim_reviews = cosine_similarity(tfidf_matrix, tfidf_matrix)

print("Saving model files...")
with open('review_similarity.pkl', 'wb') as f:
    pickle.dump(cosine_sim_reviews, f)
with open('review_products.pkl', 'wb') as f:
    pickle.dump(product_reviews, f)

print("Review-based model created successfully!")

def get_review_recommendations(product_id, top_n=5):
    idx = product_reviews.index[product_reviews['product_id'] == product_id].tolist()[0]