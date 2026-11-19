"""Current-IP discovery and connection links without external discovery APIs."""
import json
import threading
import unittest
import urllib.request
from unittest.mock import patch

import network_links
import server


INTERFACES = '''lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> mtu 16384
    inet 127.0.0.1 netmask 0xff000000
en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
    inet 192.168.2.10 netmask 0xffffff00 broadcast 192.168.2.255
    status: active
en1: flags=8863<UP,BROADCAST,RUNNING,MULTICAST> mtu 1500
    inet 10.0.0.8 netmask 0xffffff00 broadcast 10.0.0.255
    status: active
en2: flags=8863<UP,BROADCAST,RUNNING,MULTICAST> mtu 1500
    inet 192.168.50.2 netmask 0xffffff00
    status: inactive
utun0: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1400
    inet 100.100.100.1 netmask 0xffffffff
awdl0: flags=8943<UP,BROADCAST,RUNNING,MULTICAST> mtu 1500
    inet 10.10.10.1 netmask 0xffffff00
'''


class NetworkLinkTests(unittest.TestCase):
    def test_only_active_lan_interfaces(self):
        self.assertEqual(network_links.parse_interfaces(INTERFACES), [
            {'interface':'en0', 'address':'192.168.2.10'},
            {'interface':'en1', 'address':'10.0.0.8'},
        ])

    def test_default_interface_preferred_without_exposing_vpn(self):
        with patch.object(network_links.sys, 'platform', 'darwin'), patch.object(
                network_links, '_command', side_effect=[INTERFACES, 'interface: en1']):
            self.assertEqual(network_links.local_addresses()[0]['address'], '10.0.0.8')

    def test_no_interfaces_is_clear_empty_result(self):
        with patch.object(network_links, 'local_addresses', return_value=[]):
            self.assertEqual(network_links.ipad_links(8008), {'addresses':[], 'port':8008})

    def test_vpn_only_does_not_fall_back_to_a_vpn_address(self):
        inventory = 'utun0: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1400\n    inet 100.100.100.1 netmask 0xffffffff\n'
        with patch.object(network_links.sys, 'platform', 'darwin'), patch.object(
                network_links, '_command', side_effect=[inventory, 'interface: utun0']), patch.object(network_links.socket, 'socket') as socket:
            self.assertEqual(network_links.local_addresses(), [])
            socket.assert_not_called()

    def test_links_use_actual_server_port_and_supported_ui(self):
        with patch.object(network_links, 'local_addresses', return_value=[{'interface':'en0', 'address':'192.168.2.10'}]):
            original = network_links.ipad_links(8123)
            self.assertEqual(original['addresses'][0]['urls'], {'v1':'http://192.168.2.10:8123/?remote=1'})
            redesigned = network_links.ipad_links(8123, redesigned=True)
            self.assertEqual(redesigned['addresses'][0]['urls']['redesign'], 'http://192.168.2.10:8123/redesign?remote=1')

    def test_http_refresh_follows_changed_ip_address(self):
        httpd = server.ThreadedHTTPServer(('127.0.0.1', 0), server.Handler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        try:
            for address in ['192.168.2.10', '10.0.0.9']:
                with patch.object(network_links, 'local_addresses', return_value=[{'interface':'en0', 'address':address}]):
                    with urllib.request.urlopen(f'http://127.0.0.1:{httpd.server_port}/api/ipad-links') as response:
                        data = json.load(response)
                    self.assertEqual(data['addresses'][0]['urls']['v1'], f'http://{address}:{httpd.server_port}/?remote=1')
        finally:
            httpd.shutdown(); httpd.server_close()


if __name__ == '__main__':
    unittest.main()
