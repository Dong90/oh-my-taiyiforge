.PHONY: install dev test lint clean

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	python -m pytest tests/ -v --cov=app --cov-report=term-missing

lint:
	python -m ruff check app/ tests/ --fix
	python -m mypy app/

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
