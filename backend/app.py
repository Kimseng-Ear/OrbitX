from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import math
import time

app = Flask(__name__)
CORS(app)

ISS_URL = "http://api.open-notify.org/iss-now.json"

COUNTRIES = {
    "cambodia":  {"name":"Cambodia","capital":"Phnom Penh","population":"17.0M","area":"181,035 km²","timezone":"UTC+7","lat":11.5564,"lon":104.9282},
    "usa":       {"name":"United States","capital":"Washington D.C.","population":"331M","area":"9.8M km²","timezone":"UTC-5","lat":37.09,"lon":-95.71},
    "japan":     {"name":"Japan","capital":"Tokyo","population":"125M","area":"377,975 km²","timezone":"UTC+9","lat":36.20,"lon":138.25},
    "brazil":    {"name":"Brazil","capital":"Brasília","population":"215M","area":"8.5M km²","timezone":"UTC-3","lat":-14.24,"lon":-51.93},
    "india":     {"name":"India","capital":"New Delhi","population":"1.4B","area":"3.3M km²","timezone":"UTC+5:30","lat":20.59,"lon":78.96},
    "australia": {"name":"Australia","capital":"Canberra","population":"26M","area":"7.7M km²","timezone":"UTC+10","lat":-25.27,"lon":133.78},
}

SATELLITES = [
    {"id":"ISS","name":"International Space Station","altitude":408,"velocity":27600,"inclination":51.6,"period":92.65,"status":"ACTIVE"},
    {"id":"SAT-01","name":"Starlink-A Group","altitude":550,"velocity":27400,"inclination":53,"period":95.5,"status":"ACTIVE"},
    {"id":"SAT-02","name":"WorldView-Legion","altitude":617,"velocity":27100,"inclination":97,"period":97.1,"status":"ACTIVE"},
    {"id":"SAT-03","name":"Starlink-B Group","altitude":540,"velocity":27500,"inclination":28,"period":95.2,"status":"ACTIVE"},
]

ALL_COUNTRIES_CACHE = []

@app.route('/api/countries')
def get_all_countries():
    global ALL_COUNTRIES_CACHE
    if not ALL_COUNTRIES_CACHE:
        try:
            r = requests.get('https://restcountries.com/v3.1/all', timeout=10)
            ALL_COUNTRIES_CACHE = r.json()
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify(ALL_COUNTRIES_CACHE)

def mock_iss():
    t = time.time()
    inc = 51.6 * math.pi / 180
    period = 5400  # 90 min in seconds
    angle = (t % period) / period * 2 * math.pi
    lat = math.degrees(math.asin(math.sin(inc) * math.sin(angle)))
    lon = math.degrees(angle % (2 * math.pi)) - 180
    lon = ((lon + 180 + (t / period * 360 * 0.2)) % 360) - 180
    return {"latitude": round(lat, 4), "longitude": round(lon, 4),
            "altitude": 408, "velocity": 27600, "timestamp": int(t)}

@app.route('/api/iss-location')
def get_iss():
    try:
        r = requests.get(ISS_URL, timeout=4)
        d = r.json()
        return jsonify({
            "latitude":  float(d['iss_position']['latitude']),
            "longitude": float(d['iss_position']['longitude']),
            "altitude":  408, "velocity": 27600,
            "timestamp": d['timestamp'],
        })
    except:
        return jsonify(mock_iss())

@app.route('/api/satellite-data')
def get_satellites():
    return jsonify(SATELLITES)

@app.route('/api/weather/<lat>/<lon>')
def get_weather(lat, lon):
    la, lo = float(lat), float(lon)
    # Phnom Penh detection
    if 10 < la < 14 and 102 < lo < 108:
        return jsonify({"temp":33,"condition":"Partly Cloudy","humidity":78,"wind_speed":14,"location":"Phnom Penh","icon":"⛅"})
    # Rough seasonal mock
    base_temp = 25 - abs(la) * 0.4
    return jsonify({
        "temp": round(base_temp + (lo % 10 - 5) * 0.3, 1),
        "condition": "Clear" if la > 0 else "Overcast",
        "humidity": round(50 + abs(la) * 0.5),
        "wind_speed": round(8 + abs(lo) * 0.05),
        "location": "Selected Region",
        "icon": "☀️",
    })

@app.route('/api/country/<country_id>')
def get_country(country_id):
    cid = country_id.lower()
    c_info = COUNTRIES.get(cid)
    
    # fallback for dynamic restcountries data
    if not c_info:
        c_info = {
            "name": cid.capitalize(),
            "population": "N/A",
            "area": "N/A"
        }
        
    data = {
        "country": c_info["name"],
        "population": c_info["population"],
        "area": c_info["area"]
    }
    return jsonify(data)

@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "time": int(time.time()), "service": "OrbitX-Backend"})

if __name__ == '__main__':
    # Increase workers/threads if possible, but for dev app.run is fine
    # Ensure port 5005 is used as the frontend expects
    app.run(host='0.0.0.0', port=5005, debug=False, threaded=True)
