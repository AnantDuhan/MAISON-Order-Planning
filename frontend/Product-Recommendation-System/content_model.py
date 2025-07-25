# content_trainer.py
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pickle

print("✅ Loading product data...")
# Make sure products.csv is in the same directory
products_df = pd.read_csv('products.csv').dropna(subset=['product_id', 'name', 'description', 'category'])

# Combine text fields for analysis
products_df['content'] = products_df['name'] + ' ' + products_df['description'] + ' ' + products_df['category']

print("⚙️ Vectorizing product content using TF-IDF...")
tfidf = TfidfVectorizer(stop_words='english')
tfidf_matrix = tfidf.fit_transform(products_df['content'])

print("🧮 Calculating cosine similarity matrix...")
cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

print("💾 Saving model files...")
# This saves the files with the names the prediction script expects
with open('content_similarity.pkl', 'wb') as f:
    pickle.dump(cosine_sim, f)

with open('content_products.pkl', 'wb') as f:
    pickle.dump(products_df, f)

print("🎉 Content-based model created successfully!")