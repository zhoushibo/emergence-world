import urllib.request
url = 'https://raw.githubusercontent.com/ahujasid/blender-mcp/main/addon.py'
urllib.request.urlretrieve(url, 'addon.py')
print('Downloaded addon.py')
