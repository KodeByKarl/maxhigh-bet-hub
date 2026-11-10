import unittest
import finish_private_staging as finish
from common import DB, SHA


class Finish(unittest.TestCase):
    def test_existing_nonempty_schema_cannot_auto_migrate(self):
        with self.assertRaises(RuntimeError):
            finish.empty_checkpoint_allowed(['0000.sql'], 1)
        finish.empty_checkpoint_allowed(['0000.sql'], 0)
        finish.empty_checkpoint_allowed([], 21)

    def test_recovery_requires_every_gate_and_exact_identity(self):
        value = dict(schema=DB, applicationSha=SHA, restoreCompared=True, corruptionRejected=True,
                     offHostRetrieved=True, keyRecoveryVerified=True, ciphertextSha256='a' * 64)
        self.assertTrue(finish.recovery_ready(value))
        for key in ('restoreCompared', 'corruptionRejected', 'offHostRetrieved', 'keyRecoveryVerified'):
            self.assertFalse(finish.recovery_ready({**value, key: False}))
        self.assertFalse(finish.recovery_ready({**value, 'schema': 'maxhigh'}))
        self.assertFalse(finish.recovery_ready({**value, 'applicationSha': '0' * 40}))
        self.assertFalse(finish.recovery_ready({**value, 'ciphertextSha256': ''}))
        self.assertFalse(finish.recovery_ready(None))


if __name__ == '__main__':
    unittest.main()
