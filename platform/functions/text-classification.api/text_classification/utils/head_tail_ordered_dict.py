from collections import OrderedDict
import itertools

def head(d: OrderedDict, num: int = 3):
    return d.__class__(itertools.islice(d.items(), num))

def tail(d: OrderedDict, num: int = 3):
    return d.__class__(((k, d[k]) for k in itertools.islice(reversed(d), num)))
