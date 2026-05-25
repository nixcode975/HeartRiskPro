import sys
import json
import urllib.request

URL = 'http://127.0.0.1:8000/model-status'

def main():
    try:
        with urllib.request.urlopen(URL, timeout=5) as r:
            data = json.loads(r.read().decode())
        print(json.dumps(data, indent=2))
        if data.get('model_loadable'):
            print('Model loadable: OK')
            return 0
        else:
            print('Model not loadable')
            return 2
    except Exception as e:
        print('Error contacting backend:', e)
        return 3

if __name__ == '__main__':
    sys.exit(main())
