from collections import OrderedDict
import itertools


class HeadTailOrderedDict(OrderedDict):
    def head(self, num: int = 3):
        return self.__class__(itertools.islice(self.items(), num))

    def tail(self, num: int = 3):
        return self.__class__(((k, self[k]) for k in itertools.islice(reversed(self), num)))
