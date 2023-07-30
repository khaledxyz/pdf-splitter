@echo off

rem Define the path to the Node.js file
set SCRIPT_PATH=./src/script.js

rem Check if node_modules folder exists
if not exist node_modules (
    echo node_modules not found. Running npm install...
    npm install
	
	rem Execute the Node.js script
	echo Running %SCRIPT_PATH%...
	node %SCRIPT_PATH%
	
	pause
)

rem Execute the Node.js script
echo Running %SCRIPT_PATH%...
node %SCRIPT_PATH%

rem Pause to keep the window open
pause
