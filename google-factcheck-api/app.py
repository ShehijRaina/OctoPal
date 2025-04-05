from flask import Flask, jsonify, request
import requests
import json


from flask_cors import CORS


app = Flask(__name__)

# Enable CORS for all origins (or specify a single domain like 'https://x.com')
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins, change "*" to a specific URL for better security

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
    

@app.route('/call-python', methods=['GET'])
def call_python():
    input_string = request.args.get('input', '')  # Get 'input' from query parameters
    result = FactCheck(input_string)
    return jsonify({"result": result})

if __name__ == "__main__":
    app.run(port=5000)
