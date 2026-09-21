import sys
import json
import cv2
import numpy as np
from PIL import Image, ImageChops, ImageEnhance
import os

def detect_forgery(image_path):
    try:
        # Check if the image exists
        if not os.path.exists(image_path):
            return {"error": f"File not found: {image_path}"}
            
        original = Image.open(image_path).convert('RGB')
        
        # Save the image at a known quality
        temp_filename = f"{image_path}_ela_temp.jpg"
        original.save(temp_filename, 'JPEG', quality=90)
        
        # Open the resaved image
        resaved = Image.open(temp_filename)
        
        # Calculate the ELA (Error Level Analysis)
        ela_image = ImageChops.difference(original, resaved)
        
        # Get the extrema
        extrema = ela_image.getextrema()
        max_diff = max([ex[1] for ex in extrema])
        
        # If max_diff is 0, image is basically identical (maybe synthetic or extremely solid color)
        if max_diff == 0:
            max_diff = 1
            
        # Enhance the difference image
        scale = 255.0 / max_diff
        ela_image = ImageEnhance.Brightness(ela_image).enhance(scale)
        
        # Convert to numpy array for opencv processing
        ela_array = np.array(ela_image)
        gray = cv2.cvtColor(ela_array, cv2.COLOR_RGB2GRAY)
        
        # Compute mean and standard deviation
        mean, std_dev = cv2.meanStdDev(gray)
        mean = mean[0][0]
        std_dev = std_dev[0][0]
        
        # Clean up
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
            
        # Simple heuristic: high standard deviation suggests tampering in specific regions
        is_tampered = False
        confidence = 0.0
        
        # These thresholds can be tuned. For a standard document, the background is uniform 
        # and ELA yields a very dark, low-variance image. 
        # Tampered regions (e.g. pasted text) will have higher error levels, raising the standard deviation.
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

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing image path argument"}))
        sys.exit(1)
        
    result = detect_forgery(sys.argv[1])
    print(json.dumps(result))
