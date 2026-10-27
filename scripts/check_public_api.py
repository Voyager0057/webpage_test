#!/usr/bin/env python3
"""Gate a Pages release on a reachable HTTPS Java API and exact-origin CORS."""
import ipaddress
import json
import os
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def validate_origin(value):
    url = urlsplit(value)
    if (url.scheme != 'https' or not url.hostname or url.username or url.password
            or url.path or url.query or url.fragment):
        raise ValueError('PUBLIC_API_URL must be an HTTPS origin without a path, credentials or trailing slash')
    hostname = url.hostname.lower()
    if hostname == 'localhost' or hostname.endswith(('.localhost', '.local')):
        raise ValueError('The API must be publicly hosted, not localhost')
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        address = None
    if address and not address.is_global:
        raise ValueError('The API cannot use a private or loopback IP address')
    return value


def request(url, origin, payload=None, method=None, headers=None):
    body = None if payload is None else json.dumps(payload).encode()
    supplied = {'Origin': origin, **(headers or {})}
    if body is not None:
        supplied['Content-Type'] = 'application/json'
    with urlopen(Request(url, data=body, headers=supplied, method=method), timeout=120) as response:
        assert response.headers.get('Access-Control-Allow-Origin') == origin, 'API must allow the exact Pages origin'
        return response.read(), response.headers


def main():
    base = validate_origin(os.environ.get('PUBLIC_API_URL', ''))
    origin = validate_origin(os.environ.get('PUBLIC_FRONTEND_ORIGIN', 'https://voyager0057.github.io'))
    raw, _ = request(base + '/api/health', origin)
    assert json.loads(raw)['status'] == 'UP', 'API health is not UP'
    _, headers = request(base + '/api/calculate', origin, method='OPTIONS', headers={
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
    })
    assert 'POST' in headers.get('Access-Control-Allow-Methods', ''), 'CORS must permit POST'
    assert 'content-type' in headers.get('Access-Control-Allow-Headers', '').lower(), 'CORS must permit JSON'
    raw, _ = request(base + '/api/calculate', origin, payload={})
    result = json.loads(raw)
    assert len(result['monthly']) == 12 and len(result['schedule']) == 360, 'Default calculation is incomplete'
    assert result['schedule'][-1]['remainingPrincipal'] == '0.00', 'Final principal must be zero'
    print('Public HTTPS API, exact-origin CORS and complete default calculation passed.')


if __name__ == '__main__':
    main()
