import pandas as pd
from surprise import Dataset, Reader, SVD
from surprise.model_selection import train_test_split
from surprise import accuracy
import pickle

# 1. Load your data
df = pd.read_csv('ratings.csv')
reader = Reader(rating_scale=(1, 5))
data = Dataset.load_from_df(df[['user_id', 'product_id', 'rating']], reader)

# 2. Split data for training and testing
trainset, testset = train_test_split(data, test_size=0.2)

# 3. Choose and train the model (SVD is a great choice)
model = SVD()
model.fit(trainset)

# 4. Evaluate the model (optional but good practice)
predictions = model.test(testset)
print(f"Model Accuracy (RMSE): {accuracy.rmse(predictions)}")

# 5. Save the trained model for later use
with open('recommendation_model.pkl', 'wb') as f:
    pickle.dump(model, f)

print("Model trained and saved successfully!")