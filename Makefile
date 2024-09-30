# Install required dependencies
install:
	@pip install -r requirements.txt

# Run the Flask application locally
run:
	@python app.py

# Optionally add a command for linting or testing
test:
	@echo "Run tests here"
