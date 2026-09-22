import os
import cv2
import numpy as np
from PIL import Image, ImageChops, ImageEnhance
from flask import Flask, request, jsonify

app = Flask(__name__)

def detect_forgery_core(image_bytes):
    from io import BytesIO
    try:
        original = Image.open(BytesIO(image_bytes)).convert('RGB')
        
        # Save the image at a known quality
        temp_buffer = BytesIO()
        original.save(temp_buffer, 'JPEG', quality=90)
        temp_buffer.seek(0)
        
        # Open the resaved image
        resaved = Image.open(temp_buffer)
        
        # Calculate the ELA
        ela_image = ImageChops.difference(original, resaved)
        
        extrema = ela_image.getextrema()
        max_diff = max([ex[1] for ex in extrema])
        
        if max_diff == 0:
            max_diff = 1
            
        scale = 255.0 / max_diff
        ela_image = ImageEnhance.Brightness(ela_image).enhance(scale)
        
        ela_array = np.array(ela_image)
        gray = cv2.cvtColor(ela_array, cv2.COLOR_RGB2GRAY)
        
        mean, std_dev = cv2.meanStdDev(gray)
        mean = mean[0][0]
        std_dev = std_dev[0][0]
        
        is_tampered = False
        if std_dev > 15.0 or mean > 35.0:
            is_tampered = True
            confidence = min(0.99, (std_dev / 30.0))
        else:
            confidence = max(0.1, 1.0 - (std_dev / 15.0))
            
        return {
            "is_tampered": bool(is_tampered),
            "confidence": float(round(confidence, 2)),
            "metrics": {
                "mean": float(round(mean, 2)),
                "std_dev": float(round(std_dev, 2)),
                "max_diff": int(max_diff)
            }
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.route('/api/forgery', methods=['POST'])
def check_forgery():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty file"}), 400
        
    image_bytes = file.read()
    result = detect_forgery_core(image_bytes)
    return jsonify(result)
