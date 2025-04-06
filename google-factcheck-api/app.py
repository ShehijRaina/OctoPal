from flask import Flask, jsonify, request
import joblib
import nltk
import requests
import json
import os
import string


from flask_cors import CORS


app = Flask(__name__)

# Enable CORS for all origins (or specify a single domain like 'https://x.com')
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins, change "*" to a specific URL for better security

# Download NLTK stopwords
nltk.download('stopwords')
from nltk.corpus import stopwords

# Function to clean text
def clean_text(text):
    text = text.lower()  # Convert text to lowercase
    text = ''.join([char for char in text if char not in string.punctuation])  # Remove punctuation
    text = ' '.join([word for word in text.split() if word not in stopwords.words('english')])  # Remove stopwords
    return text

def FactCheck(query):

    print(f'Query is {query}')

    payload = {
    'key': 'AIzaSyC7gwEzB-EN6A_FFXo7XVfEsjmTMe6_yek',
    'query':query
    }
    url ='https://factchecktools.googleapis.com/v1alpha1/claims:search'
    response = requests.get(url,params=payload)
    if response.status_code == 200:
        result = json.loads(response.text)
        # Arbitrarily select 1
        try:
            topRating = result["claims"][0]
            # arbitrarily select top 1
            claimReview = topRating["claimReview"][0]["textualRating"]
            claimVal = "According to " + str(topRating["claimReview"][0]['publisher']['name'])+ " that claim is " + str(claimReview)
            return claimVal           
        except:
            print("No matching claims were found.")
            return "No claim review field found."
    else:
        return 0
    

def predict_misinformation_score(query):
    # Load the saved model and vectorizer
    model_path = os.path.join(os.path.dirname(__file__), 'fake_news_model.pkl')
    vectorizer_path = os.path.join(os.path.dirname(__file__), 'tfidf_vectorizer.pkl')
    model = joblib.load(model_path)
    tfidf = joblib.load(vectorizer_path)

    # Sample new text
    new_text = [query]

    # Clean and transform the new text
    new_text_cleaned = [clean_text(text) for text in new_text]
    new_text_tfidf = tfidf.transform(new_text_cleaned)
  
    # Get prediction probabilities
    new_probs = model.predict_proba(new_text_tfidf)

    # Output the result
    print(f"Probability of being real: {new_probs[0][0]:.2f}")
    print(f"Probability of being fake: {new_probs[0][1]:.2f}")

    return (new_probs[0][1] * 100)


@app.route('/call-python', methods=['GET'])
def call_python():
    input_string = request.args.get('input', '')  # Get 'input' from query parameters
    result = FactCheck(input_string)
    misinfo_score = predict_misinformation_score(input_string)
    return jsonify({"result": result})

if __name__ == "__main__":
    app.run(port=5000)
