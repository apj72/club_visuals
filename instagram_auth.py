"""Browser-cookie import with local validation; never claims a live login check."""
from http.cookiejar import MozillaCookieJar, LoadError
from pathlib import Path
import os
import re
import subprocess
import tempfile
import time
import warnings

BROWSERS = {'chrome': 'Chrome', 'brave': 'Brave'}


def _load_jar(path):
    jar = MozillaCookieJar(str(path))
    # Malformed-cookie warnings can contain the offending line; do not log it.
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        jar.load(ignore_discard=True, ignore_expires=True)
    return jar


def validate_source(browser, profile):
    if not isinstance(browser, str) or browser not in BROWSERS:
        raise ValueError('Choose Chrome or Brave for the Instagram login browser.')
    if not isinstance(profile, str) or (profile and not re.fullmatch(r'[A-Za-z0-9 _.-]{1,80}', profile)):
        raise ValueError('Enter a browser profile directory name, for example Default or Profile 1.')


def cookie_status(path, max_age):
    path = Path(path)
    result = {'exists':path.exists(), 'age_hours':None, 'fresh':False,
              'has_session':False, 'verified':False}
    if not result['exists']:
        return result
    try:
        age = max(0, time.time() - path.stat().st_mtime)
        result['age_hours'] = round(age / 3600, 1)
        jar = _load_jar(path)
        result['has_session'] = any(
            cookie.domain.lstrip('.') == 'instagram.com' and cookie.name == 'sessionid'
            and bool(cookie.value) and not cookie.is_expired()
            for cookie in jar)
        result['fresh'] = result['has_session'] and age <= max_age
    except (OSError, LoadError, ValueError):
        pass
    return result


def export_cookies(path, browser='chrome', profile='', password=None):
    """Return success/error. A failed import leaves the prior cookie jar intact.

    Export cookies without requesting a media URL. yt-dlp can report no URL
    after exporting; validate the new jar/session. This is a local cookie
    import, not an Instagram authentication check.
    """
    validate_source(browser, profile)
    path = Path(path)
    if password:
        keychain = Path.home() / 'Library' / 'Keychains' / 'login.keychain-db'
        try:
            unlocked = subprocess.run(['security', 'unlock-keychain', '-p', password, str(keychain)],
                                      capture_output=True, timeout=5)
            if unlocked.returncode:
                return False, 'Could not unlock the login Keychain. Try Refresh without a password and respond to the macOS permission prompt.'
        except (OSError, subprocess.SubprocessError):
            return False, 'Could not unlock the login Keychain. Try Refresh without a password.'
    descriptor, temporary = tempfile.mkstemp(prefix='.instagram-cookie-import-', dir=path.parent)
    os.close(descriptor)
    target = Path(temporary)
    try:
        # yt-dlp also reads --cookies before merging browser cookies. An empty
        # mkstemp file is not a valid Netscape cookie jar.
        target.write_text('# Netscape HTTP Cookie File\n')
        source = browser + (':' + profile if profile else '')
        subprocess.run(['yt-dlp', '--cookies-from-browser', source, '--cookies', str(target)],
                       capture_output=True, timeout=30)
        if not cookie_status(target, 60)['fresh']:
            return False, (f'No usable Instagram login cookie was exported from {BROWSERS[browser]} '
                           f'({profile or "default profile"}). Log into Instagram in that Mac browser/profile, '
                           'complete any verification, then refresh. Allow macOS Keychain access if asked.')
        jar = _load_jar(target)
        # Instagram needs only its own cookies; avoid retaining other sites.
        for cookie in list(jar):
            if cookie.domain.lstrip('.') != 'instagram.com' and not cookie.domain.endswith('.instagram.com'):
                jar.clear(cookie.domain, cookie.path, cookie.name)
        jar.save(ignore_discard=True, ignore_expires=True)
        target.chmod(0o600)
        target.replace(path)
        return True, ''
    except FileNotFoundError:
        return False, 'yt-dlp was not found. Install it on the Mac before refreshing cookies.'
    except subprocess.TimeoutExpired:
        return False, 'Cookie import timed out. Check the Mac for a Keychain permission prompt, then try again.'
    except (OSError, LoadError, ValueError, subprocess.SubprocessError):
        return False, 'Cookie import failed. Check the selected Mac browser/profile and its Keychain permissions.'
    finally:
        target.unlink(missing_ok=True)
