.PHONY: dev db-up backend frontend lint test

db-up:
	docker compose up -d db

backend:
	cd backend && npm run dev

frontend:
	cd frontend && npm run dev

lint:
	cd backend && npm run lint; cd ../frontend && npm run lint

test:
	cd backend && npm test
