# TaskBoard Backend

Flask API for TaskBoard application.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file:

```
SECRET_KEY=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DATABASE_URL=sqlite:///taskboard.db
JWT_SECRET_KEY=your-jwt-secret-key
```

## Running

```bash
python run.py
```

The API will be available at `http://localhost:5000/api/v1/`

## Testing

```bash
pytest
```
