"""Verify the local NASA POWER pilot download before offline training."""

import argparse
from hashlib import sha256
import json
from pathlib import Path

from .model import DEFAULT_RAW, END, PILOT, START, read_observations
from .pipeline import UNITS


# Fingerprint of the observed values and scientific request metadata. NASA's
# response timing field varies between otherwise identical downloads.
EXPECTED_OBSERVATIONS_SHA256 = 'd70f60ca0b8084a16da9d7c3ae56b7f7af67e1c783ee3477f9f5fd9afde1e8f9'


def verify_source(raw_path: Path = DEFAULT_RAW) -> dict:
    _, quality, raw_hash = read_observations(raw_path)
    payload = json.loads(raw_path.read_bytes())
    fingerprint = {
        'location': PILOT,
        'start': START.strftime('%Y%m%d'),
        'end': END.strftime('%Y%m%d'),
        'time_standard': 'LST',
        'units': {key: payload['parameters'][key]['units'] for key in UNITS},
        'observations': {key: payload['properties']['parameter'][key] for key in UNITS},
    }
    observations_hash = sha256(
        json.dumps(fingerprint, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    ).hexdigest()
    result = {
        'file': str(raw_path),
        'raw_sha256': raw_hash,
        'observations_sha256': observations_hash,
        'expected_observations_sha256': EXPECTED_OBSERVATIONS_SHA256,
        'expected_days': quality['expected_days'],
        'missing_or_invalid_days': quality['missing_or_invalid_days'],
        'api_version': quality['api_version'],
        'matches_reference_observations': observations_hash == EXPECTED_OBSERVATIONS_SHA256,
    }
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('raw_path', nargs='?', type=Path, default=DEFAULT_RAW)
    args = parser.parse_args()
    result = verify_source(args.raw_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not result['matches_reference_observations']:
        parser.exit(1, 'Las observaciones NASA difieren del piloto validado; revisar antes de entrenar.\n')


if __name__ == '__main__':
    main()
