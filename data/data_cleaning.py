import pandas as pd

df = pd.read_csv('data/health_fitness_tracking_365days.csv', header=0)
df.columns = pd.Index([
    'user_id', 'age', 'gender', 'date', 'steps', 'heart_rate_avg', 'sleep_hours',
    'calories_burned', 'exercise_minutes', 'stress_level', 'weight_kg', 'bmi'
])

df = df.drop_duplicates()

# remove rows with missing or invalid data
df = df.dropna()
df = df[df['steps'] >= 0]
df = df[df['sleep_hours'] >= 0]
df = df[df['calories_burned'] >= 0]
df = df[df['exercise_minutes'] >= 0]
df = df[df['stress_level'].between(1, 10)]

# Convert date to datetime
df['date'] = pd.to_datetime(df['date'], errors='coerce')
df = df.dropna(subset=['date'])

# Save cleaned data
df.to_csv('data/health_fitness_tracking_365days_cleaned.csv', index=False)