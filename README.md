### Backend

cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

Backend běží na: http://localhost:8001

backend env = 
MONGO_URL=mongodb://localhost:27017
DB_NAME=sierra97_db
CORS_ORIGINS=*
GROQ_API_KEY=your_api_key_here

### Frontend

Otevři nový terminál:

cd frontend
yarn install
yarn start

frontend env = REACT_APP_BACKEND_URL=http://localhost:8001