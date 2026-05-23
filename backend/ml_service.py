import os
import pickle
import numpy as np
import pandas as pd

MODEL_PATH = "cvd_echo_model.pkl"

# Mock implementation until the actual model is trained with the dataset
def predict_risk_mock(params: dict) -> dict:
    # A simple rule-based mock to simulate ML model output
    score = 0.0
    warnings = []
    
    # Example logic
    ef = params.get("ef")
    if ef is not None:
        if ef < 50:
            score += 0.4
            warnings.append(f"Low Ejection Fraction ({ef}%)")
        elif ef < 55:
            score += 0.2
            
    lvedd = params.get("lvedd")
    if lvedd is not None:
        if lvedd > 55:
            score += 0.3
            warnings.append(f"Enlarged Left Ventricle ({lvedd}mm)")
            
    # Add age or other factors if provided
    age = params.get("age", 50)
    if age > 60:
        score += 0.1
        
    # Cap score
    probability = min(max(score, 0.05), 0.95)
    
    if probability < 0.2:
        category = "Low"
    elif probability < 0.5:
        category = "Moderate"
    else:
        category = "High"
        
    return {
        "probability": probability,
        "confidence_score": 0.88,
        "risk_category": category,
        "warnings": warnings,
        "is_mock": True
    }

def predict_risk(params: dict) -> dict:
    """
    Loads the trained XGBoost model and makes a prediction.
    If the model doesn't exist yet, falls back to a mock prediction.
    """
    if not os.path.exists(MODEL_PATH):
        return predict_risk_mock(params)
        
    try:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
            
        # Example of creating a dataframe for the model (adjust columns based on actual training)
        # We need the exact feature names the model was trained on
        # For now, this is a placeholder
        feature_names = ["ef", "lvedd", "lvesd", "hr", "age", "sbp", "cholesterol"]
        input_data = {}
        for f_name in feature_names:
            input_data[f_name] = [params.get(f_name, 0.0) or 0.0]
            
        df = pd.DataFrame(input_data)
        
        # predict_proba returns probability for both classes, [:, 1] is positive class
        prob = model.predict_proba(df)[0][1]
        
        if prob < 0.2:
            category = "Low"
        elif prob < 0.5:
            category = "Moderate"
        else:
            category = "High"
            
        return {
            "probability": float(prob),
            "confidence_score": 0.92, # Placeholder, could use prediction variance
            "risk_category": category,
            "warnings": [], # We can add threshold logic here too
            "is_mock": False
        }
    except Exception as e:
        print(f"Error making ML prediction: {e}")
        return predict_risk_mock(params)
