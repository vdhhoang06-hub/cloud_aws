import boto3
from flask import Flask, request, jsonify
from flask_cors import CORS

# Khởi tạo ứng dụng Flask
app = Flask(__name__)
CORS(app) # Cho phép Cross-Origin Resource Sharing

# AWS Credentials - Paste your credentials here
AWS_ACCESS_KEY_ID = "your_access_key"
AWS_SECRET_ACCESS_KEY = "your_secret_key"
AWS_REGION = "ap-southeast-1"  # Sử dụng region Singapore

# Cấu hình client cho AWS Comprehend
try:
    comprehend_client = boto3.client(
        'comprehend',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )
    print("AWS Comprehend client created successfully.")
except Exception as e:
    print(f"Error creating AWS client: {e}")
    comprehend_client = None

# Định nghĩa API endpoint '/analyze'
@app.route('/analyze', methods=['POST'])
def analyze_text():
    if not comprehend_client:
        return jsonify({"error": "AWS client not configured"}), 500

    data = request.get_json()
    print("\nJSON REQUEST từ frontend")
    print("Received data:", data)
    
    if not data or 'text' not in data:
        return jsonify({"error": "Missing 'text' in request body"}), 400
    
    comment_text = data['text']
    
    try:
        # 1. Tự động phát hiện ngôn ngữ
        # Điều này rất quan trọng vì các API khác cần biết LanguageCode
        lang_response = comprehend_client.detect_dominant_language(Text=comment_text)
        language_code = lang_response['Languages'][0]['LanguageCode']

        # 2. Gọi API Detect Sentiment (Phân tích cảm xúc)
        sentiment_response = comprehend_client.detect_sentiment(
            Text=comment_text,
            LanguageCode=language_code
        )
        
        # 3. Gọi API Detect Key Phrases (Tìm cụm từ khóa chính)
        phrases_response = comprehend_client.detect_key_phrases(
            Text=comment_text,
            LanguageCode=language_code
        )
        # Lấy các cụm từ và làm sạch
        key_phrases = [phrase['Text'] for phrase in phrases_response['KeyPhrases']]

        # 4. Gọi API Detect Entities (Tìm thực thể)
        # Thực thể là tên riêng, địa điểm, tổ chức, ngày tháng...
        entities_response = comprehend_client.detect_entities(
            Text=comment_text,
            LanguageCode=language_code
        )
        # Lấy các thực thể và làm sạch
        entities = [
            {"text": entity['Text'], "type": entity['Type']} 
            for entity in entities_response['Entities']
        ]

        # 5. Tổng hợp tất cả kết quả
        result = {
            "language": language_code,
            "overallSentiment": sentiment_response.get('Sentiment'),
            "sentimentScores": sentiment_response.get('SentimentScore'),
            "keyPhrases": key_phrases,
            "entities": entities
        }
        print("\nAnalysis result sau khi xử lý:", result)
        
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Chạy server
if __name__ == '__main__':
    app.run(debug=True, port=5000)
