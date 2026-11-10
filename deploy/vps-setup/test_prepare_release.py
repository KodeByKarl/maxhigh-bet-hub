import unittest
import prepare_release as prepare


class Preparation(unittest.TestCase):
    def test_minimal_readonly_grants_accepted(self):
        self.assertTrue(prepare.grants_readonly(['GRANT USAGE ON *.* TO x', 'GRANT SELECT ON `maxhigh_staging`.* TO x']))

    def test_roles_writes_or_delegation_rejected(self):
        for grant in ['GRANT ALL PRIVILEGES ON *.* TO x', 'GRANT INSERT ON `maxhigh_staging`.* TO x',
                      'GRANT `production_role` TO x', 'GRANT SELECT ON `maxhigh_staging`.* TO x WITH GRANT OPTION']:
            self.assertFalse(prepare.grants_readonly([grant]))

    def test_missing_select_rejected(self):
        self.assertFalse(prepare.grants_readonly(['GRANT USAGE ON *.* TO x']))

    def test_dry_run_only_accepts_fresh_or_complete_plan(self):
        prepare.accepted_pending(['0000.sql', '0001.sql'], ['0000.sql', '0001.sql'])
        prepare.accepted_pending([], ['0000.sql', '0001.sql'])
        with self.assertRaises(RuntimeError):
            prepare.accepted_pending(['0001.sql'], ['0000.sql', '0001.sql'])


if __name__ == '__main__':
    unittest.main()
