# Current iPad connection

Start `./start.sh` on the Mac. Use **Connect iPad** to generate a current LAN link.
The current interface is `http://<Mac-LAN-IP>:8008/?remote=1`; the classic editor is
`http://<Mac-LAN-IP>:8008/classic?remote=1`. Older `/redesign` links redirect to the
current homepage. Both `python3 server.py` and the former redesign launcher now
serve the complete application. Save edits, restart the server and refresh both
devices after updating. See the [current Mac/iPad guide](user-guide/mac-ipad.html).

The notes below are the historical introduction of this feature; their separate
launcher and homepage instructions are superseded by the above.

---

# Connecting an iPad to the Mac

Click **Connect iPad** in the top control bar of either interface on the Mac.
The dialog generates a link using the Mac's current LAN IPv4 address and the
server's actual port. Press **Copy link** and open it in Safari on the iPad.
The `remote=1` query explicitly selects controller mode.

If there are several adapters, choose the one on the iPad's network. The
original server offers the V1 link. The optional redesigned launcher offers
both interfaces. The button remains reachable when the Mac editor is locked
by remote control; generating a link does not claim or release ownership.

After changing Wi-Fi, reopen the dialog or press **Generate current link**.
Addresses are discovered afresh and are not saved in configuration. Clipboard
access has a selection/copy fallback for browsers that restrict it over HTTP.
No external service receives the connection link or network addresses.

The Mac must be awake with the server running, its firewall must allow the
connection, and both devices need a network path to each other. Guest/venue
Wi-Fi may isolate clients. An IP-based URL avoids Bonjour lookup failures but
cannot bypass client isolation.

Restart the updated Python server and reload the editor to install the new
endpoint/button. In the redesigned setup, restart `ui-redesign/launch.py`.

## Why a fixed IPv6 address is not a universal replacement

An ordinary globally routed IPv6 address uses a network prefix, so roaming to
another Wi-Fi network normally changes which addresses can be used. Assigning
one permanent address to the Mac does not arrange routing on other networks.
See [IPv6 address autoconfiguration, RFC 4862](https://www.rfc-editor.org/rfc/rfc4862).

IPv6 link-local addresses work on the local link without an IPv6 internet
connection or a router advertising a global prefix. Both devices still need
IPv6 enabled, and the Wi-Fi must carry the required IPv6 traffic between
clients. Link-local addresses also need a local zone/interface selection;
that identifier belongs to the device opening the URL, and browser handling
is not a dependable replacement for an ordinary web link. See
[scoped addresses, RFC 4007](https://www.rfc-editor.org/rfc/rfc4007) and
[user-interface zone identifiers, RFC 9844](https://www.rfc-editor.org/rfc/rfc9844).

A manually assigned unique-local IPv6 address can stay fixed, but the other
device needs compatible addressing and routing too. It does not automatically
become reachable on arbitrary Wi-Fi networks. See
[unique-local addresses, RFC 4193](https://www.rfc-editor.org/rfc/rfc4193).

Club Visuals currently listens on IPv4. The new button generates IPv4 links;
it does not alter the Mac/iPad network configuration or add an IPv6 listener.

## Checks

```sh
python3 -m unittest test_network_links.py test_remote_control.py -q
python3 -m unittest discover -s ui-redesign -p 'test_*.py' -q
python3 ui-redesign/check_network_links.py
```

The Chrome check requires the same optional developer dependencies as the
other browser checks and uses temporary metadata and mocked network addresses.
