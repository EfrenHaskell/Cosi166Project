import load
from unittest import TestCase, main


class LoadConfTests(TestCase):

    def test_key_pair_match(self):
        for conf in vars(load.CONFIG_TAGS).values():
            self.assertIn(conf, load.CONFIG)

    def test_dump_no_update(self):
        old_conf = load.CONFIG
        load.dump_conf()
        conf = load.load_config()
        self.assertEqual(old_conf, conf)

    def test_dump_inc_samples(self):
        old_samples = load.CONFIG[load.CONFIG_TAGS.AI_SAMPLES]
        load.increment_ai_samples()
        load.dump_conf()
        conf = load.load_config()
        new_samples = conf[load.CONFIG_TAGS.AI_SAMPLES]
        self.assertEqual(old_samples + 1, new_samples)
        load.reset_ai_samples(old_samples)
        load.dump_conf(conf)
        self.assertEqual(old_samples, load.CONFIG[load.CONFIG_TAGS.AI_SAMPLES])


class LoadErrorTests(TestCase):

    def test_key_pair_match(self):
        for error in vars(load.ERROR_TAGS).values():
            self.assertIn(error, load.ERRORS)


class LoadQueryTests(TestCase):

    def test_query_test(self):
        self.assertEqual("this is a test for queries_d.yaml", load.QUERY[load.QUERY_TAGS.TEST_D])
        self.assertEqual("this is a test for queries_p.yaml", load.QUERY[load.QUERY_TAGS.TEST_P])
        self.assertEqual("this is a test for queries_j.yaml", load.QUERY[load.QUERY_TAGS.TEST_J])
        self.assertEqual("this is a test for queries_ef.yaml", load.QUERY[load.QUERY_TAGS.TEST_EF])
        self.assertEqual("this is a test for queries_ek.yaml", load.QUERY[load.QUERY_TAGS.TEST_EK])


if __name__ == "__main__":
    main()
