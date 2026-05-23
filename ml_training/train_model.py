import os
import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from sklearn.impute import SimpleImputer

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'echo_dataset.csv')
MODEL_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'backend', 'cvd_echo_model.pkl')

def perform_data_analysis(df):
    print("="*50)
    print("PHASE 1 - DATASET ANALYSIS")
    print("="*50)
    print(f"Dataset shape: {df.shape}")
    print("\n--- Column Names & Data Types ---")
    print(df.dtypes)
    print("\n--- Missing Values ---")
    print(df.isnull().sum())
    print("\n--- Dataset Summary ---")
    print(df.describe())
    
    # Identify target and features
    target_col = 'Cardiovascular_Risk'
    features = [col for col in df.columns if col != target_col]
    print(f"\nTarget Column: {target_col}")
    print(f"Numerical Features: {features}")
    
def train_and_evaluate():
    if not os.path.exists(DATA_PATH):
        print(f"Error: Dataset not found at {DATA_PATH}")
        return
        
    df = pd.read_csv(DATA_PATH)
    
    # Phase 1
    perform_data_analysis(df)
    
    print("\n" + "="*50)
    print("PHASE 2 - DATA PREPROCESSING")
    print("="*50)
    
    # Handle missing values using Median Imputer
    imputer = SimpleImputer(strategy='median')
    
    X = df.drop(columns=['Cardiovascular_Risk'])
    y = df['Cardiovascular_Risk']
    
    # Feature names must match what backend expects: "ef", "lvedd", "lvesd", "hr", "age", "sbp", "cholesterol"
    X = X.rename(columns={
        'Ejection_Fraction': 'ef',
        'LVEDD': 'lvedd',
        'LVESD': 'lvesd',
        'Heart_Rate': 'hr',
        'Age': 'age',
        'SBP': 'sbp',
        'Total_Cholesterol': 'cholesterol'
    })
    feature_names = X.columns.tolist()
    
    X_imputed = imputer.fit_transform(X)
    X = pd.DataFrame(X_imputed, columns=feature_names)
    
    print(f"Features mapped: {feature_names}")
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"Training set: {X_train.shape[0]} samples")
    print(f"Testing set: {X_test.shape[0]} samples")
    
    print("\n" + "="*50)
    print("PHASE 3 - MACHINE LEARNING MODEL")
    print("="*50)
    
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000),
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
        'XGBoost': XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42)
    }
    
    best_model = None
    best_f1 = 0
    best_name = ""
    
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        roc = roc_auc_score(y_test, y_prob)
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        
        print(f"\n--- {name} ---")
        print(f"Accuracy:    {acc:.4f}")
        print(f"Precision:   {prec:.4f}")
        print(f"Recall:      {rec:.4f}")
        print(f"F1 Score:    {f1:.4f}")
        print(f"Specificity: {specificity:.4f}")
        print(f"ROC-AUC:     {roc:.4f}")
        print("Confusion Matrix:")
        print(cm)
        
        if f1 > best_f1:
            best_f1 = f1
            best_model = model
            best_name = name
            
    print(f"\n=> Best Model Selected: {best_name} (F1: {best_f1:.4f})")
    
    # Save the best model
    os.makedirs(os.path.dirname(MODEL_OUTPUT_PATH), exist_ok=True)
    with open(MODEL_OUTPUT_PATH, 'wb') as f:
        pickle.dump(best_model, f)
        
    print(f"Model saved to {MODEL_OUTPUT_PATH}")

if __name__ == "__main__":
    train_and_evaluate()
