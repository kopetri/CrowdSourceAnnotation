# Usage
## Backend (start development server)
Create a virtual python environment and activate it
```python
python -m venv venv
./venv/Scripts/activate
```
Install requirements
```python
(venv) pip install -r ./backend/requirements.txt
```
Set FLASK_APP environment variable
```python
$env:FLASK_APP="backend" (Windows PowerShell)
export FLASK_APP="backend" (Unix)
```
Start flask development server
```python
flask run
```

## Frontend (start development server)
install npm modules
```python
cd ./frontend
npm install
```
Wait until npm finishes to install modules into frontend/node_modules.

Next, start frontend server
```python
npm start
```

A Browser window should open. If not, open Browser and go to http://localhost:3000/tutorial0


# Data Loading
There is a sample_data directory containing images and a json file.

The json file contains all jobs, which are distributed for an online crowd source application.

Check in the backend/\_\_init\_\_.py file, line 12-17 for database parameters.