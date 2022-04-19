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
