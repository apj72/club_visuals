"""Discover current LAN IPv4 addresses for the local iPad connection dialog."""
import ipaddress
import re
import socket
import subprocess
import sys


def _command(*args):
    try:
        return subprocess.check_output(args, text=True, timeout=3, stderr=subprocess.DEVNULL)
    except (OSError, subprocess.SubprocessError):
        return ''


def _usable(address):
    try:
        ip = ipaddress.IPv4Address(address)
        return not (ip.is_loopback or ip.is_unspecified or ip.is_multicast)
    except ipaddress.AddressValueError:
        return False


def parse_interfaces(output):
    """Keep active physical/LAN interfaces; omit tunnel and peer-discovery IPs."""
    entries = []
    blocks = re.split(r'(?=^\S+: flags=)', output, flags=re.MULTILINE)
    for block in blocks:
        header = re.match(r'([^\s:]+): flags=[^<]*<([^>]*)>', block)
        if not header or 'UP' not in header[2].split(','):
            continue
        interface = header[1]
        if interface.startswith(('lo', 'utun', 'tun', 'tap', 'awdl', 'llw', 'p2p', 'gif', 'stf')):
            continue
        if re.search(r'^\s*status:\s*inactive', block, re.MULTILINE):
            continue
        for address in re.findall(r'^\s+inet\s+(\d+\.\d+\.\d+\.\d+)\b', block, re.MULTILINE):
            if _usable(address):
                entries.append({'interface': interface, 'address': address})
    return entries


def local_addresses():
    inventory = _command('/sbin/ifconfig', '-a') if sys.platform == 'darwin' else ''
    entries = parse_interfaces(inventory)
    primary = ''
    if sys.platform == 'darwin':
        match = re.search(r'interface:\s*(\S+)', _command('/sbin/route', '-n', 'get', 'default'))
        primary = match[1] if match else ''
    if not entries and not inventory:
        # UDP connect chooses a route without sending application data. No
        # internet service or external address-discovery API is contacted.
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
                probe.connect(('192.0.2.1', 9))
                address = probe.getsockname()[0]
                if _usable(address):
                    entries.append({'interface': 'Network', 'address': address})
        except OSError:
            pass
    entries.sort(key=lambda entry: (
        entry['interface'] != primary,
        not entry['interface'].startswith('en'),
        ipaddress.IPv4Address(entry['address']).is_link_local,
        entry['interface'], entry['address'],
    ))
    unique = {}
    for entry in entries:
        unique.setdefault(entry['address'], entry)
    return list(unique.values())


def ipad_links(port, redesigned=False):
    addresses = []
    for entry in local_addresses():
        origin = f"http://{entry['address']}:{int(port)}"
        urls = {'v1': origin + '/?remote=1'}
        if redesigned:
            urls['redesign'] = origin + '/redesign?remote=1'
        addresses.append({**entry, 'urls': urls})
    return {'addresses': addresses, 'port': int(port)}
