# Dot-source to set the browser-test environment for the LOOPBACK clone. Usage: . scripts/qa/clone-env.ps1 <credsDir>
param([Parameter(Mandatory)][string]$CredsDir)
$env:UAT_BASE = 'http://127.0.0.1:18081'
$env:UAT_CREDS_FILE = "$CredsDir\creds.txt"; $env:UAT_QA_CREDS_FILE = "$CredsDir\qa-creds.txt"
$env:PW_MODULE_DIR = 'D:\Porjects\Book\mehfil\node_modules'
$env:PW_CHROME = 'C:\Users\Keydi\AppData\Local\ms-playwright\chromium-1254\chrome-win64\chrome.exe'
$env:DB_URL = 'mysql://root:audit-local-only@127.0.0.1:19307/qa_clone'
