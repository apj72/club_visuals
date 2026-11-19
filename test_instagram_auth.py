"""Cookie-source selection and safe failure handling without browser access."""
from pathlib import Path
import os
import subprocess
import time
from types import SimpleNamespace
from unittest.mock import patch

import pytest
import instagram_auth
import server


def jar(path, session=True, expired=False):
    expiry = int(time.time()) + (-60 if expired else 3600)
    text = '# Netscape HTTP Cookie File\n'
    if session:
        text += f'.instagram.com\tTRUE\t/\tTRUE\t{expiry}\tsessionid\tfixture-session\n'
    text += f'.example.org\tTRUE\t/\tTRUE\t{expiry}\tother\tfixture-other\n'
    Path(path).write_text(text)


def test_saved_cookie_status_is_not_a_live_login_verification(tmp_path):
    path = tmp_path / 'cookies.txt'
    jar(path)
    status = instagram_auth.cookie_status(path, 7 * 86400)
    assert status['fresh'] and status['has_session']
    assert status['verified'] is False
    assert 'fixture-session' not in str(status)
    os.utime(path, (time.time() - 8 * 86400,) * 2)
    assert instagram_auth.cookie_status(path, 7 * 86400)['fresh'] is False


@pytest.mark.parametrize('session,expired', [(False,False), (True,True)])
def test_missing_or_expired_session_is_not_reported_connected(tmp_path, session, expired):
    path = tmp_path / 'cookies.txt'; jar(path, session, expired)
    assert not instagram_auth.cookie_status(path, 7 * 86400)['fresh']


def test_chrome_profile_export_validates_jar_and_retains_only_instagram(tmp_path):
    path = tmp_path / 'cookies.txt'
    def run(command, **kwargs):
        assert command[command.index('--cookies-from-browser') + 1] == 'chrome:Profile 1'
        assert Path(command[command.index('--cookies') + 1]).read_text().startswith('# Netscape HTTP Cookie File')
        jar(command[command.index('--cookies') + 1])
        # A no-URL exit can follow a successful local cookie export.
        assert not any(argument.startswith('https://') for argument in command)
        return SimpleNamespace(returncode=1)
    with patch.object(instagram_auth.subprocess, 'run', side_effect=run):
        ok, error = instagram_auth.export_cookies(path, 'chrome', 'Profile 1')
    assert ok and not error
    assert 'instagram.com' in path.read_text() and 'example.org' not in path.read_text()
    assert path.stat().st_mode & 0o777 == 0o600
    assert not list(tmp_path.glob('.instagram-cookie-import-*'))


def test_failed_import_keeps_existing_cookie_jar(tmp_path):
    path = tmp_path / 'cookies.txt'; jar(path)
    previous = path.read_bytes()
    def run(command, **kwargs):
        jar(command[command.index('--cookies') + 1], session=False)
        return SimpleNamespace(returncode=1)
    with patch.object(instagram_auth.subprocess, 'run', side_effect=run):
        ok, error = instagram_auth.export_cookies(path, 'brave')
    assert not ok and 'Brave' in error
    assert path.read_bytes() == previous
    assert not list(tmp_path.glob('.instagram-cookie-import-*'))


def test_timeout_preserves_existing_file_and_explains_keychain_prompt(tmp_path):
    path = tmp_path / 'cookies.txt'; jar(path)
    previous = path.read_bytes()
    with patch.object(instagram_auth.subprocess, 'run', side_effect=subprocess.TimeoutExpired('yt-dlp',30)):
        ok, error = instagram_auth.export_cookies(path)
    assert not ok and 'Keychain' in error
    assert path.read_bytes() == previous


@pytest.mark.parametrize('browser,profile', [('other',''), ('chrome','../Default'), ('chrome','Profile 1:extra')])
def test_reject_unknown_browser_or_profile_path(browser, profile, tmp_path):
    with patch.object(instagram_auth.subprocess, 'run') as run:
        with pytest.raises(ValueError):
            instagram_auth.export_cookies(tmp_path/'cookies.txt', browser, profile)
        run.assert_not_called()


def test_shared_server_defaults_to_chrome_without_reading_browser_data():
    with patch.object(server, 'load_config', return_value={}), patch.object(
            instagram_auth, 'export_cookies', return_value=(True,'')) as export:
        assert server.refresh_cookies()
        export.assert_called_once_with(server.COOKIE_JAR, 'chrome', '', None)
