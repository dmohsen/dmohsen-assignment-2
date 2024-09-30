from flask import Flask, jsonify, request, render_template
import numpy as np

app = Flask(__name__)

# Global variables to store data points and centroids
data_points = []
centroids = []
k = 3  # Default number of clusters

# Helper function to initialize centroids
def initialize_centroids(k, points):
    """Randomly initialize centroids from data points."""
    centroid_indices = np.random.choice(range(len(points)), k, replace=False)  # Select indices
    return [points[i] for i in centroid_indices]  # Get points corresponding to those indices

def assign_clusters(centroids, points):
    """Assign each point to the nearest centroid."""
    clusters = [[] for _ in range(len(centroids))]
    for point in points:
        distances = [np.linalg.norm(np.array(point) - np.array(centroid)) for centroid in centroids]
        cluster_index = np.argmin(distances)
        clusters[cluster_index].append(point)
    return clusters

def recalculate_centroids(clusters):
    """Recalculate centroids as the mean of assigned clusters."""
    return [np.mean(cluster, axis=0).tolist() if len(cluster) > 0 else np.random.rand(2).tolist() for cluster in clusters]

@app.route('/')
def index():
    return render_template('index.html')

# Initialize a new dataset and centroids
@app.route('/initialize', methods=['POST'])
def initialize():
    global data_points, centroids, k
    try:
        k = int(request.json['num_clusters'])
        init_method = request.json.get('init_method', 'random')  # Get initialization method from request

        # Generate random 2D points
        data_points = np.random.randn(200, 2).tolist()  # Generate 200 random 2D points

        # Choose initialization method for centroids
        if init_method == "manual":
            centroids = []  # Leave centroids empty for manual mode
        else:
            centroids = initialize_centroids(k, data_points)  # Random initialization by default

        return jsonify({"data_points": data_points, "centroids": centroids})
    except Exception as e:
        print(f"Error initializing dataset: {e}")
        return jsonify({"error": str(e)}), 500

# Reset the algorithm
@app.route('/reset', methods=['POST'])
def reset():
    global centroids
    centroids = []
    return jsonify({"status": "reset"})

# Step through KMeans
@app.route('/step', methods=['POST'])
def step():
    global data_points, centroids, k
    if len(centroids) < k:
        return jsonify({"error": "Not enough centroids placed manually"}), 400  # Prevent step before all centroids are placed
    clusters = assign_clusters(centroids, data_points)
    centroids = recalculate_centroids(clusters)
    return jsonify({"centroids": centroids, "clusters": clusters})

@app.route('/converge', methods=['POST'])
def converge():
    global data_points, centroids, k
    if len(centroids) < k:
        return jsonify({"error": "Not enough centroids placed manually"}), 400  # Prevent convergence before all centroids are placed
    converged = False
    while not converged:
        clusters = assign_clusters(centroids, data_points)
        new_centroids = recalculate_centroids(clusters)
        if np.allclose(centroids, new_centroids):
            converged = True
        centroids = new_centroids
    return jsonify({"centroids": centroids, "clusters": clusters})

if __name__ == '__main__':
    app.run(debug=True, port=3000)
