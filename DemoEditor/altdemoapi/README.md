# Python Demo Backend

Project F Demo

## Setup
### Step 1: Environment and Dependencies
*The following steps are to be done in the command line denoted by the $*

To get started working with the demo backend, create your virtual environment using the command:
<br>
`$ python -m venv venv`
<br>
This will create a new virtual environment "venv" in your directory.
To then activate the virtual environment, run the command:
<br>
For windows:
<br>
`$ .\venv\Scripts\activate`
<br>
For Linux/MacOS:
<br>
`$ source venv/bin/activate`
<br>
Once you have activated your venv, run:
<br>
`$ pip install -r requirements.txt`
<br>
This will install all necessary dependencies for the project.
If at any point, you need to install any new dependencies, remember to run:
<br>
`$ pip freeze > requirements.txt`
<br>
### Step 2: Env Vars and gitignore
You will need a few environment variables for working on this project.
<br>
__NEVER PUSH ACCESS TOKENS TO GITHUB__
<br>
Create .env and .gitignore files
<br>
The contents of both will be covered in our meeting 9/26.

### Step 3: mysql

Login to mysql with your root login (default login -- replace root with your root username)
<br>
`$ mysql -u "root" -p`
<br>
Create the database for the project
<br>
`$ CREATE DATABASE learning_app;`
<br>
Create user for interfacing with database
<br>
`$ CREATE USER 'app_connect'@'localhost' IDENTIFIED BY 'cosi-166-connpass';`
<br>
Grant privileges for project database
<br>
`$ GRANT ALL PRIVILEGES ON learning_app.* TO 'app_connect'@'localhost';`
<br>
Apply Privileges
<br>
`FLUSH PRIVILEGES;`
<br>
Add info to .env:
<br>
```
DB_USER="app_connect"
DB_PASSWORD="cosi-166-connpass"
DB_HOST="localhost"
DB_DATABASE="learning_app"
```
<br>

#### 
## Running the Demo API
To run the demo, execute the following:
`python run.py`
<br>
*Make certain you have your venv activated when running this* 

## Project Layout
### ai_utils.py
### api.py
## Licenses
OpenAI API is protected by Apache License
