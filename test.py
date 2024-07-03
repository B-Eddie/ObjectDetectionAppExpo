import requests

api_key = 'zuxqZZaKZVPbzrB23QRP'
image_url = 'frame_0248.png'
endpoint = 'https://detect.roboflow.com/bobber-detection/1'

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {api_key}'
}

payload = {
    'image': image_url
}

response = requests.post(endpoint, headers=headers, json=payload)

if response.status_code == 200:
    detected_objects = response.json()['predictions']

    for obj in detected_objects:
        label = obj['label']
        confidence = obj['confidence']
        print(f'Detected object: {label} (Confidence: {confidence})')
else:
    print('Error occurred while making the request.')

