document.addEventListener("DOMContentLoaded", function() {
    let dataPoints = [];
    let centroids = [];
    let manualCentroidMode = false;  // Flag for manual centroid mode
    const numClustersInput = document.getElementById("num-clusters");

    // Generate new dataset
    document.getElementById("new-dataset").addEventListener("click", () => {
        const numClusters = parseInt(numClustersInput.value) || 3;  // Default to 3 clusters
        const initMethod = document.getElementById("init-method").value;  // Get initialization method

        // If "Manual" is selected, enable manual centroid placement mode
        if (initMethod === "manual") {
            centroids = [];
            manualCentroidMode = true;
            alert("Click on the plot to place centroids manually.");
            console.log("Manual mode ON. Waiting for centroid placement.");

            // Generate random dataset, without centroids (since user places them manually)
            fetch('/initialize', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ num_clusters: numClusters, init_method: "manual" })
            })
            .then(response => response.json())
            .then(data => {
                dataPoints = data.data_points;
                plotData(dataPoints, centroids, []);  // Plot without centroids (user will add them)
                attachClickEvent();  // Attach the click event to the plot after it's rendered

                // Disable Step and Converge buttons until centroids are placed manually
                document.getElementById("step-btn").disabled = true;
                document.getElementById("converge-btn").disabled = true;
            });
        } else {
            // Handle other initialization methods
            fetch('/initialize', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ num_clusters: numClusters, init_method: initMethod })
            })
            .then(response => response.json())
            .then(data => {
                dataPoints = data.data_points;
                centroids = data.centroids;
                plotData(dataPoints, centroids, []);

                // Enable the buttons for algorithm interaction
                document.getElementById("step-btn").disabled = false;
                document.getElementById("converge-btn").disabled = false;
                document.getElementById("reset-btn").disabled = false;
            });
        }
    });

    // Step through KMeans
    document.getElementById("step-btn").addEventListener("click", () => {
        fetch('/step', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);  // Display error if not enough centroids placed
                return;
            }
            centroids = data.centroids;
            plotData(dataPoints, centroids, data.clusters);

            if (data.converged) {
                alert("KMeans has converged.");
                document.getElementById("step-btn").disabled = true;  // Disable further steps
            }
        });
    });

    // Run to Convergence
    document.getElementById("converge-btn").addEventListener("click", () => {
        fetch('/converge', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);  // Display error if not enough centroids placed
                return;
            }
            centroids = data.centroids;
            plotData(dataPoints, centroids, data.clusters);

            alert("KMeans has converged.");
        });
    });

    // Reset Algorithm
    document.getElementById("reset-btn").addEventListener("click", () => {
        fetch('/reset', { method: 'POST' })
        .then(() => {
            centroids = [];
            plotData(dataPoints, centroids, []);
        });
    });

    // Handle manual centroid placement by clicking on the plot
    function attachClickEvent() {
        const plot = document.getElementById('plot');
        
        plot.on('plotly_click', function(eventData) {
            const numClusters = parseInt(numClustersInput.value, 10);

            console.log("Manual mode:", manualCentroidMode, "Centroid count:", centroids.length, "Target clusters:", numClusters);

            if (manualCentroidMode && centroids.length < numClusters) {
                // Get click coordinates from the Plotly event
                const xCoordinate = eventData.points[0].x;
                const yCoordinate = eventData.points[0].y;

                // Add the clicked point as a new centroid
                centroids.push([xCoordinate, yCoordinate]);
                console.log(`Centroid placed at (${xCoordinate}, ${yCoordinate}). Total centroids: ${centroids.length}`);
                plotData(dataPoints, centroids, []);
                
                // Check if we have reached the target number of centroids
                if (centroids.length >= numClusters) {
                    manualCentroidMode = false;  // Disable manual mode after the final centroid is placed
                    alert("Manual centroid placement complete.");
                    document.getElementById("step-btn").disabled = false;
                    document.getElementById("converge-btn").disabled = false;
                }
            }
        });
    }

    // Plotting function using Plotly
    function plotData(data, centroids, clusters) {
        let traceData = [];
        const colors = ['#FF7F7F', '#FFA07A', '#D3D3D3', '#B0C4DE', '#FFE4E1', '#98FB98', '#ADD8E6', '#F08080'];  // Example cluster colors

        if (clusters && clusters.length > 0) {
            clusters.forEach((cluster, idx) => {
                traceData.push({
                    x: cluster.map(p => p[0]),
                    y: cluster.map(p => p[1]),
                    mode: 'markers',
                    marker: { color: colors[idx % colors.length], size: 6 },
                    type: 'scatter',
                    name: `Cluster ${idx + 1}`
                });
            });
        } else {
            traceData.push({
                x: data.map(p => p[0]),
                y: data.map(p => p[1]),
                mode: 'markers',
                marker: { color: '#A9A9A9', size: 6 },
                type: 'scatter',
                name: 'Data Points'
            });
        }

        traceData.push({
            x: centroids.map(c => c[0]),
            y: centroids.map(c => c[1]),
            mode: 'markers',
            marker: { color: 'red', size: 12 },
            type: 'scatter',
            name: 'Centroids'
        });

        const layout = {
            title: 'KMeans Clustering Data',
            showlegend: true,
            dragmode: false  // Prevent any dragging or panning in manual mode to avoid confusion
        };

        Plotly.newPlot('plot', traceData, layout);
    }
});
