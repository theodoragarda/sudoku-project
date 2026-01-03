# Sudoku Mobile Application

This project is a mobile Sudoku application developed using Expo (React Native) with a Python backend.

## Structure

- `sudoku-client/` — Mobile app (Expo + React Native)
- `sudoku-backend/` — Remote backend (Python, REST API, SQLite)

## Features

- User authentication
- Sudoku puzzle generation and storage
- Public cloud API integration
- Camera-based OCR for Sudoku import
- GPS location capture on puzzle completion
- Sensor-based undo (shake)
- Persistent SQL storage
- Remote REST API

## Running the project

### Client
```bash
cd sudoku-client
npm install
npx expo start

### Backend
cd sudoku-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py