import subprocess
import re
import pandas as pd
from flask import Flask, render_template_string
from datetime import datetime
import os

CSV_FILE = "debit_results.csv"

# Crée le fichier CSV vide si inexistant
if not os.path.exists(CSV_FILE):
    df_init = pd.DataFrame(columns=["timestamp", "download_mbps"])
    df_init.to_csv(CSV_FILE, index=False)

def run_fast_node():
    try:
        result = subprocess.run(
            ["node", "index.js"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",  # Force UTF-8 pour éviter UnicodeDecodeError
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Erreur Node.js : {e.stderr}")
        return None

def extract_speed(output):
    match = re.search(r"Your internet speed is (\d+) Mbps", output)
    if match:
        return int(match.group(1))
    return None

def save_result(speed):
    df = pd.read_csv(CSV_FILE)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_row = {"timestamp": timestamp, "download_mbps": speed}
    df = pd.concat([df, pd.DataFrame([new_row])])
    df.to_csv(CSV_FILE, index=False)

# Lancer un test au démarrage
output = run_fast_node()
if output:
    speed = extract_speed(output)
    if speed is not None:
        save_result(speed)
    else:
        print("Impossible d'extraire la vitesse depuis la sortie Node.js.")
else:
    print("Le test de débit a échoué ou aucune sortie n'a été capturée.")

# Interface web Flask
app = Flask(__name__)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Statistiques de Débit</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f8f9fa; padding: 20px; }
        .table thead { background-color: #343a40; color: #fff; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="mb-4">📊 Statistiques de Débit</h1>
        <table class="table table-striped table-bordered">
            <thead>
                <tr>
                    <th>Horodatage</th>
                    <th>Débit (Mbps)</th>
                </tr>
            </thead>
            <tbody>
                {% for row in data %}
                <tr>
                    <td>{{ row.timestamp }}</td>
                    <td>{{ row.download_mbps }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>
</body>
</html>
"""

@app.route("/")
def index():
    df = pd.read_csv(CSV_FILE)
    data = df.to_dict(orient="records")
    return render_template_string(HTML_TEMPLATE, data=data)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
