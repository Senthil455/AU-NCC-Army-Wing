.PHONY: dev db-up backend frontend lint test clean

db-up:
	docker compose up -d db

backend:
	cd apps/backend && npm run dev

frontend:
	cd apps/frontend && npm run dev

lint:
	cd apps/backend && npm run lint; cd ../frontend && npm run lint

test:
	cd apps/backend && npm test

clean:
	npm run clean

dev: db-up
	@echo "Run backend and frontend in separate terminals: make backend & make frontend"