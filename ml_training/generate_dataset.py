import pandas as pd
import numpy as np
import os

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    
    # Generate features
    age = np.random.randint(40, 85, num_samples)
    
    # EF: Normal is 50-70%. Low is < 50.
    ef = np.random.normal(55, 10, num_samples).clip(15, 85)
    
    # LVEDD: Normal is ~39-53 mm. Enlarged is > 55.
    lvedd = np.random.normal(48, 8, num_samples).clip(30, 80)
    
    # LVESD: Normal is ~20-40 mm.
    lvesd = np.random.normal(32, 6, num_samples).clip(15, 60)
    
    hr = np.random.normal(75, 15, num_samples).clip(40, 130)
    sbp = np.random.normal(130, 20, num_samples).clip(90, 200)
    total_chol = np.random.normal(5.5, 1.2, num_samples).clip(2.5, 10.0)
    
    # Create target (Risk Level: 0 = Low, 1 = High)
    # Higher risk if age > 65, EF < 50, LVEDD > 55, SBP > 140
    risk_score = (age / 85.0) * 0.3 + (1 - ef/85.0) * 0.4 + (lvedd/80.0) * 0.2 + (sbp/200.0) * 0.1
    
    # Add noise
    risk_score += np.random.normal(0, 0.05, num_samples)
    
    # Threshold for High Risk (approx top 30-40%)
    target = (risk_score > np.percentile(risk_score, 65)).astype(int)
    
    # Introduce some missing values (Phase 2 requirement)
    mask_ef = np.random.rand(num_samples) < 0.05
    ef[mask_ef] = np.nan
    
    df = pd.DataFrame({
        'Age': age,
        'Ejection_Fraction': ef,
        'LVEDD': lvedd,
        'LVESD': lvesd,
        'Heart_Rate': hr,
        'SBP': sbp,
        'Total_Cholesterol': total_chol,
        'Cardiovascular_Risk': target
    })
    
    file_path = os.path.join(os.path.dirname(__file__), '..', 'echo_dataset.csv')
    df.to_csv(file_path, index=False)
    print(f"Generated synthetic dataset with {num_samples} samples at {file_path}")

if __name__ == "__main__":
    generate_synthetic_data()
