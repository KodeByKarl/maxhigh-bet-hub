#!/usr/bin/env python3
"""Host-wide operations: require separate approval plus verified recovery/login flags."""
import argparse
import ipaddress
from pathlib import Path
import pwd
from common import *

HERE = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['ssh', 'firewall', 'security-index', 'logrotate'])
    parser.add_argument('--approve', required=True)
    parser.add_argument('--console-verified', action='store_true')
    parser.add_argument('--new-login-verified', action='store_true')
    parser.add_argument('--sudo-verified', action='store_true')
    parser.add_argument('--existing-rules-reviewed', action='store_true')
    parser.add_argument('--admin-user')
    parser.add_argument('--client-ip')
    parser.add_argument('--ssh-port', type=int)
    args = parser.parse_args()
    gate(args.approve, args.phase.upper())
    if args.phase == 'security-index':
        run(['apt-get', 'update'])
        print('Package indexes refreshed only. Review simulated security transaction/restarts before installation; no upgrade/reboot performed.')
    elif args.phase == 'logrotate':
        text = (HERE / 'templates/logrotate-preview').read_text()
        draft = ADMIN / 'logrotate-preview'
        managed_file(draft, text)
        run(['logrotate', '--debug', draft])
        managed_file('/etc/logrotate.d/maxhigh-staging-preview', text, 0o644)
        print('Only preview operational log rotation configured. Existing host schedule is unchanged; check hourly invocation separately.')
    else:
        require(args.console_verified and args.new_login_verified and args.sudo_verified,
                'Verify provider console, second non-root SSH login and sudo before host-wide changes')
        require(args.admin_user and args.admin_user != 'root', 'Verified non-root administrator required')
        entry = pwd.getpwnam(args.admin_user)
        require(entry.pw_uid >= 1000, 'Unexpected administrator UID')
        if args.phase == 'firewall':
            require(args.existing_rules_reviewed, 'Review complete UFW/nftables/provider firewall including IPv6 first')
            require(args.ssh_port and 1 <= args.ssh_port <= 65535, 'Explicit existing SSH port required')
            ports = [int(line.split()[1]) for line in run(['/usr/sbin/sshd', '-T']).stdout.splitlines() if line.startswith('port ')]
            require(args.ssh_port in ports, 'SSH port differs from effective sshd configuration')
            status = run(['ufw', 'status']).stdout
            require('Status: inactive' in status, 'Existing active firewall must be reviewed manually, not rewritten by bootstrap')
            # Never reset rules. SSH permit is created before enable; caller keeps console and old session open.
            for port in (args.ssh_port, 80, 443):
                run(['ufw', 'allow', str(port) + '/tcp'])
            run(['ufw', 'default', 'deny', 'incoming'])
            run(['ufw', 'default', 'allow', 'outgoing'])
            run(['ufw', '--force', 'enable'])
            print('UFW enabled with preserved existing rules. Verify new login/IPv6/provider firewall immediately; never open3306/18080.')
        else:
            ipaddress.ip_address(args.client_ip or '')
            target = Path('/etc/ssh/sshd_config.d/00-maxhigh-bootstrap.conf')
            text = (HERE / 'templates/sshd.conf').read_text()
            old_ports = [line for line in run(['/usr/sbin/sshd', '-T']).stdout.splitlines() if line.startswith('port ')]
            created = managed_file(target, text, 0o644)
            try:
                run(['/usr/sbin/sshd', '-t'])
                for user in ('root', args.admin_user):
                    result = run(['/usr/sbin/sshd', '-T', '-C', 'user=%s,addr=%s,host=localhost' % (user, args.client_ip)]).stdout
                    expected = ('permitrootlogin no', 'passwordauthentication no', 'kbdinteractiveauthentication no', 'pubkeyauthentication yes')
                    require(all(line in result.splitlines() for line in expected), 'Earlier Include/Match overrides hardening; no reload')
                    require([line for line in result.splitlines() if line.startswith('port ')] == old_ports, 'SSH port changed unexpectedly')
                run(['systemctl', 'reload', 'ssh.service'])
            except Exception:
                if created:
                    target.unlink()  # Only our just-created file; existing SSH configuration remains untouched.
                    run(['/usr/sbin/sshd', '-t'])
                    run(['systemctl', 'reload', 'ssh.service'], accepted=(0, 1))
                raise RuntimeError('SSH hardening not accepted; newly created snippet removed if applicable. Keep old session/console and verify login') from None
            print('SSH syntax/effective Match settings verified; service reloaded, not restarted. Keep original session until a new administrator login and sudo pass.')


if __name__ == '__main__':
    finish(main)
