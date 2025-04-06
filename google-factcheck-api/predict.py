import pandas as pd
import string
import nltk
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder
import joblib

# Download NLTK stopwords
nltk.download('stopwords')
from nltk.corpus import stopwords

# Function to clean text
def clean_text(text):
    text = text.lower()  # Convert text to lowercase
    text = ''.join([char for char in text if char not in string.punctuation])  # Remove punctuation
    text = ' '.join([word for word in text.split() if word not in stopwords.words('english')])  # Remove stopwords
    return text

# Load the real and fake news datasets
real_news_df = pd.read_csv('dataset/True.csv')  # Load the True.csv file (real news)
fake_news_df = pd.read_csv('dataset/Fake.csv')  # Load the Fake.csv file (fake news)

# Assign labels to the datasets
real_news_df['label'] = 'REAL'  # Label real news as 'REAL'
fake_news_df['label'] = 'FAKE'  # Label fake news as 'FAKE'

# Combine both datasets
df = pd.concat([real_news_df[['title', 'text', 'label']], fake_news_df[['title', 'text', 'label']]])

# Data Preprocessing
df['cleaned_text'] = df['text'].apply(clean_text)

# Label Encoding: Convert labels into numeric values (0 for REAL, 1 for FAKE)
le = LabelEncoder()
df['label'] = le.fit_transform(df['label'])  # 'REAL' becomes 0, 'FAKE' becomes 1

# Split the dataset into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(df['cleaned_text'], df['label'], test_size=0.2, random_state=42)

# Feature Extraction using TF-IDF Vectorizer
tfidf = TfidfVectorizer(max_features=5000)

# Fit and transform the training data
X_train_tfidf = tfidf.fit_transform(X_train)

# Transform the test data
X_test_tfidf = tfidf.transform(X_test)

# Model Training using Logistic Regression
model = LogisticRegression(max_iter=1000)  # Set max_iter to ensure convergence

# Train the model
model.fit(X_train_tfidf, y_train)

# Make predictions on the test set
y_pred = model.predict(X_test_tfidf)

# Evaluate the model
print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

# Get probabilities for each test sample (real vs. fake)
probs = model.predict_proba(X_test_tfidf)

# Display probabilities for the first 5 test samples
for i in range(5):
    print(f"News: {X_test.iloc[i]}")
    print(f"Probability of being real: {probs[i][0]:.2f}")
    print(f"Probability of being fake: {probs[i][1]:.2f}")
    print("-" * 50)

# Save the model and vectorizer for future use
joblib.dump(model, 'fake_news_model.pkl')
joblib.dump(tfidf, 'tfidf_vectorizer.pkl')









# Load the saved model and vectorizer
model = joblib.load('fake_news_model.pkl')
tfidf = joblib.load('tfidf_vectorizer.pkl')

# Sample new text
new_text = ["New text to be predicted!"]

# Clean and transform the new text
new_text_cleaned = [clean_text(text) for text in new_text]
new_text_tfidf = tfidf.transform(new_text_cleaned)

# Get prediction probabilities
new_probs = model.predict_proba(new_text_tfidf)

# Output the result
print(f"Probability of being real: {new_probs[0][0]:.2f}")
print(f"Probability of being fake: {new_probs[0][1]:.2f}")
